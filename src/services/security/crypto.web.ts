export interface KdfParameters {
  algorithm: 'pbkdf2-sha256';
  memoryKb: number;
  iterations: number;
  parallelism: number;
  keyLength: number;
}

export const DEFAULT_KDF_PARAMS: KdfParameters = {
  algorithm: 'pbkdf2-sha256',
  memoryKb: 65536,
  iterations: 3,
  parallelism: 1,
  keyLength: 32,
};

export function generateRandomHex(byteCount: number = 32): string {
  const bytes = new Uint8Array(byteCount);
  if (typeof window === 'undefined' || !window.crypto) {
    throw new Error('A secure random number generator is unavailable.');
  }
  window.crypto.getRandomValues(bytes);
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

  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto is unavailable.');
  }

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
      iterations: 310_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    params.keyLength * 8
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

export async function encryptAesGcm(
  plaintext: string,
  keyHex: string
): Promise<{ ciphertextHex: string; nonceHex: string; authTagHex: string }> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto is unavailable.');
  }

  const nonce = hexToBytes(generateRandomHex(12));
  const key = await window.crypto.subtle.importKey(
    'raw',
    hexToBytes(keyHex),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const encrypted = new Uint8Array(
    await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      key,
      new TextEncoder().encode(plaintext)
    )
  );
  const tagStart = encrypted.length - 16;

  return {
    ciphertextHex: bytesToHex(encrypted.slice(0, tagStart)),
    nonceHex: bytesToHex(nonce),
    authTagHex: bytesToHex(encrypted.slice(tagStart)),
  };
}

export async function decryptAesGcm(
  ciphertextHex: string,
  keyHex: string,
  nonceHex: string,
  authTagHex: string
): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto is unavailable.');
  }

  const key = await window.crypto.subtle.importKey(
    'raw',
    hexToBytes(keyHex),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const ciphertext = hexToBytes(ciphertextHex);
  const authTag = hexToBytes(authTagHex);
  const encrypted = new Uint8Array(ciphertext.length + authTag.length);
  encrypted.set(ciphertext);
  encrypted.set(authTag, ciphertext.length);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(nonceHex), tagLength: 128 },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error('Invalid hexadecimal input.');
  }
  return new Uint8Array(hex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? []);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
