// Firebase Functions Gen 2 for Email Automation with Gmail
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Define secrets for Gmail credentials
const gmailEmail = defineSecret('GMAIL_EMAIL');
const gmailPassword = defineSecret('GMAIL_PASSWORD');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

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

// CORS helper function
function setCORSHeaders(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
}

// Helper function to load email template
function loadEmailTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, '../Templates/', templateName);
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
    
    // Get all active subscribers (not unsubscribed)
    const subscribersSnapshot = await db.collection('newsletter')
      .where('unsubscribed', '!=', true)
      .get();
    
    if (subscribersSnapshot.empty) {
      res.json({ 
        success: false, 
        message: 'No active subscribers found',
        sent: 0 
      });
      return;
    }
    
    console.log(`📊 Found ${subscribersSnapshot.size} active subscribers`);
    
    // Load newsletter template
    const template = loadEmailTemplate('newsletter-broadcast.html');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Send to each subscriber with personalization
    for (const doc of subscribersSnapshot.docs) {
      const subscriber = doc.data();
      
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
        console.log(`✅ Newsletter sent to ${subscriber.email} (${successCount}/${subscribersSnapshot.size})`);
        
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
      totalSubscribers: subscribersSnapshot.size,
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
      templatesPath: path.join(__dirname, '../Templates/'),
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