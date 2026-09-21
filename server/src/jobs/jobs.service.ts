import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Job } from './entities/job.entity.js';
import { JobTimelineEntry } from './entities/job-timeline-entry.entity.js';
import { Service as ServiceEntity } from '../services/entities/service.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Review } from '../reviews/entities/review.entity.js';
import { InvoiceStatus, ReviewStatus, JobStatus } from '../common/enums/index.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { UpdateJobStatusDto } from './dto/update-job-status.dto.js';
import { CreateTimelineEntryDto } from './dto/create-timeline-entry.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(JobTimelineEntry)
    private readonly timelineRepo: Repository<JobTimelineEntry>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepo: Repository<ServiceEntity>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    tenantId: string,
    query: PaginationDto & {
      status?: string;
      customerId?: string;
      assignedTo?: string;
    },
  ) {
    const { page = 1, limit = 20, status, customerId, assignedTo } = query;
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (assignedTo) where.assignedTo = assignedTo;

    const [data, total] = await this.jobRepo.findAndCount({
      where,
      relations: ['customer', 'vehicle', 'services', 'assignedStaff', 'timeline'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(tenantId: string, id: string) {
    const job = await this.jobRepo.findOne({
      where: { id, tenantId },
      relations: ['customer', 'vehicle', 'services', 'assignedStaff', 'timeline'],
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  async create(tenantId: string, dto: CreateJobDto) {
    const { serviceIds, ...rest } = dto;
    const services = await this.serviceRepo.findByIds(serviceIds);
    const job = this.jobRepo.create({ ...rest, services, tenantId });

    const saved = await this.jobRepo.save(job);

    const entry = this.timelineRepo.create({
      jobId: saved.id,
      stage: saved.status,
      timestamp: new Date(),
      notes: dto.notes ?? '',
      photos: [],
      tenantId,
    });
    await this.timelineRepo.save(entry);

    return this.findOne(tenantId, saved.id);
  }

  async update(tenantId: string, id: string, dto: UpdateJobDto) {
    const job = await this.findOne(tenantId, id);
    const { serviceIds, ...rest } = dto;

    Object.assign(job, rest);

    if (serviceIds) {
      job.services = await this.serviceRepo.findByIds(serviceIds);
    }

    return this.jobRepo.save(job);
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateJobStatusDto) {
    const result = await this.dataSource.transaction(async (manager) => {
      const job = await manager.findOne(Job, { where: { id, tenantId } });
      if (!job) throw new NotFoundException(`Job ${id} not found`);

      job.status = dto.status;
      job.updatedAt = new Date();
      await manager.save(Job, job);

      const entry = manager.create(JobTimelineEntry, {
        jobId: id,
        stage: dto.status,
        timestamp: new Date(),
        employeeId: dto.employeeId ?? null,
        notes: dto.notes ?? '',
        photos: dto.photos ?? [],
        tenantId,
      });
      await manager.save(JobTimelineEntry, entry);

      return job;
    });

    // When job is delivered, auto-create invoice and review request
    if (dto.status === JobStatus.DELIVERED) {
      const amount = result.actualPrice ?? result.estimatedPrice;
      const invoice = this.invoiceRepo.create({
        tenantId,
        jobId: id,
        customerId: result.customerId,
        amount,
        deposit: result.deposit,
        balance: amount - result.deposit,
        status: InvoiceStatus.SENT,
      });
      await this.invoiceRepo.save(invoice);

      const review = this.reviewRepo.create({
        tenantId,
        customerId: result.customerId,
        jobId: id,
        rating: 0,
        comment: '',
        status: ReviewStatus.REQUESTED,
      });
      await this.reviewRepo.save(review);
    }

    return this.findOne(tenantId, id);
  }

  async addTimelineEntry(tenantId: string, id: string, dto: CreateTimelineEntryDto) {
    const job = await this.findOne(tenantId, id);
    const entry = this.timelineRepo.create({
      jobId: job.id,
      stage: dto.stage,
      timestamp: new Date(),
      employeeId: dto.employeeId ?? null,
      notes: dto.notes ?? '',
      photos: dto.photos ?? [],
      tenantId,
    });
    return this.timelineRepo.save(entry);
  }

  async remove(tenantId: string, id: string) {
    const job = await this.findOne(tenantId, id);
    return this.jobRepo.remove(job);
  }
}
