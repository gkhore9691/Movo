import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async findAll(tenantId: string, unreadOnly?: boolean): Promise<Notification[]> {
    const where: any = { tenantId };
    if (unreadOnly) where.read = false;
    return this.repo.find({ where, order: { timestamp: 'DESC' } });
  }

  async create(tenantId: string, dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.repo.create({
      ...dto,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      tenantId,
    });
    return this.repo.save(notification);
  }

  async markAsRead(tenantId: string, id: string): Promise<Notification> {
    const notification = await this.repo.findOneBy({ id, tenantId });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.read = true;
    return this.repo.save(notification);
  }

  async markAllAsRead(tenantId: string): Promise<void> {
    await this.repo.update({ tenantId }, { read: true });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const notification = await this.repo.findOneBy({ id, tenantId });
    if (!notification) throw new NotFoundException('Notification not found');
    await this.repo.remove(notification);
  }
}
