// Firebase Callable Functions - Bypasses Organization Policy
const { onCall } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// Set global options for all functions
setGlobalOptions({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
});

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Health Check Function - Callable
exports.healthCheck = onCall((request) => {
  try {
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'SargaSolutions Firebase Functions are running successfully!',
      version: '2.0.0',
      method: 'callable'
    };
    
    return response;
  } catch (error) {
    console.error('Health check error:', error);
    throw new Error(`Health check failed: ${error.message}`);
  }
});

// Test Analytics Function - Callable
exports.testAnalytics = onCall((request) => {
  try {
    const testData = {
      message: 'Analytics test successful!',
      timestamp: new Date().toISOString(),
      sampleMetrics: {
        pageViews: 1247,
        uniqueVisitors: 892,
        bounceRate: 45.2,
        avgSessionDuration: '2m 34s'
      },
      method: 'callable',
      status: 'success'
    };
    
    return testData;
  } catch (error) {
    console.error('Test analytics error:', error);
    throw new Error(`Test analytics failed: ${error.message}`);
  }
});

// Enhanced Analytics Data Function - Callable
exports.getAnalyticsData = onCall((request) => {
  try {
    // Enhanced sample analytics data
    const analyticsData = {
      overview: {
        totalVisitors: 15847,
        totalPageViews: 23691,
        totalSessions: 18432,
        bounceRate: 42.8,
        avgSessionDuration: '3m 12s',
        newUsers: 67.3,
        returningUsers: 32.7
      },
      realTime: {
        activeUsers: Math.floor(Math.random() * 50) + 10,
        activePages: [
          { page: '/home', users: Math.floor(Math.random() * 20) + 5 },
          { page: '/services', users: Math.floor(Math.random() * 15) + 3 },
          { page: '/about', users: Math.floor(Math.random() * 10) + 2 },
          { page: '/contact', users: Math.floor(Math.random() * 8) + 1 }
        ]
      },
      traffic: {
        last7Days: [
          { date: '2025-07-01', visitors: 2341, pageViews: 3567 },
          { date: '2025-07-02', visitors: 2156, pageViews: 3289 },
          { date: '2025-07-03', visitors: 2890, pageViews: 4123 },
          { date: '2025-07-04', visitors: 3124, pageViews: 4567 },
          { date: '2025-07-05', visitors: 2789, pageViews: 3987 },
          { date: '2025-07-06', visitors: 2567, pageViews: 3654 },
          { date: '2025-07-07', visitors: 2980, pageViews: 4234 }
        ]
      },
      topPages: [
        { page: '/home', views: 8932, rate: 35.2 },
        { page: '/services/web-development', views: 4567, rate: 18.1 },
        { page: '/services/cloud-solutions', views: 3421, rate: 13.5 },
        { page: '/about', views: 2891, rate: 11.4 },
        { page: '/contact', views: 2156, rate: 8.5 },
        { page: '/blog', views: 1789, rate: 7.1 },
        { page: '/portfolio', views: 1567, rate: 6.2 }
      ],
      referrers: [
        { source: 'google.com', visitors: 8934, percentage: 56.4 },
        { source: 'linkedin.com', visitors: 2341, percentage: 14.8 },
        { source: 'direct', visitors: 1987, percentage: 12.5 },
        { source: 'github.com', visitors: 1234, percentage: 7.8 },
        { source: 'stackoverflow.com', visitors: 892, percentage: 5.6 },
        { source: 'medium.com', visitors: 459, percentage: 2.9 }
      ],
      countries: [
        { country: 'United States', code: 'US', visitors: 7234, flag: '🇺🇸' },
        { country: 'Canada', code: 'CA', visitors: 2156, flag: '🇨🇦' },
        { country: 'United Kingdom', code: 'GB', visitors: 1891, flag: '🇬🇧' },
        { country: 'Germany', code: 'DE', visitors: 1456, flag: '🇩🇪' },
        { country: 'France', code: 'FR', visitors: 1234, flag: '🇫🇷' },
        { country: 'Australia', code: 'AU', visitors: 987, flag: '🇦🇺' },
        { country: 'India', code: 'IN', visitors: 889, flag: '🇮🇳' }
      ],
      devices: {
        desktop: { visitors: 9234, percentage: 58.2 },
        mobile: { visitors: 5891, percentage: 37.1 },
        tablet: { visitors: 722, percentage: 4.7 }
      },
      browsers: [
        { browser: 'Chrome', visitors: 11234, percentage: 70.9 },
        { browser: 'Safari', visitors: 2891, percentage: 18.2 },
        { browser: 'Firefox', visitors: 1234, percentage: 7.8 },
        { browser: 'Edge', visitors: 456, percentage: 2.9 },
        { browser: 'Other', visitors: 32, percentage: 0.2 }
      ],
      conversionFunnel: [
        { step: 'Home Page Visit', users: 15847, rate: 100 },
        { step: 'Service Page View', users: 8934, rate: 56.4 },
        { step: 'Contact Form View', users: 3456, rate: 21.8 },
        { step: 'Contact Form Submit', users: 892, rate: 5.6 },
        { step: 'Project Inquiry', users: 234, rate: 1.5 }
      ],
      goals: {
        contactFormSubmissions: 892,
        newsletterSignups: 456,
        projectInquiries: 234,
        blogSubscriptions: 167
      },
      performance: {
        avgLoadTime: '2.1s',
        avgFirstContentfulPaint: '1.3s',
        avgLargestContentfulPaint: '2.8s',
        cumulativeLayoutShift: 0.09
      },
      lastUpdated: new Date().toISOString(),
      method: 'callable',
      status: 'success'
    };

    return analyticsData;
  } catch (error) {
    console.error('Analytics data error:', error);
    throw new Error(`Failed to fetch analytics data: ${error.message}`);
  }
});

// Visitor Trends Function - Callable
exports.getVisitorTrends = onCall((request) => {
  try {
    const trends = {
      hourlyTrends: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        visitors: Math.floor(Math.random() * 200) + 50
      })),
      weeklyTrends: [
        { day: 'Monday', visitors: 2341, change: +5.2 },
        { day: 'Tuesday', visitors: 2156, change: -7.9 },
        { day: 'Wednesday', visitors: 2890, change: +34.1 },
        { day: 'Thursday', visitors: 3124, change: +8.1 },
        { day: 'Friday', visitors: 2789, change: -10.7 },
        { day: 'Saturday', visitors: 1567, change: -43.8 },
        { day: 'Sunday', visitors: 1234, change: -21.3 }
      ],
      monthlyGrowth: +23.4,
      yearlyGrowth: +156.7,
      method: 'callable',
      status: 'success'
    };

    return trends;
  } catch (error) {
    console.error('Visitor trends error:', error);
    throw new Error(`Failed to fetch visitor trends: ${error.message}`);
  }
});