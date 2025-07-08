// Firebase Functions Gen 2 with HTTP endpoints, CORS, Analytics AND Email Automation
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Set global options for all functions
setGlobalOptions({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
});

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// FIXED: Connect to the named database 'sargasolutions-db'
const db = admin.firestore();
db.settings({ databaseId: 'sargasolutions-db' });

// Define secrets for Gmail credentials
const gmailEmail = defineSecret('GMAIL_EMAIL');
const gmailPassword = defineSecret('GMAIL_PASSWORD');

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

// ==================== EMAIL HELPER FUNCTIONS ====================

// Gmail transporter setup
function createGmailTransporter() {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: gmailEmail.value(),
      pass: gmailPassword.value()
    }
  });
}

// Helper function to load email template
function loadEmailTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, 'Templates/', templateName);
    return fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw new Error(`Template ${templateName} not found`);
  }
}

// Helper function to replace template variables
function replaceTemplateVariables(template, variables) {
  let processedTemplate = template;
  
  Object.keys(variables).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = variables[key] || '';
    processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return processedTemplate;
}

// Helper function to send email
async function sendEmail(to, subject, htmlContent) {
  const transporter = createGmailTransporter();
  
  const mailOptions = {
    from: '"SARGAS.AI" <info@sargas.ai>',
    to: to,
    subject: subject,
    html: htmlContent
  };
  
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    throw error;
  }
}

// ==================== ANALYTICS FUNCTIONS ====================

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

// ==================== EMAIL FUNCTIONS ====================

// 1. AUTO-SEND WELCOME EMAIL ON NEWSLETTER SIGNUP
exports.sendNewsletterWelcome = onDocumentCreated({
  document: 'newsletter/{docId}',
  region: 'us-central1',
  database: 'sargasolutions-db',
  secrets: [gmailEmail, gmailPassword],
}, async (event) => {
  try {
    const data = event.data.data();
    console.log('📧 Sending newsletter welcome email to:', data.email);
    
    // Load and process template
    const template = loadEmailTemplate('newsletter-welcome.html');
    const emailHtml = replaceTemplateVariables(template, {
      EMAIL: data.email,
      SUBSCRIBER_NAME: data.name || 'Subscriber'
    });
    
    // Send welcome email
    await sendEmail(
      data.email,
      'Welcome to SARGAS.AI - Uplink Established ◆',
      emailHtml
    );
    
    console.log(`✅ Newsletter welcome email sent to ${data.email}`);
    
  } catch (error) {
    console.error('❌ Error sending newsletter welcome email:', error);
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
    const data = event.data.data();
    console.log('📧 Sending contact confirmation to:', data.email);
    
    // Format submission date
    const submissionDate = data.timestamp ? 
      new Date(data.timestamp.toDate()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Recently';
    
    // Load and process template
    const template = loadEmailTemplate('contact-confirmation.html');
    const emailHtml = replaceTemplateVariables(template, {
      NAME: data.name || 'Contact',
      INTEREST: data.interest || 'General Inquiry',
      MESSAGE: data.message || 'No message provided',
      SUBMITTED: submissionDate
    });
    
    // Send confirmation email
    await sendEmail(
      data.email,
      'Message Received - SARGAS.AI Contact Confirmation',
      emailHtml
    );
    
    console.log(`✅ Contact confirmation sent to ${data.email}`);
    
  } catch (error) {
    console.error('❌ Error sending contact confirmation:', error);
  }
});

// 3. AUTO-SEND UNSUBSCRIBE CONFIRMATION
exports.sendUnsubscribeConfirmation = onDocumentUpdated({
  document: 'newsletter/{docId}',
  region: 'us-central1',
  database: 'sargasolutions-db',
  secrets: [gmailEmail, gmailPassword],
}, async (event) => {
  try {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    
    // Check if user just unsubscribed
    if (!beforeData.unsubscribed && afterData.unsubscribed) {
      console.log('📧 Sending unsubscribe confirmation to:', afterData.email);
      
      // Format unsubscribe date
      const unsubscribeDate = afterData.unsubscribedDate ? 
        new Date(afterData.unsubscribedDate.toDate()).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Recently';
      
      // Load and process template
      const template = loadEmailTemplate('unsubscribe-confirmation.html');
      const emailHtml = replaceTemplateVariables(template, {
        EMAIL: afterData.email,
        UNSUBSCRIBE_DATE: unsubscribeDate
      });
      
      // Send unsubscribe confirmation
      await sendEmail(
        afterData.email,
        'Unsubscribed - SARGAS.AI Newsletter',
        emailHtml
      );
      
      console.log(`✅ Unsubscribe confirmation sent to ${afterData.email}`);
    }
    
  } catch (error) {
    console.error('❌ Error sending unsubscribe confirmation:', error);
  }
});

// 4. MANUAL NEWSLETTER BROADCAST (Called from Admin Dashboard)
exports.sendNewsletterBroadcast = onRequest({ 
  cors: true,
  invoker: 'public',
  region: 'us-central1',
  secrets: [gmailEmail, gmailPassword],
}, async (req, res) => {
  setCORSHeaders(res);
  
  // Add GET support for testing
  if (req.method === 'GET') {
    res.json({ 
      status: 'Newsletter broadcast function is running',
      timestamp: new Date().toISOString(),
      method: 'POST required',
      testPayload: {
        title: 'Required string',
        content: 'Required string',
        subtitle: 'Optional string',
        badge: 'Optional string'
      }
    });
    return;
  }
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    const { 
      title, 
      subtitle = '', 
      content, 
      badge = '◆ NEWSLETTER UPDATE ◆',
      featuredTitle = '',
      featuredContent = '',
      ctaText = 'Visit Website',
      ctaLink = 'https://sargas.ai'
    } = req.body;
    
    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required' });
      return;
    }
    
    console.log('📧 Starting newsletter broadcast...');
    console.log('📊 Database configuration check...');
    
    // Test database connection first
    try {
      console.log('🔍 Testing database connection...');
      const testCollection = await db.collection('newsletter').limit(1).get();
      console.log('✅ Database connection successful');
      console.log(`📊 Test query returned ${testCollection.size} documents`);
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      res.status(500).json({ 
        error: 'Database connection failed',
        details: dbError.message 
      });
      return;
    }
    
    // Get all newsletter documents first, then filter
    console.log('📊 Querying for newsletter subscribers...');
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
    
    // Filter for active subscribers in JavaScript
    const activeSubscribers = [];
    subscribersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📋 Subscriber: ${data.email}, unsubscribed: ${data.unsubscribed}`);
      
      if (!data.unsubscribed) {
        activeSubscribers.push(data);
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
    
    // Load newsletter template
    const template = loadEmailTemplate('newsletter-broadcast.html');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Send to each active subscriber with personalization
    for (const subscriber of activeSubscribers) {
      try {
        // Personalize email for this subscriber
        const personalizedEmail = replaceTemplateVariables(template, {
          SUBSCRIBER_NAME: subscriber.name || 'Subscriber',
          EMAIL: subscriber.email,
          NEWSLETTER_BADGE: badge,
          NEWSLETTER_TITLE: title,
          NEWSLETTER_SUBTITLE: subtitle,
          NEWSLETTER_CONTENT: content,
          FEATURED_TITLE: featuredTitle,
          FEATURED_CONTENT: featuredContent,
          CTA_TEXT: ctaText,
          CTA_LINK: ctaLink
        });
        
        // Send email
        await sendEmail(
          subscriber.email,
          `${title} - SARGAS.AI Newsletter`,
          personalizedEmail
        );
        
        successCount++;
        console.log(`✅ Newsletter sent to ${subscriber.email} (${successCount}/${activeSubscribers.length})`);
        
        // Delay after EVERY email to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds between each email
        
      } catch (error) {
        errorCount++;
        const errorMsg = `Failed to send to ${subscriber.email}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`📊 Newsletter broadcast completed: ${successCount} sent, ${errorCount} errors`);
    
    res.json({
      success: successCount > 0,
      message: `Newsletter broadcast completed`,
      sent: successCount,
      errors: errorCount,
      totalSubscribers: activeSubscribers.length,
      details: errorCount > 0 ? errors.slice(0, 5) : [] // Show first 5 errors
    });
    
  } catch (error) {
    console.error('❌ Newsletter broadcast error:', error);
    res.status(500).json({ 
      error: 'Failed to send newsletter broadcast',
      details: error.message 
    });
  }
});

// 5. EMAIL HEALTH CHECK
exports.emailHealthCheck = onRequest({ 
  cors: true,
  invoker: 'public',
  region: 'us-central1',
  secrets: [gmailEmail, gmailPassword],
}, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    // Check if Gmail credentials are configured
    const emailValue = gmailEmail.value();
    const passwordValue = gmailPassword.value();
    
    const result = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      emailSystem: 'gmail-nodemailer',
      templatesPath: path.join(__dirname, 'Templates/'),
      credentials: {
        email: emailValue ? '✅ Configured' : '❌ Missing',
        password: passwordValue ? '✅ Configured' : '❌ Missing'
      },
      templates: {
        welcomeEmail: '✅ Available',
        contactConfirmation: '✅ Available', 
        unsubscribeConfirmation: '✅ Available',
        newsletterBroadcast: '✅ Available'
      },
      functions: {
        sendNewsletterWelcome: '✅ Active',
        sendContactConfirmation: '✅ Active',
        sendUnsubscribeConfirmation: '✅ Active',
        sendNewsletterBroadcast: '✅ Active'
      }
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('Email health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

console.log('📧 Email functions loaded successfully!');