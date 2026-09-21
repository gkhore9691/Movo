#!/usr/bin/env node

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const cleaned = line.replace(/^export\s+/, '').trim();
    if (!cleaned || cleaned.startsWith('#')) continue;
    const match = cleaned.match(/^(\w+)=["']?(.+?)["']?$/);
    if (match) process.env[match[1]] = match[2];
  }
}

const CRM_URL = 'https://admin.detailingstreet.com';
const OUT = path.join(__dirname, 'downloads', 'ds-pdfs');
fs.mkdirSync(OUT, { recursive: true });

async function run() {
  console.log('=== DS Invoice PDF Downloader ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', process.env.CRM_EMAIL);
  await page.fill('input[type="password"]', process.env.CRM_PASSWORD);
  await page.click('button:has-text("Sign Me")');
  await page.waitForTimeout(3000);
  console.log('Logged in.\n');

  // Read the invoice list from our scraped data
  const invoicesPath = path.join(__dirname, 'downloads', 'ds-data', 'invoices.json');
  if (!fs.existsSync(invoicesPath)) {
    console.error('Run scrape-ds.mjs first to get invoice list');
    process.exit(1);
  }

  const invoices = JSON.parse(fs.readFileSync(invoicesPath, 'utf-8'));
  console.log(`Found ${invoices.length} invoices to download.\n`);

  let downloaded = 0;
  let failed = 0;
  const results = [];

  for (const inv of invoices) {
    const invoiceId = inv.invoice;
    if (!invoiceId || !invoiceId.startsWith('DSIN')) continue;

    const pdfPath = path.join(OUT, `${invoiceId}.pdf`);

    // Skip if already downloaded
    if (fs.existsSync(pdfPath)) {
      downloaded++;
      results.push({ id: invoiceId, name: inv.name, status: 'cached' });
      continue;
    }

    try {
      const pdfUrl = `${CRM_URL}/downloadInvoicePDf/${invoiceId}`;

      // Trigger download
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        page.goto(pdfUrl),
      ]);

      await download.saveAs(pdfPath);
      downloaded++;
      results.push({ id: invoiceId, name: inv.name, bookingId: inv.bookingId, status: 'ok' });

      if (downloaded % 10 === 0) {
        console.log(`  Downloaded ${downloaded}/${invoices.length}...`);
      }
    } catch (err) {
      failed++;
      results.push({ id: invoiceId, name: inv.name, status: 'error', error: err.message });
    }
  }

  // Save manifest
  fs.writeFileSync(path.join(OUT, '_manifest.json'), JSON.stringify(results, null, 2));

  console.log(`\n=== DONE ===`);
  console.log(`  Downloaded: ${downloaded}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Output: ${OUT}/`);

  await browser.close();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
