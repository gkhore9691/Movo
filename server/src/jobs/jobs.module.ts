import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity.js';
import { JobTimelineEntry } from './entities/job-timeline-entry.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Review } from '../reviews/entities/review.entity.js';
import { JobsService } from './jobs.service.js';
import { JobsController } from './jobs.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Job, JobTimelineEntry, Service, Invoice, Review])],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
