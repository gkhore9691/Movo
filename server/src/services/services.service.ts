import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async findAll(tenantId: string, category?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (category) {
      where.category = category;
    }
    return this.serviceRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(tenantId: string, id: string) {
    const service = await this.serviceRepository.findOne({ where: { id, tenantId } });
    if (!service) {
      throw new NotFoundException(`Service with id "${id}" not found`);
    }
    return service;
  }

  async create(tenantId: string, dto: CreateServiceDto) {
    const service = this.serviceRepository.create({ ...dto, tenantId });
    return this.serviceRepository.save(service);
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    const service = await this.findOne(tenantId, id);
    Object.assign(service, dto);
    return this.serviceRepository.save(service);
  }

  async remove(tenantId: string, id: string) {
    const service = await this.findOne(tenantId, id);
    await this.serviceRepository.remove(service);
    return { deleted: true };
  }
}
