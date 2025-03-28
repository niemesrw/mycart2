const express = require('express');
const router = express.Router();
const { decryptToken } = require('../utils/security');
const krogerApi = require('../services/kroger-api');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session.tokens || !req.session.tokens.access_token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Middleware to ensure token is valid and refreshed if needed
const ensureValidToken = async (req, res, next) => {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Check if token is expired or about to expire (within 5 minutes)
  const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
  if (req.session.tokens.expires_at < fiveMinutesFromNow) {
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
      console.error('Error refreshing token in API middleware:', error);
      return res.status(401).json({ 
        error: 'Session expired',
        message: 'Please log in again'
      });
    }
  }
  
  // Set the access token for the request
  req.accessToken = decryptToken(req.session.tokens.access_token);
  next();
};

// Product search endpoint
router.get('/products', isAuthenticated, ensureValidToken, async (req, res) => {
  try {
    const { term, locationId } = req.query;
    
    if (!term) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    // Build the endpoint with query parameters
    let endpoint = `/products?filter.term=${encodeURIComponent(term)}`;
    
    // Add location ID if provided
    if (locationId) {
      endpoint += `&filter.locationId=${encodeURIComponent(locationId)}`;
    }
    
    // Make the API request
    const productsData = await krogerApi.makeAuthenticatedRequest(
      endpoint,
      req.accessToken
    );
    
    res.json(productsData);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      error: 'Failed to search products',
      message: error.response?.data?.message || error.message
    });
  }
});

// Location search endpoint
router.get('/locations', isAuthenticated, ensureValidToken, async (req, res) => {
  try {
    const { zipCode, radius } = req.query;
    
    if (!zipCode) {
      return res.status(400).json({ error: 'ZIP code is required' });
    }
    
    // Build the endpoint with query parameters
    let endpoint = `/locations?filter.zipCode.near=${encodeURIComponent(zipCode)}`;
    
    // Add radius if provided
    if (radius) {
      endpoint += `&filter.radiusInMiles=${encodeURIComponent(radius)}`;
    }
    
    // Make the API request
    const locationsData = await krogerApi.makeAuthenticatedRequest(
      endpoint,
      req.accessToken
    );
    
    res.json(locationsData);
  } catch (error) {
    console.error('Error searching locations:', error);
    res.status(500).json({
      error: 'Failed to search locations',
      message: error.response?.data?.message || error.message
    });
  }
});

// User profile endpoint
router.get('/profile', isAuthenticated, ensureValidToken, async (req, res) => {
  try {
    // Make the API request to get user profile
    const profileData = await krogerApi.makeAuthenticatedRequest(
      '/identity/profile',
      req.accessToken
    );
    
    res.json(profileData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile',
      message: error.response?.data?.message || error.message
    });
  }
});

module.exports = router;