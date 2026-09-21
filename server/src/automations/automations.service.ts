import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Automation } from './entities/automation.entity.js';
import { CreateAutomationDto } from './dto/create-automation.dto.js';
import { UpdateAutomationDto } from './dto/update-automation.dto.js';
import { ToggleAutomationDto } from './dto/toggle-automation.dto.js';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectRepository(Automation)
    private readonly repo: Repository<Automation>,
  ) {}

  findAll(tenantId: string): Promise<Automation[]> {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findOne(tenantId: string, id: string): Promise<Automation> {
    const automation = await this.repo.findOneBy({ id, tenantId });
    if (!automation) throw new NotFoundException('Automation not found');
    return automation;
  }

  create(tenantId: string, dto: CreateAutomationDto): Promise<Automation> {
    const automation = this.repo.create({ ...dto, tenantId });
    return this.repo.save(automation);
  }

  async update(tenantId: string, id: string, dto: UpdateAutomationDto): Promise<Automation> {
    const automation = await this.findOne(tenantId, id);
    Object.assign(automation, dto);
    return this.repo.save(automation);
  }

  async toggle(tenantId: string, id: string, dto: ToggleAutomationDto): Promise<Automation> {
    const automation = await this.findOne(tenantId, id);
    automation.enabled = dto.enabled;
    return this.repo.save(automation);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const automation = await this.findOne(tenantId, id);
    await this.repo.remove(automation);
  }
}
