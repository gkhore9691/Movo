#!/usr/bin/env node

/**
 * push-booking.mjs — Push a single Movo booking to Detailing Street CRM
 *
 * Usage:  node scripts/push-booking.mjs '{"name":"John","email":"j@x.com",...}'
 * Env:    CRM_EMAIL, CRM_PASSWORD in scripts/.env
 *
 * Accepts a JSON argument with these fields:
 *   name, email, phone, carName, carNumber, carColor, carRemark,
 *   date, price, advance, package, remark, address, city, pincode,
 *   pickup, membershipId
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ── Bootstrap ────────────────────────────────────────────────────────────────

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
const EMAIL = process.env.CRM_EMAIL;
const PASSWORD = process.env.CRM_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Missing CRM_EMAIL or CRM_PASSWORD in scripts/.env');
  process.exit(1);
}

// Parse booking data from CLI argument
const rawArg = process.argv[2];
if (!rawArg) {
  console.error('Usage: node push-booking.mjs \'{"name":"...","email":"...","phone":"...",...}\'');
  process.exit(1);
}

let bookingData;
try {
  bookingData = JSON.parse(rawArg);
} catch (err) {
  console.error('Invalid JSON argument:', err.message);
  process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('=== Push Booking to Detailing Street ===');
  console.log(`Customer: ${bookingData.name || 'N/A'}`);
  console.log(`Vehicle: ${bookingData.carNumber || 'N/A'}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    // ── Login ──────────────────────────────────────────────────────────────
    console.log('Logging in...');
    try {
      await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle', timeout: 20000 });
    } catch {
      await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    }

    await page.fill('input[type="email"], input[name="email"], input[placeholder*="mail" i]', EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button:has-text("Sign Me")');
    await page.waitForTimeout(5000);
    console.log(`Logged in. URL: ${page.url()}`);

    // ── Navigate to new booking form ─────────────────────────────────────
    console.log('Navigating to new booking form...');
    try {
      await page.goto(`${CRM_URL}/new_booking`, { waitUntil: 'networkidle', timeout: 20000 });
    } catch {
      await page.goto(`${CRM_URL}/new_booking`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    }
    await page.waitForTimeout(2000);

    // ── Fill the form ────────────────────────────────────────────────────
    console.log('Filling booking form...');

    const fillField = async (selector, value) => {
      if (!value) return;
      try {
        await page.fill(selector, String(value));
      } catch {
        // Try by ID if selector fails
        try {
          await page.evaluate(({ sel, val }) => {
            const el = document.querySelector(sel);
            if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }
          }, { sel: selector, val: String(value) });
        } catch {
          console.warn(`  Could not fill ${selector}`);
        }
      }
    };

    const selectField = async (selector, value) => {
      if (!value) return;
      try {
        await page.selectOption(selector, { label: value });
      } catch {
        try {
          await page.selectOption(selector, { value: value });
        } catch {
          console.warn(`  Could not select ${selector} = ${value}`);
        }
      }
    };

    // Customer info
    await fillField('#cname', bookingData.name);
    await fillField('#cemail', bookingData.email);
    await fillField('#mobileno', bookingData.phone);
    await fillField('#address', bookingData.address);
    await fillField('#city', bookingData.city);
    await fillField('#pincode', bookingData.pincode);

    // Membership
    await fillField('#mid', bookingData.membershipId);

    // Vehicle info
    await fillField('#carName', bookingData.carName);
    await fillField('#carNumber', bookingData.carNumber);
    await fillField('#carColor', bookingData.carColor);
    await fillField('#carRemark', bookingData.carRemark);

    // Booking info
    await fillField('#pickup', bookingData.pickup);
    await fillField('#remark', bookingData.remark);
    await fillField('#price', bookingData.price);
    await fillField('#advReceive', bookingData.advance);

    // Preferred date — DS expects format "YYYY/MM/DD HH:mm"
    if (bookingData.date) {
      const dateStr = formatDateForDS(bookingData.date, bookingData.time);
      await fillField('#prefDate', dateStr);
    }

    // Package (select dropdown)
    if (bookingData.package) {
      await selectField('#package', bookingData.package);
    }

    // State (select dropdown)
    if (bookingData.state) {
      await selectField('#state_id', bookingData.state);
    }

    console.log('Form filled. Submitting...');

    // ── Submit the form ──────────────────────────────────────────────────
    // Look for submit button
    const submitBtn = await page.$('button[type="submit"], button:has-text("Submit"), input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(5000);
      console.log(`Submitted. URL: ${page.url()}`);

      // Try to extract the new booking ID from the response
      const bodyText = await page.textContent('body');
      const bookingIdMatch = bodyText?.match(/DSINMP\w+|DSBK\w+/);
      if (bookingIdMatch) {
        console.log(`DS Booking ID: ${bookingIdMatch[0]}`);
        // Output as JSON for the calling process to parse
        console.log(JSON.stringify({ success: true, dsBookingId: bookingIdMatch[0] }));
      } else {
        // Check for success/error messages
        const alertText = await page.$eval('.alert, .toast, .notification, [role="alert"]', el => el.textContent?.trim()).catch(() => '');
        if (alertText) {
          console.log(`Response: ${alertText}`);
        }
        console.log(JSON.stringify({ success: true, dsBookingId: null, message: alertText || 'Submitted but no booking ID found' }));
      }
    } else {
      console.error('Submit button not found');
      console.log(JSON.stringify({ success: false, error: 'Submit button not found' }));
    }
  } catch (err) {
    console.error('Error:', err.message);
    console.log(JSON.stringify({ success: false, error: err.message }));
  } finally {
    await browser.close();
  }
}

/** Convert Movo date/time to DS prefDate format "YYYY/MM/DD HH:mm" */
function formatDateForDS(date, time) {
  if (!date) return '';
  // date might be "2026-09-21" or "2026/09/21"
  const d = date.replace(/-/g, '/');
  // time might be "10:00" or "10:00 AM" or undefined
  const t = time || '00:00';
  // Extract HH:mm
  const timeMatch = t.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const mins = timeMatch[2];
    // Handle AM/PM
    if (t.toLowerCase().includes('pm') && hours < 12) hours += 12;
    if (t.toLowerCase().includes('am') && hours === 12) hours = 0;
    return `${d} ${String(hours).padStart(2, '0')}:${mins}`;
  }
  return `${d} 00:00`;
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
