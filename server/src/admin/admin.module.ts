import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/entities/tenant.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { Job } from '../jobs/entities/job.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Customer } from '../customers/entities/customer.entity.js';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User, Job, Invoice, Customer])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
