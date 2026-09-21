import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { StaffRole } from '../common/enums/index.js';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  async findAll(tenantId: string, role?: StaffRole) {
    const where: Record<string, unknown> = { tenantId };
    if (role) {
      where.role = role;
    }
    return this.staffRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(tenantId: string, id: string) {
    const staff = await this.staffRepository.findOne({ where: { id, tenantId } });
    if (!staff) {
      throw new NotFoundException(`Staff member with id "${id}" not found`);
    }
    return staff;
  }

  async create(tenantId: string, dto: CreateStaffDto) {
    const staff = this.staffRepository.create({ ...dto, tenantId });
    return this.staffRepository.save(staff);
  }

  async update(tenantId: string, id: string, dto: UpdateStaffDto) {
    const staff = await this.findOne(tenantId, id);
    Object.assign(staff, dto);
    return this.staffRepository.save(staff);
  }

  async remove(tenantId: string, id: string) {
    const staff = await this.findOne(tenantId, id);
    await this.staffRepository.remove(staff);
    return { deleted: true };
  }
}
