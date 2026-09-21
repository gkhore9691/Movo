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
const OUT = path.join(__dirname, 'downloads', 'ds-full');
const PDF_DIR = path.join(OUT, 'pdfs');
fs.mkdirSync(PDF_DIR, { recursive: true });

async function run() {
  console.log('=== DS Full Data Extractor ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', process.env.CRM_EMAIL);
  await page.fill('input[type="password"]', process.env.CRM_PASSWORD);
  await page.click('button:has-text("Sign Me")');
  await page.waitForTimeout(4000);
  console.log('Logged in.\n');

  // ─── STEP 1: Get all invoice IDs from the invoice list ───
  console.log('--- Step 1: Scraping invoice list ---');
  await page.goto(`${CRM_URL}/invoice_list`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const invoiceRows = await page.$$eval('#today_table tbody tr, table tbody tr', rows =>
    rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 6) return null;
      return {
        invoiceId: cells[0]?.textContent?.trim() || '',
        customerId: cells[1]?.textContent?.trim() || '',
        bookingId: cells[2]?.textContent?.trim() || '',
        name: cells[3]?.textContent?.trim() || '',
        payDate: cells[4]?.textContent?.trim() || '',
        email: cells[5]?.textContent?.trim() || '',
      };
    }).filter(r => r && r.invoiceId.startsWith('DSIN'))
  );

  console.log(`Found ${invoiceRows.length} invoices.\n`);

  // ─── STEP 2: For each invoice, load the /invoice page with booking ID to get form data ───
  console.log('--- Step 2: Extracting invoice details via form ---');
  const detailedInvoices = [];

  for (let i = 0; i < invoiceRows.length; i++) {
    const inv = invoiceRows[i];
    const bookingId = inv.bookingId;

    try {
      // Navigate to the invoice creation page
      await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);

      // Enter the booking ID to load invoice data
      const bookingInput = await page.$('#txt_bookingid');
      if (bookingInput && bookingId) {
        await bookingInput.fill('');
        await bookingInput.fill(bookingId);
        // Press Enter or Tab to trigger the auto-fill
        await bookingInput.press('Tab');
        await page.waitForTimeout(2000);

        // Now extract all form field values
        const formData = await page.evaluate(() => {
          const val = (id) => {
            const el = document.getElementById(id);
            return el ? (el.value || el.textContent?.trim() || '') : '';
          };

          // Line items (up to 10)
          const items = [];
          for (let j = 1; j <= 10; j++) {
            const desc = val(`txt_booking_item${j}`);
            if (!desc) break;
            items.push({
              description: desc,
              qty: val(`txt_booking_qty${j}`),
              rate: val(`txt_booking_rate${j}`),
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
            branch: val('bid'),
            customerGst: val('pd_tx_customer_gst'),
            lineItems: items,
            subtotal: val('pd_tx_amount'),
            grandTotal: val('txt_gd_total'),
            cgst: val('txt_cgst_cm'),
            sgst: val('txt_sgst_cm'),
            igst: val('txt_igst_cm'),
          };
        });

        detailedInvoices.push({
          ...inv,
          detail: formData,
        });
      } else {
        detailedInvoices.push({ ...inv, detail: null, error: 'No booking ID or input' });
      }

      if ((i + 1) % 10 === 0) {
        console.log(`  Extracted ${i + 1}/${invoiceRows.length}...`);
      }
    } catch (err) {
      console.log(`  ⚠ Failed ${inv.invoiceId}: ${err.message}`);
      detailedInvoices.push({ ...inv, detail: null, error: err.message });
    }
  }

  // ─── STEP 3: Download PDFs using authenticated requests ───
  console.log(`\n--- Step 3: Downloading ${invoiceRows.length} invoice PDFs ---`);
  let pdfOk = 0, pdfFail = 0;

  for (const inv of invoiceRows) {
    const invoiceId = inv.invoiceId;
    const pdfPath = path.join(PDF_DIR, `${invoiceId}.pdf`);

    if (fs.existsSync(pdfPath)) { pdfOk++; continue; }

    try {
      const pdfUrl = `${CRM_URL}/downloadInvoicePDf/${invoiceId}`;
      const response = await context.request.get(pdfUrl);
      const body = await response.body();

      if (body[0] === 0x25 && body.length > 100) {
        fs.writeFileSync(pdfPath, body);
        pdfOk++;
      } else {
        pdfFail++;
      }
    } catch {
      pdfFail++;
    }

    if ((pdfOk + pdfFail) % 20 === 0) {
      console.log(`  PDFs: ${pdfOk} ok, ${pdfFail} failed...`);
    }
  }

  // ─── STEP 4: Get all bookings with edit modal data ───
  console.log(`\n--- Step 4: Scraping booking details ---`);
  await page.goto(`${CRM_URL}/bookings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const bookingRows = await page.$$eval('table tbody tr', rows =>
    rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 5) return null;
      return {
        bookingNo: cells[0]?.textContent?.trim() || '',
        customerNumber: cells[1]?.textContent?.trim() || '',
        carNumber: cells[2]?.textContent?.trim() || '',
        remarks: cells[3]?.textContent?.trim() || '',
        branch: cells[4]?.textContent?.trim() || '',
        dateTime: cells[5]?.textContent?.trim() || '',
      };
    }).filter(r => r && r.bookingNo)
  );

  // ─── Save everything ───
  const output = {
    invoices: detailedInvoices,
    bookings: bookingRows,
    scrapedAt: new Date().toISOString(),
    stats: {
      totalInvoices: detailedInvoices.length,
      invoicesWithDetail: detailedInvoices.filter(i => i.detail?.customerName).length,
      invoicesWithItems: detailedInvoices.filter(i => i.detail?.lineItems?.length > 0).length,
      invoicesWithTotal: detailedInvoices.filter(i => i.detail?.grandTotal).length,
      pdfsDownloaded: pdfOk,
      pdfsFailed: pdfFail,
      bookings: bookingRows.length,
    },
  };

  fs.writeFileSync(path.join(OUT, 'full-data.json'), JSON.stringify(output, null, 2));

  console.log(`\n${'═'.repeat(50)}`);
  console.log('DONE');
  console.log('═'.repeat(50));
  console.log(`  Invoices scraped:     ${output.stats.totalInvoices}`);
  console.log(`  With customer name:   ${output.stats.invoicesWithDetail}`);
  console.log(`  With line items:      ${output.stats.invoicesWithItems}`);
  console.log(`  With grand total:     ${output.stats.invoicesWithTotal}`);
  console.log(`  PDFs downloaded:      ${pdfOk} ok, ${pdfFail} failed`);
  console.log(`  Bookings:             ${output.stats.bookings}`);
  console.log(`  Output: ${OUT}/`);

  // Print sample
  const sample = detailedInvoices.find(i => i.detail?.customerName);
  if (sample) {
    console.log(`\n--- SAMPLE: ${sample.invoiceId} ---`);
    console.log(`  Customer: ${sample.detail.customerName}`);
    console.log(`  Phone: ${sample.detail.customerPhone}`);
    console.log(`  Vehicle: ${sample.detail.vehicleName} ${sample.detail.registrationNo}`);
    console.log(`  Payment: ${sample.detail.paymentMode}`);
    console.log(`  Items: ${sample.detail.lineItems?.length}`);
    sample.detail.lineItems?.forEach(item =>
      console.log(`    - ${item.description}: qty=${item.qty} rate=₹${item.rate} = ₹${item.amount}`)
    );
    console.log(`  Subtotal: ₹${sample.detail.subtotal}`);
    console.log(`  GST: CGST ₹${sample.detail.cgst} SGST ₹${sample.detail.sgst}`);
    console.log(`  Grand Total: ₹${sample.detail.grandTotal}`);
  }

  await browser.close();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
