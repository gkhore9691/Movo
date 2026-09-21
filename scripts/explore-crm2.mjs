#!/usr/bin/env node

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
const OUT = path.join(__dirname, 'downloads');
fs.mkdirSync(OUT, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="mail" i]', process.env.CRM_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', process.env.CRM_PASSWORD);
  await page.click('button:has-text("Sign Me")');
  await page.waitForURL((url) => !url.pathname.includes('login') && !url.pathname.includes('invoice'), { timeout: 15000 }).catch(() => {});
  console.log('Logged in.');

  // 1. Check invoice_list page
  console.log('\n=== Exploring /invoice_list ===');
  await page.goto(`${CRM_URL}/invoice_list`, { waitUntil: 'networkidle' });
  console.log('URL:', page.url());
  await page.screenshot({ path: path.join(OUT, '03-invoice-list.png'), fullPage: true });

  // Get table structure
  const tables = await page.$$eval('table', els => els.map((t, i) => ({
    index: i,
    id: t.id,
    rows: t.rows.length,
    headers: Array.from(t.querySelectorAll('th')).map(th => th.textContent?.trim()),
    firstRowCells: t.rows[1] ? Array.from(t.rows[1].cells).map(c => c.textContent?.trim().slice(0, 50)) : [],
  })));
  console.log('\nTables:');
  tables.forEach(t => {
    console.log(`  Table ${t.index} (id="${t.id}"): ${t.rows} rows`);
    console.log(`    Headers: [${t.headers.join(' | ')}]`);
    if (t.firstRowCells.length) console.log(`    First row: [${t.firstRowCells.join(' | ')}]`);
  });

  // Search for DSINMP
  const bodyText = await page.textContent('body');
  const matches = bodyText?.match(/DSINMP\w+/g);
  if (matches) {
    console.log('\nFound DSINMP IDs:', [...new Set(matches)].slice(0, 10).join(', '));
  }

  // Look for any search/filter
  const inputs = await page.$$eval('input', els => els.map(e => ({
    type: e.type, name: e.name, placeholder: e.placeholder, id: e.id
  })));
  console.log('\nInputs:', inputs.map(i => `${i.id || i.name}(${i.type})`).join(', '));

  // Find all links with invoice-related patterns
  const invoiceLinks = await page.$$eval('a[href]', els => els.filter(e =>
    e.href.includes('invoice') || e.href.includes('receipt') || e.href.includes('pdf') || e.href.includes('download')
  ).map(e => ({ text: e.textContent?.trim().slice(0, 40), href: e.href })));
  console.log('\nInvoice/PDF links:');
  invoiceLinks.forEach(l => console.log(`  "${l.text}" → ${l.href}`));

  // Look for any onclick handlers that might trigger PDF
  const clickElements = await page.$$eval('[onclick]', els => els.map(e => ({
    tag: e.tagName,
    text: e.textContent?.trim().slice(0, 40),
    onclick: e.getAttribute('onclick')?.slice(0, 120),
  })));
  console.log('\nElements with onclick:');
  clickElements.forEach(e => console.log(`  <${e.tag}> "${e.text}" → ${e.onclick}`));

  // 2. Now try the /invoice page with booking ID flow
  console.log('\n=== Testing booking ID search on /invoice ===');
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });

  // Type booking ID and click Next
  console.log('Entering DSINMP00391...');
  await page.fill('#txt_bookingid', 'DSINMP00391');

  // Listen for network requests
  const requests = [];
  page.on('request', req => {
    if (req.url().includes('invoice') || req.url().includes('booking') || req.url().includes('receipt') || req.url().includes('api')) {
      requests.push({ method: req.method(), url: req.url().slice(0, 120) });
    }
  });

  await page.click('#btn_searchbooking');
  await page.waitForTimeout(3000);

  console.log('Network requests after search:');
  requests.forEach(r => console.log(`  ${r.method} ${r.url}`));

  await page.screenshot({ path: path.join(OUT, '04-after-booking-search.png'), fullPage: true });
  console.log('Screenshot: 04-after-booking-search.png');

  // Check if form got populated
  const formValues = await page.evaluate(() => {
    const fields = {};
    document.querySelectorAll('input[id^="pd_"]').forEach(el => {
      if (el.value) fields[el.id] = el.value;
    });
    return fields;
  });
  console.log('\nPopulated form fields:', formValues);

  // Save the HTML
  const detailHtml = await page.content();
  fs.writeFileSync(path.join(OUT, 'after-search.html'), detailHtml);

  await browser.close();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
