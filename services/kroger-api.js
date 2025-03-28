const axios = require('axios');

// Base Kroger API URL
const KROGER_API_BASE = 'https://api.kroger.com/v1';

/**
 * Kroger API service for handling API requests and token management
 */
const krogerApi = {
  /**
   * Exchange authorization code for access and refresh tokens
   * @param {string} code - The authorization code from Kroger
   * @returns {Promise<Object>} Token response object
   */
  async exchangeCodeForTokens(code) {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.KROGER_REDIRECT_URI);
    
    const auth = Buffer.from(
      `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
    ).toString('base64');
    
    const response = await axios.post(
      `${KROGER_API_BASE}/connect/oauth2/token`,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        }
      }
    );
    
    return response.data;
  },
  
  /**
   * Refresh access token using a refresh token
   * @param {string} refreshToken - The refresh token
   * @returns {Promise<Object>} New token response object
   */
  async refreshTokens(refreshToken) {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    
    const auth = Buffer.from(
      `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
    ).toString('base64');
    
    const response = await axios.post(
      `${KROGER_API_BASE}/connect/oauth2/token`,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        }
      }
    );
    
    return response.data;
  },
  
  /**
   * Get a client credentials token (for server-to-server API calls)
   * @returns {Promise<Object>} Token response object
   */
  async getClientCredentialsToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'product.compact'); // Adjust scope as needed
    
    const auth = Buffer.from(
      `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
    ).toString('base64');
    
    const response = await axios.post(
      `${KROGER_API_BASE}/connect/oauth2/token`,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        }
      }
    );
    
    return response.data;
  },
  
  /**
   * Get user profile information
   * @param {string} accessToken - The user's access token
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(accessToken) {
    const response = await axios.get(
      `${KROGER_API_BASE}/identity/profile`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    return response.data;
  },
  
  /**
   * Make a generic authenticated request to the Kroger API
   * @param {string} endpoint - API endpoint to call
   * @param {string} accessToken - Valid access token
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {Object} data - Request body data (for POST, PUT, etc.)
   * @returns {Promise<Object>} API response data
   */
  async makeAuthenticatedRequest(endpoint, accessToken, method = 'GET', data = null) {
    const config = {
      method,
      url: `${KROGER_API_BASE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    };
    
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  }
};

module.exports = krogerApi;