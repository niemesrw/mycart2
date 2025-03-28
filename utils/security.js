const CryptoJS = require('crypto-js');

/**
 * Security utilities for token encryption and decryption
 */
module.exports = {
  /**
   * Encrypt a token for secure storage
   * @param {string} token - The token to encrypt
   * @returns {string} Encrypted token
   */
  encryptToken(token) {
    if (!token) return null;
    
    // Encrypt the token using AES encryption
    return CryptoJS.AES.encrypt(
      token,
      process.env.ENCRYPTION_KEY
    ).toString();
  },
  
  /**
   * Decrypt a token from secure storage
   * @param {string} encryptedToken - The encrypted token
   * @returns {string} Decrypted token
   */
  decryptToken(encryptedToken) {
    if (!encryptedToken) return null;
    
    // Decrypt the token using AES decryption
    const bytes = CryptoJS.AES.decrypt(
      encryptedToken,
      process.env.ENCRYPTION_KEY
    );
    
    return bytes.toString(CryptoJS.enc.Utf8);
  }
};