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
const OUT = path.join(__dirname, 'downloads', 'ds-invoices');
fs.mkdirSync(OUT, { recursive: true });

async function run() {
  console.log('=== Deep Invoice Scraper ===');
  console.log(`Output: ${OUT}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', process.env.CRM_EMAIL);
  await page.fill('input[type="password"]', process.env.CRM_PASSWORD);
  await page.click('button:has-text("Sign Me")');
  await page.waitForTimeout(3000);
  console.log('Logged in.\n');

  // Go to invoice list
  await page.goto(`${CRM_URL}/invoice_list`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Try to show more records
  try {
    const sel = await page.$('select[name="today_table_length"]');
    if (sel) {
      await sel.selectOption({ value: '100' }).catch(() => {});
      await page.waitForTimeout(2000);
    }
  } catch { /* ignore */ }

  // Get all invoice IDs and basic info from the table
  const invoiceRows = await page.$$eval('table tbody tr', rows =>
    rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 5) return null;
      // Find the PDF/detail link
      const links = Array.from(row.querySelectorAll('a[href]'));
      const pdfLink = links.find(a => a.href.includes('downloadInvoicePDf') || a.href.includes('invoice'));
      return {
        invoiceId: cells[0]?.textContent?.trim() || '',
        customerId: cells[1]?.textContent?.trim() || '',
        bookingId: cells[2]?.textContent?.trim() || '',
        name: cells[3]?.textContent?.trim() || '',
        payDate: cells[4]?.textContent?.trim() || '',
        email: cells[5]?.textContent?.trim() || '',
        pdfUrl: pdfLink?.href || '',
      };
    }).filter(Boolean)
  );

  console.log(`Found ${invoiceRows.length} invoices in the list.\n`);

  // Now scrape each invoice's detail page
  const detailedInvoices = [];
  let scraped = 0;

  for (const inv of invoiceRows) {
    try {
      // The invoice detail/edit page — try to navigate to it
      // DS uses /invoice route with the booking ID to load invoice data
      // The PDF download URL is /downloadInvoicePDf/DSIN0015570
      // Try loading the invoice detail by clicking or navigating

      // First try: navigate to the PDF page (it might show the invoice)
      const invoiceId = inv.invoiceId;
      if (!invoiceId || !invoiceId.startsWith('DSIN')) continue;

      // Navigate to the invoice PDF/print view
      const pdfUrl = `${CRM_URL}/downloadInvoicePDf/${invoiceId}`;
      await page.goto(pdfUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);

      // Extract data from the invoice page
      const pageText = await page.textContent('body') || '';

      // Try to extract structured data
      const invoiceData = await page.evaluate(() => {
        const body = document.body;
        const text = body?.textContent || '';

        // Try to find key fields from the rendered invoice
        const getField = (patterns) => {
          for (const p of patterns) {
            const regex = new RegExp(p + '\\s*:?\\s*([^\\n]+)', 'i');
            const m = text.match(regex);
            if (m) return m[1].trim();
          }
          return '';
        };

        // Try table-based extraction (invoices usually render as tables)
        const tables = document.querySelectorAll('table');
        const lineItems = [];
        let subtotal = '';
        let gst = '';
        let grandTotal = '';

        for (const table of tables) {
          const rows = Array.from(table.querySelectorAll('tr'));
          for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td, th'));
            const cellTexts = cells.map(c => c.textContent?.trim() || '');

            // Look for line items (item, qty, rate, amount)
            if (cellTexts.length >= 4 && /^\d+$/.test(cellTexts[0])) {
              lineItems.push({
                sno: cellTexts[0],
                description: cellTexts[1] || '',
                qty: cellTexts[2] || '',
                rate: cellTexts[3] || '',
                warranty: cellTexts[4] || '',
                amount: cellTexts[5] || cellTexts[cellTexts.length - 1] || '',
              });
            }

            // Look for totals
            const rowText = cellTexts.join(' ').toLowerCase();
            if (rowText.includes('subtotal')) subtotal = cellTexts[cellTexts.length - 1];
            if (rowText.includes('grand total') || rowText.includes('grand  total')) grandTotal = cellTexts[cellTexts.length - 1];
            if (rowText.includes('gst') || rowText.includes('cgst') || rowText.includes('sgst')) {
              if (!gst) gst = cellTexts[cellTexts.length - 1];
            }
          }
        }

        // Extract customer info
        const customerName = getField(['Customer Name', 'Bill To', 'Client Name', 'Name']);
        const customerPhone = getField(['Phone', 'Mobile', 'Contact']);
        const customerEmail = getField(['Email']);
        const customerAddress = getField(['Address']);
        const vehicleNo = getField(['Registration', 'Vehicle No', 'Car No', 'Reg']);
        const vehicleModel = getField(['Vehicle Model', 'Model', 'Car Type']);
        const vehicleColor = getField(['Vehicle Color', 'Color', 'Colour']);
        const paymentMode = getField(['Payment Mode', 'Payment']);
        const invoiceDate = getField(['Invoice Date', 'Date', 'Pay Date']);
        const bookingDate = getField(['Booking Date']);

        return {
          customerName,
          customerPhone,
          customerEmail,
          customerAddress,
          vehicleNo,
          vehicleModel,
          vehicleColor,
          paymentMode,
          invoiceDate,
          bookingDate,
          lineItems,
          subtotal,
          gst,
          grandTotal,
          rawTextSnippet: text.slice(0, 2000),
        };
      });

      const detailed = {
        ...inv,
        pdfUrl,
        detail: invoiceData,
      };

      detailedInvoices.push(detailed);
      scraped++;

      if (scraped % 10 === 0) {
        console.log(`  Scraped ${scraped}/${invoiceRows.length} invoices...`);
      }
    } catch (err) {
      console.log(`  ⚠ Failed on ${inv.invoiceId}: ${err.message}`);
      detailedInvoices.push({ ...inv, detail: null, error: err.message });
    }
  }

  // Save results
  const outPath = path.join(OUT, 'invoices-detailed.json');
  fs.writeFileSync(outPath, JSON.stringify(detailedInvoices, null, 2));
  console.log(`\nSaved ${detailedInvoices.length} invoices to ${outPath}`);

  // Print summary of data quality
  const withAmount = detailedInvoices.filter(i => i.detail?.grandTotal || i.detail?.subtotal);
  const withName = detailedInvoices.filter(i => i.detail?.customerName || i.name);
  const withItems = detailedInvoices.filter(i => i.detail?.lineItems?.length > 0);
  console.log(`\n=== DATA QUALITY ===`);
  console.log(`  With grand total: ${withAmount.length}`);
  console.log(`  With customer name: ${withName.length}`);
  console.log(`  With line items: ${withItems.length}`);

  // Print first 3 detailed invoices as samples
  console.log('\n=== SAMPLE INVOICES ===');
  for (const inv of detailedInvoices.slice(0, 3)) {
    console.log(`\n--- ${inv.invoiceId} (${inv.name}) ---`);
    if (inv.detail) {
      console.log(`  Customer: ${inv.detail.customerName}`);
      console.log(`  Phone: ${inv.detail.customerPhone}`);
      console.log(`  Vehicle: ${inv.detail.vehicleNo} ${inv.detail.vehicleModel}`);
      console.log(`  Payment: ${inv.detail.paymentMode}`);
      console.log(`  Items: ${inv.detail.lineItems?.length || 0}`);
      inv.detail.lineItems?.forEach(item => console.log(`    - ${item.description}: ₹${item.amount}`));
      console.log(`  Subtotal: ${inv.detail.subtotal}`);
      console.log(`  GST: ${inv.detail.gst}`);
      console.log(`  Grand Total: ${inv.detail.grandTotal}`);
    }
  }

  await browser.close();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
