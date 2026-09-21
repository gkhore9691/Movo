import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../jobs/entities/job.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Notification } from '../notifications/entities/notification.entity.js';
import { RetentionCustomer } from '../retention/entities/retention-customer.entity.js';
import { InvoiceStatus, JobStatus, LeadStatus, RetentionStatus } from '../common/enums/index.js';

@Injectable()
export class PulseService {
  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Notification) private notificationRepo: Repository<Notification>,
    @InjectRepository(RetentionCustomer) private retentionRepo: Repository<RetentionCustomer>,
  ) {}

  async getDashboard(tenantId: string) {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaysRevenue = await this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.amount), 0)', 'total')
      .where('i.status = :status', { status: InvoiceStatus.PAID })
      .andWhere('i.paidAt BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
      .andWhere('i.tenant_id = :tenantId', { tenantId })
      .getRawOne();

    const todayStr = todayStart.toISOString().split('T')[0];
    const todaysBookings = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.date = :date', { date: todayStr })
      .andWhere('b.tenant_id = :tenantId', { tenantId })
      .getCount();

    const carsInStudio = await this.jobRepo
      .createQueryBuilder('j')
      .where('j.status IN (:...statuses)', {
        statuses: [JobStatus.CAR_RECEIVED, JobStatus.INSPECTION, JobStatus.WORK_IN_PROGRESS, JobStatus.QUALITY_CHECK, JobStatus.READY],
      })
      .andWhere('j.tenant_id = :tenantId', { tenantId })
      .getCount();

    const openEnquiries = await this.leadRepo.count({ where: { status: LeadStatus.NEW, tenantId } });

    const followUpsDue = await this.leadRepo
      .createQueryBuilder('l')
      .where('l.followUpDate <= :today', { today: todayEnd })
      .andWhere('l.tenant_id = :tenantId', { tenantId })
      .getCount();

    const recommendations: Array<{ icon: string; title: string; description: string; action: string; route: string }> = [];

    const quotedLeadsDue = await this.leadRepo
      .createQueryBuilder('l')
      .where('l.status = :status', { status: LeadStatus.QUOTED })
      .andWhere('l.followUpDate <= :today', { today: todayEnd })
      .andWhere('l.tenant_id = :tenantId', { tenantId })
      .getCount();
    if (quotedLeadsDue > 0) {
      recommendations.push({
        icon: 'phone',
        title: 'Follow Up on Quoted Leads',
        description: `${quotedLeadsDue} quoted lead(s) need follow-up today.`,
        action: 'View Leads',
        route: '/leads',
      });
    }

    const retentionDue = await this.retentionRepo.count({ where: { status: RetentionStatus.DUE, tenantId } });
    if (retentionDue > 0) {
      recommendations.push({
        icon: 'users',
        title: 'Retention Campaign Needed',
        description: `${retentionDue} customer(s) are at risk of churning.`,
        action: 'View Retention',
        route: '/retention',
      });
    }

    const pendingInvoices = await this.invoiceRepo.count({ where: { status: InvoiceStatus.SENT, tenantId } });
    if (pendingInvoices > 0) {
      recommendations.push({
        icon: 'credit-card',
        title: 'Collect Pending Payments',
        description: `${pendingInvoices} invoice(s) are awaiting payment.`,
        action: 'View Invoices',
        route: '/invoices',
      });
    }

    const overdueInvoices = await this.invoiceRepo.count({ where: { status: InvoiceStatus.OVERDUE, tenantId } });
    if (overdueInvoices > 0) {
      recommendations.push({
        icon: 'alert-triangle',
        title: 'Overdue Invoices',
        description: `${overdueInvoices} invoice(s) are overdue.`,
        action: 'View Invoices',
        route: '/invoices',
      });
    }

    if (openEnquiries > 0) {
      recommendations.push({
        icon: 'inbox',
        title: 'New Enquiries',
        description: `${openEnquiries} new enquiry/enquiries waiting for response.`,
        action: 'View Leads',
        route: '/leads',
      });
    }

    const recentNotifications = await this.notificationRepo.find({
      where: { tenantId },
      order: { timestamp: 'DESC' },
      take: 5,
    });

    return {
      greeting,
      stats: {
        todaysRevenue: parseFloat(todaysRevenue.total),
        todaysBookings,
        carsInStudio,
        openEnquiries,
        followUpsDue,
      },
      recommendations: recommendations.slice(0, 5),
      recentNotifications,
    };
  }
}
