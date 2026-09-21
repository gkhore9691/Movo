import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PulseService } from './pulse.service.js';
import { PulseController } from './pulse.controller.js';
import { Job } from '../jobs/entities/job.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Notification } from '../notifications/entities/notification.entity.js';
import { RetentionCustomer } from '../retention/entities/retention-customer.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Booking, Lead, Invoice, Notification, RetentionCustomer])],
  controllers: [PulseController],
  providers: [PulseService],
})
export class PulseModule {}
