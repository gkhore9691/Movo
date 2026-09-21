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
import { JobsService } from './jobs.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { UpdateJobStatusDto } from './dto/update-job-status.dto.js';
import { CreateTimelineEntryDto } from './dto/create-timeline-entry.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List jobs' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.jobsService.findAll(user.tenantId, {
      ...pagination,
      status,
      customerId,
      assignedTo,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  findOne(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create job' })
  create(@CurrentUser() user: any, @Body() dto: CreateJobDto) {
    return this.jobsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update job' })
  update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(user.tenantId, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job status' })
  updateStatus(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.jobsService.updateStatus(user.tenantId, id, dto);
  }

  @Post(':id/timeline')
  @ApiOperation({ summary: 'Add timeline entry' })
  addTimelineEntry(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTimelineEntryDto,
  ) {
    return this.jobsService.addTimelineEntry(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete job' })
  remove(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.remove(user.tenantId, id);
  }
}
