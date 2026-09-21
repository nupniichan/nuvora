import { Platform } from 'react-native';

export interface StorageFolderInfo {
  folderName: string;
  uri?: string | null;
}

export interface RestoreFileInfo {
  content: string;
  name: string;
  size: string;
}

export type BackupSaveDestination = 'folder' | 'picker' | 'download' | 'default';

export interface WriteBackupResult {
  success: boolean;
  destination?: BackupSaveDestination;
  folderName?: string;
  filename: string;
}

function getHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open('nuvora_backup_storage', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('handles');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeWebDirectoryHandle(handle: any): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('indexedDB' in window)) return;
  try {
    const db = await getHandleDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, 'backup_dir');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not store directory handle in IndexedDB:', err);
  }
}

export async function getWebDirectoryHandle(): Promise<any | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('indexedDB' in window)) return null;
  try {
    const db = await getHandleDb();
    return new Promise((resolve) => {
      const tx = db.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get('backup_dir');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export function isDirectoryPickerSupported(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return 'showDirectoryPicker' in window;
  }
  if (Platform.OS === 'android') {
    return true;
  }
  return false;
}

export async function pickStorageFolder(): Promise<StorageFolderInfo | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        if (handle) {
          await storeWebDirectoryHandle(handle);
          return { folderName: handle.name || '', uri: null };
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return null;
        throw err;
      }
    }
    return null;
  }

  if (Platform.OS === 'android') {
    try {
      const { StorageAccessFramework } = require('expo-file-system/legacy');
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted && permissions.directoryUri) {
        const uri = permissions.directoryUri;
        const decoded = decodeURIComponent(uri);
        const folderName = decoded.split('/').pop() || decoded.split(':').pop() || '';
        return { folderName, uri };
      }
      return null;
    } catch (err) {
      console.warn('Android SAF error:', err);
      return null;
    }
  }

  return null;
}

export async function writeBackupToFile(
  data: string,
  filename: string,
  folderInfo?: { folderName?: string | null; uri?: string | null } | null
): Promise<WriteBackupResult> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const dirHandle = await getWebDirectoryHandle();
    if (dirHandle) {
      try {
        let perm = await dirHandle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          perm = await dirHandle.requestPermission({ mode: 'readwrite' });
        }
        if (perm === 'granted') {
          const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(data);
          await writable.close();
          return {
            success: true,
            destination: 'folder',
            folderName: dirHandle.name,
            filename,
          };
        }
      } catch (e) {
        console.warn('Directory handle write failed, falling back to picker/download:', e);
      }
    }

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'JSON Backup File',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
        return {
          success: true,
          destination: 'picker',
          filename,
        };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, filename };
        }
      }
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return {
      success: true,
      destination: 'download',
      filename,
    };
  }

  if (Platform.OS === 'android' && folderInfo?.uri) {
    try {
      const { StorageAccessFramework } = require('expo-file-system/legacy');
      const fileUri = await StorageAccessFramework.createFileAsync(
        folderInfo.uri,
        filename,
        'application/json'
      );
      await StorageAccessFramework.writeAsStringAsync(fileUri, data);
      return {
        success: true,
        destination: 'folder',
        folderName: folderInfo.folderName || '',
        filename,
      };
    } catch (e: any) {
      console.warn('Android SAF write error:', e);
    }
  }

  return {
    success: true,
    destination: 'default',
    filename,
  };
}

export async function pickBackupFile(): Promise<RestoreFileInfo | null> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return resolve(null);
        const sizeKb = (file.size / 1024).toFixed(1) + ' KB';
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          resolve({
            content,
            name: file.name,
            size: sizeKb,
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      };
      input.click();
    });
  }

  return null;
}
