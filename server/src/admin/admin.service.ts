import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { Job } from '../jobs/entities/job.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Customer } from '../customers/entities/customer.entity.js';
import { AdminUpdateTenantDto } from './dto/update-tenant.dto.js';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async getStats() {
    const totalTenants = await this.tenantRepository.count();
    const totalUsers = await this.userRepository.count();
    const totalJobs = await this.jobRepository.count();

    const revenueResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.amount), 0)', 'total')
      .where('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    const totalRevenue = parseFloat(revenueResult?.total ?? '0');

    return { totalTenants, totalUsers, totalJobs, totalRevenue };
  }

  async getTenants(query: { page?: string; limit?: string }) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const [tenants, total] = await this.tenantRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const tenantsWithCounts = await Promise.all(
      tenants.map(async (tenant) => {
        const userCount = await this.userRepository.count({
          where: { tenantId: tenant.id },
        });
        const jobCount = await this.jobRepository.count({
          where: { tenantId: tenant.id } as any,
        });
        return { ...tenant, userCount, jobCount };
      }),
    );

    return { data: tenantsWithCounts, total, page, limit };
  }

  async getTenant(id: string) {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const userCount = await this.userRepository.count({
      where: { tenantId: tenant.id },
    });
    const jobCount = await this.jobRepository.count({
      where: { tenantId: tenant.id } as any,
    });
    const customerCount = await this.customerRepository.count({
      where: { tenantId: tenant.id } as any,
    });

    return { ...tenant, userCount, jobCount, customerCount };
  }

  async updateTenant(id: string, dto: AdminUpdateTenantDto) {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    Object.assign(tenant, dto);
    return this.tenantRepository.save(tenant);
  }

  async getUsers(query: { page?: string; limit?: string }) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const [data, total] = await this.userRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: ['id', 'email', 'name', 'role', 'tenantId', 'createdAt'],
    });

    return { data, total, page, limit };
  }
}
