const express = require('express');
const router = express.Router();
const axios = require('axios');
const { validationResult, query } = require('express-validator');
const { encryptToken, decryptToken } = require('../utils/security');
const { generateRandomString } = require('../utils/helpers');
const krogerApi = require('../services/kroger-api');

// Base Kroger API URL
const KROGER_API_BASE = 'https://api.kroger.com/v1';

// Authentication routes
router.get('/authorize', (req, res) => {
  // Generate and store state parameter to prevent CSRF attacks
  const state = generateRandomString(32);
  req.session.oauth2State = state;
  
  // Redirect to Kroger authorization page
  const authUrl = new URL(`${KROGER_API_BASE}/connect/oauth2/authorize`);
  authUrl.searchParams.append('client_id', process.env.KROGER_CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  // Force HTTP redirect URI for local development
  authUrl.searchParams.append('redirect_uri', 
    process.env.KROGER_REDIRECT_URI.replace('https://', 'http://'));
  authUrl.searchParams.append('scope', 'product.compact');
  authUrl.searchParams.append('state', state);
  
  res.redirect(authUrl.toString());
});

// Handle the OAuth callback from Kroger
router.get('/callback', [
  query('code').optional().isString(),
  query('state').optional().isString(),
  query('error').optional().isString(),
  query('error_description').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('error', { 
      error: { 
        message: 'Invalid callback parameters',
        details: errors.array()
      } 
    });
  }

  // Handle error response from Kroger
  if (req.query.error) {
    return res.status(400).render('error', {
      error: {
        message: req.query.error,
        description: req.query.error_description || 'No error description provided'
      }
    });
  }

  // Validate state parameter to prevent CSRF attacks
  const { state, code } = req.query;
  if (!state || state !== req.session.oauth2State) {
    return res.status(400).render('error', {
      error: {
        message: 'Invalid state parameter',
        description: 'The state parameter does not match. This could be a CSRF attack attempt.'
      }
    });
  }

  // Clear state from session
  req.session.oauth2State = null;

  // Exchange authorization code for tokens
  try {
    const tokenResponse = await krogerApi.exchangeCodeForTokens(code);
    
    // Store tokens securely in session (encrypted)
    req.session.tokens = {
      access_token: encryptToken(tokenResponse.access_token),
      refresh_token: encryptToken(tokenResponse.refresh_token),
      expires_at: Date.now() + (tokenResponse.expires_in * 1000)
    };
    
    // Fetch user information if needed
    try {
      const userInfo = await krogerApi.getUserProfile(tokenResponse.access_token);
      req.session.user = userInfo;
    } catch (userError) {
      console.error('Error fetching user profile:', userError);
      // Continue even if user profile fetch fails
    }
    
    // Redirect to profile or home page
    res.redirect('/profile');
    
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).render('error', {
      error: {
        message: 'Failed to exchange authorization code for tokens',
        description: error.response?.data?.error_description || error.message
      }
    });
  }
});

// Legacy login route that redirects to authorize
router.get('/login', (req, res) => {
  res.redirect('/authorize');
});

// User profile page (protected route)
router.get('/profile', async (req, res) => {
  // Check if user is authenticated
  if (!req.session.tokens) {
    return res.redirect('/authorize');
  }

  // Check if token needs refresh
  if (req.session.tokens.expires_at < Date.now()) {
    try {
      const refreshToken = decryptToken(req.session.tokens.refresh_token);
      const newTokens = await krogerApi.refreshTokens(refreshToken);
      
      // Update tokens in session
      req.session.tokens = {
        access_token: encryptToken(newTokens.access_token),
        refresh_token: encryptToken(newTokens.refresh_token),
        expires_at: Date.now() + (newTokens.expires_in * 1000)
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Token refresh failed, redirect to login
      req.session.destroy();
      return res.redirect('/authorize?error=session_expired');
    }
  }

  // Render profile page with user data
  res.render('profile', {
    user: req.session.user || { name: 'Kroger User' },
    tokenInfo: {
      expiresAt: new Date(req.session.tokens.expires_at).toLocaleString(),
      isValid: req.session.tokens.expires_at > Date.now()
    }
  });
});

// Refresh token endpoint
router.post('/refresh-token', async (req, res) => {
  // Check if user is authenticated
  if (!req.session.tokens || !req.session.tokens.refresh_token) {
    return res.status(401).json({ error: 'No refresh token available' });
  }

  try {
    const refreshToken = decryptToken(req.session.tokens.refresh_token);
    const newTokens = await krogerApi.refreshTokens(refreshToken);
    
    // Update tokens in session
    req.session.tokens = {
      access_token: encryptToken(newTokens.access_token),
      refresh_token: encryptToken(newTokens.refresh_token),
      expires_at: Date.now() + (newTokens.expires_in * 1000)
    };
    
    res.json({
      success: true,
      expires_at: req.session.tokens.expires_at
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(401).json({
      error: 'Failed to refresh token',
      message: error.message
    });
  }
});

// Logout endpoint
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

// Client credentials grant - for testing and server-to-server operations
router.get('/client-credentials', async (req, res) => {
  try {
    const token = await krogerApi.getClientCredentialsToken();
    res.json({
      success: true,
      token_type: token.token_type,
      expires_in: token.expires_in,
      scope: token.scope
    });
  } catch (error) {
    console.error('Error getting client credentials token:', error);
    res.status(500).json({
      error: 'Failed to get client credentials token',
      message: error.message
    });
  }
});

module.exports = router;
