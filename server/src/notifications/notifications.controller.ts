import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  findAll(@CurrentUser() user: any, @Query('unreadOnly') unreadOnly?: string) {
    return this.service.findAll(user.tenantId, unreadOnly === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Create a notification' })
  create(@CurrentUser() user: any, @Body() dto: CreateNotificationDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser() user: any) {
    return this.service.markAllAsRead(user.tenantId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.markAsRead(user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
