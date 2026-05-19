import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "default-encryption-key-32chars!!";

/**
 * Basic AES encryption for demonstration.
 * In production, implement Signal Protocol for true E2EE.
 */
export const encryptMessage = (text) => {
  if (!text) return text;
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

export const decryptMessage = (ciphertext) => {
  if (!ciphertext) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8) || ciphertext;
  } catch {
    return ciphertext;
  }
};
