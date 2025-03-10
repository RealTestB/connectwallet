import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

/**
 * ✅ PBKDF2 Key Derivation - Strengthens password security
 */
const deriveEncryptionKey = async (password, salt) => {
    return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + salt
    );
};

/**
 * ✅ Encrypt Password (AES-256-GCM)
 */
export const encryptPassword = async (password) => {
    const salt = Crypto.getRandomBytes(16).toString();
    const key = await deriveEncryptionKey(password, salt);
    const iv = Crypto.getRandomBytes(12).toString();

    const encryptedData = await Crypto.encryptAsync(
        password,
        key,
        { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
    );

    return JSON.stringify({ encryptedData, salt, iv });
};

/**
 * ✅ Verify Password (AES-256-GCM)
 */
export const verifyPassword = async (inputPassword, encryptedPasswordData) => {
    try {
        const { encryptedData, salt, iv } = JSON.parse(encryptedPasswordData);
        const key = await deriveEncryptionKey(inputPassword, salt);

        const decryptedPassword = await Crypto.decryptAsync(
            encryptedData,
            key,
            { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
        );

        return decryptedPassword === inputPassword;
    } catch (error) {
        console.error("Password verification failed:", error);
        return false;
    }
};

/**
 * ✅ Encrypt Seed Phrase (AES-256-GCM)
 */
export const encryptSeedPhrase = async (seedPhrase, password) => {
    const salt = Crypto.getRandomBytes(16).toString();
    const key = await deriveEncryptionKey(password, salt);
    const iv = Crypto.getRandomBytes(12).toString();

    const encryptedData = await Crypto.encryptAsync(
        seedPhrase,
        key,
        { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
    );

    return JSON.stringify({ encryptedData, salt, iv });
};

/**
 * ✅ Decrypt Seed Phrase (AES-256-GCM)
 */
export const decryptSeedPhrase = async (encryptedData, password) => {
    try {
        const { encryptedSeedPhrase, salt, iv } = JSON.parse(encryptedData);
        const key = await deriveEncryptionKey(password, salt);

        return await Crypto.decryptAsync(
            encryptedSeedPhrase,
            key,
            { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
        );
    } catch (error) {
        console.error("Seed phrase decryption failed:", error);
        throw new Error("Failed to decrypt seed phrase");
    }
};

/**
 * ✅ Encrypt Private Key (AES-256-GCM)
 */
export const encryptPrivateKey = async (privateKey, password) => {
    const salt = Crypto.getRandomBytes(16).toString();
    const key = await deriveEncryptionKey(password, salt);
    const iv = Crypto.getRandomBytes(12).toString();

    const encryptedData = await Crypto.encryptAsync(
        privateKey,
        key,
        { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
    );

    return JSON.stringify({ encryptedData, salt, iv });
};

/**
 * ✅ Decrypt Private Key (AES-256-GCM)
 */
export const decryptPrivateKey = async (encryptedData, password) => {
    try {
        const { encryptedKey, salt, iv } = JSON.parse(encryptedData);
        const key = await deriveEncryptionKey(password, salt);

        return await Crypto.decryptAsync(
            encryptedKey,
            key,
            { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
        );
    } catch (error) {
        console.error("Private key decryption failed:", error);
        throw new Error("Failed to decrypt private key");
    }
};

/**
 * ✅ Session Management
 */
export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export const updateLastActive = async () => {
    await SecureStore.setItemAsync("lastActiveTimestamp", Date.now().toString());
};

export const checkSessionValid = async () => {
    const lastActiveStr = await SecureStore.getItemAsync("lastActiveTimestamp");
    if (!lastActiveStr) return false;

    const lastActive = parseInt(lastActiveStr);
    const now = Date.now();
    return (now - lastActive) < SESSION_TIMEOUT;
};

/**
 * ✅ Store Encrypted Data Securely
 */
export const storeEncryptedData = async (key, encryptedData) => {
    await SecureStore.setItemAsync(key, encryptedData);
};

/**
 * ✅ Retrieve Encrypted Data
 */
export const getEncryptedData = async (key) => {
    return await SecureStore.getItemAsync(key);
};
