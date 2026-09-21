#!/usr/bin/env node

/**
 * Extracts full invoice data from DS by:
 * 1. Going to /invoice page
 * 2. Entering each booking ID into txt_bookingid
 * 3. Triggering the "Next" button which fires the AJAX to load data
 * 4. Reading all populated form fields
 * 5. Also downloading the PDF via context.request.get()
 */

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
const OUT = path.join(__dirname, 'downloads', 'ds-extracted');
const PDF_DIR = path.join(OUT, 'pdfs');
fs.mkdirSync(PDF_DIR, { recursive: true });

async function run() {
  console.log('=== DS Invoice Data Extractor v2 ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', process.env.CRM_EMAIL);
  await page.fill('input[type="password"]', process.env.CRM_PASSWORD);
  await page.click('button:has-text("Sign Me")');
  await page.waitForTimeout(4000);
  console.log('Logged in.\n');

  // Get the invoice list first
  const invoicesFile = path.join(__dirname, 'downloads', 'ds-data', 'invoices.json');
  let invoiceList = [];
  if (fs.existsSync(invoicesFile)) {
    invoiceList = JSON.parse(fs.readFileSync(invoicesFile, 'utf-8'));
  } else {
    console.log('No invoice list found. Run scrape-ds.mjs first.');
    process.exit(1);
  }

  // Get unique booking IDs
  const bookingIds = [...new Set(invoiceList.map(i => i.bookingId).filter(Boolean))];
  console.log(`Found ${bookingIds.length} unique booking IDs to extract.\n`);

  const results = [];
  let success = 0, failed = 0;

  for (let i = 0; i < bookingIds.length; i++) {
    const bookingId = bookingIds[i];

    try {
      // Navigate to the invoice creation page fresh each time
      await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);

      // Fill booking ID
      await page.fill('#txt_bookingid', bookingId);
      await page.waitForTimeout(500);

      // Click "Next" button to trigger the AJAX data load
      const nextBtn = await page.$('button:has-text("Next"), input[value="Next"]');
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(3000); // Wait for AJAX
      } else {
        // Try pressing Enter
        await page.press('#txt_bookingid', 'Enter');
        await page.waitForTimeout(3000);
      }

      // Take a screenshot of the first one for debugging
      if (i === 0) {
        await page.screenshot({ path: path.join(OUT, 'debug-first-invoice.png'), fullPage: true });
      }

      // Extract all form data
      const formData = await page.evaluate(() => {
        const val = (id) => {
          const el = document.getElementById(id);
          if (!el) return '';
          if (el.tagName === 'SELECT') {
            return el.options[el.selectedIndex]?.text || el.value || '';
          }
          return el.value || '';
        };

        const items = [];
        for (let j = 1; j <= 15; j++) {
          const desc = val(`txt_booking_item${j}`);
          const rate = val(`txt_booking_rate${j}`);
          if (!desc && !rate) break;
          items.push({
            description: desc,
            qty: val(`txt_booking_qty${j}`),
            rate: rate,
            warranty: val(`txt_warranty_year${j}`),
            amount: val(`txt_booking_amount${j}`),
            notes: val(`txt_item_notes${j}`),
          });
        }

        return {
          customerName: val('pd_tx_name'),
          customerAddress1: val('pd_tx_addrs1'),
          customerAddress2: val('pd_tx_addrs2'),
          customerPhone: val('pd_tx_phone'),
          customerEmail: val('pd_tx_email'),
          invoiceNumber: val('pd_invoice'),
          customerId: val('pd_cid'),
          bookingId: val('pd_bid'),
          payDate: val('pd_pay_date'),
          companyGst: val('pd_company_gst'),
          invoiceDate: val('pd_tx_date'),
          vehicleName: val('pd_tx_vehicle'),
          vehicleType: val('pd_tx_type'),
          registrationNo: val('pd_tx_rno'),
          vehicleModel: val('pd_tx_model'),
          paymentMode: val('pd_tx_paymenttype'),
          vehicleColor: val('pd_tx_vcolor'),
          customerGst: val('pd_tx_customer_gst'),
          lineItems: items,
          subtotal: val('pd_tx_amount'),
          grandTotal: val('txt_gd_total'),
          cgst: val('txt_cgst_cm'),
          sgst: val('txt_sgst_cm'),
          igst: val('txt_igst_cm'),
        };
      });

      // Also get the matching invoice ID for PDF download
      const matchingInv = invoiceList.find(inv => inv.bookingId === bookingId);
      const invoiceId = matchingInv?.invoice || formData.invoiceNumber;

      // Download PDF
      let pdfStatus = 'skipped';
      if (invoiceId && invoiceId.startsWith('DSIN')) {
        const pdfPath = path.join(PDF_DIR, `${invoiceId}.pdf`);
        if (!fs.existsSync(pdfPath)) {
          try {
            const response = await context.request.get(`${CRM_URL}/downloadInvoicePDf/${invoiceId}`);
            const body = await response.body();
            if (body[0] === 0x25 && body.length > 100) {
              fs.writeFileSync(pdfPath, body);
              pdfStatus = 'ok';
            } else {
              pdfStatus = 'invalid';
            }
          } catch { pdfStatus = 'error'; }
        } else {
          pdfStatus = 'cached';
        }
      }

      const hasData = !!(formData.customerName || formData.grandTotal || formData.lineItems.length);

      results.push({
        bookingId,
        invoiceId,
        name: matchingInv?.name || formData.customerName || '',
        payDate: matchingInv?.payDate || formData.payDate || '',
        detail: formData,
        pdfStatus,
        hasData,
      });

      if (hasData) success++;
      else failed++;

      if ((i + 1) % 5 === 0 || i === bookingIds.length - 1) {
        console.log(`  ${i + 1}/${bookingIds.length} — ${success} with data, ${failed} empty`);
      }
    } catch (err) {
      console.log(`  ⚠ ${bookingId}: ${err.message}`);
      failed++;
      results.push({ bookingId, error: err.message });
    }
  }

  // Save
  fs.writeFileSync(path.join(OUT, 'extracted-data.json'), JSON.stringify(results, null, 2));

  console.log(`\n${'═'.repeat(50)}`);
  console.log('EXTRACTION COMPLETE');
  console.log('═'.repeat(50));
  console.log(`  Total: ${results.length}`);
  console.log(`  With data: ${success}`);
  console.log(`  Empty: ${failed}`);
  console.log(`  PDFs: ${results.filter(r => r.pdfStatus === 'ok' || r.pdfStatus === 'cached').length}`);

  // Print samples
  const samples = results.filter(r => r.hasData).slice(0, 3);
  for (const s of samples) {
    console.log(`\n--- ${s.invoiceId} (${s.name || s.detail?.customerName}) ---`);
    const d = s.detail;
    if (d) {
      console.log(`  Customer: ${d.customerName} | Phone: ${d.customerPhone}`);
      console.log(`  Vehicle: ${d.vehicleName} ${d.registrationNo} (${d.vehicleColor})`);
      console.log(`  Payment: ${d.paymentMode} | Date: ${d.payDate}`);
      console.log(`  Items (${d.lineItems.length}):`);
      d.lineItems.forEach(item => console.log(`    ${item.description}: ${item.qty}x ₹${item.rate} = ₹${item.amount}`));
      console.log(`  Subtotal: ₹${d.subtotal} | GST: ₹${d.cgst}+₹${d.sgst} | Total: ₹${d.grandTotal}`);
    }
  }

  console.log(`\nOutput: ${OUT}/`);
  await browser.close();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
