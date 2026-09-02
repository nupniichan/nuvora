import * as ExpoCrypto from 'expo-crypto';
import QuickCrypto from 'react-native-quick-crypto';

export interface KdfParameters {
  algorithm: 'argon2id';
  memoryKb: number; // e.g. 65536 (64 MB)
  iterations: number; // e.g. 3
  parallelism: number; // e.g. 1
  keyLength: number; // e.g. 32 bytes (256 bits)
}

export const DEFAULT_KDF_PARAMS: KdfParameters = {
  algorithm: 'argon2id',
  memoryKb: 65536,
  iterations: 3,
  parallelism: 1,
  keyLength: 32,
};

/**
 * Generates cryptographically secure random bytes as hex string
 */
export function generateRandomHex(byteCount: number = 32): string {
  const bytes = ExpoCrypto.getRandomBytes(byteCount);
  const byteArray = Array.from(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  return byteArray.map((b: number) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derives a key from password and salt using Argon2id
 */
export async function deriveKeyArgon2id(
  passwordStr: string,
  saltHex: string,
  params: KdfParameters = DEFAULT_KDF_PARAMS
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const saltBuffer = QuickCrypto.Buffer.from(saltHex, 'hex');
      const qcAny = QuickCrypto as any;

      if (qcAny.argon2 && typeof qcAny.argon2.hash === 'function') {
        qcAny.argon2.hash(
          passwordStr,
          saltBuffer,
          {
            type: 2, // Argon2id
            memoryCost: params.memoryKb,
            timeCost: params.iterations,
            parallelism: params.parallelism,
            hashLength: params.keyLength,
          },
          (err: any, derivedKey: any) => {
            if (err) return reject(err);
            resolve(derivedKey.toString('hex'));
          }
        );
      } else {
        // Fallback PBKDF2 if Argon2 native module unavailable in non-native / JS environments
        QuickCrypto.pbkdf2(
          passwordStr,
          saltBuffer,
          params.iterations * 10000,
          params.keyLength,
          'sha256',
          (err: any, derivedKey: any) => {
            if (err) return reject(err);
            resolve(derivedKey.toString('hex'));
          }
        );
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Encrypts plaintext string using AES-256-GCM
 */
export async function encryptAesGcm(
  plaintext: string,
  keyHex: string
): Promise<{ ciphertextHex: string; nonceHex: string; authTagHex: string }> {
  const nonceBytes = ExpoCrypto.getRandomBytes(12); // 96-bit nonce for GCM
  const nonceArray = Array.from(new Uint8Array(nonceBytes.buffer, nonceBytes.byteOffset, nonceBytes.byteLength));
  const nonceHex = nonceArray.map((b: number) => b.toString(16).padStart(2, '0')).join('');

  const keyBuffer = QuickCrypto.Buffer.from(keyHex, 'hex');
  const nonceBuffer = QuickCrypto.Buffer.from(nonceHex, 'hex');

  const cipher = QuickCrypto.createCipheriv('aes-256-gcm', keyBuffer, nonceBuffer) as any;
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTagHex = cipher.getAuthTag().toString('hex');

  return {
    ciphertextHex: encrypted,
    nonceHex,
    authTagHex,
  };
}

/**
 * Decrypts AES-256-GCM ciphertext string
 */
export async function decryptAesGcm(
  ciphertextHex: string,
  keyHex: string,
  nonceHex: string,
  authTagHex: string
): Promise<string> {
  const keyBuffer = QuickCrypto.Buffer.from(keyHex, 'hex');
  const nonceBuffer = QuickCrypto.Buffer.from(nonceHex, 'hex');
  const authTagBuffer = QuickCrypto.Buffer.from(authTagHex, 'hex');

  const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', keyBuffer, nonceBuffer) as any;
  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
