import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
const app = new Hono()
// Basic Rate Limiting Simulation (Memory-based placeholder)
const rateLimit = new Map();
// Logger Middleware
app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url} - ${new Date().toISOString()}`);
  await next();
});
// API Endpoint for Contact Form
app.post('/api/contact', async (c) => {
  try {
    const body = await c.req.json();
    const { firstName, email, message, locationAtTimeOfInquiry } = body;
    // 2. Malformed JSON / Field Validation
    if (!firstName || !email || !message) {
      return c.json({
        success: false,
        message: 'Validation failed: Missing required fields.'
      }, 400);
    }
    // 1. Enhanced Logging with Lead Context
    console.log('--- NEW INQUIRY RECEIVED ---');
    console.log(`Name: ${firstName}`);
    console.log(`Email: ${email}`);
    console.log(`Lead Origin: ${locationAtTimeOfInquiry || 'Unknown'}`);
    console.log(`Message Preview: ${message.substring(0, 50)}...`);
    console.log('----------------------------');
    // Artificial delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 800));
    return c.json({
      success: true,
      message: `Message received! Erica will get back to you from ${locationAtTimeOfInquiry || 'her current location'} soon.`
    }, 200);
  } catch (error) {
    console.error('Contact API Error:', error);
    return c.json({
      success: false,
      message: 'Failed to process inquiry. Please check your network connection.'
    }, 400);
  }
});
// Serve static assets with caching headers
app.get('/*', serveStatic({
  root: './public',
  onNotFound: (path, c) => {
    // 3. Explicit Content-Type for HTML fallback
    const fallbackResponse = fetch(new Request(`${new URL(c.req.url).origin}/index.html`));
    return fallbackResponse.then(res => {
      const headers = new Headers(res.headers);
      headers.set('Content-Type', 'text/html; charset=utf-8');
      return new Response(res.body, { ...res, headers });
    });
  }
}))
export default app