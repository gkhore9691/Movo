import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'List bookings' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'date', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    return this.bookingsService.findAll(user.tenantId, { ...pagination, status, date });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  findOne(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create booking' })
  create(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update booking' })
  update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(user.tenantId, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status' })
  updateStatus(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(user.tenantId, id, dto);
  }

  @Post(':id/start-job')
  @ApiOperation({ summary: 'Start job from booking' })
  startJob(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.startJob(user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete booking' })
  remove(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.remove(user.tenantId, id);
  }
}
