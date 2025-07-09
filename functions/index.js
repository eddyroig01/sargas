// Complete Firebase Functions with Analytics + Email System
// This is your FIXED index.js file with proper service account configuration

const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const app = initializeApp();

// *** CRITICAL FIX: Specify which service account to use ***
setGlobalOptions({
  region: 'us-central1',
  memory: '512MiB',
  timeoutSeconds: 540,
  serviceAccount: 'firebase-adminsdk-fbsvc@sargasolutions-webbpage.iam.gserviceaccount.com'
});

// Initialize Firestore to use default database
let db;
function getDb() {
  if (!db) {
    db = getFirestore(app);
  }
  return db;
}

// Access secrets using process.env (Firebase automatically injects secrets)
function getResendApiKey() {
  return process.env.RESEND_API_KEY;
}

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

// =============================================================================
// EMAIL SYSTEM FUNCTIONS
// =============================================================================

// Template loading and processing functions
function loadTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, 'Templates', templateName);
    return fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw new Error(`Template ${templateName} not found`);
  }
}

function processTemplate(template, variables) {
  let processedTemplate = template;
  
  // Replace all variables in format {{VARIABLE_NAME}}
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processedTemplate = processedTemplate.replace(regex, variables[key] || '');
  });
  
  // Handle conditional sections (basic Mustache-like syntax)
  // {{#VARIABLE}} content {{/VARIABLE}}
  Object.keys(variables).forEach(key => {
    const showSectionRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{/${key}}}`, 'g');
    if (variables[key]) {
      processedTemplate = processedTemplate.replace(showSectionRegex, '$1');
    } else {
      processedTemplate = processedTemplate.replace(showSectionRegex, '');
    }
  });
  
  return processedTemplate;
}

// Rate limiting helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Core email sending function
async function sendEmail(resend, to, subject, htmlContent, fromEmail = 'SARGAS.AI <noreply@sargas.ai>') {
  try {
    console.log(`📧 Sending email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    
    const result = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: htmlContent,
    });
    
    console.log(`✅ Email sent successfully to ${to}:`, result);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// 1. NEWSLETTER WELCOME EMAIL TRIGGER
// =============================================================================
exports.sendWelcomeEmail = onDocumentCreated({
  document: 'newsletter/{docId}',
  secrets: ['RESEND_API_KEY']
}, async (event) => {
  const resend = new Resend(getResendApiKey());
  
  try {
    const snapshot = event.data;
    const subscriberData = snapshot.data();
    
    console.log('🎉 New newsletter subscriber:', subscriberData);
    
    // Load and process welcome template
    const template = loadTemplate('newsletter-welcome.html');
    const variables = {
      EMAIL: subscriberData.email,
      SUBSCRIBER_NAME: subscriberData.name || 'Valued Subscriber',
      SUBSCRIPTION_DATE: new Date().toLocaleDateString(),
    };
    
    const htmlContent = processTemplate(template, variables);
    
    // Send welcome email
    const result = await sendEmail(
      resend,
      subscriberData.email,
      'Welcome to SARGAS.AI - Your Subscription is Active',
      htmlContent
    );
    
    if (result.success) {
      // Update subscriber record with welcome email status
      await snapshot.ref.update({
        welcomeEmailSent: true,
        welcomeEmailSentAt: FieldValue.serverTimestamp(),
        welcomeEmailMessageId: result.messageId
      });
      
      console.log('✅ Welcome email sent and recorded');
    } else {
      console.error('❌ Failed to send welcome email:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error in welcome email trigger:', error);
  }
});

// =============================================================================
// 2. CONTACT FORM CONFIRMATION EMAIL TRIGGER
// =============================================================================
exports.sendContactConfirmation = onDocumentCreated({
  document: 'contacts/{docId}',
  secrets: ['RESEND_API_KEY']
}, async (event) => {
  const resend = new Resend(getResendApiKey());
  
  try {
    const snapshot = event.data;
    const contactData = snapshot.data();
    
    console.log('📞 New contact form submission:', contactData);
    
    // Load and process contact confirmation template
    const template = loadTemplate('contact-confirmation.html');
    const variables = {
      EMAIL: contactData.email,
      NAME: contactData.name || 'Valued Contact',
      INTEREST: contactData.interest || 'General Inquiry',
      MESSAGE: contactData.message || 'No message provided',
      SUBMITTED: new Date().toLocaleDateString(),
    };
    
    const htmlContent = processTemplate(template, variables);
    
    // Send confirmation email
    const result = await sendEmail(
      resend,
      contactData.email,
      'Message Received - SARGAS.AI Contact Confirmation',
      htmlContent
    );
    
    if (result.success) {
      // Update contact record with confirmation email status
      await snapshot.ref.update({
        confirmationEmailSent: true,
        confirmationEmailSentAt: FieldValue.serverTimestamp(),
        confirmationEmailMessageId: result.messageId
      });
      
      console.log('✅ Contact confirmation email sent and recorded');
    } else {
      console.error('❌ Failed to send contact confirmation email:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error in contact confirmation email trigger:', error);
  }
});

// =============================================================================
// 3. UNSUBSCRIBE CONFIRMATION EMAIL FUNCTION
// =============================================================================
exports.sendUnsubscribeConfirmation = onRequest({
  secrets: ['RESEND_API_KEY'],
  invoker: 'public'
}, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  const resend = new Resend(getResendApiKey());
  
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    
    console.log('🚫 Processing unsubscribe confirmation for:', email);
    
    // Load and process unsubscribe confirmation template
    const template = loadTemplate('unsubscribe-confirmation.html');
    const variables = {
      EMAIL: email,
      UNSUBSCRIBE_DATE: new Date().toLocaleDateString(),
    };
    
    const htmlContent = processTemplate(template, variables);
    
    // Send unsubscribe confirmation email
    const result = await sendEmail(
      resend,
      email,
      'Unsubscribed Successfully - SARGAS.AI',
      htmlContent
    );
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Unsubscribe confirmation sent',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send confirmation email' 
      });
    }
    
  } catch (error) {
    console.error('❌ Error in unsubscribe confirmation:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// 4. NEWSLETTER BROADCAST FUNCTION - FIXED WITH SERVICE ACCOUNT
// =============================================================================
exports.sendNewsletterBroadcast = onRequest({
  secrets: ['RESEND_API_KEY'],
  invoker: 'public',
  timeoutSeconds: 540 // 9 minutes for large broadcasts
}, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  const resend = new Resend(getResendApiKey());
  
  try {
    const newsletterData = req.body;
    
    console.log('📡 Starting newsletter broadcast:', newsletterData);
    
    // Validate required fields
    if (!newsletterData.title || !newsletterData.content) {
      res.status(400).json({ 
        success: false, 
        error: 'Title and content are required' 
      });
      return;
    }
    
    // *** CRITICAL: This should now work with the firebase-adminsdk service account ***
    console.log('🔐 Using firebase-adminsdk service account for Firestore access');
    
    // Get all newsletter subscribers (we'll filter manually for better reliability)
    const subscribersSnapshot = await getDb().collection('newsletter').get();
    
    const subscribers = [];
    subscribersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email) {
        // Include subscriber if:
        // 1. No unsubscribed field exists (default to active)
        // 2. unsubscribed field exists and is false
        // 3. Exclude only if unsubscribed is explicitly true
        const isUnsubscribed = data.unsubscribed === true;
        
        if (!isUnsubscribed) {
          subscribers.push({
            id: doc.id,
            email: data.email,
            name: data.name || 'Valued Subscriber',
            unsubscribed: data.unsubscribed || false
          });
        }
      }
    });
    
    console.log(`👥 Found ${subscribers.length} active subscribers`);
    
    if (subscribers.length === 0) {
      res.json({
        success: true,
        message: 'No active subscribers found',
        sent: 0,
        errors: 0
      });
      return;
    }
    
    // Load and prepare newsletter template
    const template = loadTemplate('newsletter-broadcast.html');
    
    let sentCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Send to each subscriber with rate limiting
    for (const subscriber of subscribers) {
      try {
        // Prepare personalized variables for this subscriber
        const variables = {
          EMAIL: subscriber.email,
          SUBSCRIBER_NAME: subscriber.name,
          NEWSLETTER_BADGE: newsletterData.badge || '◆ NEWSLETTER UPDATE ◆',
          NEWSLETTER_TITLE: newsletterData.title,
          NEWSLETTER_SUBTITLE: newsletterData.subtitle || '',
          NEWSLETTER_CONTENT: newsletterData.content,
          FEATURED_TITLE: newsletterData.featuredTitle || '',
          FEATURED_CONTENT: newsletterData.featuredContent || '',
          CTA_TEXT: newsletterData.ctaText || '',
          CTA_LINK: newsletterData.ctaLink || 'https://sargas.ai',
          SHOW_QUICK_UPDATES: newsletterData.showQuickUpdates === 'true' ? true : false,
          TECH_UPDATE: newsletterData.techUpdate || '',
          OPERATIONS_UPDATE: newsletterData.operationsUpdate || '',
          PARTNERSHIPS_UPDATE: newsletterData.partnershipsUpdate || ''
        };
        
        // Process template with subscriber-specific variables
        const personalizedContent = processTemplate(template, variables);
        
        // Send email to this subscriber
        const result = await sendEmail(
          resend,
          subscriber.email,
          `${newsletterData.title} - SARGAS.AI Newsletter`,
          personalizedContent
        );
        
        if (result.success) {
          sentCount++;
          console.log(`✅ Newsletter sent to ${subscriber.email} (${sentCount}/${subscribers.length})`);
        } else {
          errorCount++;
          errors.push({ email: subscriber.email, error: result.error });
          console.error(`❌ Failed to send to ${subscriber.email}:`, result.error);
        }
        
        // Rate limiting: 2-second delay between emails
        if (sentCount + errorCount < subscribers.length) {
          console.log('⏱️ Rate limiting: waiting 2 seconds...');
          await delay(2000);
        }
        
      } catch (error) {
        errorCount++;
        errors.push({ email: subscriber.email, error: error.message });
        console.error(`❌ Error sending to ${subscriber.email}:`, error);
      }
    }
    
    // Log broadcast completion to Firestore
    await getDb().collection('newsletter_broadcasts').add({
      title: newsletterData.title,
      subtitle: newsletterData.subtitle,
      sentAt: FieldValue.serverTimestamp(),
      recipientCount: subscribers.length,
      sentCount: sentCount,
      errorCount: errorCount,
      errors: errors.slice(0, 10) // Store first 10 errors for debugging
    });
    
    console.log(`📊 Broadcast complete: ${sentCount} sent, ${errorCount} errors`);
    
    res.json({
      success: true,
      message: `Newsletter broadcast completed`,
      sent: sentCount,
      errors: errorCount,
      totalSubscribers: subscribers.length,
      details: errorCount > 0 ? `${errorCount} emails failed to send` : 'All emails sent successfully'
    });
    
  } catch (error) {
    console.error('❌ Error in newsletter broadcast:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Newsletter broadcast failed'
    });
  }
});

// =============================================================================
// REST OF YOUR EXISTING FUNCTIONS (unchanged)
// =============================================================================

// 5. EMAIL SYSTEM HEALTH CHECK
exports.emailHealthCheck = onRequest({
  secrets: ['RESEND_API_KEY'],
  invoker: 'public'
}, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const resend = new Resend(getResendApiKey());
    
    // Test Resend connection
    const testResult = await resend.emails.send({
      from: 'SARGAS.AI <noreply@sargas.ai>',
      to: ['test@resend.dev'], // Resend test email
      subject: 'SARGAS.AI Email System Health Check',
      html: '<p>Email system is operational</p>',
    });
    
    // Check template availability
    const templates = ['newsletter-welcome.html', 'contact-confirmation.html', 'unsubscribe-confirmation.html', 'newsletter-broadcast.html'];
    const templateStatus = {};
    
    templates.forEach(template => {
      try {
        loadTemplate(template);
        templateStatus[template] = 'OK';
      } catch (error) {
        templateStatus[template] = 'ERROR';
      }
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      resendStatus: testResult.data ? 'OK' : 'ERROR',
      templates: templateStatus,
      databaseStatus: 'SKIPPED - Testing in other functions',
      rateLimiting: 'Enabled (2 seconds)',
      serviceAccount: 'firebase-adminsdk-fbsvc@sargasolutions-webbpage.iam.gserviceaccount.com',
      message: 'Email system is operational'
    });
    
  } catch (error) {
    console.error('❌ Email health check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 6. TEMPLATE TESTING FUNCTION (for development)
exports.testEmailTemplate = onRequest({
  secrets: ['RESEND_API_KEY'],
  invoker: 'public'
}, async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  const resend = new Resend(getResendApiKey());
  
  try {
    const { templateName, testEmail, variables } = req.body;
    
    if (!templateName || !testEmail) {
      res.status(400).json({ error: 'templateName and testEmail are required' });
      return;
    }
    
    // Load template
    const template = loadTemplate(templateName);
    
    // Default test variables
    const testVariables = {
      EMAIL: testEmail,
      NAME: 'Test User',
      SUBSCRIBER_NAME: 'Test Subscriber',
      NEWSLETTER_TITLE: 'Test Newsletter',
      NEWSLETTER_SUBTITLE: 'This is a test newsletter',
      NEWSLETTER_CONTENT: 'This is test content for the newsletter.',
      UNSUBSCRIBE_DATE: new Date().toLocaleDateString(),
      SUBMITTED: new Date().toLocaleDateString(),
      INTEREST: 'Technology',
      MESSAGE: 'This is a test message',
      ...variables // Override with provided variables
    };
    
    // Process template
    const htmlContent = processTemplate(template, testVariables);
    
    // Send test email
    const result = await sendEmail(
      resend,
      testEmail,
      `Test Email - ${templateName}`,
      htmlContent
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: `Test email sent to ${testEmail}`,
        templateName: templateName,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error in template testing:', error);
    res.status(500).json({ error: error.message });
  }
});

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
      message: 'Firebase Functions with GA4 integration and Email system operational',
      version: '4.0',
      propertyId: GA4_PROPERTY_ID,
      features: ['real-time-analytics', 'ga4-integration', 'caribbean-focus', 'state-level-data', 'resend-email-system'],
      serviceAccount: 'firebase-adminsdk-fbsvc@sargasolutions-webbpage.iam.gserviceaccount.com',
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
      serviceAccount: 'firebase-adminsdk-fbsvc@sargasolutions-webbpage.iam.gserviceaccount.com',
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
      serviceAccount: 'firebase-adminsdk-fbsvc@sargasolutions-webbpage.iam.gserviceaccount.com',
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
      serviceAccount: 'firebase-adminsdk-fbsvc@sargasolutions-webbpage.iam.gserviceaccount.com',
      cors: 'enabled'
    };
    
    res.json(result);
  } catch (error) {
    console.error('Visitor trends error:', error);
    res.status(500).json({ error: `Failed to get visitor trends: ${error.message}` });
  }
});