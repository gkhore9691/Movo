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
  console.log('Logged in. At:', page.url());

  // Go to invoice page
  console.log('\n--- Navigating to /invoice ---');
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  console.log('URL:', page.url());

  // Screenshot the invoice page
  await page.screenshot({ path: path.join(OUT, '01-invoice-page.png'), fullPage: true });
  console.log('Screenshot: 01-invoice-page.png');

  // Dump the page HTML structure
  const html = await page.content();
  fs.writeFileSync(path.join(OUT, 'invoice-page.html'), html);
  console.log('HTML saved: invoice-page.html');

  // Find all links on the page
  const links = await page.$$eval('a[href]', els => els.map(e => ({ text: e.textContent?.trim().slice(0, 60), href: e.href })));
  console.log('\n--- All links on invoice page ---');
  links.forEach(l => console.log(`  ${l.text} → ${l.href}`));

  // Find all buttons
  const buttons = await page.$$eval('button, input[type="submit"], [role="button"]', els => els.map(e => ({
    text: e.textContent?.trim().slice(0, 60),
    class: e.className?.slice(0, 80),
    id: e.id,
  })));
  console.log('\n--- All buttons ---');
  buttons.forEach(b => console.log(`  "${b.text}" id=${b.id} class=${b.class}`));

  // Find tables
  const tables = await page.$$eval('table', els => els.map((t, i) => ({
    index: i,
    rows: t.rows.length,
    headers: Array.from(t.querySelectorAll('th')).map(th => th.textContent?.trim()),
  })));
  console.log('\n--- Tables ---');
  tables.forEach(t => console.log(`  Table ${t.index}: ${t.rows} rows, headers: [${t.headers.join(', ')}]`));

  // Search for DSINMP00391 on the page
  const bodyText = await page.textContent('body');
  if (bodyText?.includes('DSINMP00391')) {
    console.log('\n✓ Found "DSINMP00391" on the page!');
  } else {
    console.log('\n✗ "DSINMP00391" not found on page.');
    console.log('Looking for any DSINMP text...');
    const matches = bodyText?.match(/DSINMP\w+/g);
    if (matches) {
      console.log('Found invoice IDs:', [...new Set(matches)].slice(0, 20).join(', '));
    }
  }

  // Look for search/filter inputs
  const inputs = await page.$$eval('input', els => els.map(e => ({
    type: e.type,
    name: e.name,
    placeholder: e.placeholder,
    id: e.id,
  })));
  console.log('\n--- Input fields ---');
  inputs.forEach(i => console.log(`  type=${i.type} name="${i.name}" placeholder="${i.placeholder}" id=${i.id}`));

  // Check for pagination
  const pagination = await page.$$eval('.pagination a, [class*="paginate"] a, nav a', els => els.map(e => ({
    text: e.textContent?.trim(),
    href: e.href,
  })));
  if (pagination.length) {
    console.log('\n--- Pagination ---');
    pagination.forEach(p => console.log(`  ${p.text} → ${p.href}`));
  }

  // Look for any download/PDF related elements
  const pdfElements = await page.$$eval('[href*="pdf"], [href*="download"], [onclick*="pdf"], [onclick*="download"], [class*="pdf"], [class*="download"]', els => els.map(e => ({
    tag: e.tagName,
    text: e.textContent?.trim().slice(0, 60),
    href: e.getAttribute('href'),
    onclick: e.getAttribute('onclick')?.slice(0, 100),
  })));
  console.log('\n--- PDF/Download elements ---');
  if (pdfElements.length) {
    pdfElements.forEach(e => console.log(`  <${e.tag}> "${e.text}" href=${e.href} onclick=${e.onclick}`));
  } else {
    console.log('  None found on list page');
  }

  // Click on first invoice row to see detail page
  const firstRow = await page.$('table tbody tr:first-child a, table tbody tr:first-child');
  if (firstRow) {
    const firstLink = await page.$('table tbody tr:first-child a');
    if (firstLink) {
      const href = await firstLink.getAttribute('href');
      console.log(`\n--- Clicking first invoice link: ${href} ---`);
      await firstLink.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('\n--- Clicking first table row ---');
      await firstRow.click();
      await page.waitForTimeout(3000);
    }

    console.log('Detail URL:', page.url());
    await page.screenshot({ path: path.join(OUT, '02-invoice-detail.png'), fullPage: true });
    console.log('Screenshot: 02-invoice-detail.png');

    // Look for PDF/download on detail page
    const detailPdf = await page.$$eval('[href*="pdf"], [href*="download"], [onclick*="pdf"], [onclick*="download"], [class*="pdf"], [class*="download"], button:has-text("PDF"), button:has-text("Download"), a:has-text("PDF"), a:has-text("Download"), button:has-text("Print"), a:has-text("Print")', els => els.map(e => ({
      tag: e.tagName,
      text: e.textContent?.trim().slice(0, 60),
      href: e.getAttribute('href'),
      onclick: e.getAttribute('onclick')?.slice(0, 100),
      class: e.className?.slice(0, 80),
    })));
    console.log('\n--- PDF/Download on detail page ---');
    detailPdf.forEach(e => console.log(`  <${e.tag}> "${e.text}" href=${e.href} onclick=${e.onclick} class=${e.class}`));

    // Dump detail HTML
    const detailHtml = await page.content();
    fs.writeFileSync(path.join(OUT, 'invoice-detail.html'), detailHtml);
    console.log('Detail HTML saved: invoice-detail.html');
  }

  await browser.close();
  console.log('\nDone exploring.');
}

run().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
