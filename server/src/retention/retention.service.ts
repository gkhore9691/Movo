import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RetentionCustomer } from './entities/retention-customer.entity.js';
import { UpdateRetentionStatusDto } from './dto/update-retention-status.dto.js';

@Injectable()
export class RetentionService {
  constructor(
    @InjectRepository(RetentionCustomer)
    private readonly repo: Repository<RetentionCustomer>,
  ) {}

  findAll(tenantId: string): Promise<RetentionCustomer[]> {
    return this.repo.find({ where: { tenantId }, relations: ['customer'] });
  }

  async updateStatus(
    tenantId: string,
    customerId: string,
    dto: UpdateRetentionStatusDto,
  ): Promise<RetentionCustomer> {
    const record = await this.repo.findOne({ where: { customerId, tenantId } });
    if (!record) {
      throw new NotFoundException(
        `Retention record for customer ${customerId} not found`,
      );
    }
    record.status = dto.status;
    return this.repo.save(record);
  }

  async recalculate(tenantId: string): Promise<{ updated: number }> {
    const records = await this.repo.find({ where: { tenantId } });
    const now = Date.now();
    for (const rc of records) {
      rc.daysSinceVisit = Math.floor(
        (now - new Date(rc.lastVisit).getTime()) / (1000 * 60 * 60 * 24),
      );
    }
    await this.repo.save(records);
    return { updated: records.length };
  }
}
