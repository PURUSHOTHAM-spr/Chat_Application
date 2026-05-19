import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-encryption-key-32chars!!";

/**
 * Basic AES encryption for message content.
 * NOTE: This is NOT true E2EE — messages are encrypted at rest in the database.
 * For true E2EE, implement Signal Protocol on the client side.
 */
export const encryptMessage = (text) => {
  if (!text) return text;
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

export const decryptMessage = (ciphertext) => {
  if (!ciphertext) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return ciphertext; // Return as-is if decryption fails
  }
};
