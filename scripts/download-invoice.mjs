#!/usr/bin/env node

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load .env from scripts/ directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const cleaned = line.replace(/^export\s+/, '').trim();
    if (!cleaned || cleaned.startsWith('#')) continue;
    const match = cleaned.match(/^(\w+)=["']?(.+?)["']?$/);
    if (match) process.env[match[1]] = match[2];
  }
}

const CRM_URL = 'https://admin.detailingstreet.com';
const EMAIL = process.env.CRM_EMAIL;
const PASSWORD = process.env.CRM_PASSWORD;
const BOOKING_ID = process.argv[2];

if (!EMAIL || !PASSWORD) {
  console.error('Missing credentials. Set CRM_EMAIL and CRM_PASSWORD in scripts/.env');
  process.exit(1);
}

if (!BOOKING_ID) {
  console.error('Usage: node scripts/download-invoice.mjs <booking-id>');
  console.error('Example: node scripts/download-invoice.mjs DSINMP00391');
  process.exit(1);
}

const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  // 1. Login
  console.log('Logging in...');
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button:has-text("Sign Me")');
  await page.waitForURL(url => url.pathname === '/index', { timeout: 15000 }).catch(() => {});

  if (page.url().includes('login') || page.url().includes('sign')) {
    console.error('Login failed — check credentials.');
    await browser.close();
    process.exit(1);
  }
  console.log('Logged in.');

  // 2. Go to invoice list and search by booking ID
  console.log(`\nSearching for booking: ${BOOKING_ID}...`);
  await page.goto(`${CRM_URL}/invoice_list`, { waitUntil: 'networkidle' });

  // Select "Booking Id" in the search dropdown
  await page.selectOption('#epackage', 'c_booking_id');
  await page.waitForTimeout(500);

  // Type booking ID and click the server-side search button
  await page.fill('#searchTodayIn', BOOKING_ID);
  await page.click('#searchTodayBtn');
  await page.waitForTimeout(3000);

  // 3. Find matching row in results
  const rows = await page.$$('#today_table tbody tr');
  let matchedRow = null;
  for (const row of rows) {
    const text = await row.textContent();
    if (text?.includes(BOOKING_ID)) {
      matchedRow = row;
      break;
    }
  }

  if (!matchedRow) {
    console.error(`Booking ${BOOKING_ID} not found in invoice list.`);
    await page.screenshot({ path: path.join(DOWNLOADS_DIR, 'debug.png'), fullPage: true });
    console.error('Screenshot saved to downloads/debug.png');
    await browser.close();
    process.exit(1);
  }

  // 4. Extract invoice ID and customer info from the row
  const cells = await matchedRow.$$eval('td', tds => tds.map(td => td.textContent?.trim()));
  const invoiceId = cells[0];
  const customerId = cells[1];
  const customerName = cells[3];
  const payDate = cells[4];

  console.log(`Found: ${invoiceId}`);
  console.log(`  Customer: ${customerName} (${customerId})`);
  console.log(`  Pay Date: ${payDate}`);

  // 5. Download PDF via authenticated request
  const pdfUrl = `${CRM_URL}/downloadInvoicePDf/${invoiceId}`;
  console.log(`Downloading: ${pdfUrl}`);

  const response = await context.request.get(pdfUrl);
  const body = await response.body();
  const outputPath = path.join(DOWNLOADS_DIR, `${invoiceId}-${BOOKING_ID}.pdf`);
  fs.writeFileSync(outputPath, body);

  // Verify it's a PDF
  if (body[0] !== 0x25 || body.length < 100) {
    console.error(`Download failed — response: ${body.toString().slice(0, 200)}`);
    await browser.close();
    process.exit(1);
  }

  console.log(`\nSaved: ${outputPath} (${(body.length / 1024).toFixed(1)} KB)`);

  await browser.close();
  console.log('Done.');
}

run().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
