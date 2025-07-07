// Firebase Functions for SargaSolutions Analytics
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin SDK
admin.initializeApp();

// CORS wrapper function
function corsWrapper(handler) {
  return (request, response) => {
    return cors(request, response, () => {
      return handler(request, response);
    });
  };
}

/**
 * Get real-time and historical analytics data
 */
exports.getAnalyticsData = functions.https.onRequest(corsWrapper(async (request, response) => {
  try {
    // Set CORS headers
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Enhanced sample data with more realistic analytics
    const now = new Date();
    const todayVisitors = Math.floor(Math.random() * 30) + 15; // 15-45
    const weekVisitors = Math.floor(Math.random() * 150) + 80; // 80-230
    const monthVisitors = Math.floor(Math.random() * 500) + 300; // 300-800

    const sampleData = {
      today: { 
        users: todayVisitors, 
        sessions: Math.floor(todayVisitors * 1.2), 
        pageviews: Math.floor(todayVisitors * 2.8),
        bounceRate: (Math.random() * 30 + 40).toFixed(1) + '%'
      },
      week: { 
        users: weekVisitors, 
        sessions: Math.floor(weekVisitors * 1.3), 
        pageviews: Math.floor(weekVisitors * 3.2)
      },
      month: { 
        users: monthVisitors, 
        sessions: Math.floor(monthVisitors * 1.4), 
        pageviews: Math.floor(monthVisitors * 3.5)
      },
      totalUsers: Math.floor(Math.random() * 1000) + 1000,
      realTime: {
        activeUsers: Math.floor(Math.random() * 15) + 1,
        topPages: [
          { page: '/', views: Math.floor(Math.random() * 50) + 20 },
          { page: '/about', views: Math.floor(Math.random() * 30) + 10 },
          { page: '/contact', views: Math.floor(Math.random() * 20) + 5 }
        ]
      },
      countries: [
        { name: 'Jamaica', count: 45, lat: 18.1096, lng: -77.2975, flag: '🇯🇲' },
        { name: 'United States', count: 67, lat: 39.8283, lng: -98.5795, flag: '🇺🇸' },
        { name: 'Barbados', count: 32, lat: 13.1939, lng: -59.5432, flag: '🇧🇧' },
        { name: 'Trinidad and Tobago', count: 28, lat: 10.6918, lng: -61.2225, flag: '🇹🇹' },
        { name: 'Canada', count: 34, lat: 56.1304, lng: -106.3468, flag: '🇨🇦' },
        { name: 'Dominican Republic', count: 23, lat: 18.7357, lng: -70.1627, flag: '🇩🇴' },
        { name: 'Puerto Rico', count: 19, lat: 18.2208, lng: -66.5901, flag: '🇵🇷' },
        { name: 'United Kingdom', count: 12, lat: 55.3781, lng: -3.4360, flag: '🇬🇧' },
        { name: 'Bahamas', count: 15, lat: 25.0343, lng: -77.3963, flag: '🇧🇸' },
        { name: 'Saint Lucia', count: 8, lat: 13.9094, lng: -60.9789, flag: '🇱🇨' }
      ]
    };

    response.json({
      success: true,
      data: sampleData,
      note: 'Enhanced sample data - configure Google Analytics API for real data',
      lastUpdated: now.toISOString(),
      serverTime: now.toISOString()
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    response.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data: ' + error.message
    });
  }
}));

/**
 * Test function to verify setup
 */
exports.testAnalytics = functions.https.onRequest(corsWrapper(async (request, response) => {
  try {
    // Set CORS headers
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    response.json({
      success: true,
      message: 'Firebase Functions are working perfectly! 🎉',
      details: {
        cors: 'Fixed ✅',
        functions: 'Deployed ✅',
        analytics: 'Sample data ready ✅',
        nextStep: 'Configure Google Analytics API for real data'
      },
      timestamp: new Date().toISOString(),
      project: 'sargasolutions-webbpage',
      measurementId: 'G-M0Y57J2SWF',
      functionsWorking: true
    });

  } catch (error) {
    console.error('Test failed:', error);
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * Health check endpoint with CORS
 */
exports.healthCheck = functions.https.onRequest(corsWrapper((request, response) => {
  // Set CORS headers
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  response.json({
    status: 'healthy',
    message: 'SargaSolutions Analytics Functions are running smoothly! 🚀',
    cors: 'enabled',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}));

// Additional utility functions for future use

/**
 * Get visitor trends (for future implementation)
 */
exports.getVisitorTrends = functions.https.onRequest(corsWrapper(async (request, response) => {
  try {
    response.set('Access-Control-Allow-Origin', '*');
    
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Sample trend data
    const trends = {
      daily: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        visitors: Math.floor(Math.random() * 50) + 10
      })).reverse(),
      sources: [
        { source: 'Direct', visitors: 45, percentage: 35 },
        { source: 'Google', visitors: 38, percentage: 30 },
        { source: 'Social Media', visitors: 25, percentage: 20 },
        { source: 'Referral', visitors: 19, percentage: 15 }
      ]
    };

    response.json({
      success: true,
      data: trends,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Trends API Error:', error);
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
}));