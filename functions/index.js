// Import email functions
require('./email-functions.js');

// Firebase Functions Gen 2 with HTTP endpoints and CORS - WITH STATE SUPPORT
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
      version: '3.0',
      propertyId: GA4_PROPERTY_ID,
      features: ['real-time-analytics', 'ga4-integration', 'caribbean-focus', 'state-level-data'],
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

// Enhanced Analytics Data Function with Real GA4 Data + STATE SUPPORT
exports.getAnalyticsData = onRequest({ invoker: 'public' }, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('🔄 Starting GA4 data retrieval with state support...');

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

    // *** NEW: Get country AND region data for state-level breakdown ***
    console.log('📍 Requesting country and region data from GA4...');
    const [locationResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: '7daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        { name: 'country' },
        { name: 'region' }  // *** NEW: This gives us states/provinces ***
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
      limit: 50, // Increased limit to capture more states
    });

    // Process location data with Caribbean focus and state support
    console.log('🗺️ Processing location data with state support...');
    const locations = locationResponse.rows?.map(row => {
      const country = row.dimensionValues[0].value;
      const region = row.dimensionValues[1].value || null;
      
      // Clean up region data
      const cleanRegion = region && region !== '(not set)' && region !== 'Unknown' ? region : null;
      
      return {
        country: country,
        region: cleanRegion,
        sessions: parseInt(row.metricValues[0].value) || 0,
        users: parseInt(row.metricValues[1].value) || 0,
        isCaribbean: [
          'Jamaica', 'Barbados', 'Trinidad and Tobago', 'Dominican Republic',
          'Puerto Rico', 'Haiti', 'Cuba', 'Bahamas', 'Martinique', 'Guadeloupe',
          'Saint Lucia', 'Grenada', 'Saint Vincent and the Grenadines',
          'Antigua and Barbuda', 'Dominica', 'Saint Kitts and Nevis'
        ].includes(country),
        hasStateData: cleanRegion !== null
      };
    }) || [];

    console.log(`📊 Found ${locations.length} location entries`);
    console.log('🏛️ State-level entries:', locations.filter(l => l.hasStateData).length);
    console.log('🌍 Country-only entries:', locations.filter(l => !l.hasStateData).length);

    // Sort to prioritize Caribbean countries and states
    locations.sort((a, b) => {
      // Caribbean locations first
      if (a.isCaribbean && !b.isCaribbean) return -1;
      if (!a.isCaribbean && b.isCaribbean) return 1;
      
      // Within same region (Caribbean or not), prioritize state data
      if (a.hasStateData && !b.hasStateData) return -1;
      if (!a.hasStateData && b.hasStateData) return 1;
      
      // Finally sort by sessions
      return b.sessions - a.sessions;
    });

    const realTimeUsers = parseInt(realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || '0');
    const totalSessions = parseInt(weeklyResponse.rows?.[0]?.metricValues?.[0]?.value || '0');
    const totalPageViews = parseInt(weeklyResponse.rows?.[0]?.metricValues?.[1]?.value || '0');
    const bounceRate = parseFloat(weeklyResponse.rows?.[0]?.metricValues?.[2]?.value || '0');
    const totalUsers = parseInt(weeklyResponse.rows?.[0]?.metricValues?.[4]?.value || '0');

    // If we have real-time users but no historical data, show estimated data
    const hasRealTimeData = realTimeUsers > 0;
    const hasHistoricalData = totalSessions > 0 || totalUsers > 0;

    // *** IMPROVED: Better fallback for state data ***
    let finalLocations = locations.slice(0, 20); // Show top 20 locations
    
    if (finalLocations.length === 0 && hasRealTimeData) {
      console.log('⚠️ No historical location data, using real-time fallback...');
      finalLocations = [
        { 
          country: 'United States', 
          region: null, // No state data in real-time
          sessions: realTimeUsers, 
          users: realTimeUsers, 
          isCaribbean: false,
          hasStateData: false
        }
      ];
    }

    console.log('✅ Final locations to send:', finalLocations.length);
    finalLocations.forEach((loc, i) => {
      console.log(`${i + 1}. ${loc.country}${loc.region ? ` (${loc.region})` : ''}: ${loc.users} users`);
    });

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      source: 'google-analytics-4',
      propertyId: GA4_PROPERTY_ID,
      realTime: {
        activeUsers: realTimeUsers
      },
      traffic: {
        sessions: hasHistoricalData ? totalSessions : (hasRealTimeData ? realTimeUsers : 0),
        pageViews: hasHistoricalData ? totalPageViews : (hasRealTimeData ? realTimeUsers : 0),
        bounceRate: hasHistoricalData ? Math.round(bounceRate * 100) : (hasRealTimeData ? 50 : 0),
        users: hasHistoricalData ? totalUsers : (hasRealTimeData ? realTimeUsers : 0)
      },
      countries: finalLocations, // *** NEW: Now includes both countries AND states ***
      stateData: {
        totalStates: locations.filter(l => l.hasStateData).length,
        stateBreakdown: locations.filter(l => l.hasStateData).slice(0, 10), // Top 10 states
        countryBreakdown: locations.filter(l => !l.hasStateData).slice(0, 10) // Top 10 countries
      },
      caribbeanMetrics: {
        locations: locations.filter(c => c.isCaribbean),
        totalSessions: locations.filter(c => c.isCaribbean).reduce((sum, c) => sum + c.sessions, 0),
        totalUsers: locations.filter(c => c.isCaribbean).reduce((sum, c) => sum + c.users, 0),
        statesInCaribbean: locations.filter(c => c.isCaribbean && c.hasStateData).length
      },
      dataRange: hasHistoricalData ? '7 days' : 'real-time only',
      message: hasHistoricalData ? 
        `Real GA4 data with ${locations.filter(l => l.hasStateData).length} states retrieved successfully` : 
        'Real-time GA4 data available - state data will appear in 24-48 hours',
      cors: 'enabled'
    };
    
    console.log('✅ Successfully returning GA4 data with state support');
    res.json(result);
    
  } catch (error) {
    console.error('❌ Analytics data error:', error);
    
    // Fallback to sample data if GA4 fails
    const fallbackResult = {
      success: false,
      timestamp: new Date().toISOString(),
      source: 'sample-data-fallback',
      error: error.message,
      message: `GA4 error: ${error.message}. Using sample data with states.`,
      realTime: { activeUsers: Math.floor(Math.random() * 50) + 10 },
      traffic: {
        sessions: 18432,
        pageViews: 23691,
        bounceRate: 43,
        users: 15847
      },
      countries: [
        { country: 'United States', region: 'California', sessions: 2840, users: 2234, isCaribbean: false, hasStateData: true },
        { country: 'United States', region: 'Florida', sessions: 1876, users: 1534, isCaribbean: false, hasStateData: true },
        { country: 'Jamaica', region: null, sessions: 3420, users: 2890, isCaribbean: true, hasStateData: false },
        { country: 'United States', region: 'New York', sessions: 1654, users: 1398, isCaribbean: false, hasStateData: true },
        { country: 'Barbados', region: null, sessions: 1876, users: 1534, isCaribbean: true, hasStateData: false },
        { country: 'Canada', region: 'Ontario', sessions: 987, users: 823, isCaribbean: false, hasStateData: true },
        { country: 'Trinidad and Tobago', region: null, sessions: 1654, users: 1398, isCaribbean: true, hasStateData: false },
      ],
      stateData: {
        totalStates: 4,
        stateBreakdown: [
          { country: 'United States', region: 'California', sessions: 2840, users: 2234 },
          { country: 'United States', region: 'Florida', sessions: 1876, users: 1534 },
          { country: 'United States', region: 'New York', sessions: 1654, users: 1398 },
          { country: 'Canada', region: 'Ontario', sessions: 987, users: 823 }
        ]
      },
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