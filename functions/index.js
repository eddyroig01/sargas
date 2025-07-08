// Firebase Functions Gen 2 with HTTP endpoints and CORS - WITH STATE SUPPORT + EMAIL
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

// ADDED: Email functionality imports
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

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

// Initialize Firebase Admin (ADDED)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Use the SAME database connection pattern as your successful client-side code
const db = admin.firestore();
// Your GA4 Property ID
const GA4_PROPERTY_ID = '495789768';

// Email Secrets (ADDED)
const gmailEmail = defineSecret('GMAIL_EMAIL');
const gmailPassword = defineSecret('GMAIL_PASSWORD');

// CORS helper function
function setCORSHeaders(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
}

// ==================== EMAIL UTILITY FUNCTIONS (ADDED) ====================

async function createEmailTransporter(emailSecret, passwordSecret) {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: emailSecret.value(),
      pass: passwordSecret.value(),
    },
    pool: true,
    maxConnections: 1,
    rateDelta: 2000,
    rateLimit: 1,
  });
}

async function loadEmailTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, 'Templates', templateName);
    console.log(`📄 Loading template from: ${templatePath}`);
    const template = await fs.readFile(templatePath, 'utf8');
    return template;
  } catch (error) {
    console.error(`❌ Template loading error: ${error.message}`);
    throw error;
  }
}

// ==================== YOUR ORIGINAL ANALYTICS FUNCTIONS ====================

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
      features: ['real-time-analytics', 'ga4-integration', 'caribbean-focus', 'state-level-data', 'email-automation'],
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

    // Get country AND region data for state-level breakdown
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
        { name: 'region' }  // This gives us states/provinces
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

    // Better fallback for state data
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
      countries: finalLocations, // Now includes both countries AND states
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

// ==================== EMAIL FUNCTIONS (ADDED) ====================

// 1. AUTO-SEND WELCOME EMAIL ON NEWSLETTER SIGNUP
exports.sendNewsletterWelcome = onDocumentCreated({
  document: 'newsletter/{docId}',
  region: 'us-central1',
  database: 'sargasolutions-db',
  secrets: [gmailEmail, gmailPassword],
}, async (event) => {
  try {
    console.log('📧 Newsletter welcome trigger activated');
    
    const subscriberData = event.data.data();
    const { email, name = 'Subscriber' } = subscriberData;
    
    if (!email) {
      console.error('❌ No email found in subscriber data');
      return;
    }

    console.log(`📧 Sending welcome email to: ${email}`);
    
    const transporter = await createEmailTransporter(gmailEmail, gmailPassword);
    const template = await loadEmailTemplate('newsletter-welcome.html');
    
    const personalizedTemplate = template
      .replace(/{{SUBSCRIBER_NAME}}/g, name)
      .replace(/{{SUBSCRIBER_EMAIL}}/g, email);

    const mailOptions = {
      from: `"SARGAS.AI" <${gmailEmail.value()}>`,
      to: email,
      subject: '🚀 Welcome to SARGAS.AI Newsletter!',
      html: personalizedTemplate,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent successfully to ${email}`);
    
  } catch (error) {
    console.error('❌ Newsletter welcome email error:', error);
  }
});

// 2. AUTO-SEND CONTACT CONFIRMATION
exports.sendContactConfirmation = onDocumentCreated({
  document: 'contacts/{docId}',
  region: 'us-central1',
  database: 'sargasolutions-db',
  secrets: [gmailEmail, gmailPassword],
}, async (event) => {
  try {
    console.log('📧 Contact confirmation trigger activated');
    
    const contactData = event.data.data();
    const { email, name = 'Friend' } = contactData;
    
    if (!email) {
      console.error('❌ No email found in contact data');
      return;
    }

    console.log(`📧 Sending contact confirmation to: ${email}`);
    
    const transporter = await createEmailTransporter(gmailEmail, gmailPassword);
    const template = await loadEmailTemplate('contact-confirmation.html');
    
    const personalizedTemplate = template
      .replace(/{{CONTACT_NAME}}/g, name)
      .replace(/{{CONTACT_EMAIL}}/g, email);

    const mailOptions = {
      from: `"SARGAS.AI" <${gmailEmail.value()}>`,
      to: email,
      subject: '✅ We received your message - SARGAS.AI',
      html: personalizedTemplate,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Contact confirmation sent successfully to ${email}`);
    
  } catch (error) {
    console.error('❌ Contact confirmation email error:', error);
  }
});

// 3. MANUAL NEWSLETTER BROADCAST (Admin Dashboard)
exports.sendNewsletterBroadcast = onRequest({ 
  cors: true,
  invoker: 'public',
  region: 'us-central1',
  secrets: [gmailEmail, gmailPassword],
}, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  if (req.method === 'GET') {
    res.json({ 
      status: 'Newsletter broadcast function is running',
      timestamp: new Date().toISOString(),
      method: 'POST required'
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('📧 Starting newsletter broadcast...');
    
    // Get newsletter data from request
    const { title, subtitle, content, badge, featuredTitle, featuredContent, ctaText, ctaLink } = req.body;
    
    if (!title || !content) {
      res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['title', 'content'] 
      });
      return;
    }

    console.log('📊 Querying for active subscribers...');
    
    // Use the SAME query pattern as your successful client-side writes
    const subscribersSnapshot = await db.collection('newsletter').get();
    
    if (subscribersSnapshot.empty) {
      console.log('❌ No documents found in newsletter collection');
      res.json({ 
        success: false, 
        message: 'No subscribers found in collection',
        sent: 0 
      });
      return;
    }
    
    console.log(`📊 Found ${subscribersSnapshot.size} total documents`);
    
    // Filter for active subscribers
    const activeSubscribers = [];
    subscribersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📋 Subscriber: ${data.email}, unsubscribed: ${data.unsubscribed}`);
      
      if (!data.unsubscribed && data.email) {
        activeSubscribers.push({ id: doc.id, ...data });
      }
    });
    
    console.log(`✅ Found ${activeSubscribers.length} active subscribers`);
    
    if (activeSubscribers.length === 0) {
      res.json({ 
        success: false, 
        message: 'No active subscribers found',
        sent: 0 
      });
      return;
    }

    // Load email template and send emails
    const template = await loadEmailTemplate('newsletter-broadcast.html');
    const transporter = await createEmailTransporter(gmailEmail, gmailPassword);
    
    let successCount = 0;
    let errorCount = 0;
    
    console.log(`📧 Starting to send ${activeSubscribers.length} emails...`);
    
    // Send emails with rate limiting
    for (const subscriber of activeSubscribers) {
      try {
        const personalizedTemplate = template
          .replace(/{{SUBSCRIBER_NAME}}/g, subscriber.name || 'Subscriber')
          .replace(/{{NEWSLETTER_TITLE}}/g, title)
          .replace(/{{NEWSLETTER_SUBTITLE}}/g, subtitle || '')
          .replace(/{{NEWSLETTER_CONTENT}}/g, content)
          .replace(/{{NEWSLETTER_BADGE}}/g, badge || 'Newsletter Update')
          .replace(/{{FEATURED_TITLE}}/g, featuredTitle || '')
          .replace(/{{FEATURED_CONTENT}}/g, featuredContent || '')
          .replace(/{{CTA_TEXT}}/g, ctaText || '')
          .replace(/{{CTA_LINK}}/g, ctaLink || '#');

        const mailOptions = {
          from: `"SARGAS.AI Newsletter" <${gmailEmail.value()}>`,
          to: subscriber.email,
          subject: `📧 ${title} - SARGAS.AI`,
          html: personalizedTemplate,
        };

        await transporter.sendMail(mailOptions);
        successCount++;
        console.log(`✅ Newsletter sent to ${subscriber.email} (${successCount}/${activeSubscribers.length})`);
        
        // Rate limiting: 2 seconds between emails
        if (successCount < activeSubscribers.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (emailError) {
        errorCount++;
        console.error(`❌ Failed to send to ${subscriber.email}:`, emailError.message);
      }
    }

    console.log(`📊 Newsletter broadcast completed: ${successCount} sent, ${errorCount} failed`);
    
    res.json({
      success: true,
      message: 'Newsletter broadcast completed',
      sent: successCount,
      failed: errorCount,
      total: activeSubscribers.length
    });

  } catch (error) {
    console.error('❌ Newsletter broadcast error:', error);
    res.status(500).json({ 
      error: 'Failed to send newsletter broadcast', 
      details: error.message 
    });
  }
});

// 4. EMAIL HEALTH CHECK
exports.emailHealthCheck = onRequest({
  cors: true,
  invoker: 'public',
  region: 'us-central1',
  secrets: [gmailEmail, gmailPassword],
}, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    console.log('🔍 Email health check starting...');
    
    const transporter = await createEmailTransporter(gmailEmail, gmailPassword);
    await transporter.verify();
    
    const templatesPath = path.join(__dirname, 'Templates');
    const templateFiles = await fs.readdir(templatesPath);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      emailSystem: 'gmail-nodemailer',
      templatesPath: templatesPath,
      credentials: {
        email: gmailEmail.value(),
        passwordConfigured: !!gmailPassword.value()
      },
      templates: templateFiles
    });
    
  } catch (error) {
    console.error('❌ Email health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});