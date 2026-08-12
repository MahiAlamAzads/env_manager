import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

type EncryptedValue = {
  encryptedPayload: string;
  iv: string;
  authTag: string;
};

function getEncryptionKey(): Buffer {
  const raw = process.env.VAULT_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("VAULT_ENCRYPTION_KEY is not configured.");
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("VAULT_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }

  return key;
}

export function encryptVaultPayload(
  payload: unknown,
  context: string,
): EncryptedValue {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(context, "utf8"));

  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedPayload: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptVaultPayload<T>(
  encrypted: EncryptedValue,
  context: string,
): T {
  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(encrypted.iv, "base64"),
  );
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.encryptedPayload, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString("utf8")) as T;
}
