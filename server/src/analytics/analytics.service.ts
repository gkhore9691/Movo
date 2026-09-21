import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../jobs/entities/job.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Customer } from '../customers/entities/customer.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { Staff } from '../staff/entities/staff.entity.js';
import { InvoiceStatus, JobStatus, LeadStatus } from '../common/enums/index.js';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(Staff) private staffRepo: Repository<Staff>,
  ) {}

  async getRevenueStats(tenantId: string, period?: string) {
    const paidResult = await this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.amount), 0)', 'total')
      .where('i.status = :status', { status: InvoiceStatus.PAID })
      .andWhere('i.tenant_id = :tenantId', { tenantId })
      .getRawOne();

    const pendingResult = await this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.balance), 0)', 'total')
      .where('i.status = :status', { status: InvoiceStatus.SENT })
      .andWhere('i.tenant_id = :tenantId', { tenantId })
      .getRawOne();

    const overdueResult = await this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.balance), 0)', 'total')
      .where('i.status = :status', { status: InvoiceStatus.OVERDUE })
      .andWhere('i.tenant_id = :tenantId', { tenantId })
      .getRawOne();

    return {
      totalRevenue: parseFloat(paidResult.total),
      pendingRevenue: parseFloat(pendingResult.total),
      overdueRevenue: parseFloat(overdueResult.total),
    };
  }

  async getJobStats(tenantId: string) {
    const total = await this.jobRepo.count({ where: { tenantId } });

    const byStatus = await this.jobRepo
      .createQueryBuilder('j')
      .select('j.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('j.tenant_id = :tenantId', { tenantId })
      .groupBy('j.status')
      .getRawMany();

    const completedJobs = await this.jobRepo.count({ where: { status: JobStatus.DELIVERED, tenantId } });

    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.status, count: parseInt(s.count) })),
      completedJobs,
    };
  }

  async getCustomerStats(tenantId: string) {
    const total = await this.customerRepo.count({ where: { tenantId } });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newThisMonth = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.createdAt >= :start', { start: startOfMonth })
      .andWhere('c.tenant_id = :tenantId', { tenantId })
      .getCount();

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const repeatCustomers = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.lifetimeSpend > 0 AND c.customerSince < :date', { date: threeMonthsAgo })
      .andWhere('c.tenant_id = :tenantId', { tenantId })
      .getCount();

    return { total, newThisMonth, repeatCustomers };
  }

  async getLeadStats(tenantId: string) {
    const byStatus = await this.leadRepo
      .createQueryBuilder('l')
      .select('l.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('l.tenant_id = :tenantId', { tenantId })
      .groupBy('l.status')
      .getRawMany();

    const total = byStatus.reduce((sum, s) => sum + parseInt(s.count), 0);
    const won = byStatus.find(s => s.status === LeadStatus.WON);
    const wonCount = won ? parseInt(won.count) : 0;
    const conversionRate = total > 0 ? (wonCount / total) * 100 : 0;

    return {
      byStatus: byStatus.map(s => ({ status: s.status, count: parseInt(s.count) })),
      total,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  async getServiceRevenue(tenantId: string) {
    const results = await this.invoiceRepo
      .createQueryBuilder('i')
      .leftJoin('i.job', 'j')
      .leftJoin('j.services', 's')
      .select('s.name', 'service')
      .addSelect('SUM(i.amount)', 'revenue')
      .where('i.status = :status', { status: InvoiceStatus.PAID })
      .andWhere('i.tenant_id = :tenantId', { tenantId })
      .groupBy('s.name')
      .getRawMany();

    return results.map(r => ({
      service: r.service || 'Unlinked',
      revenue: parseFloat(r.revenue || '0'),
    }));
  }

  async getStaffWorkload(tenantId: string) {
    const staff = await this.staffRepo.find({ where: { tenantId } });

    const workload = await Promise.all(
      staff.map(async (s) => {
        const activeJobs = await this.jobRepo
          .createQueryBuilder('j')
          .where('j.assigned_to = :staffId', { staffId: s.id })
          .andWhere('j.status IN (:...statuses)', {
            statuses: [JobStatus.WORK_IN_PROGRESS, JobStatus.QUALITY_CHECK, JobStatus.BOOKED, JobStatus.CAR_RECEIVED, JobStatus.INSPECTION],
          })
          .andWhere('j.tenant_id = :tenantId', { tenantId })
          .getCount();

        const completedJobs = await this.jobRepo
          .createQueryBuilder('j')
          .where('j.assigned_to = :staffId', { staffId: s.id })
          .andWhere('j.status = :status', { status: JobStatus.DELIVERED })
          .andWhere('j.tenant_id = :tenantId', { tenantId })
          .getCount();

        return {
          name: s.name,
          role: s.role,
          activeJobs,
          completedJobs,
        };
      }),
    );

    return workload;
  }
}
