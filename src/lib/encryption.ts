import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

const KEY_BYTE_LENGTH = 32;
const KEY_HEX_LENGTH = KEY_BYTE_LENGTH * 2;
const GENERATE_KEY_CMD =
  'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';

function parseKeyEnv(name: string): Buffer | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;

  if (!/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error(`${name} must be hex. Generate with: ${GENERATE_KEY_CMD}`);
  }
  if (raw.length !== KEY_HEX_LENGTH) {
    throw new Error(
      `${name} must be exactly ${KEY_HEX_LENGTH} hex characters (${KEY_BYTE_LENGTH} bytes). Got ${raw.length}.`,
    );
  }
  return Buffer.from(raw, "hex");
}

function getEncryptionKeys(): Buffer[] {
  const current = parseKeyEnv("ENCRYPTION_KEY");
  if (!current) {
    throw new Error(
      `ENCRYPTION_KEY is not set. Generate one with: ${GENERATE_KEY_CMD}`,
    );
  }

  const previous = parseKeyEnv("ENCRYPTION_KEY_PREVIOUS");
  return previous ? [current, previous] : [current];
}

function getPrimaryEncryptionKey(): Buffer {
  return getEncryptionKeys()[0]!;
}

export function encrypt(plaintext: string): string {
  const key = getPrimaryEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // Format: iv:tag:ciphertext
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  let lastError: Error | undefined;
  for (const key of getEncryptionKeys()) {
    try {
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('Decryption failed');
}
