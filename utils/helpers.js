/**
 * Helper utilities for the application
 */
module.exports = {
  /**
   * Generate a random string of specified length
   * @param {number} length - Length of the string to generate
   * @returns {string} Random string
   */
  generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    
    return text;
  },
  
  /**
   * Format date to a readable string
   * @param {Date|number|string} date - Date to format
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    return new Date(date).toLocaleString();
  }
};