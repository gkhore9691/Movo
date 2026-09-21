#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = 'http://localhost:3001/api';

async function api(method, endpoint, token, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${endpoint}`, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `${res.status}`);
  return json.data !== undefined ? json.data : json;
}

async function run() {
  console.log('=== DS → Movo Import ===\n');

  // 1. Login
  const loginRes = await api('POST', '/auth/login', null, {
    email: 'shivesh@detailingstreet.in',
    password: 'password123',
  });
  const token = loginRes.access_token;
  console.log(`Logged in as ${loginRes.user.name}\n`);

  // 2. Read extracted data
  const dataPath = path.join(__dirname, 'downloads', 'ds-extracted', 'extracted-data.json');
  const records = JSON.parse(fs.readFileSync(dataPath, 'utf-8')).filter(r => r.hasData);
  console.log(`Records to import: ${records.length}\n`);

  // Track created entities
  const customerCache = new Map(); // phone -> customerId
  let stats = { customers: 0, customersSkipped: 0, vehicles: 0, vehiclesSkipped: 0, invoices: 0, invoicesSkipped: 0, errors: 0 };

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const d = r.detail;
    if (!d) continue;

    try {
      const phone = d.customerPhone?.trim();
      const name = d.customerName?.trim() || r.name?.trim() || 'Unknown';

      if (!phone || phone.length < 5) {
        stats.errors++;
        continue;
      }

      // 3. Find or create customer
      let customerId = customerCache.get(phone);

      if (!customerId) {
        // Search by phone
        try {
          const searchRes = await api('GET', `/customers?search=${encodeURIComponent(phone)}&limit=1`, token);
          const existing = Array.isArray(searchRes) ? searchRes : searchRes;
          if (existing.length > 0) {
            customerId = existing[0].id;
            stats.customersSkipped++;
          }
        } catch {
          // Search might fail, that's ok
        }

        if (!customerId) {
          // Create customer
          const addr1 = d.customerAddress1 || '';
          const addr2 = d.customerAddress2 || '';
          const address = [addr1, addr2].filter(Boolean).join(', ');
          const email = d.customerEmail && d.customerEmail !== 'nil@gmail.com' ? d.customerEmail : '';

          const cust = await api('POST', '/customers', token, {
            name,
            phone,
            email,
            address,
            tags: ['ds-import'],
          });
          customerId = cust.id;
          stats.customers++;
        }

        customerCache.set(phone, customerId);
      } else {
        stats.customersSkipped++;
      }

      // 4. Find or create vehicle
      const regNo = d.registrationNo?.trim();
      let vehicleId = null;

      if (regNo && regNo.length > 3) {
        // Search for existing vehicle by registration
        try {
          const vehRes = await api('GET', `/vehicles?customerId=${customerId}&limit=100`, token);
          const vehicles = Array.isArray(vehRes) ? vehRes : [];
          const existing = vehicles.find(v =>
            v.registrationNumber?.replace(/\s/g, '').toLowerCase() === regNo.replace(/\s/g, '').toLowerCase()
          );
          if (existing) {
            vehicleId = existing.id;
            stats.vehiclesSkipped++;
          }
        } catch { /* ignore */ }

        if (!vehicleId) {
          const make = d.vehicleName === 'Car' ? '' : (d.vehicleName || '');
          const model = d.vehicleModel || '';

          const veh = await api('POST', '/vehicles', token, {
            customerId,
            make: make || 'Car',
            model: model || 'Unknown',
            registrationNumber: regNo,
            color: d.vehicleColor || '',
          });
          vehicleId = veh.id;
          stats.vehicles++;
        }
      }

      // 5. Create invoice
      // Calculate amount from line items or subtotal
      let amount = parseFloat(d.subtotal) || 0;
      if (!amount && d.lineItems?.length > 0) {
        amount = d.lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      }

      if (amount > 0) {
        const inv = await api('POST', '/invoices', token, {
          customerId,
          amount,
          deposit: 0,
          balance: 0, // Paid invoices
          status: 'paid',
          paymentMethod: (d.paymentMode || 'cash').toLowerCase() === 'upi' ? 'upi' : (d.paymentMode || 'cash').toLowerCase() === 'card' ? 'card' : 'cash',
        });
        stats.invoices++;
      } else {
        stats.invoicesSkipped++;
      }
    } catch (err) {
      stats.errors++;
      if (i < 3) console.log(`  ⚠ Record ${i}: ${err.message}`);
    }

    if ((i + 1) % 10 === 0 || i === records.length - 1) {
      console.log(`  ${i + 1}/${records.length} — C:${stats.customers}+${stats.customersSkipped} V:${stats.vehicles}+${stats.vehiclesSkipped} I:${stats.invoices} E:${stats.errors}`);
    }
  }

  // 6. Copy PDFs
  const pdfSrc = path.join(__dirname, 'downloads', 'ds-extracted', 'pdfs');
  const pdfDst = path.join(__dirname, '..', 'server', 'public', 'invoices');
  fs.mkdirSync(pdfDst, { recursive: true });

  let pdfsCopied = 0;
  if (fs.existsSync(pdfSrc)) {
    for (const file of fs.readdirSync(pdfSrc)) {
      if (file.endsWith('.pdf')) {
        fs.copyFileSync(path.join(pdfSrc, file), path.join(pdfDst, file));
        pdfsCopied++;
      }
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log('IMPORT COMPLETE');
  console.log('═'.repeat(50));
  console.log(`  Customers created:  ${stats.customers}`);
  console.log(`  Customers existing: ${stats.customersSkipped}`);
  console.log(`  Vehicles created:   ${stats.vehicles}`);
  console.log(`  Vehicles existing:  ${stats.vehiclesSkipped}`);
  console.log(`  Invoices created:   ${stats.invoices}`);
  console.log(`  Invoices skipped:   ${stats.invoicesSkipped}`);
  console.log(`  Errors:             ${stats.errors}`);
  console.log(`  PDFs copied:        ${pdfsCopied} → server/public/invoices/`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
