import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Deriva a chave de criptografia (32 bytes) para o AES-256.
 *
 * Prefere TOTP_ENCRYPTION_KEY (chave DEDICADA — separa o segredo de cripto em
 * repouso do segredo de assinatura de sessão; rotacionar o JWT não invalida os
 * secrets TOTP já gravados). Faz fallback para JWT_SECRET por compatibilidade
 * com secrets que foram criptografados antes da chave dedicada existir.
 *
 * Nunca usa fallback hardcoded: sem nenhum dos dois segredos, lança erro
 * (melhor falhar do que cifrar dados sensíveis com um valor público).
 */
function getKey(): Buffer {
  const secret = process.env.TOTP_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY ou JWT_SECRET é obrigatório para cifrar/decifrar o secret TOTP',
    );
  }
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

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plain.toString('utf8');
}
