import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Deriva a chave de criptografia (32 bytes) a partir do JWT_SECRET.
 * Usa SHA-256 para garantir o tamanho correto da chave para o AES-256.
 */
function getKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? 'fallback-secret';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Criptografa um secret TOTP em texto puro usando AES-256-GCM.
 * Retorna o formato "iv:authTag:ciphertext" com cada parte em hex.
 */
export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    ciphertext.toString('hex'),
  ].join(':');
}

/**
 * Descriptografa um secret previamente gerado por encryptSecret.
 */
export function decryptSecret(enc: string): string {
  const [ivHex, authTagHex, ciphertextHex] = enc.split(':');
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Formato de secret criptografado invalido');
  }

  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plain = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plain.toString('utf8');
}
