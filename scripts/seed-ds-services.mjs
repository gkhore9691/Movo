#!/usr/bin/env node
/**
 * One-time script to replace the generic 6 services for the Detailing Street
 * tenant with the full DS service catalog.
 *
 * Usage:
 *   node scripts/seed-ds-services.mjs
 *
 * Requires: DATABASE_URL env var or the server's .env to be loadable.
 */

import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

const DS_SERVICES = [
  // Ceramic Coating
  { name: '9H Ceramic Silver (1 Year)',           description: '1-year 9H ceramic coating protection',            basePrice: 10999, maxPrice: 24999, duration: '1-2 days', category: 'Ceramic Coating' },
  { name: '9H Ceramic Gold (3 Years)',            description: '3-year 9H ceramic coating protection',            basePrice: 15999, maxPrice: 34999, duration: '1-2 days', category: 'Ceramic Coating' },
  { name: '9H Ceramic Platinum (5 Years)',        description: '5-year 9H ceramic coating protection',            basePrice: 20999, maxPrice: 42999, duration: '2-3 days', category: 'Ceramic Coating' },
  { name: '9H Ceramic Platinum Plus (Lifetime)',  description: 'Lifetime 9H ceramic coating protection',          basePrice: 36999, maxPrice: 79999, duration: '2-3 days', category: 'Ceramic Coating' },
  // PPF
  { name: 'Pro Shield PPF C (5 Years)',           description: '5-year paint protection film — Pro Shield C',     basePrice: 44999, maxPrice: 74999, duration: '3-5 days', category: 'PPF' },
  { name: 'Pro Shield PPF S (10 Years)',          description: '10-year paint protection film — Pro Shield S',    basePrice: 89999, maxPrice: 134999, duration: '3-5 days', category: 'PPF' },
  // Graphene Coating
  { name: 'Graphene (5 Years)',                   description: '5-year graphene coating protection',              basePrice: 28999, maxPrice: 56999, duration: '2-3 days', category: 'Graphene Coating' },
  { name: 'Graphene (10 Years)',                  description: '10-year graphene coating protection',             basePrice: 37999, maxPrice: 80999, duration: '2-3 days', category: 'Graphene Coating' },
  // Protection
  { name: 'Ultra 9H Armour',                     description: '9H armour protection for painted surfaces',       basePrice: 0, maxPrice: 0, duration: '1-2 days', category: 'Protection' },
  { name: 'Ultra 10H Armour',                    description: '10H armour protection for painted surfaces',      basePrice: 0, maxPrice: 0, duration: '1-2 days', category: 'Protection' },
  { name: 'Leather Armour',                      description: 'Leather surface protection treatment',            basePrice: 0, maxPrice: 0, duration: '4-6 hours', category: 'Protection' },
  { name: 'Vision Armour (Windshield)',           description: 'Windshield hydrophobic protection coating',       basePrice: 0, maxPrice: 0, duration: '2-3 hours', category: 'Protection' },
  { name: 'Wheel Armour',                        description: 'Wheel protection coating',                        basePrice: 0, maxPrice: 0, duration: '2-3 hours', category: 'Protection' },
  { name: 'Plastic Armour',                      description: 'Plastic trim protection coating',                 basePrice: 0, maxPrice: 0, duration: '2-3 hours', category: 'Protection' },
  // Restoration
  { name: 'Paint Restoration / Paint Correction', description: 'Machine polishing to remove swirls, scratches and oxidation', basePrice: 0, maxPrice: 0, duration: '1-2 days', category: 'Restoration' },
  { name: 'Headlight Restoration',               description: 'Headlight lens restoration and clarity treatment', basePrice: 0, maxPrice: 0, duration: '2-3 hours', category: 'Restoration' },
  { name: 'Wheel Restoration',                   description: 'Wheel refurbishment and restoration',             basePrice: 0, maxPrice: 0, duration: '4-6 hours', category: 'Restoration' },
  { name: 'Trim Restoration',                    description: 'Exterior trim restoration treatment',             basePrice: 0, maxPrice: 0, duration: '2-3 hours', category: 'Restoration' },
  { name: 'Interior Restoration',                description: 'Full interior restoration and deep cleaning',     basePrice: 0, maxPrice: 0, duration: '1-2 days', category: 'Restoration' },
  { name: 'Chrome Restoration',                  description: 'Chrome surface polishing and restoration',        basePrice: 0, maxPrice: 0, duration: '2-3 hours', category: 'Restoration' },
  // Detailing
  { name: 'Full Car Detailing',                  description: 'Complete interior and exterior detailing package', basePrice: 0, maxPrice: 0, duration: '1-2 days', category: 'Detailing' },
  { name: 'Interior Detailing',                  description: 'Deep cleaning and conditioning of all interior surfaces', basePrice: 0, maxPrice: 0, duration: '4-6 hours', category: 'Detailing' },
  { name: 'Exterior Detailing',                  description: 'Thorough exterior wash, clay bar, and polish',    basePrice: 0, maxPrice: 0, duration: '4-6 hours', category: 'Detailing' },
  { name: 'Maintenance Wash',                    description: 'Gentle maintenance wash for coated vehicles',     basePrice: 0, maxPrice: 0, duration: '1-2 hours', category: 'Detailing' },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://movo:movo@localhost:5432/movo';
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Find the Detailing Street tenant
    const tenantRes = await client.query(
      `SELECT id FROM tenants WHERE slug = 'detailing-street-indore' LIMIT 1`
    );
    if (tenantRes.rows.length === 0) {
      console.error('Detailing Street tenant not found. Exiting.');
      process.exit(1);
    }
    const tenantId = tenantRes.rows[0].id;
    console.log(`Found DS tenant: ${tenantId}`);

    // Count existing services
    const countRes = await client.query(
      `SELECT COUNT(*) FROM services WHERE tenant_id = $1`,
      [tenantId]
    );
    console.log(`Existing services for DS tenant: ${countRes.rows[0].count}`);

    // Begin transaction
    await client.query('BEGIN');

    // Delete junction table references first
    console.log('Cleaning junction tables...');
    await client.query(
      `DELETE FROM booking_services WHERE service_id IN (SELECT id FROM services WHERE tenant_id = $1)`,
      [tenantId]
    );
    await client.query(
      `DELETE FROM job_services WHERE service_id IN (SELECT id FROM services WHERE tenant_id = $1)`,
      [tenantId]
    );
    await client.query(
      `DELETE FROM lead_services WHERE service_id IN (SELECT id FROM services WHERE tenant_id = $1)`,
      [tenantId]
    );

    // Delete old services
    const deleteRes = await client.query(
      `DELETE FROM services WHERE tenant_id = $1`,
      [tenantId]
    );
    console.log(`Deleted ${deleteRes.rowCount} old services.`);

    // Insert new services
    for (const svc of DS_SERVICES) {
      await client.query(
        `INSERT INTO services (tenant_id, name, description, base_price, max_price, duration, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tenantId, svc.name, svc.description, svc.basePrice, svc.maxPrice, svc.duration, svc.category]
      );
    }
    console.log(`Inserted ${DS_SERVICES.length} new services.`);

    await client.query('COMMIT');
    console.log('Done! DS services updated successfully.');

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
