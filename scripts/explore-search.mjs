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

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', process.env.CRM_EMAIL);
  await page.fill('input[name="password"]', process.env.CRM_PASSWORD);
  await page.click('button:has-text("Sign Me")');
  await page.waitForURL(url => url.pathname === '/index', { timeout: 15000 }).catch(() => {});

  await page.goto(`${CRM_URL}/invoice_list`, { waitUntil: 'networkidle' });

  // Get the full HTML of the search area
  const searchHtml = await page.evaluate(() => {
    // Find everything near the epackage dropdown
    const epackage = document.getElementById('epackage');
    if (epackage) {
      // Go up to find the container
      let parent = epackage.parentElement;
      for (let i = 0; i < 5; i++) {
        if (parent?.parentElement) parent = parent.parentElement;
      }
      return parent?.innerHTML?.slice(0, 3000) || 'parent not found';
    }
    return 'epackage not found';
  });
  console.log('Search area HTML:\n', searchHtml);

  // Find the search button near epackage
  const searchBtn = await page.$$eval('button, a.btn, input[type="submit"]', els => els.map(e => ({
    tag: e.tagName,
    text: e.textContent?.trim().slice(0, 40),
    class: e.className?.slice(0, 80),
    id: e.id,
    type: e.getAttribute('type'),
    onclick: e.getAttribute('onclick')?.slice(0, 100),
    parentId: e.parentElement?.id,
  })).filter(e => e.class?.includes('search') || e.id?.includes('search') || e.onclick?.includes('search')));
  console.log('\nSearch-related buttons:', searchBtn);

  // Find all elements with id or class containing 'search'
  const searchElements = await page.$$eval('[id*="search" i], [class*="search" i], [id*="Search" i]', els => els.map(e => ({
    tag: e.tagName,
    id: e.id,
    class: e.className?.toString().slice(0, 60),
    text: e.textContent?.trim().slice(0, 40),
  })));
  console.log('\nAll search elements:', searchElements);

  // Now actually try: select Booking Id, type in the input next to it, click the search btn
  await page.selectOption('#epackage', 'c_booking_id');

  // Find the text input that's a sibling of epackage
  const searchInputSelector = await page.evaluate(() => {
    const epackage = document.getElementById('epackage');
    let container = epackage?.closest('.dataTables_filter') || epackage?.parentElement?.parentElement?.parentElement;
    const inputs = container?.querySelectorAll('input[type="text"], input[type="search"], input:not([type])');
    return inputs ? Array.from(inputs).map(i => ({ id: i.id, name: i.name, placeholder: i.placeholder, type: i.type })) : [];
  });
  console.log('\nInputs near epackage:', searchInputSelector);

  // The red search button with magnifying glass
  const allBtns = await page.$$eval('.dataTables_filter button, .dataTables_filter .btn, .dataTables_filter a', els => els.map(e => ({
    tag: e.tagName,
    text: e.textContent?.trim().slice(0, 20),
    class: e.className?.slice(0, 80),
    id: e.id,
    href: e.getAttribute('href'),
    onclick: e.getAttribute('onclick')?.slice(0, 100),
    innerHTML: e.innerHTML?.slice(0, 100),
  })));
  console.log('\nButtons in dataTables_filter:', allBtns);

  await browser.close();
}

run().catch(err => { console.error(err.message); process.exit(1); });
