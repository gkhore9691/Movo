import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { Job } from '../jobs/entities/job.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Customer } from '../customers/entities/customer.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { Staff } from '../staff/entities/staff.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Invoice, Customer, Lead, Staff])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
