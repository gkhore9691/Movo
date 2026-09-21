import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

import { Customer } from '../customers/entities/customer.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { BookingStatus, LeadStatus, InvoiceStatus } from '../common/enums/index.js';
import { ImportDataDto, DsBookingDto, DsQueryDto, DsInvoiceDto } from './dto/import-data.dto.js';

@Injectable()
export class DsBridgeService {
  private readonly logger = new Logger(DsBridgeService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
  ) {}

  // ── Import All ───────────────────────────────────────────────────────────

  async importAll(tenantId: string, dto: ImportDataDto) {
    const result: Record<string, { created: number; skipped: number; errors: number }> = {};

    if (dto.bookings?.length) {
      result.bookings = await this.importBookings(tenantId, dto.bookings);
    }

    if (dto.queries?.length) {
      result.queries = await this.importQueries(tenantId, dto.queries);
    }

    if (dto.invoices?.length) {
      result.invoices = await this.importInvoices(tenantId, dto.invoices);
    }

    if (dto.followups?.length) {
      result.followups = await this.importFollowups(tenantId, dto.followups);
    }

    return { message: 'DS import complete', result };
  }

  // ── Import Bookings ──────────────────────────────────────────────────────

  async importBookings(tenantId: string, bookings: DsBookingDto[]) {
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const dsBooking of bookings) {
      try {
        const dsId = dsBooking.bookingNo?.trim();
        if (!dsId) { skipped++; continue; }

        // Check if already imported (look for DS ID in booking notes)
        const existing = await this.bookingRepo
          .createQueryBuilder('b')
          .where('b.tenantId = :tenantId', { tenantId })
          .andWhere('b.notes LIKE :pattern', { pattern: `%[DS:${dsId}]%` })
          .getOne();

        if (existing) { skipped++; continue; }

        // Resolve or create customer
        const customerName = dsBooking.ecname || dsBooking.customerNumber || 'DS Customer';
        const customerPhone = dsBooking.ecnumber || dsBooking.customerNumber || '';
        const customerEmail = dsBooking.ecemail || '';

        const customer = await this.findOrCreateCustomer(tenantId, {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          address: dsBooking.ecaddress || '',
        });

        // Resolve or create vehicle
        const regNumber = dsBooking.carBikeNumber || dsBooking.ecarnumber || '';
        let vehicle: Vehicle | null = null;
        if (regNumber) {
          vehicle = await this.findOrCreateVehicle(tenantId, customer.id, {
            registrationNumber: regNumber,
            make: dsBooking.ecarname || 'Unknown',
            model: '',
            color: dsBooking.ecarcolor || null,
          });
        }

        // Parse DS date "2026/09/21 00:00"
        const { date, time } = this.parseDsDateTime(dsBooking.preferredDateTime || '');

        // Build notes with DS tracking tag
        const noteParts = [`[DS:${dsId}]`];
        if (dsBooking.serviceRemarks) noteParts.push(dsBooking.serviceRemarks);
        if (dsBooking.eremark) noteParts.push(dsBooking.eremark);
        if (dsBooking.branch) noteParts.push(`Branch: ${dsBooking.branch}`);
        if (dsBooking.epackage) noteParts.push(`Package: ${dsBooking.epackage}`);

        // Create booking
        const booking = this.bookingRepo.create({
          tenantId,
          customerId: customer.id,
          vehicleId: vehicle?.id || null,
          date: date || new Date().toISOString().slice(0, 10),
          time: time || '00:00',
          estimatedPrice: parseFloat(dsBooking.eprice || '0') || 0,
          deposit: parseFloat(dsBooking.eadvprice || '0') || 0,
          notes: noteParts.join(' | '),
          status: BookingStatus.CONFIRMED,
          services: [],
        });

        await this.bookingRepo.save(booking);
        created++;
      } catch (err) {
        this.logger.warn(`Failed to import DS booking ${dsBooking.bookingNo}: ${(err as Error).message}`);
        errors++;
      }
    }

    return { created, skipped, errors };
  }

  // ── Import Queries → Leads ───────────────────────────────────────────────

  async importQueries(tenantId: string, queries: DsQueryDto[]) {
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const q of queries) {
      try {
        const phone = q.mobileNo?.trim();
        const name = q.clientName?.trim();
        if (!phone && !name) { skipped++; continue; }

        // Check if a lead with this phone already exists
        if (phone) {
          const existing = await this.leadRepo.findOne({
            where: { tenantId, phone },
          });
          if (existing) { skipped++; continue; }
        }

        // Map DS priority to Movo lead status
        let status = LeadStatus.NEW;
        const priority = (q.priority || '').toLowerCase();
        if (priority === 'medium') status = LeadStatus.CONTACTED;
        if (priority === 'low') status = LeadStatus.CONTACTED;
        // DS status mapping
        const dsStatus = (q.status || '').toLowerCase();
        if (dsStatus.includes('won') || dsStatus.includes('booked')) status = LeadStatus.WON;
        if (dsStatus.includes('lost') || dsStatus.includes('closed')) status = LeadStatus.LOST;

        const lead = this.leadRepo.create({
          tenantId,
          name: name || 'DS Query',
          phone: phone || '',
          email: q.email || null,
          source: 'Detailing Street CRM',
          status,
          notes: [
            q.workshop ? `Workshop: ${q.workshop}` : '',
            q.user ? `Assigned: ${q.user}` : '',
            q.priority ? `Priority: ${q.priority}` : '',
          ].filter(Boolean).join(' | '),
        });

        await this.leadRepo.save(lead);
        created++;
      } catch (err) {
        this.logger.warn(`Failed to import DS query for ${q.clientName}: ${(err as Error).message}`);
        errors++;
      }
    }

    return { created, skipped, errors };
  }

  // ── Import Invoices ──────────────────────────────────────────────────────

  async importInvoices(tenantId: string, invoices: DsInvoiceDto[]) {
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const dsInv of invoices) {
      try {
        const dsInvoiceId = dsInv.invoice?.trim();
        if (!dsInvoiceId) { skipped++; continue; }

        // Check if already imported — find an invoice whose customer's notes contain the DS ID
        // Simpler approach: check if any invoice was created recently with matching amount
        // Actually, we can't perfectly deduplicate DS invoices without a dedicated field.
        // So look for a matching booking by DS booking ID, and check if it has an invoice.
        let customerId: string | undefined;

        if (dsInv.bookingId) {
          // Try to find the Movo booking that was imported from this DS booking
          const movoBooking = await this.bookingRepo
            .createQueryBuilder('b')
            .where('b.tenantId = :tenantId', { tenantId })
            .andWhere('b.notes LIKE :pattern', { pattern: `%[DS:${dsInv.bookingId}]%` })
            .getOne();

          if (movoBooking) {
            customerId = movoBooking.customerId;

            // Check if this booking already has an invoice
            // We don't have a direct booking-invoice link, so check by customer + date proximity
            // For now, skip dedup for invoices and just create them
          }
        }

        // If no customer found via booking, try by name
        if (!customerId && dsInv.name) {
          const customer = await this.customerRepo.findOne({
            where: { tenantId, name: dsInv.name.trim() },
          });
          if (customer) customerId = customer.id;
        }

        // If still no customer, create one from the DS data
        if (!customerId) {
          const customerName = dsInv.customer || dsInv.name || 'DS Customer';
          const customer = await this.findOrCreateCustomer(tenantId, {
            name: customerName,
            phone: '',
            email: dsInv.email || '',
          });
          customerId = customer.id;
        }

        // Create invoice (amount unknown from list view — set to 0, can be updated later)
        const invoiceData: Record<string, unknown> = {
          tenantId,
          customerId,
          amount: 0,
          deposit: 0,
          balance: 0,
          status: dsInv.payDate ? InvoiceStatus.PAID : InvoiceStatus.DRAFT,
        };
        const paidDate = dsInv.payDate ? this.parseDsDate(dsInv.payDate) : null;
        if (paidDate) invoiceData.paidAt = paidDate;

        const invoice = this.invoiceRepo.create(invoiceData as any);

        await this.invoiceRepo.save(invoice);
        created++;
      } catch (err) {
        this.logger.warn(`Failed to import DS invoice ${dsInv.invoice}: ${(err as Error).message}`);
        errors++;
      }
    }

    return { created, skipped, errors };
  }

  // ── Import Follow-ups (add as lead notes/follow-up dates) ────────────────

  async importFollowups(tenantId: string, followups: any[]) {
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const fu of followups) {
      try {
        const phone = fu.mobileNo?.trim();
        const name = fu.clientName?.trim();
        if (!phone && !name) { skipped++; continue; }

        // Check if lead already exists
        let lead = phone
          ? await this.leadRepo.findOne({ where: { tenantId, phone } })
          : null;

        if (!lead && name) {
          lead = await this.leadRepo.findOne({ where: { tenantId, name } });
        }

        if (lead) {
          // Update follow-up date and append notes
          if (fu.followupDate) {
            lead.followUpDate = this.parseDsDate(fu.followupDate);
          }
          const fuNote = `DS Follow-up: ${fu.status || 'pending'}`;
          if (!lead.notes.includes(fuNote)) {
            lead.notes = lead.notes ? `${lead.notes} | ${fuNote}` : fuNote;
          }
          await this.leadRepo.save(lead);
          created++;
        } else {
          // Create a new lead for this follow-up
          const newLead = this.leadRepo.create({
            tenantId,
            name: name || 'DS Follow-up',
            phone: phone || '',
            email: fu.email || null,
            source: 'Detailing Street CRM',
            status: LeadStatus.CONTACTED,
            followUpDate: fu.followupDate ? this.parseDsDate(fu.followupDate) : null,
            notes: `DS Follow-up: ${fu.status || 'pending'}`,
          });
          await this.leadRepo.save(newLead);
          created++;
        }
      } catch (err) {
        this.logger.warn(`Failed to import DS follow-up: ${(err as Error).message}`);
        errors++;
      }
    }

    return { created, skipped, errors };
  }

  // ── Push Booking to DS ───────────────────────────────────────────────────

  async pushBookingToDS(bookingData: {
    name: string;
    email: string;
    phone: string;
    carName: string;
    carNumber: string;
    carColor: string;
    date: string;
    time: string;
    price: number;
    advance: number;
    package: string;
    remark: string;
  }): Promise<{ success: boolean; dsBookingId?: string; error?: string }> {
    return new Promise((resolve) => {
      const scriptsDir = path.join(process.cwd(), '..', 'scripts');
      const scriptPath = path.join(scriptsDir, 'push-booking.mjs');

      const child = spawn('node', [scriptPath, JSON.stringify(bookingData)], {
        cwd: scriptsDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120_000, // 2 minute timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      child.on('close', (code) => {
        if (code !== 0) {
          this.logger.warn(`push-booking.mjs exited with code ${code}: ${stderr}`);
          resolve({ success: false, error: stderr || `Exit code ${code}` });
          return;
        }

        // Try to parse the last JSON line from stdout
        const lines = stdout.trim().split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const result = JSON.parse(lines[i]);
            resolve(result);
            return;
          } catch {
            // Not JSON, keep looking
          }
        }

        resolve({ success: true });
      });

      child.on('error', (err) => {
        this.logger.error(`Failed to spawn push-booking.mjs: ${err.message}`);
        resolve({ success: false, error: err.message });
      });
    });
  }

  /** Fire-and-forget push: spawns the script detached */
  pushBookingToDSAsync(bookingData: Record<string, unknown>): void {
    const scriptsDir = path.join(process.cwd(), '..', 'scripts');
    const scriptPath = path.join(scriptsDir, 'push-booking.mjs');

    const child = spawn('node', [scriptPath, JSON.stringify(bookingData)], {
      cwd: scriptsDir,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    this.logger.log(`Spawned DS push for booking (PID ${child.pid})`);
  }

  // ── Trigger Full Scrape ──────────────────────────────────────────────────

  async triggerScrape(tenantId: string) {
    this.logger.log(`Starting DS scrape for tenant ${tenantId}`);

    return new Promise<{
      message: string;
      importResult?: Record<string, { created: number; skipped: number; errors: number }>;
    }>((resolve, reject) => {
      const scriptsDir = path.join(process.cwd(), '..', 'scripts');
      const scriptPath = path.join(scriptsDir, 'scrape-ds.mjs');

      const child = spawn('node', [scriptPath], {
        cwd: scriptsDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 300_000, // 5 minute timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
        this.logger.debug(data.toString().trim());
      });
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', async (code) => {
        if (code !== 0) {
          this.logger.error(`scrape-ds.mjs failed (code ${code}): ${stderr}`);
          reject(new Error(`Scraper failed with code ${code}: ${stderr.slice(0, 500)}`));
          return;
        }

        this.logger.log('Scrape completed. Reading JSON files...');

        try {
          // Read the scraped JSON files
          const dataDir = path.join(scriptsDir, 'downloads', 'ds-data');
          const dto: ImportDataDto = {};

          const readJson = async (file: string) => {
            try {
              const raw = await fs.readFile(path.join(dataDir, file), 'utf-8');
              return JSON.parse(raw);
            } catch {
              return [];
            }
          };

          dto.bookings = await readJson('bookings.json');
          dto.queries = await readJson('queries.json');
          dto.invoices = await readJson('invoices.json');
          dto.followups = await readJson('followups.json');

          // Run the import
          const importResult = await this.importAll(tenantId, dto);
          resolve({
            message: 'Scrape and import completed',
            importResult: importResult.result,
          });
        } catch (err) {
          this.logger.error(`Failed to import scraped data: ${(err as Error).message}`);
          reject(err);
        }
      });

      child.on('error', (err) => {
        this.logger.error(`Failed to spawn scraper: ${err.message}`);
        reject(new Error(`Failed to start scraper: ${err.message}`));
      });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async findOrCreateCustomer(
    tenantId: string,
    data: { name: string; phone: string; email: string; address?: string },
  ): Promise<Customer> {
    // Try to find by phone first (most reliable identifier)
    if (data.phone) {
      const existing = await this.customerRepo.findOne({
        where: { tenantId, phone: data.phone },
      });
      if (existing) return existing;
    }

    // Try by name
    if (data.name && data.name !== 'DS Customer') {
      const existing = await this.customerRepo.findOne({
        where: { tenantId, name: data.name },
      });
      if (existing) return existing;
    }

    // Create new customer
    const customer = this.customerRepo.create({
      tenantId,
      name: data.name || 'DS Customer',
      phone: data.phone || '',
      email: data.email || null,
      address: data.address || null,
      tags: ['ds-import'],
    } as Partial<Customer>);
    return this.customerRepo.save(customer);
  }

  private async findOrCreateVehicle(
    tenantId: string,
    customerId: string,
    data: { registrationNumber: string; make: string; model: string; color: string | null },
  ): Promise<Vehicle> {
    // Try to find by registration number
    if (data.registrationNumber) {
      const existing = await this.vehicleRepo.findOne({
        where: { tenantId, registrationNumber: data.registrationNumber },
      });
      if (existing) return existing;
    }

    // Create new vehicle
    const vehicle = this.vehicleRepo.create({
      tenantId,
      customerId,
      make: data.make || 'Unknown',
      model: data.model || 'Unknown',
      registrationNumber: data.registrationNumber || null,
      color: data.color || null,
    });
    return this.vehicleRepo.save(vehicle);
  }

  /** Parse DS date format "2026/09/21 00:00" → { date: "2026-09-21", time: "00:00" } */
  private parseDsDateTime(dsDate: string): { date: string; time: string } {
    if (!dsDate) return { date: '', time: '' };

    // Handle "2026/09/21 00:00" or "21/09/2026 00:00" or "2026-09-21 00:00"
    const cleaned = dsDate.trim();
    const parts = cleaned.split(/\s+/);
    const datePart = parts[0] || '';
    const timePart = parts[1] || '00:00';

    // Normalize date separators
    const dateSegments = datePart.split(/[/\-]/);
    let isoDate = '';

    if (dateSegments.length === 3) {
      const [a, b, c] = dateSegments;
      // Determine if format is YYYY/MM/DD or DD/MM/YYYY
      if (a.length === 4) {
        isoDate = `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
      } else if (c.length === 4) {
        isoDate = `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      } else {
        isoDate = datePart.replace(/\//g, '-');
      }
    }

    return { date: isoDate, time: timePart };
  }

  /** Parse a DS date string to a JS Date (or null) */
  private parseDsDate(dsDate: string): Date | null {
    if (!dsDate) return null;
    const { date } = this.parseDsDateTime(dsDate);
    if (!date) return null;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}
