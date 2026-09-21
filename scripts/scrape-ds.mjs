#!/usr/bin/env node

/**
 * scrape-ds.mjs — Full Detailing Street CRM Scraper
 *
 * Logs into admin.detailingstreet.com and scrapes ALL data tables
 * into JSON files under scripts/downloads/ds-data/.
 *
 * Usage:  node scripts/scrape-ds.mjs
 * Env:    CRM_EMAIL, CRM_PASSWORD in scripts/.env
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ── Bootstrap ────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dependency)
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
const OUT_DIR = path.join(__dirname, 'downloads', 'ds-data');
fs.mkdirSync(OUT_DIR, { recursive: true });

if (!EMAIL || !PASSWORD) {
  console.error('Missing CRM_EMAIL or CRM_PASSWORD in scripts/.env');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a header string to camelCase key */
function toCamelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

/** Wait for a table to load on the page */
async function waitForTable(page, timeout = 10000) {
  try {
    await page.waitForSelector('table tbody tr', { timeout });
  } catch {
    // Table might be empty or not present — that's okay
  }
}

/** Try to set DataTables page length to "All" or maximum */
async function tryShowAll(page) {
  // Many DS pages use DataTables with a _length select
  const selectors = [
    'select[name$="_length"]',
    'select.custom-select',
    '#today_table_length select',
    '.dataTables_length select',
  ];
  for (const sel of selectors) {
    try {
      const select = await page.$(sel);
      if (select) {
        // Try setting to -1 (All) first, then 100
        const options = await select.$$eval('option', opts =>
          opts.map(o => ({ value: o.value, text: o.textContent?.trim() }))
        );
        const allOpt = options.find(o => o.value === '-1' || o.text?.toLowerCase() === 'all');
        const maxOpt = options.reduce((max, o) => {
          const n = parseInt(o.value);
          return n > 0 && n > (parseInt(max?.value) || 0) ? o : max;
        }, options[0]);

        const targetValue = allOpt?.value || maxOpt?.value;
        if (targetValue) {
          await select.selectOption(targetValue);
          await page.waitForTimeout(2000);
          return true;
        }
      }
    } catch {
      // Ignore
    }
  }
  return false;
}

/** Scrape a standard HTML table into an array of objects */
async function scrapeTable(page) {
  await waitForTable(page);

  // Extract headers
  const headers = await page.$$eval('table thead th', ths =>
    ths.map(th => th.textContent?.trim() || '')
  );

  if (headers.length === 0) {
    return { headers: [], rows: [] };
  }

  // Extract all row data
  const rawRows = await page.$$eval('table tbody tr', rows =>
    rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      return cells.map(cell => cell.textContent?.trim() || '');
    })
  );

  // Filter out empty rows and "no data" rows
  const dataRows = rawRows.filter(
    row => row.length > 0 && !row.every(c => !c) && !row.some(c => c.toLowerCase().includes('no data available'))
  );

  // Convert to objects with camelCase keys
  const rows = dataRows.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h && h.toLowerCase() !== 'actions' && h.toLowerCase() !== '#') {
        const key = toCamelCase(h);
        obj[key] = row[i] || '';
      }
    });
    return obj;
  });

  return { headers, rows };
}

/** Handle DataTables pagination — click through all pages */
async function scrapeAllPages(page) {
  const allRows = [];
  let pageNum = 0;

  // First, try to show all records at once
  const showedAll = await tryShowAll(page);
  if (showedAll) {
    const { rows } = await scrapeTable(page);
    return rows;
  }

  // Otherwise paginate
  while (true) {
    pageNum++;
    const { rows } = await scrapeTable(page);
    allRows.push(...rows);

    // Check for DataTables "Next" button
    const nextBtn = await page.$('.dataTables_paginate .next:not(.disabled), .paginate_button.next:not(.disabled)');
    if (!nextBtn) break;

    // Check if next button is actually disabled via class or attribute
    const isDisabled = await nextBtn.evaluate(el =>
      el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true'
    );
    if (isDisabled) break;

    await nextBtn.click();
    await page.waitForTimeout(1500);

    // Safety: don't loop more than 100 pages
    if (pageNum >= 100) {
      console.warn('  Hit 100-page safety limit, stopping pagination');
      break;
    }
  }

  // Deduplicate by JSON stringification
  const seen = new Set();
  return allRows.filter(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Save data to JSON and return count */
function saveJson(filename, data) {
  const filePath = path.join(OUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return data.length;
}

// ── Page Scrapers ────────────────────────────────────────────────────────────

async function scrapeBookings(page) {
  console.log('\n--- Scraping Bookings (/bookings) ---');
  await page.goto(`${CRM_URL}/bookings`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
    page.goto(`${CRM_URL}/bookings`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  );
  await page.waitForTimeout(3000);

  const rows = await scrapeAllPages(page);
  console.log(`  Found ${rows.length} bookings`);

  // Normalize field names for bookings
  const bookings = rows.map(row => ({
    bookingNo: row.bookingNo || row.bookingId || '',
    customerNumber: row.customerNumber || row.customerNo || '',
    carBikeNumber: row.carBikeNumber || row.carbikeNumber || row.vehicleNo || '',
    serviceRemarks: row.serviceRemarks || row.remarks || '',
    branch: row.branch || '',
    preferredDateTime: row.preferredDateTime || row.preferreddateTime || row.preferredDate || '',
  }));

  const count = saveJson('bookings.json', bookings);
  return count;
}

async function scrapeQueries(page) {
  console.log('\n--- Scraping Queries (/queryList) ---');
  await page.goto(`${CRM_URL}/queryList`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
    page.goto(`${CRM_URL}/queryList`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  );
  await page.waitForTimeout(3000);

  const rows = await scrapeAllPages(page);
  console.log(`  Found ${rows.length} queries`);

  const queries = rows.map(row => ({
    priority: row.priority || '',
    clientName: row.clientName || row.clientname || '',
    email: row.email || '',
    mobileNo: row.mobileNo || row.mobileNumber || '',
    user: row.user || '',
    workshop: row.workshop || '',
    status: row.status || '',
  }));

  const count = saveJson('queries.json', queries);
  return count;
}

async function scrapeFollowups(page) {
  console.log('\n--- Scraping Follow Ups (/followup) ---');
  await page.goto(`${CRM_URL}/followup`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
    page.goto(`${CRM_URL}/followup`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  );
  await page.waitForTimeout(3000);

  const rows = await scrapeAllPages(page);
  console.log(`  Found ${rows.length} follow-ups`);

  // Follow-up fields may vary; capture whatever the table has
  const count = saveJson('followups.json', rows);
  return count;
}

async function scrapeInvoices(page) {
  console.log('\n--- Scraping Invoices (/invoice_list) ---');
  await page.goto(`${CRM_URL}/invoice_list`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
    page.goto(`${CRM_URL}/invoice_list`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  );
  await page.waitForTimeout(3000);

  const rows = await scrapeAllPages(page);
  console.log(`  Found ${rows.length} invoices`);

  const invoices = rows.map(row => ({
    invoice: row.invoice || row.invoiceNo || '',
    customer: row.customer || '',
    bookingId: row.bookingId || row.bookingid || '',
    name: row.name || '',
    payDate: row.payDate || row.paydate || '',
    email: row.email || '',
  }));

  // Also try to extract download/detail links for each invoice row
  try {
    const links = await page.$$eval('table tbody tr', rows =>
      rows.map(row => {
        const anchors = Array.from(row.querySelectorAll('a[href]'));
        const downloadLink = anchors.find(a =>
          a.href.includes('pdf') || a.href.includes('download') || a.href.includes('invoice/')
        );
        const invoiceId = row.querySelector('td')?.textContent?.trim() || '';
        return { invoiceId, detailLink: downloadLink?.href || '' };
      })
    );
    // Merge detail links into invoices
    invoices.forEach((inv, i) => {
      if (links[i]?.detailLink) {
        inv.detailLink = links[i].detailLink;
      }
    });
  } catch {
    // Non-critical; skip link extraction
  }

  const count = saveJson('invoices.json', invoices);
  return count;
}

async function scrapeMaintenance(page) {
  console.log('\n--- Scraping Maintenance History (/maintenance_history) ---');
  await page.goto(`${CRM_URL}/maintenance_history`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
    page.goto(`${CRM_URL}/maintenance_history`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  );
  await page.waitForTimeout(3000);

  const rows = await scrapeAllPages(page);
  console.log(`  Found ${rows.length} maintenance records`);

  const count = saveJson('maintenance.json', rows);
  return count;
}

async function scrapeWarranty(page) {
  console.log('\n--- Scraping Warranty Tracker (/warranty) ---');
  await page.goto(`${CRM_URL}/warranty`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
    page.goto(`${CRM_URL}/warranty`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  );
  await page.waitForTimeout(3000);

  const rows = await scrapeAllPages(page);
  console.log(`  Found ${rows.length} warranty records`);

  const count = saveJson('warranty.json', rows);
  return count;
}

// ── Booking Detail Scraper (optional enrichment) ─────────────────────────────

async function scrapeBookingDetails(page) {
  console.log('\n--- Attempting to scrape booking edit details ---');

  // Go back to bookings page
  await page.goto(`${CRM_URL}/bookings`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
    page.goto(`${CRM_URL}/bookings`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  );
  await page.waitForTimeout(3000);

  // Find edit buttons in the table
  const editButtons = await page.$$('table tbody tr .btn, table tbody tr a[onclick*="edit"], table tbody tr button[onclick*="edit"], table tbody tr a[data-toggle="modal"]');

  if (editButtons.length === 0) {
    console.log('  No edit buttons found; skipping detail scrape');
    return [];
  }

  const details = [];
  const maxDetails = Math.min(editButtons.length, 5); // Scrape first 5 for testing
  console.log(`  Found ${editButtons.length} edit buttons; scraping first ${maxDetails} for detail fields`);

  for (let i = 0; i < maxDetails; i++) {
    try {
      // Re-navigate to bookings (modal may have changed the page)
      if (i > 0) {
        await page.goto(`${CRM_URL}/bookings`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        await tryShowAll(page);
        await page.waitForTimeout(1000);
      }

      const btns = await page.$$('table tbody tr .btn-warning, table tbody tr a[onclick*="edit"], table tbody tr a[title*="Edit" i]');
      if (!btns[i]) break;

      await btns[i].click();
      await page.waitForTimeout(2000);

      // Try to read edit modal form fields
      const formData = await page.evaluate(() => {
        const fields = {};
        const fieldIds = [
          'ecid', 'ecname', 'ecnumber', 'ecemail', 'ecaddress', 'ecity',
          'id_booking', 'ebookid', 'ecarname', 'ecarnumber', 'ecarcolor',
          'epiklocation', 'ebid', 'eprice', 'eadvprice', 'epackage',
          'epredate', 'eremark', 'carremark',
        ];
        for (const fid of fieldIds) {
          const el = document.getElementById(fid);
          if (el) {
            fields[fid] = el.value || el.textContent?.trim() || '';
          }
        }
        return fields;
      });

      if (Object.keys(formData).length > 0) {
        details.push(formData);
      }

      // Close modal if open
      const closeBtn = await page.$('.modal.show .close, .modal.show [data-dismiss="modal"], .modal.show .btn-close');
      if (closeBtn) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (err) {
      console.log(`  Error scraping detail ${i}: ${err.message}`);
    }
  }

  if (details.length > 0) {
    saveJson('booking-details.json', details);
    console.log(`  Saved ${details.length} booking detail records`);
  }
  return details;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('=== Detailing Street CRM Scraper ===');
  console.log(`Output: ${OUT_DIR}`);
  console.log(`Email: ${EMAIL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  // ── Login ──────────────────────────────────────────────────────────────────
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

  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('invoice')) {
    // Check if we're still on the login page (some sites redirect to /invoice for login)
    const hasLoginForm = await page.$('input[type="password"]');
    if (hasLoginForm) {
      console.error('Login may have failed. Current URL:', currentUrl);
      await page.screenshot({ path: path.join(OUT_DIR, 'login-failed.png') });
      await browser.close();
      process.exit(1);
    }
  }
  console.log(`Logged in successfully. URL: ${currentUrl}`);

  // ── Scrape all pages ───────────────────────────────────────────────────────
  const summary = {};

  try {
    summary.bookings = await scrapeBookings(page);
  } catch (err) {
    console.error('Error scraping bookings:', err.message);
    summary.bookings = 0;
  }

  try {
    summary.queries = await scrapeQueries(page);
  } catch (err) {
    console.error('Error scraping queries:', err.message);
    summary.queries = 0;
  }

  try {
    summary.followups = await scrapeFollowups(page);
  } catch (err) {
    console.error('Error scraping follow-ups:', err.message);
    summary.followups = 0;
  }

  try {
    summary.invoices = await scrapeInvoices(page);
  } catch (err) {
    console.error('Error scraping invoices:', err.message);
    summary.invoices = 0;
  }

  try {
    summary.maintenance = await scrapeMaintenance(page);
  } catch (err) {
    console.error('Error scraping maintenance:', err.message);
    summary.maintenance = 0;
  }

  try {
    summary.warranty = await scrapeWarranty(page);
  } catch (err) {
    console.error('Error scraping warranty:', err.message);
    summary.warranty = 0;
  }

  // Optional: scrape booking edit details
  try {
    const details = await scrapeBookingDetails(page);
    summary.bookingDetails = details.length;
  } catch (err) {
    console.error('Error scraping booking details:', err.message);
    summary.bookingDetails = 0;
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log('SCRAPE COMPLETE');
  console.log('='.repeat(50));
  console.log(`  Bookings:           ${summary.bookings}`);
  console.log(`  Queries:            ${summary.queries}`);
  console.log(`  Follow-ups:         ${summary.followups}`);
  console.log(`  Invoices:           ${summary.invoices}`);
  console.log(`  Maintenance:        ${summary.maintenance}`);
  console.log(`  Warranty:           ${summary.warranty}`);
  console.log(`  Booking details:    ${summary.bookingDetails}`);
  console.log(`\nOutput: ${OUT_DIR}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Save summary
  saveJson('_summary.json', { ...summary, scrapedAt: new Date().toISOString() });

  await browser.close();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
