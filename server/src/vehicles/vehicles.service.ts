import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
  ) {}

  async findAll(tenantId: string, query: PaginationDto & { customerId?: string }) {
    const { page = 1, limit = 20, customerId } = query;
    const where: Record<string, unknown> = { tenantId };
    if (customerId) where.customerId = customerId;

    const [data, total] = await this.vehicleRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(tenantId: string, id: string) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id, tenantId },
      relations: ['customer'],
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${id} not found`);
    return vehicle;
  }

  async create(tenantId: string, dto: CreateVehicleDto) {
    const vehicle = this.vehicleRepo.create({ ...dto, tenantId });
    return this.vehicleRepo.save(vehicle);
  }

  async update(tenantId: string, id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.findOne(tenantId, id);
    Object.assign(vehicle, dto);
    return this.vehicleRepo.save(vehicle);
  }

  async remove(tenantId: string, id: string) {
    const vehicle = await this.findOne(tenantId, id);
    return this.vehicleRepo.remove(vehicle);
  }
}
