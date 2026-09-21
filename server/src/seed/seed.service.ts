import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

import { Customer } from '../customers/entities/customer.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { Staff } from '../staff/entities/staff.entity.js';
import { Job } from '../jobs/entities/job.entity.js';
import { JobTimelineEntry } from '../jobs/entities/job-timeline-entry.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Automation } from '../automations/entities/automation.entity.js';
import { Review } from '../reviews/entities/review.entity.js';
import { Conversation } from '../conversations/entities/conversation.entity.js';
import { Message } from '../conversations/entities/message.entity.js';
import { Notification } from '../notifications/entities/notification.entity.js';
import { RetentionCustomer } from '../retention/entities/retention-customer.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { Tenant } from '../tenants/entities/tenant.entity.js';

import {
  JobStatus,
  LeadStatus,
  BookingStatus,
  StaffRole,
  InvoiceStatus,
  PaymentMethod,
  ReviewStatus,
  MessageSender,
  RetentionStatus,
  NotificationType,
  UserRole,
} from '../common/enums/index.js';

// ── helpers ────────────────────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function dateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);
  private readonly id = new Map<string, string>();

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(JobTimelineEntry) private readonly timeline: Repository<JobTimelineEntry>,
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Automation) private readonly automations: Repository<Automation>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(RetentionCustomer) private readonly retentionCustomers: Repository<RetentionCustomer>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  /** Entry point — idempotent. */
  async run(): Promise<void> {
    const count = await this.customers.count();
    if (count > 0) {
      this.logger.log('Database already seeded — skipping.');
      return;
    }

    this.logger.log('Seeding database...');

    // Create super-admin user (no tenant)
    await this.seedSuperAdmin();

    // Create demo tenant
    await this.seedDemoTenant();

    await this.seedServices();
    await this.seedStaff();
    await this.seedDefaultUser();

    // Only seed real DS data — no fake demo records
    await this.seedDsData();

    this.logger.log('Seeding complete!');
  }

  // ── helpers ──────────────────────────────────────────────────────────
  private map(key: string): string {
    const v = this.id.get(key);
    if (!v) throw new Error(`Missing id mapping for "${key}"`);
    return v;
  }

  private async save<T extends { id: string }>(
    repo: Repository<T>,
    key: string,
    data: Partial<T>,
  ): Promise<T> {
    const entity = repo.create(data as T);
    const saved = await repo.save(entity);
    this.id.set(key, saved.id);
    return saved;
  }

  private async junction(table: string, col1: string, id1: string, col2: string, id2: string) {
    await this.dataSource.query(
      `INSERT INTO ${table} (${col1}, ${col2}) VALUES ($1, $2)`,
      [id1, id2],
    );
  }

  // ── super admin ─────────────────────────────────────────────────────
  private async seedSuperAdmin(): Promise<void> {
    this.logger.log('  Super admin...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    await this.save(this.users, 'super-admin', {
      email: 'admin@movo.app',
      passwordHash,
      name: 'Super Admin',
      role: UserRole.ADMIN,
      tenantId: null,
    } as Partial<User>);
  }

  // ── demo tenant ─────────────────────────────────────────────────────
  private async seedDemoTenant(): Promise<void> {
    this.logger.log('  Demo tenant...');
    await this.save(this.tenants, 'tenant', {
      name: 'Detailing Street',
      slug: 'detailing-street-indore',
      industry: 'automotive_detailing',
      phone: '+919876500001',
      email: 'hello@detailingstreet.in',
      city: 'Indore',
      state: 'Madhya Pradesh',
    } as Partial<Tenant>);
  }

  // ── services (Detailing Street catalog) ──────────────────────────────
  private async seedServices(): Promise<void> {
    this.logger.log('  Services...');
    const rows: Array<[string, string, string, number, number | null, string, string]> = [
      // Ceramic Coating
      ['svc-1',  '9H Ceramic Silver (1 Year)',           '1-year 9H ceramic coating protection',            10999, 24999, '1-2 days', 'Ceramic Coating'],
      ['svc-2',  '9H Ceramic Gold (3 Years)',            '3-year 9H ceramic coating protection',            15999, 34999, '1-2 days', 'Ceramic Coating'],
      ['svc-3',  '9H Ceramic Platinum (5 Years)',        '5-year 9H ceramic coating protection',            20999, 42999, '2-3 days', 'Ceramic Coating'],
      ['svc-4',  '9H Ceramic Platinum Plus (Lifetime)',  'Lifetime 9H ceramic coating protection',          36999, 79999, '2-3 days', 'Ceramic Coating'],
      // PPF (Paint Protection Film)
      ['svc-5',  'Pro Shield PPF C (5 Years)',           '5-year paint protection film — Pro Shield C',     44999, 74999, '3-5 days', 'PPF'],
      ['svc-6',  'Pro Shield PPF S (10 Years)',          '10-year paint protection film — Pro Shield S',    89999, 134999, '3-5 days', 'PPF'],
      // Graphene Coating
      ['svc-7',  'Graphene (5 Years)',                   '5-year graphene coating protection',              28999, 56999, '2-3 days', 'Graphene Coating'],
      ['svc-8',  'Graphene (10 Years)',                  '10-year graphene coating protection',             37999, 80999, '2-3 days', 'Graphene Coating'],
      // Protection
      ['svc-9',  'Ultra 9H Armour',                     '9H armour protection for painted surfaces',       0, 0, '1-2 days', 'Protection'],
      ['svc-10', 'Ultra 10H Armour',                    '10H armour protection for painted surfaces',      0, 0, '1-2 days', 'Protection'],
      ['svc-11', 'Leather Armour',                      'Leather surface protection treatment',            0, 0, '4-6 hours', 'Protection'],
      ['svc-12', 'Vision Armour (Windshield)',           'Windshield hydrophobic protection coating',       0, 0, '2-3 hours', 'Protection'],
      ['svc-13', 'Wheel Armour',                        'Wheel protection coating',                        0, 0, '2-3 hours', 'Protection'],
      ['svc-14', 'Plastic Armour',                      'Plastic trim protection coating',                 0, 0, '2-3 hours', 'Protection'],
      // Restoration
      ['svc-15', 'Paint Restoration / Paint Correction', 'Machine polishing to remove swirls, scratches and oxidation', 0, 0, '1-2 days', 'Restoration'],
      ['svc-16', 'Headlight Restoration',               'Headlight lens restoration and clarity treatment', 0, 0, '2-3 hours', 'Restoration'],
      ['svc-17', 'Wheel Restoration',                   'Wheel refurbishment and restoration',             0, 0, '4-6 hours', 'Restoration'],
      ['svc-18', 'Trim Restoration',                    'Exterior trim restoration treatment',             0, 0, '2-3 hours', 'Restoration'],
      ['svc-19', 'Interior Restoration',                'Full interior restoration and deep cleaning',     0, 0, '1-2 days', 'Restoration'],
      ['svc-20', 'Chrome Restoration',                  'Chrome surface polishing and restoration',        0, 0, '2-3 hours', 'Restoration'],
      // Detailing
      ['svc-21', 'Full Car Detailing',                  'Complete interior and exterior detailing package', 0, 0, '1-2 days', 'Detailing'],
      ['svc-22', 'Interior Detailing',                  'Deep cleaning and conditioning of all interior surfaces', 0, 0, '4-6 hours', 'Detailing'],
      ['svc-23', 'Exterior Detailing',                  'Thorough exterior wash, clay bar, and polish',    0, 0, '4-6 hours', 'Detailing'],
      ['svc-24', 'Maintenance Wash',                    'Gentle maintenance wash for coated vehicles',     0, 0, '1-2 hours', 'Detailing'],
    ];
    for (const [key, name, description, basePrice, maxPrice, duration, category] of rows) {
      await this.save(this.services, key, { name, description, basePrice, maxPrice, duration, category, tenantId: this.map('tenant') } as Partial<Service>);
    }
  }

  // ── staff ────────────────────────────────────────────────────────────
  private async seedStaff(): Promise<void> {
    this.logger.log('  Staff...');
    const rows: Array<[string, string, StaffRole, string, string, number, number]> = [
      ['staff-1', 'Shivesh Patel', StaffRole.OWNER, '+919876500001', 'shivesh@detailingstreet.in', 0, 312],
      ['staff-2', 'Priya Patel', StaffRole.MANAGER, '+919876500002', 'priya@detailingstreet.in', 3, 187],
      ['staff-3', 'Arjun Desai', StaffRole.SALES, '+919876500003', 'arjun@detailingstreet.in', 5, 94],
      ['staff-4', 'Rohit Verma', StaffRole.TECHNICIAN, '+919876500004', 'rohit@detailingstreet.in', 4, 156],
      ['staff-5', 'Deepak Kumar', StaffRole.TECHNICIAN, '+919876500005', 'deepak@detailingstreet.in', 3, 128],
    ];
    for (const [key, name, role, phone, email, activeJobs, completedJobs] of rows) {
      await this.save(this.staff, key, { name, role, phone, email, activeJobs, completedJobs, tenantId: this.map('tenant') } as Partial<Staff>);
    }
  }

  // ── default user ─────────────────────────────────────────────────────
  private async seedDefaultUser(): Promise<void> {
    this.logger.log('  Default user...');
    const passwordHash = await bcrypt.hash('password123', 10);
    await this.save(this.users, 'user-1', {
      email: 'shivesh@detailingstreet.in',
      passwordHash,
      name: 'Shivesh Patel',
      role: UserRole.OWNER,
      tenantId: this.map('tenant'),
    } as Partial<User>);
  }

  // ── customers ────────────────────────────────────────────────────────
  private async seedCustomers(): Promise<void> {
    this.logger.log('  Customers...');
    const rows: Array<[string, string, string, string, string, string, number, string[]]> = [
      ['cust-1', 'Rahul Sharma', '+919826012345', 'rahul.sharma@gmail.com', 'Vijay Nagar Indore', '2025-01-15', 87400, ['premium', 'repeat']],
      ['cust-2', 'Ananya Mishra', '+919826023456', 'ananya.m@gmail.com', 'Sapna Sangeeta Indore', '2025-03-20', 45000, ['referral']],
      ['cust-3', 'Karan Malhotra', '+919826034567', 'karan.malhotra@outlook.com', 'Palasia Square Indore', '2024-11-05', 152000, ['vip', 'premium', 'repeat']],
      ['cust-4', 'Sneha Joshi', '+919826045678', 'sneha.joshi@yahoo.com', 'Scheme No 78 Indore', '2025-06-10', 12000, ['new']],
      ['cust-5', 'Amit Patel', '+919826056789', 'amit.patel@gmail.com', 'South Tukoganj Indore', '2024-08-22', 98500, ['fleet', 'premium', 'repeat']],
      ['cust-6', 'Priyanka Rathore', '+919826067890', 'priyanka.r@gmail.com', 'AB Road Indore', '2025-02-14', 35000, ['repeat']],
      ['cust-7', 'Vikas Agarwal', '+919826078901', 'vikas.agarwal@hotmail.com', 'MG Road Indore', '2025-05-03', 24999, ['hot-lead']],
      ['cust-8', 'Deepika Chauhan', '+919826089012', 'deepika.c@gmail.com', 'Rajwada Indore', '2024-12-01', 67000, ['premium', 'repeat']],
      ['cust-9', 'Sanjay Gupta', '+919826090123', 'sanjay.g@gmail.com', 'Bhawarkua Indore', '2025-04-18', 18500, []],
      ['cust-10', 'Nisha Verma', '+919826101234', 'nisha.verma@gmail.com', 'Annapurna Road Indore', '2025-07-01', 8000, ['new']],
      ['cust-11', 'Rajesh Tiwari', '+919826112345', 'rajesh.t@outlook.com', 'Rau Indore', '2024-06-15', 126000, ['vip', 'repeat']],
      ['cust-12', 'Meera Kulkarni', '+919826123456', 'meera.k@gmail.com', 'LIG Colony Indore', '2025-08-20', 3500, ['new']],
      ['cust-13', 'Arjun Saxena', '+919826134567', 'arjun.saxena@gmail.com', 'Mahalaxmi Nagar Indore', '2025-01-28', 55000, ['repeat']],
      ['cust-14', 'Pooja Bhatt', '+919826145678', 'pooja.bhatt@yahoo.com', 'Nipania Indore', '2025-03-05', 42000, ['repeat']],
      ['cust-15', 'Manish Dubey', '+919826156789', 'manish.dubey@gmail.com', 'Kanadia Road Indore', '2025-06-22', 15000, []],
      ['cust-16', 'Shruti Nair', '+919826167890', 'shruti.nair@gmail.com', 'Geeta Bhawan Indore', '2024-10-10', 89000, ['vip', 'premium', 'repeat']],
    ];
    for (const [key, name, phone, email, address, since, spend, tags] of rows) {
      await this.save(this.customers, key, {
        name,
        phone,
        email,
        address,
        customerSince: new Date(since),
        lifetimeSpend: spend,
        tags,
        tenantId: this.map('tenant'),
      } as Partial<Customer>);
    }
  }

  // ── vehicles (without currentJobId — set later) ──────────────────────
  private async seedVehicles(): Promise<void> {
    this.logger.log('  Vehicles...');
    const rows: Array<[string, string, string, string, number, string, string]> = [
      ['veh-1', 'cust-1', 'Volkswagen', 'Virtus', 2024, 'MP 09 AB 1234', 'Candy White'],
      ['veh-2', 'cust-2', 'Hyundai', 'Creta', 2025, 'MP 09 CD 5678', 'Titan Grey'],
      ['veh-3', 'cust-3', 'BMW', '3 Series', 2024, 'MP 09 EF 9012', 'Alpine White'],
      ['veh-4', 'cust-3', 'Toyota', 'Fortuner', 2023, 'MP 09 GH 3456', 'Attitude Black'],
      ['veh-5', 'cust-4', 'Tata', 'Nexon', 2025, 'MP 09 IJ 7890', 'Fearless Purple'],
      ['veh-6', 'cust-5', 'Mahindra', 'Thar', 2024, 'MP 09 KL 2345', 'Everest White'],
      ['veh-7', 'cust-5', 'Honda', 'City', 2023, 'MP 09 MN 6789', 'Platinum White Pearl'],
      ['veh-8', 'cust-5', 'Mahindra', 'XUV700', 2024, 'MP 09 OP 0123', 'Midnight Black'],
      ['veh-9', 'cust-6', 'Kia', 'Seltos', 2024, 'MP 09 QR 4567', 'Glacier White Pearl'],
      ['veh-10', 'cust-7', 'Volkswagen', 'Virtus', 2025, 'MP 09 ST 8901', 'Carbon Steel Grey'],
      ['veh-11', 'cust-8', 'BMW', '3 Series', 2023, 'MP 09 UV 2345', 'Black Sapphire'],
      ['veh-12', 'cust-9', 'Maruti Suzuki', 'Brezza', 2024, 'MP 09 WX 6789', 'Sizzling Red'],
      ['veh-13', 'cust-10', 'Hyundai', 'Creta', 2025, 'MP 09 YZ 0123', 'Abyss Black'],
      ['veh-14', 'cust-11', 'Toyota', 'Fortuner', 2024, 'MP 09 AA 4567', 'Super White'],
      ['veh-15', 'cust-11', 'Mahindra', 'XUV700', 2025, 'MP 09 BB 8901', 'Dazzling Silver'],
      ['veh-16', 'cust-12', 'Tata', 'Nexon', 2024, 'MP 09 CC 2345', 'Flame Red'],
      ['veh-17', 'cust-13', 'Mahindra', 'Thar', 2025, 'MP 09 DD 6789', 'Napoli Black'],
      ['veh-18', 'cust-14', 'Honda', 'City', 2024, 'MP 09 EE 0123', 'Meteoroid Grey'],
      ['veh-19', 'cust-15', 'Kia', 'Seltos', 2025, 'MP 09 FF 4567', 'Intense Red'],
      ['veh-20', 'cust-16', 'Mercedes-Benz', 'C-Class', 2024, 'MP 09 GG 8901', 'Obsidian Black'],
      ['veh-21', 'cust-2', 'Mahindra', 'Thar', 2024, 'MP 09 HH 1122', 'Rocky Beige'],
    ];
    for (const [key, custKey, make, model, year, reg, color] of rows) {
      await this.save(this.vehicles, key, {
        customerId: this.map(custKey),
        make,
        model,
        year,
        registrationNumber: reg,
        color,
        currentJobId: null,
        tenantId: this.map('tenant'),
      } as Partial<Vehicle>);
    }
  }

  // ── jobs + timeline + junction ───────────────────────────────────────
  private async seedJobs(): Promise<void> {
    this.logger.log('  Jobs + timeline...');

    interface JobDef {
      key: string;
      cust: string;
      veh: string;
      svcs: string[];
      status: JobStatus;
      staff: string;
      est: number;
      actual: number | null;
      dep: number;
      tl: Array<[JobStatus, number, 'd' | 'h', string]>;
    }

    const defs: JobDef[] = [
      {
        key: 'job-1', cust: 'cust-5', veh: 'veh-6', svcs: ['svc-1'],
        status: JobStatus.WORK_IN_PROGRESS, staff: 'staff-4', est: 25000, actual: null, dep: 10000,
        tl: [
          [JobStatus.ENQUIRY, 5, 'd', 'staff-3'],
          [JobStatus.BOOKED, 4, 'd', 'staff-3'],
          [JobStatus.CAR_RECEIVED, 3, 'd', 'staff-2'],
          [JobStatus.INSPECTION, 3, 'd', 'staff-4'],
          [JobStatus.WORK_IN_PROGRESS, 2, 'd', 'staff-4'],
        ],
      },
      {
        key: 'job-2', cust: 'cust-2', veh: 'veh-2', svcs: ['svc-5'],
        status: JobStatus.DELIVERED, staff: 'staff-5', est: 15000, actual: 15000, dep: 5000,
        tl: [
          [JobStatus.ENQUIRY, 10, 'd', 'staff-3'],
          [JobStatus.BOOKED, 9, 'd', 'staff-3'],
          [JobStatus.CAR_RECEIVED, 8, 'd', 'staff-2'],
          [JobStatus.INSPECTION, 8, 'd', 'staff-5'],
          [JobStatus.WORK_IN_PROGRESS, 7, 'd', 'staff-5'],
          [JobStatus.QUALITY_CHECK, 2, 'd', 'staff-2'],
          [JobStatus.READY, 2, 'd', 'staff-2'],
          [JobStatus.DELIVERED, 1, 'd', 'staff-2'],
        ],
      },
      {
        key: 'job-3', cust: 'cust-1', veh: 'veh-1', svcs: ['svc-6'],
        status: JobStatus.CAR_RECEIVED, staff: 'staff-4', est: 2500, actual: null, dep: 0,
        tl: [
          [JobStatus.BOOKED, 2, 'd', 'staff-3'],
          [JobStatus.CAR_RECEIVED, 2, 'h', 'staff-2'],
        ],
      },
      {
        key: 'job-4', cust: 'cust-13', veh: 'veh-17', svcs: ['svc-3', 'svc-1'],
        status: JobStatus.INSPECTION, staff: 'staff-5', est: 38000, actual: null, dep: 15000,
        tl: [
          [JobStatus.ENQUIRY, 4, 'd', 'staff-3'],
          [JobStatus.BOOKED, 3, 'd', 'staff-3'],
          [JobStatus.CAR_RECEIVED, 2, 'd', 'staff-2'],
          [JobStatus.INSPECTION, 6, 'h', 'staff-5'],
        ],
      },
      {
        key: 'job-5', cust: 'cust-3', veh: 'veh-3', svcs: ['svc-2'],
        status: JobStatus.WORK_IN_PROGRESS, staff: 'staff-4', est: 85000, actual: null, dep: 40000,
        tl: [
          [JobStatus.ENQUIRY, 7, 'd', 'staff-3'],
          [JobStatus.BOOKED, 6, 'd', 'staff-3'],
          [JobStatus.CAR_RECEIVED, 4, 'd', 'staff-2'],
          [JobStatus.INSPECTION, 4, 'd', 'staff-4'],
          [JobStatus.WORK_IN_PROGRESS, 3, 'd', 'staff-4'],
        ],
      },
      {
        key: 'job-6', cust: 'cust-6', veh: 'veh-9', svcs: ['svc-4'],
        status: JobStatus.DELIVERED, staff: 'staff-5', est: 8000, actual: 8000, dep: 3000,
        tl: [
          [JobStatus.BOOKED, 7, 'd', 'staff-3'],
          [JobStatus.CAR_RECEIVED, 6, 'd', 'staff-2'],
          [JobStatus.INSPECTION, 6, 'd', 'staff-5'],
          [JobStatus.WORK_IN_PROGRESS, 5, 'd', 'staff-5'],
          [JobStatus.QUALITY_CHECK, 4, 'd', 'staff-2'],
          [JobStatus.READY, 3, 'd', 'staff-2'],
          [JobStatus.DELIVERED, 3, 'd', 'staff-2'],
        ],
      },
      {
        key: 'job-7', cust: 'cust-5', veh: 'veh-8', svcs: ['svc-5'],
        status: JobStatus.QUALITY_CHECK, staff: 'staff-5', est: 20000, actual: null, dep: 8000,
        tl: [
          [JobStatus.BOOKED, 5, 'd', 'staff-3'],
          [JobStatus.CAR_RECEIVED, 4, 'd', 'staff-2'],
          [JobStatus.INSPECTION, 4, 'd', 'staff-5'],
          [JobStatus.WORK_IN_PROGRESS, 3, 'd', 'staff-5'],
          [JobStatus.QUALITY_CHECK, 3, 'h', 'staff-2'],
        ],
      },
      {
        key: 'job-8', cust: 'cust-16', veh: 'veh-20', svcs: ['svc-1', 'svc-3'],
        status: JobStatus.READY, staff: 'staff-4', est: 42000, actual: 42000, dep: 20000,
        tl: [
          [JobStatus.BOOKED, 7, 'd', 'staff-3'],
          [JobStatus.CAR_RECEIVED, 6, 'd', 'staff-2'],
          [JobStatus.INSPECTION, 6, 'd', 'staff-4'],
          [JobStatus.WORK_IN_PROGRESS, 5, 'd', 'staff-4'],
          [JobStatus.QUALITY_CHECK, 1, 'd', 'staff-2'],
          [JobStatus.READY, 5, 'h', 'staff-2'],
        ],
      },
      {
        key: 'job-9', cust: 'cust-8', veh: 'veh-11', svcs: ['svc-6'],
        status: JobStatus.BOOKED, staff: 'staff-5', est: 3000, actual: null, dep: 0,
        tl: [
          [JobStatus.BOOKED, 1, 'd', 'staff-3'],
        ],
      },
      {
        key: 'job-10', cust: 'cust-11', veh: 'veh-14', svcs: ['svc-2'],
        status: JobStatus.WORK_IN_PROGRESS, staff: 'staff-4', est: 95000, actual: null, dep: 45000,
        tl: [
          [JobStatus.ENQUIRY, 8, 'd', 'staff-3'],
          [JobStatus.BOOKED, 7, 'd', 'staff-3'],
          [JobStatus.CAR_RECEIVED, 5, 'd', 'staff-2'],
          [JobStatus.INSPECTION, 5, 'd', 'staff-4'],
          [JobStatus.WORK_IN_PROGRESS, 4, 'd', 'staff-4'],
        ],
      },
      {
        key: 'job-11', cust: 'cust-14', veh: 'veh-18', svcs: ['svc-4'],
        status: JobStatus.ENQUIRY, staff: 'staff-3', est: 7000, actual: null, dep: 0,
        tl: [
          [JobStatus.ENQUIRY, 4, 'h', 'staff-3'],
        ],
      },
      {
        key: 'job-12', cust: 'cust-9', veh: 'veh-12', svcs: ['svc-5'],
        status: JobStatus.BOOKED, staff: 'staff-5', est: 12000, actual: null, dep: 5000,
        tl: [
          [JobStatus.ENQUIRY, 3, 'd', 'staff-3'],
          [JobStatus.BOOKED, 1, 'd', 'staff-3'],
        ],
      },
    ];

    for (const j of defs) {
      // Save the job (without services relation — we do junction manually)
      const saved = await this.save(this.jobs, j.key, {
        customerId: this.map(j.cust),
        vehicleId: this.map(j.veh),
        status: j.status,
        assignedTo: this.map(j.staff),
        estimatedPrice: j.est,
        actualPrice: j.actual,
        deposit: j.dep,
        notes: '',
        photos: [],
        tenantId: this.map('tenant'),
      } as Partial<Job>);

      // Junction: job_services
      for (const svcKey of j.svcs) {
        await this.junction('job_services', 'job_id', saved.id, 'service_id', this.map(svcKey));
      }

      // Timeline entries
      for (const [stage, offset, unit, staffKey] of j.tl) {
        const ts = unit === 'd' ? daysAgo(offset) : hoursAgo(offset);
        await this.timeline.save(
          this.timeline.create({
            jobId: saved.id,
            stage,
            timestamp: ts,
            employeeId: this.map(staffKey),
            notes: '',
            photos: [],
            tenantId: this.map('tenant'),
          } as any),
        );
      }
    }
  }

  // ── update vehicles with currentJobId ────────────────────────────────
  private async updateVehicleCurrentJobs(): Promise<void> {
    this.logger.log('  Updating vehicle currentJobId...');
    const mapping: Array<[string, string]> = [
      ['veh-1', 'job-3'],
      ['veh-3', 'job-5'],
      ['veh-6', 'job-1'],
      ['veh-8', 'job-7'],
      ['veh-11', 'job-9'],
      ['veh-14', 'job-10'],
      ['veh-17', 'job-4'],
      ['veh-20', 'job-8'],
    ];
    for (const [vehKey, jobKey] of mapping) {
      await this.vehicles.update(this.map(vehKey), { currentJobId: this.map(jobKey) });
    }
  }

  // ── leads ────────────────────────────────────────────────────────────
  private async seedLeads(): Promise<void> {
    this.logger.log('  Leads...');

    interface LeadDef {
      key: string;
      cust: string;
      veh: string;
      svcs: string[];
      status: LeadStatus;
      quoted: number;
      source: string;
      followUp: number; // days offset from today
    }

    const defs: LeadDef[] = [
      { key: 'lead-1', cust: 'cust-7', veh: 'veh-10', svcs: ['svc-1'], status: LeadStatus.QUOTED, quoted: 24999, source: 'Walk-in', followUp: 0 },
      { key: 'lead-2', cust: 'cust-10', veh: 'veh-13', svcs: ['svc-1'], status: LeadStatus.NEW, quoted: 0, source: 'Instagram', followUp: 1 },
      { key: 'lead-3', cust: 'cust-15', veh: 'veh-19', svcs: ['svc-2'], status: LeadStatus.QUOTED, quoted: 55000, source: 'Phone', followUp: -1 },
      { key: 'lead-4', cust: 'cust-4', veh: 'veh-5', svcs: ['svc-3', 'svc-1'], status: LeadStatus.NEGOTIATION, quoted: 32000, source: 'Referral', followUp: 0 },
      { key: 'lead-5', cust: 'cust-12', veh: 'veh-16', svcs: ['svc-5'], status: LeadStatus.CONTACTED, quoted: 0, source: 'Google', followUp: 2 },
      { key: 'lead-6', cust: 'cust-3', veh: 'veh-4', svcs: ['svc-1'], status: LeadStatus.WON, quoted: 30000, source: 'Existing customer', followUp: -7 },
      { key: 'lead-7', cust: 'cust-9', veh: 'veh-12', svcs: ['svc-1'], status: LeadStatus.LOST, quoted: 18000, source: 'Walk-in', followUp: -10 },
      { key: 'lead-8', cust: 'cust-6', veh: 'veh-9', svcs: ['svc-1', 'svc-4'], status: LeadStatus.QUOTED, quoted: 28000, source: 'WhatsApp', followUp: 1 },
      { key: 'lead-9', cust: 'cust-14', veh: 'veh-18', svcs: ['svc-4'], status: LeadStatus.NEW, quoted: 0, source: 'Phone', followUp: 1 },
      { key: 'lead-10', cust: 'cust-5', veh: 'veh-7', svcs: ['svc-6'], status: LeadStatus.WON, quoted: 2500, source: 'Existing customer', followUp: -5 },
      { key: 'lead-11', cust: 'cust-8', veh: 'veh-11', svcs: ['svc-3'], status: LeadStatus.NEGOTIATION, quoted: 15000, source: 'Walk-in', followUp: 2 },
      { key: 'lead-12', cust: 'cust-16', veh: 'veh-20', svcs: ['svc-2'], status: LeadStatus.QUOTED, quoted: 110000, source: 'Existing customer', followUp: 0 },
      { key: 'lead-13', cust: 'cust-2', veh: 'veh-21', svcs: ['svc-1', 'svc-3'], status: LeadStatus.CONTACTED, quoted: 0, source: 'Instagram', followUp: 1 },
      { key: 'lead-14', cust: 'cust-11', veh: 'veh-15', svcs: ['svc-1'], status: LeadStatus.WON, quoted: 28000, source: 'Existing customer', followUp: -10 },
      { key: 'lead-15', cust: 'cust-13', veh: 'veh-17', svcs: ['svc-5'], status: LeadStatus.LOST, quoted: 22000, source: 'Walk-in', followUp: -15 },
    ];

    for (const l of defs) {
      const saved = await this.save(this.leads, l.key, {
        customerId: this.map(l.cust),
        vehicleId: this.map(l.veh),
        status: l.status,
        quotedPrice: l.quoted,
        source: l.source,
        notes: '',
        followUpDate: l.followUp >= 0 ? daysFromNow(l.followUp) : daysAgo(Math.abs(l.followUp)),
        tenantId: this.map('tenant'),
      } as Partial<Lead>);

      for (const svcKey of l.svcs) {
        await this.junction('lead_services', 'lead_id', saved.id, 'service_id', this.map(svcKey));
      }
    }
  }

  // ── bookings ─────────────────────────────────────────────────────────
  private async seedBookings(): Promise<void> {
    this.logger.log('  Bookings...');

    interface BkDef {
      key: string;
      cust: string;
      veh: string;
      svcs: string[];
      dayOff: number;
      time: string;
      est: number;
      dep: number;
      status: BookingStatus;
    }

    const defs: BkDef[] = [
      { key: 'bk-1', cust: 'cust-1', veh: 'veh-1', svcs: ['svc-6'], dayOff: 0, time: '10:00', est: 2500, dep: 0, status: BookingStatus.IN_PROGRESS },
      { key: 'bk-2', cust: 'cust-9', veh: 'veh-12', svcs: ['svc-5'], dayOff: 2, time: '09:00', est: 12000, dep: 5000, status: BookingStatus.CONFIRMED },
      { key: 'bk-3', cust: 'cust-8', veh: 'veh-11', svcs: ['svc-6'], dayOff: 1, time: '11:00', est: 3000, dep: 0, status: BookingStatus.CONFIRMED },
      { key: 'bk-4', cust: 'cust-4', veh: 'veh-5', svcs: ['svc-3', 'svc-1'], dayOff: 3, time: '09:30', est: 32000, dep: 12000, status: BookingStatus.CONFIRMED },
      { key: 'bk-5', cust: 'cust-2', veh: 'veh-2', svcs: ['svc-5'], dayOff: -3, time: '10:00', est: 15000, dep: 5000, status: BookingStatus.COMPLETED },
      { key: 'bk-6', cust: 'cust-6', veh: 'veh-9', svcs: ['svc-4'], dayOff: -5, time: '09:00', est: 8000, dep: 3000, status: BookingStatus.COMPLETED },
      { key: 'bk-7', cust: 'cust-12', veh: 'veh-16', svcs: ['svc-6'], dayOff: 4, time: '14:00', est: 2000, dep: 0, status: BookingStatus.CONFIRMED },
      { key: 'bk-8', cust: 'cust-3', veh: 'veh-4', svcs: ['svc-1'], dayOff: 5, time: '09:00', est: 30000, dep: 15000, status: BookingStatus.CONFIRMED },
    ];

    for (const b of defs) {
      const saved = await this.save(this.bookings, b.key, {
        customerId: this.map(b.cust),
        vehicleId: this.map(b.veh),
        date: dateStr(b.dayOff),
        time: b.time,
        estimatedPrice: b.est,
        deposit: b.dep,
        notes: '',
        status: b.status,
        tenantId: this.map('tenant'),
      } as Partial<Booking>);

      for (const svcKey of b.svcs) {
        await this.junction('booking_services', 'booking_id', saved.id, 'service_id', this.map(svcKey));
      }
    }
  }

  // ── invoices ─────────────────────────────────────────────────────────
  private async seedInvoices(): Promise<void> {
    this.logger.log('  Invoices...');

    interface InvDef {
      key: string;
      job: string;
      cust: string;
      amount: number;
      dep: number;
      bal: number;
      status: InvoiceStatus;
      pm: PaymentMethod | null;
      paidDaysAgo: number | null;
    }

    const defs: InvDef[] = [
      { key: 'inv-1', job: 'job-2', cust: 'cust-2', amount: 15000, dep: 5000, bal: 0, status: InvoiceStatus.PAID, pm: PaymentMethod.UPI, paidDaysAgo: 1 },
      { key: 'inv-2', job: 'job-6', cust: 'cust-6', amount: 8000, dep: 3000, bal: 0, status: InvoiceStatus.PAID, pm: PaymentMethod.CASH, paidDaysAgo: 3 },
      { key: 'inv-3', job: 'job-1', cust: 'cust-5', amount: 25000, dep: 10000, bal: 15000, status: InvoiceStatus.SENT, pm: null, paidDaysAgo: null },
      { key: 'inv-4', job: 'job-5', cust: 'cust-3', amount: 85000, dep: 40000, bal: 45000, status: InvoiceStatus.SENT, pm: null, paidDaysAgo: null },
      { key: 'inv-5', job: 'job-7', cust: 'cust-5', amount: 20000, dep: 8000, bal: 12000, status: InvoiceStatus.SENT, pm: null, paidDaysAgo: null },
      { key: 'inv-6', job: 'job-8', cust: 'cust-16', amount: 42000, dep: 20000, bal: 22000, status: InvoiceStatus.SENT, pm: null, paidDaysAgo: null },
      { key: 'inv-7', job: 'job-10', cust: 'cust-11', amount: 95000, dep: 45000, bal: 50000, status: InvoiceStatus.SENT, pm: null, paidDaysAgo: null },
      { key: 'inv-8', job: 'job-3', cust: 'cust-1', amount: 2500, dep: 0, bal: 2500, status: InvoiceStatus.DRAFT, pm: null, paidDaysAgo: null },
      { key: 'inv-9', job: 'job-4', cust: 'cust-13', amount: 38000, dep: 15000, bal: 23000, status: InvoiceStatus.SENT, pm: null, paidDaysAgo: null },
      { key: 'inv-10', job: 'job-12', cust: 'cust-9', amount: 12000, dep: 5000, bal: 7000, status: InvoiceStatus.DRAFT, pm: null, paidDaysAgo: null },
    ];

    for (const i of defs) {
      await this.save(this.invoices, i.key, {
        jobId: this.map(i.job),
        customerId: this.map(i.cust),
        amount: i.amount,
        deposit: i.dep,
        balance: i.bal,
        status: i.status,
        paymentMethod: i.pm as PaymentMethod,
        paidAt: i.paidDaysAgo !== null ? daysAgo(i.paidDaysAgo) : undefined,
        tenantId: this.map('tenant'),
      } as Partial<Invoice>);
    }
  }

  // ── automations ──────────────────────────────────────────────────────
  private async seedAutomations(): Promise<void> {
    this.logger.log('  Automations...');

    const defs: Array<Partial<Automation> & { key: string }> = [
      {
        key: 'auto-1',
        name: 'Post-Delivery Review Request',
        description: 'Automatically request a review 1 day after job delivery',
        trigger: 'Job status changes to "Delivered"',
        conditions: ['Job is completed', 'Customer has phone number'],
        actions: [
          { type: 'wait', label: 'Wait 1 day', delay: '1 day' },
          { type: 'message', label: 'Send review request via WhatsApp' },
          { type: 'condition', label: 'If positive → send Google Review link' },
          { type: 'condition', label: 'If negative → collect private feedback' },
        ],
        enabled: true,
        lastRun: daysAgo(1),
        runsCount: 47,
        tenantId: this.map('tenant'),
      },
      {
        key: 'auto-2',
        name: 'Maintenance Reminder',
        description: 'Remind customers to come back for maintenance wash 60 days after service',
        trigger: 'Job delivered (Ceramic Coating or PPF)',
        conditions: ['Service type is Ceramic Coating or PPF', '60 days since delivery'],
        actions: [
          { type: 'wait', label: 'Wait 60 days', delay: '60 days' },
          { type: 'message', label: 'Send maintenance reminder' },
          { type: 'wait', label: 'Wait 3 days if no response', delay: '3 days' },
          { type: 'message', label: 'Send follow-up reminder' },
        ],
        enabled: true,
        lastRun: daysAgo(3),
        runsCount: 23,
        tenantId: this.map('tenant'),
      },
      {
        key: 'auto-3',
        name: 'Lead Follow-Up',
        description: 'Follow up on unresponsive leads 3 days after sending a quote',
        trigger: 'Quote sent to lead',
        conditions: ['Lead status is "Quoted"', 'No response in 3 days'],
        actions: [
          { type: 'wait', label: 'Wait 3 days', delay: '3 days' },
          { type: 'message', label: 'Send follow-up message' },
          { type: 'wait', label: 'Wait 5 days if still no response', delay: '5 days' },
          { type: 'message', label: 'Send final follow-up with special offer' },
          { type: 'notification', label: 'Notify sales team' },
        ],
        enabled: true,
        lastRun: daysAgo(0),
        runsCount: 56,
        tenantId: this.map('tenant'),
      },
      {
        key: 'auto-4',
        name: 'Birthday / Anniversary Greeting',
        description: 'Send personalized greeting with a special discount offer',
        trigger: 'Customer birthday or anniversary date',
        conditions: ['Customer has date on file', 'Has visited at least once'],
        actions: [
          { type: 'message', label: 'Send personalized greeting' },
          { type: 'message', label: 'Include 10% discount coupon' },
        ],
        enabled: false,
        lastRun: undefined,
        runsCount: 0,
        tenantId: this.map('tenant'),
      },
      {
        key: 'auto-5',
        name: 'Annual Service Reminder',
        description: 'Remind customers about annual comprehensive service 1 year after major work',
        trigger: '1 year since last major service',
        conditions: ['Service was Ceramic Coating, PPF, or Full Detailing', 'Customer has not visited in 10+ months'],
        actions: [
          { type: 'wait', label: 'Wait 11 months', delay: '11 months' },
          { type: 'message', label: 'Send annual service reminder' },
          { type: 'wait', label: 'Wait 7 days', delay: '7 days' },
          { type: 'message', label: 'Send follow-up with before/after photos from last visit' },
          { type: 'notification', label: 'Add to retention list' },
        ],
        enabled: true,
        lastRun: daysAgo(5),
        runsCount: 12,
        tenantId: this.map('tenant'),
      },
    ];

    for (const { key, ...data } of defs) {
      await this.save(this.automations, key, data as Partial<Automation>);
    }
  }

  // ── reviews ──────────────────────────────────────────────────────────
  private async seedReviews(): Promise<void> {
    this.logger.log('  Reviews...');

    interface RevDef {
      key: string;
      cust: string;
      job: string;
      rating: number;
      comment: string;
      status: ReviewStatus;
      googleUrl: string | null;
      daysAgo: number;
    }

    const defs: RevDef[] = [
      { key: 'rev-1', cust: 'cust-1', job: 'job-2', rating: 5, comment: 'Excellent ceramic coating on my Virtus! The finish is absolutely stunning. Best detailing studio in Indore.', status: ReviewStatus.PUBLISHED, googleUrl: '#', daysAgo: 30 },
      { key: 'rev-2', cust: 'cust-3', job: 'job-5', rating: 5, comment: 'PPF on my BMW was flawless. Very professional team. Highly recommended!', status: ReviewStatus.PUBLISHED, googleUrl: '#', daysAgo: 20 },
      { key: 'rev-3', cust: 'cust-2', job: 'job-2', rating: 4, comment: 'Full detailing was great. Only minor issue — took an extra day. But the result was worth the wait.', status: ReviewStatus.PUBLISHED, googleUrl: '#', daysAgo: 2 },
      { key: 'rev-4', cust: 'cust-6', job: 'job-6', rating: 5, comment: 'Interior detailing for my Seltos was top-notch. Car feels brand new inside!', status: ReviewStatus.RECEIVED, googleUrl: null, daysAgo: 3 },
      { key: 'rev-5', cust: 'cust-5', job: 'job-1', rating: 5, comment: '', status: ReviewStatus.REQUESTED, googleUrl: null, daysAgo: 0 },
      { key: 'rev-6', cust: 'cust-11', job: 'job-10', rating: 5, comment: 'Second car I have got PPF done from Detailing Street. Consistent quality every time.', status: ReviewStatus.PUBLISHED, googleUrl: '#', daysAgo: 15 },
      { key: 'rev-7', cust: 'cust-16', job: 'job-8', rating: 5, comment: '', status: ReviewStatus.REQUESTED, googleUrl: null, daysAgo: 0 },
      { key: 'rev-8', cust: 'cust-14', job: 'job-11', rating: 4, comment: 'Good interior clean. Would come back for ceramic next time.', status: ReviewStatus.RECEIVED, googleUrl: null, daysAgo: 10 },
    ];

    for (const r of defs) {
      await this.save(this.reviews, r.key, {
        customerId: this.map(r.cust),
        jobId: this.map(r.job),
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        googleReviewUrl: r.googleUrl,
        createdAt: daysAgo(r.daysAgo),
        tenantId: this.map('tenant'),
      } as Partial<Review>);
    }
  }

  // ── conversations + messages ──────────────────────────────────────────
  private async seedConversations(): Promise<void> {
    this.logger.log('  Conversations + messages...');

    interface MsgDef {
      content: string;
      sender: MessageSender;
      hoursAgo: number;
      read: boolean;
    }

    interface ConvDef {
      key: string;
      cust: string;
      aiHandling: boolean;
      lastMessage: string;
      unreadCount: number;
      msgs: MsgDef[];
    }

    const defs: ConvDef[] = [
      {
        key: 'conv-1', cust: 'cust-7', aiHandling: true,
        lastMessage: 'Ji zaroor, aapko detail bhej raha hoon...',
        unreadCount: 0,
        msgs: [
          { content: 'Hi, Virtus ke liye ceramic coating kitne ka padega?', sender: MessageSender.CUSTOMER, hoursAgo: 5, read: true },
          { content: 'Namaste Vikas ji! Volkswagen Virtus ke liye humara ceramic coating package ₹18,000 se start hota hai.\n\nHumare paas 2 options hain:\n\n• Standard Ceramic (₹18,000) — 2 saal ki warranty\n• Premium 9H Ceramic (₹24,999) — 5 saal ki warranty, hydrophobic coating included\n\nKya aap studio visit karke demo dekhna chahenge?', sender: MessageSender.AI, hoursAgo: 5, read: true },
          { content: 'Premium wala me kya kya included hai?', sender: MessageSender.CUSTOMER, hoursAgo: 4, read: true },
          { content: 'Premium 9H Ceramic Coating mein included hai:\n\n✅ Full exterior paint decontamination\n✅ Single-stage paint correction\n✅ 9H ceramic coating application (2 layers)\n✅ Hydrophobic top coat\n✅ Wheel ceramic coating\n✅ 5 saal ki warranty\n\nTime lagta hai 2-3 din. Kya aap is week available hain demo ke liye?', sender: MessageSender.AI, hoursAgo: 4, read: true },
          { content: 'Thoda mehnga hai. Kuch discount milega?', sender: MessageSender.CUSTOMER, hoursAgo: 3, read: true },
          { content: 'Vikas ji, quality mein hum compromise nahi karte but aapke liye ek offer hai — agar aap is week book karte hain toh free maintenance wash included rahega (worth ₹2,500). Kya main aapke liye slot check karoon?', sender: MessageSender.AI, hoursAgo: 3, read: true },
          { content: 'Achha sochta hoon kal tak batata hoon', sender: MessageSender.CUSTOMER, hoursAgo: 2, read: true },
          { content: 'Ji zaroor, aapko detail bhej raha hoon WhatsApp pe bhi. Koi bhi sawal ho toh bejhijhak poochiye! 🙏', sender: MessageSender.AI, hoursAgo: 2, read: true },
        ],
      },
      {
        key: 'conv-2', cust: 'cust-10', aiHandling: true,
        lastMessage: 'Meri nayi Creta ke liye PPF ka rate batao',
        unreadCount: 1,
        msgs: [
          { content: 'Hello, meri nayi Creta ke liye PPF ka rate batao', sender: MessageSender.CUSTOMER, hoursAgo: 1, read: false },
          { content: 'Hello Nisha ji! Nayi Hyundai Creta ke liye PPF packages:\n\n• Front-end PPF (bonnet + bumper + fenders): ₹40,000\n• Half body PPF: ₹65,000\n• Full body PPF: ₹95,000\n\nHum XPEL aur SunTek dono brands offer karte hain. Kaunsa package aapko suit karega?', sender: MessageSender.AI, hoursAgo: 1, read: false },
        ],
      },
      {
        key: 'conv-3', cust: 'cust-1', aiHandling: false,
        lastMessage: 'Rahul ji, aapki Virtus ready hai pickup ke liye.',
        unreadCount: 0,
        msgs: [
          { content: 'Bhai meri Virtus ka maintenance wash kab tak hoga?', sender: MessageSender.CUSTOMER, hoursAgo: 24, read: true },
          { content: 'Rahul ji, aapki car aaj shaam tak ready ho jayegi. 5 baje tak aa sakte hain.', sender: MessageSender.HUMAN, hoursAgo: 24, read: true },
          { content: 'Ok thanks. Aur next ceramic maintenance kab due hai?', sender: MessageSender.CUSTOMER, hoursAgo: 24, read: true },
          { content: 'Aapka last ceramic coating June mein hua tha, toh next maintenance December mein due hoga. Main aapko reminder bhej doonga.', sender: MessageSender.HUMAN, hoursAgo: 24, read: true },
          { content: 'Perfect, thanks bhai 👍', sender: MessageSender.CUSTOMER, hoursAgo: 24, read: true },
          { content: 'Kal 10 baje drop kar doonga maintenance ke liye', sender: MessageSender.CUSTOMER, hoursAgo: 18, read: true },
          { content: 'Done Rahul ji, slot booked for tomorrow 10 AM. See you! 🙏', sender: MessageSender.HUMAN, hoursAgo: 17, read: true },
          { content: 'Rahul ji, aapki Virtus ready hai pickup ke liye. Quality check complete — sabkuch achha hai.', sender: MessageSender.HUMAN, hoursAgo: 3, read: true },
        ],
      },
      {
        key: 'conv-4', cust: 'cust-4', aiHandling: true,
        lastMessage: 'Kal aa sakte hain studio check karne?',
        unreadCount: 2,
        msgs: [
          { content: 'Hi, mere friend ne bataya aapke baare mein. Nexon ke liye ceramic + paint correction ka total kitna aayega?', sender: MessageSender.CUSTOMER, hoursAgo: 8, read: true },
          { content: 'Namaste Sneha ji! Referral ke liye shukriya 🙏\n\nTata Nexon ke liye:\n\n• Paint Correction: ₹10,000 - ₹15,000 (condition pe depend karta hai)\n• Ceramic Coating: ₹18,000 - ₹22,000\n\nCombo package mein hum special pricing dete hain — ₹28,000 se ₹32,000 ke beech aayega.\n\nKya aap car dikhane aa sakti hain? Inspection ke baad exact quote de sakte hain.', sender: MessageSender.AI, hoursAgo: 8, read: true },
          { content: 'Combo package achha hai. Kitne din lagenge?', sender: MessageSender.CUSTOMER, hoursAgo: 6, read: true },
          { content: 'Paint correction + ceramic coating ke liye total 3-4 din lagte hain. Hum aapki car ke saath puri tarah se careful rehte hain — rush nahi karte.\n\nKya process dikhau step by step?', sender: MessageSender.AI, hoursAgo: 6, read: true },
          { content: 'Haan dikhao', sender: MessageSender.CUSTOMER, hoursAgo: 5, read: true },
          { content: 'Humara process:\n\n1️⃣ Car inspection & documentation\n2️⃣ Thorough wash & decontamination\n3️⃣ Paint correction (machine polish)\n4️⃣ IPA wipe down\n5️⃣ Ceramic coating application\n6️⃣ 24hr IR lamp curing\n7️⃣ Quality check\n8️⃣ Delivery with care instructions\n\nHar step pe photos share karte hain aapke saath!', sender: MessageSender.AI, hoursAgo: 5, read: true },
          { content: '32000 final hai? Kuch kam nahi hoga?', sender: MessageSender.CUSTOMER, hoursAgo: 3, read: false },
          { content: 'Sneha ji, aapke liye best deal — ₹30,000 mein paint correction + ceramic with 3 saal warranty. Plus ek free maintenance wash bhi included.\n\nKal aa sakte hain studio check karne? Morning 10 baje slot available hai.', sender: MessageSender.AI, hoursAgo: 3, read: false },
        ],
      },
    ];

    for (const c of defs) {
      const conv = await this.save(this.conversations, c.key, {
        customerId: this.map(c.cust),
        aiHandling: c.aiHandling,
        lastMessage: c.lastMessage,
        unreadCount: c.unreadCount,
        tenantId: this.map('tenant'),
      } as Partial<Conversation>);

      for (let i = 0; i < c.msgs.length; i++) {
        const m = c.msgs[i];
        await this.messages.save(
          this.messages.create({
            conversationId: conv.id,
            content: m.content,
            sender: m.sender,
            timestamp: hoursAgo(m.hoursAgo),
            read: m.read,
            tenantId: this.map('tenant'),
          } as any),
        );
      }
    }
  }

  // ── notifications ────────────────────────────────────────────────────
  private async seedNotifications(): Promise<void> {
    this.logger.log('  Notifications...');

    interface NotifDef {
      type: NotificationType;
      title: string;
      description: string;
      hoursAgo?: number;
      daysAgo?: number;
      read: boolean;
      actionUrl: string | null;
    }

    const defs: NotifDef[] = [
      { type: NotificationType.BOOKING, title: 'New Booking', description: 'Sanjay Gupta booked Full Detailing for Maruti Brezza — Sep 10', hoursAgo: 1, read: false, actionUrl: '/bookings' },
      { type: NotificationType.AI_HANDLED, title: 'AI Handled Enquiry', description: 'Movo responded to Nisha Verma about PPF pricing for Hyundai Creta', hoursAgo: 1, read: false, actionUrl: '/ai-receptionist' },
      { type: NotificationType.JOB_UPDATE, title: 'Quality Check Complete', description: 'Mercedes C-Class (Shruti Nair) passed QC — ready for delivery', hoursAgo: 5, read: false, actionUrl: '/jobs' },
      { type: NotificationType.PAYMENT, title: 'Payment Received', description: '₹15,000 received from Ananya Mishra via UPI — Full Detailing', daysAgo: 1, read: true, actionUrl: '/revenue' },
      { type: NotificationType.REVIEW, title: 'New Review', description: 'Ananya Mishra left a 4-star review for Full Detailing', daysAgo: 2, read: true, actionUrl: '/reviews' },
      { type: NotificationType.LEAD, title: 'Hot Lead', description: 'Vikas Agarwal quoted ₹24,999 — follow-up due today', hoursAgo: 3, read: false, actionUrl: '/leads' },
      { type: NotificationType.RETENTION, title: 'Retention Alert', description: '12 customers are due for maintenance follow-up', daysAgo: 1, read: true, actionUrl: '/retention' },
      { type: NotificationType.JOB_UPDATE, title: 'Job Started', description: 'Rohit started ceramic coating on Mahindra Thar (Amit Patel)', daysAgo: 2, read: true, actionUrl: '/jobs' },
      { type: NotificationType.AI_HANDLED, title: 'AI Handled Enquiry', description: 'Movo responded to Sneha Joshi about paint correction + ceramic combo', hoursAgo: 8, read: true, actionUrl: '/ai-receptionist' },
      { type: NotificationType.BOOKING, title: 'Booking Reminder', description: 'Deepika Chauhan — Maintenance Wash tomorrow at 11:00 AM', hoursAgo: 6, read: false, actionUrl: '/bookings' },
    ];

    for (const n of defs) {
      const ts = n.hoursAgo != null ? hoursAgo(n.hoursAgo) : daysAgo(n.daysAgo!);
      await this.notifications.save(
        this.notifications.create({
          type: n.type,
          title: n.title,
          description: n.description,
          timestamp: ts,
          read: n.read,
          actionUrl: n.actionUrl ?? undefined,
          tenantId: this.map('tenant'),
        } as any),
      );
    }
  }

  // ── retention customers ──────────────────────────────────────────────
  private async seedRetentionCustomers(): Promise<void> {
    this.logger.log('  Retention customers...');

    interface RetDef {
      cust: string;
      daysSince: number;
      service: string | null;
      value: number;
      status: RetentionStatus;
    }

    const defs: RetDef[] = [
      { cust: 'cust-1', daysSince: 55, service: 'Ceramic Maintenance Wash', value: 2500, status: RetentionStatus.DUE },
      { cust: 'cust-6', daysSince: 62, service: 'Maintenance Wash', value: 2000, status: RetentionStatus.DUE },
      { cust: 'cust-8', daysSince: 45, service: 'Maintenance Wash', value: 3000, status: RetentionStatus.CONTACTED },
      { cust: 'cust-11', daysSince: 90, service: 'Interior Detailing', value: 8000, status: RetentionStatus.DUE },
      { cust: 'cust-14', daysSince: 75, service: 'Full Detailing', value: 12000, status: RetentionStatus.DUE },
      { cust: 'cust-3', daysSince: 120, service: 'Ceramic Maintenance', value: 5000, status: RetentionStatus.DUE },
      { cust: 'cust-9', daysSince: 180, service: 'Premium Detailing', value: 15000, status: RetentionStatus.DUE },
      { cust: 'cust-13', daysSince: 35, service: 'Maintenance Wash', value: 2500, status: RetentionStatus.BOOKED },
      { cust: 'cust-16', daysSince: 50, service: 'Ceramic Maintenance Wash', value: 3500, status: RetentionStatus.CONTACTED },
      { cust: 'cust-5', daysSince: 100, service: 'Interior Detailing', value: 10000, status: RetentionStatus.DUE },
      { cust: 'cust-2', daysSince: 30, service: 'Maintenance Wash', value: 2000, status: RetentionStatus.DUE },
      { cust: 'cust-12', daysSince: 365, service: 'Annual Service Package', value: 20000, status: RetentionStatus.DECLINED },
    ];

    for (const r of defs) {
      const lastVisit = new Date(Date.now() - r.daysSince * 86400000);
      await this.retentionCustomers.save(
        this.retentionCustomers.create({
          customerId: this.map(r.cust),
          lastVisit,
          daysSinceVisit: r.daysSince,
          recommendedService: r.service ?? undefined,
          estimatedValue: r.value,
          status: r.status,
          tenantId: this.map('tenant'),
        } as any),
      );
    }
  }

  private async seedDsData(): Promise<void> {
    // Try seed data dir first, then the scripts downloads dir
    let dsDataPath = path.join(process.cwd(), 'src', 'seed', 'data', 'ds-invoices.json');
    if (!fs.existsSync(dsDataPath)) {
      dsDataPath = path.join(process.cwd(), '..', 'scripts', 'downloads', 'ds-extracted', 'extracted-data.json');
    }
    if (!fs.existsSync(dsDataPath)) {
      this.logger.log('  No DS extracted data found — skipping DS import.');
      return;
    }

    this.logger.log('  Importing DS extracted data...');
    const records = JSON.parse(fs.readFileSync(dsDataPath, 'utf-8')).filter((r: any) => r.hasData);
    const tenantId = this.map('tenant');
    const phoneToCustomerId = new Map<string, string>();
    const regToVehicleId = new Map<string, string>();
    let custCreated = 0, vehCreated = 0, invCreated = 0;

    for (const r of records) {
      const d = r.detail;
      if (!d) continue;

      try {
        const phone = d.customerPhone?.trim();
        const name = d.customerName?.trim() || r.name?.trim() || 'DS Customer';
        if (!phone || phone.length < 5) continue;

        // Find or create customer
        let customerId = phoneToCustomerId.get(phone);
        if (!customerId) {
          const existing = await this.customers.findOne({ where: { tenantId, phone } });
          if (existing) {
            customerId = existing.id;
          } else {
            const addr = [d.customerAddress1, d.customerAddress2].filter(Boolean).join(', ');
            const email = d.customerEmail && d.customerEmail !== 'nil@gmail.com' ? d.customerEmail : '';
            const cust = await this.customers.save(this.customers.create({
              tenantId, name, phone, email, address: addr,
              tags: ['ds-import'], notes: `[DS:${r.bookingId}]`,
              lifetimeSpend: 0,
            }));
            customerId = cust.id;
            custCreated++;
          }
          phoneToCustomerId.set(phone, customerId);
        }

        // Find or create vehicle
        const regNo = d.registrationNo?.trim();
        let vehicleId: string | null = null;
        if (regNo && regNo.length > 3) {
          const regKey = regNo.replace(/\s/g, '').toLowerCase();
          vehicleId = regToVehicleId.get(regKey) || null;
          if (!vehicleId) {
            const existing = await this.vehicles.createQueryBuilder('v')
              .where('v.tenantId = :tenantId', { tenantId })
              .andWhere('REPLACE(v.registration_number, \' \', \'\') ILIKE :reg', { reg: regKey })
              .getOne();
            if (existing) {
              vehicleId = existing.id;
            } else {
              const veh = await this.vehicles.save(this.vehicles.create({
                tenantId, customerId,
                make: d.vehicleName === 'Car' ? 'Car' : (d.vehicleName || 'Car'),
                model: d.vehicleModel || 'Unknown',
                registrationNumber: regNo,
                color: d.vehicleColor || null,
              }));
              vehicleId = veh.id;
              vehCreated++;
            }
            regToVehicleId.set(regKey, vehicleId);
          }
        }

        // Create invoice
        let amount = parseFloat(d.subtotal) || 0;
        if (!amount && d.lineItems?.length > 0) {
          amount = d.lineItems.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
        }
        if (amount > 0) {
          const pm = (d.paymentMode || 'cash').toLowerCase();
          await this.invoices.save(this.invoices.create({
            tenantId, customerId, amount, deposit: 0, balance: 0,
            status: InvoiceStatus.PAID,
            paymentMethod: pm === 'upi' ? PaymentMethod.UPI : pm === 'card' ? PaymentMethod.CARD : PaymentMethod.CASH,
          } as any));
          invCreated++;
        }
      } catch (err) {
        // Skip failures silently
      }
    }

    this.logger.log(`  DS import: ${custCreated} customers, ${vehCreated} vehicles, ${invCreated} invoices`);
  }
}
