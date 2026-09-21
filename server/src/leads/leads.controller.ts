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
import { LeadsService } from './leads.service.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List leads' })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.leadsService.findAll(user.tenantId, { ...pagination, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  findOne(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create lead' })
  create(@CurrentUser() user: any, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead' })
  update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(user.tenantId, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update lead status' })
  updateStatus(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateStatus(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete lead' })
  remove(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.remove(user.tenantId, id);
  }
}
