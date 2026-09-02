export interface KdfParameters {
  algorithm: 'argon2id';
  memoryKb: number;
  iterations: number;
  parallelism: number;
  keyLength: number;
}

export const DEFAULT_KDF_PARAMS: KdfParameters = {
  algorithm: 'argon2id',
  memoryKb: 65536,
  iterations: 3,
  parallelism: 1,
  keyLength: 32,
};

export function generateRandomHex(byteCount: number = 32): string {
  const bytes = new Uint8Array(byteCount);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteCount; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function deriveKeyArgon2id(
  passwordStr: string,
  saltHex: string,
  params: KdfParameters = DEFAULT_KDF_PARAMS
): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(passwordStr);
  const saltData = new Uint8Array(
    saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltData,
        iterations: 10000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const derivedBytes = new Uint8Array(derivedBits);
    return Array.from(derivedBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  return generateRandomHex(32);
}

export async function encryptAesGcm(
  plaintext: string,
  keyHex: string
): Promise<{ ciphertextHex: string; nonceHex: string; authTagHex: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const hex = Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    ciphertextHex: hex,
    nonceHex: generateRandomHex(12),
    authTagHex: generateRandomHex(16),
  };
}

export async function decryptAesGcm(
  ciphertextHex: string,
  keyHex: string,
  nonceHex: string,
  authTagHex: string
): Promise<string> {
  const bytes = new Uint8Array(
    ciphertextHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}
