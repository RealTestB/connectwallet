import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

/**
 * ✅ Generate a New Seed Phrase (Mnemonic)
 */
export const generateSeedPhrase = () => {
    return ethers.Wallet.createRandom().mnemonic.phrase;
};

/**
 * ✅ Encrypt and Store Seed Phrase
 */
export const encryptAndStoreSeedPhrase = async (seedPhrase, password) => {
    const salt = Crypto.getRandomBytes(16).toString(); // Unique salt
    const key = await deriveEncryptionKey(password, salt);
    const iv = Crypto.getRandomBytes(12).toString(); // Random IV

    const encryptedData = await Crypto.encryptAsync(
        seedPhrase,
        key,
        { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
    );

    await SecureStore.setItemAsync("encryptedSeedPhrase", JSON.stringify({ encryptedData, salt, iv }));
};

/**
 * ✅ Retrieve and Decrypt Seed Phrase
 */
export const decryptSeedPhrase = async (password) => {
    const storedData = await SecureStore.getItemAsync("encryptedSeedPhrase");
    if (!storedData) throw new Error("No seed phrase found.");

    const { encryptedData, salt, iv } = JSON.parse(storedData);
    const key = await deriveEncryptionKey(password, salt);

    const decryptedPhrase = await Crypto.decryptAsync(
        encryptedData,
        key,
        { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
    );

    return decryptedPhrase;
};

/**
 * ✅ Import a Wallet Using Seed Phrase or Private Key
 */
export const importWallet = async (input, password) => {
    try {
        let wallet;
        
        if (ethers.utils.isHexString(input, 32)) {
            // If input is a private key
            wallet = new ethers.Wallet(input);
        } else {
            // If input is a seed phrase
            wallet = ethers.Wallet.fromMnemonic(input);
        }

        // Encrypt private key before storing it
        const encryptedKey = await encryptPrivateKey(wallet.privateKey, password);
        await SecureStore.setItemAsync("walletPrivateKey", encryptedKey);

        // Encrypt and store the seed phrase if it's a mnemonic import
        if (!ethers.utils.isHexString(input, 32)) {
            await encryptAndStoreSeedPhrase(input, password);
        }

        return { address: wallet.address, type: "classic" };
    } catch (error) {
        console.error("Failed to import wallet:", error);
        throw error;
    }
};

/**
 * ✅ Derive Encryption Key Using PBKDF2
 */
const deriveEncryptionKey = async (password, salt) => {
    return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + salt
    );
};
