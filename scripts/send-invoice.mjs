#!/usr/bin/env node

import { chromium } from 'playwright';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, delay, Browsers } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
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
const SEND_TO = (process.argv[3] || '917241145947').replace(/[\s+\-]/g, '');

if (!EMAIL || !PASSWORD) {
  console.error('Missing CRM credentials in scripts/.env');
  process.exit(1);
}

if (!BOOKING_ID) {
  console.error('Usage: node scripts/send-invoice.mjs <booking-id> [phone-number]');
  console.error('Example: node scripts/send-invoice.mjs DSINMP00396 917241145947');
  process.exit(1);
}

const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
const AUTH_DIR = path.join(__dirname, 'wa-auth');
fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
fs.mkdirSync(AUTH_DIR, { recursive: true });

// ─── Step 1: Download invoice from CRM ───

async function downloadInvoice(bookingId) {
  console.log('═══ Step 1: Download invoice from CRM ═══\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button:has-text("Sign Me")');
  await page.waitForURL(url => url.pathname === '/index', { timeout: 15000 }).catch(() => {});

  if (page.url().includes('login') || page.url().includes('sign')) {
    await browser.close();
    throw new Error('CRM login failed');
  }
  console.log('Logged in.');

  // Search invoice list
  console.log(`Searching for booking: ${bookingId}...`);
  await page.goto(`${CRM_URL}/invoice_list`, { waitUntil: 'networkidle' });
  await page.selectOption('#epackage', 'c_booking_id');
  await page.waitForTimeout(500);
  await page.fill('#searchTodayIn', bookingId);
  await page.click('#searchTodayBtn');
  await page.waitForTimeout(3000);

  // Find row
  const rows = await page.$$('#today_table tbody tr');
  let matchedRow = null;
  for (const row of rows) {
    const text = await row.textContent();
    if (text?.includes(bookingId)) {
      matchedRow = row;
      break;
    }
  }

  if (!matchedRow) {
    await browser.close();
    throw new Error(`No invoice found for booking ${bookingId}`);
  }

  const cells = await matchedRow.$$eval('td', tds => tds.map(td => td.textContent?.trim()));
  const invoiceId = cells[0];
  const customerName = cells[3];

  console.log(`Found: ${invoiceId} — ${customerName}`);

  // Get vehicle/amount details from /invoice page
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('#txt_bookingid', bookingId);
  await page.click('#btn_searchbooking');
  await page.waitForTimeout(3000);
  const vehicle = await page.$eval('#pd_tx_model', el => el.value).catch(() => '');
  const regNo = await page.$eval('#pd_tx_rno', el => el.value).catch(() => '');
  const amount = await page.$eval('#pd_tx_amount', el => el.value).catch(() => '');

  if (vehicle) console.log(`  Vehicle: ${vehicle} (${regNo})`);
  if (amount) console.log(`  Amount: ₹${amount}`);

  // Download PDF
  const pdfUrl = `${CRM_URL}/downloadInvoicePDf/${invoiceId}`;
  const response = await context.request.get(pdfUrl);
  const body = await response.body();
  const outputPath = path.join(DOWNLOADS_DIR, `${invoiceId}-${bookingId}.pdf`);
  fs.writeFileSync(outputPath, body);

  if (body[0] !== 0x25 || body.length < 100) {
    await browser.close();
    throw new Error(`Download failed: ${body.toString().slice(0, 200)}`);
  }

  console.log(`Downloaded: ${outputPath} (${(body.length / 1024).toFixed(1)} KB)\n`);
  await browser.close();

  return { path: outputPath, invoiceId, customerName, bookingId, vehicle, regNo, amount };
}

// ─── Step 2: Send via WhatsApp using Baileys ───

async function sendWhatsApp(invoice, phoneNumber) {
  console.log('═══ Step 2: Send invoice via WhatsApp ═══\n');

  const jid = phoneNumber + '@s.whatsapp.net';
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('WhatsApp connection timed out (60s). Run "node scripts/wa-connect.mjs" first.'));
      sock.end();
    }, 60000);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('Scan this QR code with WhatsApp → Linked Devices → Link a Device:\n');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        console.log('WhatsApp connected.\n');

        try {
          // Small delay to ensure connection is stable
          await delay(2000);

          // Read the PDF file
          const pdfBuffer = fs.readFileSync(invoice.path);

          // Send the PDF
          console.log(`Sending invoice ${invoice.invoiceId} to ${phoneNumber}...`);

          const firstName = invoice.customerName.split(' ')[0];
          const caption = [
            `Hi ${firstName},`,
            ``,
            `Thank you for choosing *Detailing Street, Indore*! We truly appreciate your trust in us.`,
            ``,
            `Please find your invoice attached:`,
            ``,
            `Invoice: *${invoice.invoiceId}*`,
            invoice.vehicle ? `Vehicle: *${invoice.vehicle}*` : null,
            invoice.regNo ? `Reg No: *${invoice.regNo}*` : null,
            invoice.amount ? `Amount: *₹${Number(invoice.amount).toLocaleString('en-IN')}*` : null,
            ``,
            `If you have any questions, feel free to reach out. We'd love to see you again!`,
            ``,
            `Warm regards,`,
            `*Detailing Street — Indore*`,
            `detailingstreet.com`,
          ].filter(Boolean).join('\n');

          await sock.sendMessage(jid, {
            document: pdfBuffer,
            mimetype: 'application/pdf',
            fileName: `Invoice-${invoice.invoiceId}.pdf`,
            caption,
          });

          console.log(`\n✓ Invoice sent to +${phoneNumber}`);

          clearTimeout(timeout);
          await delay(2000);
          sock.end();
          resolve();
        } catch (err) {
          clearTimeout(timeout);
          sock.end();
          reject(err);
        }
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        if (reason === DisconnectReason.loggedOut) {
          clearTimeout(timeout);
          reject(new Error('WhatsApp logged out. Delete scripts/wa-auth/ and re-scan QR.'));
        }
      }
    });
  });
}

// ─── Main ───

async function main() {
  console.log(`\nMovo Invoice → WhatsApp\n`);
  console.log(`Booking:  ${BOOKING_ID}`);
  console.log(`Send to:  +${SEND_TO}\n`);

  const invoice = await downloadInvoice(BOOKING_ID);
  await sendWhatsApp(invoice, SEND_TO);

  console.log('\nDone.');
  process.exit(0);
}

main().catch(err => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
