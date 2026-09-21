import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { Job } from '../jobs/entities/job.entity.js';
import { JobTimelineEntry } from '../jobs/entities/job-timeline-entry.entity.js';
import { BookingsService } from './bookings.service.js';
import { BookingsController } from './bookings.controller.js';
import { DsBridgeModule } from '../ds-bridge/ds-bridge.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Service, Job, JobTimelineEntry]),
    forwardRef(() => DsBridgeModule),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
