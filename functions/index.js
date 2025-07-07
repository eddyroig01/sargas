// Firebase Functions Gen 2 with HTTP endpoints and CORS - ACTUALLY WORKING
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

// Set global options for all functions
setGlobalOptions({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
});

// Initialize Google Analytics Data API client
const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: './service-account-key.json',
});

// Your GA4 Property ID
const GA4_PROPERTY_ID = '495789768';

// CORS helper function
function setCORSHeaders(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
}

// Health Check Function
exports.healthCheck = onRequest({ invoker: 'public' }, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const result = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'Firebase Functions with GA4 integration operational',
      version: '2.0',
      propertyId: GA4_PROPERTY_ID,
      features: ['real-time-analytics', 'ga4-integration', 'caribbean-focus'],
      cors: 'enabled'
    };
    
    res.json(result);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: `Health check failed: ${error.message}` });
  }
});

// Test Analytics Connection Function
exports.testAnalytics = onRequest({ invoker: 'public' }, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Test GA4 connection with a simple request
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: 'today',
          endDate: 'today',
        },
      ],
      metrics: [
        { name: 'activeUsers' },
      ],
    });

    const result = {
      success: true,
      message: 'Google Analytics 4 connection successful!',
      timestamp: new Date().toISOString(),
      propertyId: GA4_PROPERTY_ID,
      dataAvailable: response.rows?.length > 0,
      activeUsers: response.rows?.[0]?.metricValues?.[0]?.value || '0',
      testConnection: 'PASSED',
      cors: 'enabled'
    };
    
    res.json(result);
  } catch (error) {
    console.error('Analytics test error:', error);
    res.json({
      success: false,
      message: `GA4 connection failed: ${error.message}`,
      timestamp: new Date().toISOString(),
      error: error.code || 'UNKNOWN_ERROR',
      testConnection: 'FAILED',
      cors: 'enabled'
    });
  }
});

// Enhanced Analytics Data Function with Real GA4 Data
exports.getAnalyticsData = onRequest({ invoker: 'public' }, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Get real-time active users
    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      metrics: [
        { name: 'activeUsers' },
      ],
    });

    // Get 7-day analytics data
    const [weeklyResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: '7daysAgo',
          endDate: 'today',
        },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'totalUsers' },
      ],
    });

    // Get country data with Caribbean focus
    const [countryResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: '7daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        { name: 'country' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
      ],
      orderBys: [
        {
          metric: { metricName: 'sessions' },
          desc: true,
        },
      ],
      limit: 20,
    });

    // Process country data with Caribbean focus
    const countries = countryResponse.rows?.map(row => ({
      country: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value) || 0,
      users: parseInt(row.metricValues[1].value) || 0,
      isCaribbean: [
        'Jamaica', 'Barbados', 'Trinidad and Tobago', 'Dominican Republic',
        'Puerto Rico', 'Haiti', 'Cuba', 'Bahamas', 'Martinique', 'Guadeloupe',
        'Saint Lucia', 'Grenada', 'Saint Vincent and the Grenadines',
        'Antigua and Barbuda', 'Dominica', 'Saint Kitts and Nevis'
      ].includes(row.dimensionValues[0].value)
    })) || [];

    // Sort to prioritize Caribbean countries
    countries.sort((a, b) => {
      if (a.isCaribbean && !b.isCaribbean) return -1;
      if (!a.isCaribbean && b.isCaribbean) return 1;
      return b.sessions - a.sessions;
    });

    const realTimeUsers = parseInt(realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || '0');
    const totalSessions = parseInt(weeklyResponse.rows?.[0]?.metricValues?.[0]?.value || '0');
    const totalPageViews = parseInt(weeklyResponse.rows?.[0]?.metricValues?.[1]?.value || '0');
    const bounceRate = parseFloat(weeklyResponse.rows?.[0]?.metricValues?.[2]?.value || '0');
    const totalUsers = parseInt(weeklyResponse.rows?.[0]?.metricValues?.[4]?.value || '0');

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      source: 'google-analytics-4',
      propertyId: GA4_PROPERTY_ID,
      realTime: {
        activeUsers: realTimeUsers
      },
      traffic: {
        sessions: totalSessions,
        pageViews: totalPageViews,
        bounceRate: Math.round(bounceRate * 100),
        users: totalUsers
      },
      countries: countries.slice(0, 15),
      caribbeanMetrics: {
        countries: countries.filter(c => c.isCaribbean),
        totalSessions: countries.filter(c => c.isCaribbean).reduce((sum, c) => sum + c.sessions, 0),
        totalUsers: countries.filter(c => c.isCaribbean).reduce((sum, c) => sum + c.users, 0)
      },
      dataRange: '7 days',
      message: 'Real Google Analytics 4 data retrieved successfully',
      cors: 'enabled'
    };
    
    res.json(result);
  } catch (error) {
    console.error('Analytics data error:', error);
    
    // Fallback to sample data if GA4 fails
    const fallbackResult = {
      success: false,
      timestamp: new Date().toISOString(),
      source: 'sample-data-fallback',
      error: error.message,
      message: `GA4 error: ${error.message}. Using sample data.`,
      realTime: { activeUsers: Math.floor(Math.random() * 50) + 10 },
      traffic: {
        sessions: 18432,
        pageViews: 23691,
        bounceRate: 43,
        users: 15847
      },
      countries: [
        { country: 'Jamaica', sessions: 3420, users: 2890, isCaribbean: true },
        { country: 'United States', sessions: 8234, users: 6912, isCaribbean: false },
        { country: 'Barbados', sessions: 1876, users: 1534, isCaribbean: true },
        { country: 'Trinidad and Tobago', sessions: 1654, users: 1398, isCaribbean: true },
        { country: 'Canada', sessions: 1243, users: 1087, isCaribbean: false },
      ],
      cors: 'enabled'
    };
    
    res.json(fallbackResult);
  }
});

// Visitor Trends Function with Real GA4 Data
exports.getVisitorTrends = onRequest({ invoker: 'public' }, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Get daily data for the last 30 days
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        { name: 'date' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
      ],
      orderBys: [
        {
          dimension: { dimensionName: 'date' },
          desc: false,
        },
      ],
    });

    const trends = response.rows?.map(row => ({
      date: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value) || 0,
      users: parseInt(row.metricValues[1].value) || 0,
      pageviews: parseInt(row.metricValues[2].value) || 0
    })) || [];

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      source: 'google-analytics-4',
      propertyId: GA4_PROPERTY_ID,
      trends,
      summary: {
        totalDays: trends.length,
        avgSessionsPerDay: trends.reduce((sum, day) => sum + day.sessions, 0) / (trends.length || 1),
        avgUsersPerDay: trends.reduce((sum, day) => sum + day.users, 0) / (trends.length || 1),
        peakDay: trends.reduce((peak, day) => day.sessions > peak.sessions ? day : peak, trends[0] || { sessions: 0 })
      },
      message: 'Real visitor trends data retrieved successfully',
      cors: 'enabled'
    };
    
    res.json(result);
  } catch (error) {
    console.error('Visitor trends error:', error);
    res.status(500).json({ error: `Failed to get visitor trends: ${error.message}` });
  }
});