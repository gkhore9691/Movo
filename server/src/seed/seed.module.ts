import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

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

import { SeedService } from './seed.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Vehicle,
      Service,
      Staff,
      Job,
      JobTimelineEntry,
      Lead,
      Booking,
      Invoice,
      Automation,
      Review,
      Conversation,
      Message,
      Notification,
      RetentionCustomer,
      User,
      Tenant,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
