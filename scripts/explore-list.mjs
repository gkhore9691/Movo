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

  // Login
  await page.goto(`${CRM_URL}/invoice`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', process.env.CRM_EMAIL);
  await page.fill('input[name="password"]', process.env.CRM_PASSWORD);
  await page.click('button:has-text("Sign Me")');
  await page.waitForURL(url => url.pathname === '/index', { timeout: 15000 }).catch(() => {});

  // Go to invoice list
  await page.goto(`${CRM_URL}/invoice_list`, { waitUntil: 'networkidle' });

  // Check the search dropdown options
  const selectOptions = await page.$$eval('select option', els => els.map(e => ({
    value: e.value,
    text: e.textContent?.trim(),
    parentId: e.parentElement?.id,
    parentName: e.parentElement?.getAttribute('name'),
  })));
  console.log('All select options:');
  selectOptions.forEach(o => console.log(`  [${o.parentId || o.parentName}] value="${o.value}" text="${o.text}"`));

  // Check the search area HTML
  const searchArea = await page.$eval('.dataTables_filter, [class*="search"], [id*="search"]', el => el.outerHTML).catch(() => 'not found');
  console.log('\nSearch area HTML (first match):', searchArea.slice(0, 500));

  // Check all selects near search
  const allSelects = await page.$$eval('select', els => els.map(e => ({
    id: e.id,
    name: e.name,
    options: Array.from(e.options).map(o => `${o.value}="${o.text}"`),
  })));
  console.log('\nAll selects on page:');
  allSelects.forEach(s => console.log(`  #${s.id} name="${s.name}": [${s.options.join(', ')}]`));

  // Get the table row HTML for first row to understand link structure
  const firstRowHtml = await page.$eval('#today_table tbody tr:first-child', el => el.innerHTML).catch(() => 'no table');
  console.log('\nFirst row HTML:', firstRowHtml.slice(0, 1000));

  await browser.close();
  console.log('\nDone.');
}

run().catch(err => { console.error(err.message); process.exit(1); });
