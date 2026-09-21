import { Injectable, NotFoundException, BadRequestException, Inject, Optional, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity.js';
import { Service as ServiceEntity } from '../services/entities/service.entity.js';
import { Job } from '../jobs/entities/job.entity.js';
import { JobTimelineEntry } from '../jobs/entities/job-timeline-entry.entity.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { BookingStatus, JobStatus } from '../common/enums/index.js';
import { DsBridgeService } from '../ds-bridge/ds-bridge.service.js';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepo: Repository<ServiceEntity>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(JobTimelineEntry)
    private readonly timelineRepo: Repository<JobTimelineEntry>,
    @Optional() @Inject(DsBridgeService)
    private readonly dsBridgeService?: DsBridgeService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto & { status?: string; date?: string }) {
    const { page = 1, limit = 20, status, date } = query;
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (date) where.date = date;

    const [data, total] = await this.bookingRepo.findAndCount({
      where,
      relations: ['customer', 'vehicle', 'services'],
      skip: (page - 1) * limit,
      take: limit,
      order: { date: 'ASC', time: 'ASC' },
    });

    return { data, total };
  }

  async findOne(tenantId: string, id: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id, tenantId },
      relations: ['customer', 'vehicle', 'services'],
    });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return booking;
  }

  async create(tenantId: string, dto: CreateBookingDto) {
    const { serviceIds, ...rest } = dto;
    const services = await this.serviceRepo.findByIds(serviceIds);
    const booking = this.bookingRepo.create({ ...rest, services, tenantId });
    const saved = await this.bookingRepo.save(booking);

    // Fire-and-forget push to Detailing Street CRM
    if (this.dsBridgeService) {
      try {
        const fullBooking = await this.bookingRepo.findOne({
          where: { id: saved.id },
          relations: ['customer', 'vehicle', 'services'],
        });
        if (fullBooking?.customer) {
          this.dsBridgeService.pushBookingToDSAsync({
            name: fullBooking.customer.name,
            email: fullBooking.customer.email || '',
            phone: fullBooking.customer.phone,
            carName: fullBooking.vehicle
              ? `${fullBooking.vehicle.make} ${fullBooking.vehicle.model}`.trim()
              : '',
            carNumber: fullBooking.vehicle?.registrationNumber || '',
            carColor: fullBooking.vehicle?.color || '',
            date: fullBooking.date,
            time: fullBooking.time,
            price: fullBooking.estimatedPrice,
            advance: fullBooking.deposit,
            package: fullBooking.services?.[0]?.name || '',
            remark: fullBooking.notes || '',
          });
        }
      } catch (err) {
        this.logger.warn(`DS push failed (non-blocking): ${(err as Error).message}`);
      }
    }

    return saved;
  }

  async update(tenantId: string, id: string, dto: UpdateBookingDto) {
    const booking = await this.findOne(tenantId, id);
    const { serviceIds, ...rest } = dto;

    Object.assign(booking, rest);

    if (serviceIds) {
      booking.services = await this.serviceRepo.findByIds(serviceIds);
    }

    return this.bookingRepo.save(booking);
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateBookingStatusDto) {
    const booking = await this.findOne(tenantId, id);
    booking.status = dto.status;
    return this.bookingRepo.save(booking);
  }

  async remove(tenantId: string, id: string) {
    const booking = await this.findOne(tenantId, id);
    return this.bookingRepo.remove(booking);
  }

  async startJob(tenantId: string, bookingId: string) {
    const booking = await this.findOne(tenantId, bookingId);

    if (booking.status === BookingStatus.IN_PROGRESS) {
      throw new BadRequestException('A job has already been started for this booking');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot start a job from a cancelled booking');
    }

    // Update booking status
    booking.status = BookingStatus.IN_PROGRESS;
    await this.bookingRepo.save(booking);

    // Create the job
    const job = this.jobRepo.create({
      tenantId,
      customerId: booking.customerId,
      vehicleId: booking.vehicleId!,
      services: booking.services,
      status: JobStatus.CAR_RECEIVED,
      assignedTo: null,
      estimatedPrice: booking.estimatedPrice,
      deposit: booking.deposit,
      notes: booking.notes,
    });
    const savedJob = await this.jobRepo.save(job);

    // Create initial timeline entry
    const entry = this.timelineRepo.create({
      jobId: savedJob.id,
      stage: JobStatus.CAR_RECEIVED,
      timestamp: new Date(),
      notes: `Job started from booking ${bookingId}`,
      photos: [],
      tenantId,
    });
    await this.timelineRepo.save(entry);

    return savedJob;
  }
}
