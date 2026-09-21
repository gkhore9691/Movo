#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
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
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const cleaned = line.replace(/^export\s+/, '').trim();
    if (!cleaned || cleaned.startsWith('#')) continue;
    const match = cleaned.match(/^(\w+)=["']?(.+?)["']?$/);
    if (match) process.env[match[1]] = match[2];
  }
}

const CRM_URL = 'https://admin.detailingstreet.com';
const EMAIL = process.env.CRM_EMAIL;
const PASSWORD = process.env.CRM_PASSWORD;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
const AUTH_DIR = path.join(__dirname, 'wa-auth');
fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
fs.mkdirSync(AUTH_DIR, { recursive: true });

// ─── WhatsApp Connection ───

let waSock = null;
let waReady = false;
let waQR = null;

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  function start() {
    waSock = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    waSock.ev.on('creds.update', saveCreds);

    waSock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        waQR = qr;
        waReady = false;
        console.log('\nWhatsApp QR code ready — open http://localhost:3456 to scan');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        waReady = true;
        waQR = null;
        console.log('WhatsApp connected.');
      }

      if (connection === 'close') {
        waReady = false;
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          console.log('WhatsApp logged out. Clearing session...');
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          fs.mkdirSync(AUTH_DIR, { recursive: true });
          await delay(3000);
          const newState = await useMultiFileAuthState(AUTH_DIR);
          Object.assign(state, newState.state);
          start();
        } else {
          console.log(`WhatsApp disconnected (${code}), reconnecting...`);
          await delay(3000);
          start();
        }
      }
    });
  }

  start();
}

// ─── CRM Download ───

async function downloadInvoice(bookingId) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button:has-text("Sign Me")');
  await page.waitForURL(url => url.pathname === '/index', { timeout: 15000 }).catch(() => {});

  if (page.url().includes('login')) {
    await browser.close();
    throw new Error('CRM login failed');
  }

  // Search invoice list
  await page.goto(`${CRM_URL}/invoice_list`, { waitUntil: 'networkidle' });
  await page.selectOption('#epackage', 'c_booking_id');
  await page.waitForTimeout(500);
  await page.fill('#searchTodayIn', bookingId);
  await page.click('#searchTodayBtn');
  await page.waitForTimeout(3000);

  const rows = await page.$$('#today_table tbody tr');
  let matchedRow = null;
  for (const row of rows) {
    const text = await row.textContent();
    if (text?.includes(bookingId)) { matchedRow = row; break; }
  }

  if (!matchedRow) {
    await browser.close();
    throw new Error(`No invoice found for booking ${bookingId}`);
  }

  const cells = await matchedRow.$$eval('td', tds => tds.map(td => td.textContent?.trim()));
  const invoiceId = cells[0];
  const customerName = cells[3];

  // Get vehicle details
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('#txt_bookingid', bookingId);
  await page.click('#btn_searchbooking');
  await page.waitForTimeout(3000);
  const vehicle = await page.$eval('#pd_tx_model', el => el.value).catch(() => '');
  const regNo = await page.$eval('#pd_tx_rno', el => el.value).catch(() => '');
  const amount = await page.$eval('#pd_tx_amount', el => el.value).catch(() => '');

  // Download PDF
  const response = await context.request.get(`${CRM_URL}/downloadInvoicePDf/${invoiceId}`);
  const body = await response.body();
  const outputPath = path.join(DOWNLOADS_DIR, `${invoiceId}-${bookingId}.pdf`);
  fs.writeFileSync(outputPath, body);
  await browser.close();

  if (body[0] !== 0x25 || body.length < 100) {
    throw new Error('PDF download failed');
  }

  return { path: outputPath, invoiceId, customerName, bookingId, vehicle, regNo, amount, size: body.length };
}

// ─── Send WhatsApp ───

async function sendInvoiceWhatsApp(invoice, phoneNumber) {
  if (!waReady || !waSock) throw new Error('WhatsApp not connected');

  const jid = phoneNumber.replace(/[\s+\-]/g, '') + '@s.whatsapp.net';
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

  const pdfBuffer = fs.readFileSync(invoice.path);

  await waSock.sendMessage(jid, {
    document: pdfBuffer,
    mimetype: 'application/pdf',
    fileName: `Invoice-${invoice.invoiceId}.pdf`,
    caption,
  });
}

// ─── Express Server ───

const app = express();
app.use(cors());
app.use(express.json());

// Status
app.get('/api/status', (req, res) => {
  res.json({ whatsapp: waReady, qr: waQR ? true : false });
});

// QR code as text
app.get('/api/qr', (req, res) => {
  if (!waQR) return res.json({ qr: null, connected: waReady });
  res.json({ qr: waQR, connected: false });
});

// Send invoice
app.post('/api/send', async (req, res) => {
  const { bookingId, phone } = req.body;
  if (!bookingId || !phone) {
    return res.status(400).json({ error: 'bookingId and phone are required' });
  }

  try {
    res.write && res.setHeader('Content-Type', 'application/json');

    console.log(`\n[${new Date().toLocaleTimeString()}] Sending ${bookingId} → ${phone}`);

    console.log('  Downloading invoice...');
    const invoice = await downloadInvoice(bookingId);
    console.log(`  Downloaded: ${invoice.invoiceId} — ${invoice.customerName}`);

    console.log('  Sending via WhatsApp...');
    await sendInvoiceWhatsApp(invoice, phone);
    console.log('  Sent!');

    res.json({
      success: true,
      invoice: {
        id: invoice.invoiceId,
        customer: invoice.customerName,
        vehicle: invoice.vehicle,
        regNo: invoice.regNo,
        amount: invoice.amount,
      },
    });
  } catch (err) {
    console.error('  Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Frontend
app.get('/', (req, res) => {
  res.send(HTML);
});

const PORT = 3456;
app.listen(PORT, async () => {
  console.log(`\nMovo Invoice Sender running at http://localhost:${PORT}\n`);
  await connectWhatsApp();
});

// ─── Frontend HTML ───

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Sender — Detailing Street</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #fafafa;
      color: #111;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      width: 100%;
      max-width: 440px;
      padding: 20px;
    }
    .card {
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      padding: 32px;
    }
    .brand {
      text-align: center;
      margin-bottom: 32px;
    }
    .brand h1 {
      font-size: 18px;
      font-weight: 600;
      color: #111;
    }
    .brand p {
      font-size: 13px;
      color: #888;
      margin-top: 4px;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 24px;
    }
    .status.connected { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .status.disconnected { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .status .dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .status.connected .dot { background: #22c55e; }
    .status.disconnected .dot { background: #ef4444; }
    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #555;
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #d4d4d4;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      color: #111;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus { border-color: #4f46e5; }
    input::placeholder { color: #aaa; }
    .field { margin-bottom: 16px; }
    button {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      margin-top: 8px;
    }
    button.primary {
      background: #4f46e5;
      color: #fff;
    }
    button.primary:hover { background: #4338ca; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .result {
      margin-top: 20px;
      padding: 14px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.6;
      display: none;
    }
    .result.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; display: block; }
    .result.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; display: block; }
    .result.loading { background: #f5f3ff; border: 1px solid #ddd6fe; color: #5b21b6; display: block; }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 11px;
      color: #aaa;
    }
    .qr-section {
      text-align: center;
      padding: 20px 0;
    }
    .qr-section p {
      font-size: 13px;
      color: #666;
      margin-bottom: 12px;
    }
    #qrCanvas {
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 12px;
      background: #fff;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="brand">
        <h1>Detailing Street</h1>
        <p>Invoice Sender</p>
      </div>

      <div id="statusBar" class="status disconnected">
        <span class="dot"></span>
        <span id="statusText">Checking WhatsApp...</span>
      </div>

      <div id="qrSection" class="qr-section" style="display:none">
        <p>Scan with WhatsApp to connect</p>
        <canvas id="qrCanvas"></canvas>
      </div>

      <div id="formSection">
        <div class="field">
          <label for="bookingId">Booking ID</label>
          <input type="text" id="bookingId" placeholder="DSINMP00396" autocomplete="off" spellcheck="false">
        </div>
        <div class="field">
          <label for="phone">Customer Phone</label>
          <input type="text" id="phone" placeholder="917241145947" value="917241145947" autocomplete="off">
        </div>
        <button class="primary" id="sendBtn" onclick="send()">Send Invoice</button>
      </div>

      <div id="result" class="result"></div>
    </div>
    <div class="footer">Powered by Movo</div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  <script>
    const API = '';

    async function checkStatus() {
      try {
        const res = await fetch(API + '/api/status');
        const data = await res.json();
        const bar = document.getElementById('statusBar');
        const text = document.getElementById('statusText');

        if (data.whatsapp) {
          bar.className = 'status connected';
          text.textContent = 'WhatsApp connected';
          document.getElementById('qrSection').style.display = 'none';
          document.getElementById('sendBtn').disabled = false;
        } else if (data.qr) {
          bar.className = 'status disconnected';
          text.textContent = 'Scan QR to connect WhatsApp';
          document.getElementById('sendBtn').disabled = true;
          loadQR();
        } else {
          bar.className = 'status disconnected';
          text.textContent = 'WhatsApp connecting...';
          document.getElementById('sendBtn').disabled = true;
        }
      } catch {
        document.getElementById('statusText').textContent = 'Server not reachable';
      }
    }

    async function loadQR() {
      try {
        const res = await fetch(API + '/api/qr');
        const data = await res.json();
        if (data.qr) {
          document.getElementById('qrSection').style.display = 'block';
          QRCode.toCanvas(document.getElementById('qrCanvas'), data.qr, { width: 260, margin: 2 });
        } else if (data.connected) {
          document.getElementById('qrSection').style.display = 'none';
        }
      } catch {}
    }

    async function send() {
      const bookingId = document.getElementById('bookingId').value.trim();
      const phone = document.getElementById('phone').value.trim().replace(/[\\s+\\-]/g, '');
      const result = document.getElementById('result');
      const btn = document.getElementById('sendBtn');

      if (!bookingId) { document.getElementById('bookingId').focus(); return; }
      if (!phone) { document.getElementById('phone').focus(); return; }

      btn.disabled = true;
      btn.textContent = 'Sending...';
      result.className = 'result loading';
      result.style.display = 'block';
      result.innerHTML = 'Downloading invoice from CRM and sending via WhatsApp...';

      try {
        const res = await fetch(API + '/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, phone }),
        });
        const data = await res.json();

        if (data.success) {
          result.className = 'result success';
          result.innerHTML = [
            '<strong>Sent successfully!</strong>',
            '',
            'Invoice: ' + data.invoice.id,
            'Customer: ' + data.invoice.customer,
            data.invoice.vehicle ? 'Vehicle: ' + data.invoice.vehicle : '',
            data.invoice.amount ? 'Amount: \\u20B9' + Number(data.invoice.amount).toLocaleString('en-IN') : '',
            '',
            'Delivered to +' + phone + ' via WhatsApp',
          ].filter(Boolean).join('<br>');
        } else {
          result.className = 'result error';
          result.innerHTML = '<strong>Failed:</strong> ' + data.error;
        }
      } catch (err) {
        result.className = 'result error';
        result.innerHTML = '<strong>Error:</strong> ' + err.message;
      }

      btn.disabled = false;
      btn.textContent = 'Send Invoice';
    }

    // Enter key to send
    document.getElementById('bookingId').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    document.getElementById('phone').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    // Poll status
    checkStatus();
    setInterval(checkStatus, 5000);
  </script>
</body>
</html>`;
