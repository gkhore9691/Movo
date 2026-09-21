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
const EMAIL = process.env.CRM_EMAIL;
const PASSWORD = process.env.CRM_PASSWORD;
const OUT = path.join(__dirname, 'downloads', 'site-explore');
fs.mkdirSync(OUT, { recursive: true });

const report = [];
function log(msg) { console.log(msg); report.push(msg); }

async function explorePage(page, name, url) {
  log(`\n${'═'.repeat(60)}`);
  log(`PAGE: ${name}`);
  log(`URL: ${url}`);
  log('═'.repeat(60));

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  }
  await page.waitForTimeout(2000);

  const actualUrl = page.url();
  if (actualUrl !== url) log(`Redirected to: ${actualUrl}`);

  // Screenshot
  const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  await page.screenshot({ path: path.join(OUT, `${safeName}.png`), fullPage: true });
  log(`Screenshot: ${safeName}.png`);

  // Page title
  const title = await page.title();
  log(`Title: ${title}`);

  // Navigation/sidebar links
  const navLinks = await page.$$eval('nav a, .sidebar a, [class*="sidebar"] a, [class*="nav"] a, aside a', els =>
    [...new Set(els.map(e => `${e.textContent?.trim().slice(0, 40)} → ${e.href}`))].slice(0, 30)
  );
  if (navLinks.length) {
    log(`\nNavigation links (${navLinks.length}):`);
    navLinks.forEach(l => log(`  ${l}`));
  }

  // Tables
  const tables = await page.$$eval('table', els => els.map((t, i) => ({
    index: i,
    rows: t.rows.length,
    headers: Array.from(t.querySelectorAll('th')).map(th => th.textContent?.trim()).filter(Boolean),
    sampleRow: t.rows.length > 1 ? Array.from(t.rows[1].cells).map(c => c.textContent?.trim().slice(0, 50)) : [],
  })));
  if (tables.length) {
    log(`\nTables (${tables.length}):`);
    tables.forEach(t => {
      log(`  Table ${t.index}: ${t.rows} rows`);
      if (t.headers.length) log(`    Headers: [${t.headers.join(' | ')}]`);
      if (t.sampleRow.length) log(`    Sample: [${t.sampleRow.join(' | ')}]`);
    });
  }

  // Forms
  const forms = await page.$$eval('form', els => els.map((f, i) => ({
    index: i,
    action: f.action,
    method: f.method,
    inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(inp => ({
      tag: inp.tagName.toLowerCase(),
      type: inp.type || '',
      name: inp.name || '',
      placeholder: inp.placeholder || '',
      id: inp.id || '',
    })),
  })));
  if (forms.length) {
    log(`\nForms (${forms.length}):`);
    forms.forEach(f => {
      log(`  Form ${f.index}: action=${f.action} method=${f.method}`);
      f.inputs.forEach(inp => log(`    <${inp.tag}> type=${inp.type} name="${inp.name}" placeholder="${inp.placeholder}"`));
    });
  }

  // Standalone inputs (outside forms)
  const standaloneInputs = await page.$$eval('input:not(form input), select:not(form select)', els => els.map(e => ({
    tag: e.tagName.toLowerCase(),
    type: e.type || '',
    name: e.name || '',
    placeholder: e.placeholder || '',
    id: e.id || '',
    class: e.className?.slice(0, 60) || '',
  })));
  if (standaloneInputs.length) {
    log(`\nStandalone inputs (${standaloneInputs.length}):`);
    standaloneInputs.forEach(i => log(`  <${i.tag}> type=${i.type} name="${i.name}" placeholder="${i.placeholder}" id=${i.id}`));
  }

  // Buttons
  const buttons = await page.$$eval('button, a.btn, [class*="btn-"], input[type="submit"]', els =>
    els.map(e => ({
      text: e.textContent?.trim().slice(0, 60),
      href: e.getAttribute('href') || '',
      class: e.className?.slice(0, 80) || '',
    })).filter(b => b.text)
  );
  if (buttons.length) {
    log(`\nButtons (${buttons.length}):`);
    buttons.slice(0, 20).forEach(b => log(`  "${b.text}" ${b.href ? '→ ' + b.href : ''}`));
  }

  // Cards/stats
  const cards = await page.$$eval('[class*="card"], [class*="stat"], [class*="widget"], [class*="summary"]', els =>
    els.map(e => e.textContent?.trim().slice(0, 100)).filter(Boolean)
  );
  if (cards.length && cards.length < 20) {
    log(`\nCards/Widgets (${cards.length}):`);
    cards.forEach(c => log(`  ${c.replace(/\s+/g, ' ').slice(0, 100)}`));
  }

  // Data IDs / booking IDs
  const bodyText = await page.textContent('body') || '';
  const dsIds = bodyText.match(/DSINMP\w+/g);
  if (dsIds) {
    const unique = [...new Set(dsIds)].slice(0, 10);
    log(`\nBooking IDs found: ${unique.join(', ')}`);
  }

  return { name, url: actualUrl, tables, forms, buttons, navLinks };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  // Login
  log('Logging in to admin.detailingstreet.com...');
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="mail" i]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.click('button:has-text("Sign Me")');
  await page.waitForTimeout(5000);
  log(`Logged in. Current URL: ${page.url()}`);

  // First, discover all nav links from the current page
  log('\n' + '═'.repeat(60));
  log('DISCOVERING SITE STRUCTURE');
  log('═'.repeat(60));

  const allNavLinks = await page.$$eval('nav a, .sidebar a, [class*="sidebar"] a, [class*="menu"] a, aside a, [class*="nav"] a', els =>
    els.map(e => ({ text: e.textContent?.trim(), href: e.href }))
      .filter(l => l.href && l.text && l.href.startsWith('http') && !l.href.includes('logout'))
  );

  const uniquePages = [...new Map(allNavLinks.map(l => [l.href, l])).values()];
  log(`\nDiscovered ${uniquePages.length} unique navigation links:`);
  uniquePages.forEach(p => log(`  ${p.text} → ${p.href}`));

  // Also check for common CRM paths
  const commonPaths = [
    '/dashboard', '/home', '/',
    '/booking', '/bookings',
    '/invoice', '/invoices',
    '/customer', '/customers',
    '/vehicle', '/vehicles',
    '/service', '/services',
    '/staff', '/employees', '/team',
    '/report', '/reports', '/analytics',
    '/setting', '/settings', '/configuration',
    '/lead', '/leads',
    '/payment', '/payments',
    '/enquiry', '/enquiries',
    '/quotation', '/quotations', '/quote', '/quotes',
    '/job', '/jobs', '/job-card',
    '/expense', '/expenses',
    '/product', '/products',
    '/inventory',
    '/notification', '/notifications',
    '/profile', '/account',
  ];

  // Collect all URLs to visit
  const urlsToVisit = new Map();
  uniquePages.forEach(p => urlsToVisit.set(p.href, p.text));

  // Also add common paths
  for (const p of commonPaths) {
    const fullUrl = `${CRM_URL}${p}`;
    if (!urlsToVisit.has(fullUrl)) {
      urlsToVisit.set(fullUrl, `[probe] ${p}`);
    }
  }

  log(`\nWill explore ${urlsToVisit.size} URLs total (nav links + common paths)`);

  // Explore each page
  const results = [];
  for (const [url, name] of urlsToVisit) {
    try {
      const result = await explorePage(page, name, url);
      results.push(result);
    } catch (err) {
      log(`\n⚠ Error exploring ${name} (${url}): ${err.message}`);
    }
  }

  // After exploring list pages, try to explore a detail page for key entities
  log('\n' + '═'.repeat(60));
  log('EXPLORING DETAIL PAGES');
  log('═'.repeat(60));

  // Find a booking detail page
  for (const result of results) {
    if (result.name.toLowerCase().includes('booking') || result.url.includes('booking')) {
      // Look for a link to a specific booking
      const detailLinks = result.buttons?.filter(b => b.href && (b.href.includes('booking/') || b.href.includes('view')));
      if (detailLinks?.length) {
        try {
          await explorePage(page, 'Booking Detail (first)', detailLinks[0].href);
        } catch (err) {
          log(`⚠ Could not explore booking detail: ${err.message}`);
        }
        break;
      }
      // Try clicking first table row
      try {
        await page.goto(result.url, { waitUntil: 'networkidle', timeout: 15000 });
        const firstLink = await page.$('table tbody tr:first-child a');
        if (firstLink) {
          const href = await firstLink.getAttribute('href');
          if (href) {
            await explorePage(page, 'Booking Detail (table link)', href.startsWith('http') ? href : `${CRM_URL}${href}`);
          }
        }
      } catch (err) {
        log(`⚠ Could not explore booking detail from table: ${err.message}`);
      }
      break;
    }
  }

  // Write report
  const reportPath = path.join(OUT, 'full-site-report.txt');
  fs.writeFileSync(reportPath, report.join('\n'));
  log(`\n\nFull report saved to: ${reportPath}`);

  // Summary
  log('\n' + '═'.repeat(60));
  log('SUMMARY');
  log('═'.repeat(60));
  log(`Pages explored: ${results.length}`);
  log(`Pages with tables: ${results.filter(r => r.tables.length > 0).length}`);
  log(`Pages with forms: ${results.filter(r => r.forms.length > 0).length}`);
  log(`Screenshots saved to: ${OUT}/`);

  await browser.close();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
