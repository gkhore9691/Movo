import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity.js';
import { Service as ServiceEntity } from '../services/entities/service.entity.js';
import { Customer } from '../customers/entities/customer.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepo: Repository<ServiceEntity>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
  ) {}

  async findAll(tenantId: string, query: PaginationDto & { status?: string }) {
    const { page = 1, limit = 20, status } = query;
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const [data, total] = await this.leadRepo.findAndCount({
      where,
      relations: ['customer', 'vehicle', 'services'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.leadRepo.findOne({
      where: { id, tenantId },
      relations: ['customer', 'vehicle', 'services'],
    });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    return lead;
  }

  async create(tenantId: string, dto: CreateLeadDto) {
    const { serviceIds, ...rest } = dto;
    const services = await this.serviceRepo.findByIds(serviceIds);
    const lead = this.leadRepo.create({ ...rest, services, tenantId });
    return this.leadRepo.save(lead);
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto) {
    const lead = await this.findOne(tenantId, id);
    const { serviceIds, ...rest } = dto;

    Object.assign(lead, rest);

    if (serviceIds) {
      lead.services = await this.serviceRepo.findByIds(serviceIds);
    }

    return this.leadRepo.save(lead);
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateLeadStatusDto) {
    const lead = await this.findOne(tenantId, id);
    lead.status = dto.status;

    if (dto.status === 'won' && !lead.customerId) {
      // Auto-create customer from lead contact info
      const customer = this.customerRepo.create({
        tenantId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email ?? undefined,
        customerSince: new Date(),
        lifetimeSpend: 0,
        notes: `Converted from lead. Source: ${lead.source || 'unknown'}`,
        tags: ['converted-lead'],
      } as Partial<Customer>);
      const savedCustomer = await this.customerRepo.save(customer);
      lead.customerId = savedCustomer.id;

      // Auto-create vehicle if vehicle info exists
      if (lead.vehicleMake && lead.vehicleModel) {
        const vehicle = this.vehicleRepo.create({
          tenantId,
          customerId: savedCustomer.id,
          make: lead.vehicleMake,
          model: lead.vehicleModel,
          year: lead.vehicleYear,
          registrationNumber: lead.vehicleRegistration,
        });
        const savedVehicle = await this.vehicleRepo.save(vehicle);
        lead.vehicleId = savedVehicle.id;
      }
    }

    await this.leadRepo.save(lead);
    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const lead = await this.findOne(tenantId, id);
    return this.leadRepo.remove(lead);
  }
}
