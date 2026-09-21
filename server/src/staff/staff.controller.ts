import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { StaffService } from './staff.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { StaffRole } from '../common/enums/index.js';

@ApiTags('Staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'Get all staff members' })
  @ApiQuery({ name: 'role', required: false, enum: StaffRole })
  findAll(@CurrentUser() user: any, @Query('role') role?: StaffRole) {
    return this.staffService.findAll(user.tenantId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a staff member by id' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.staffService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new staff member' })
  create(@CurrentUser() user: any, @Body() dto: CreateStaffDto) {
    return this.staffService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a staff member' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a staff member' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.staffService.remove(user.tenantId, id);
  }
}
