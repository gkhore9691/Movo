import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { AdminUpdateTenantDto } from './dto/update-tenant.dto.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide statistics' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants with counts' })
  getTenants(@Query() query: { page?: string; limit?: string }) {
    return this.adminService.getTenants(query);
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get a single tenant with stats' })
  getTenant(@Param('id') id: string) {
    return this.adminService.getTenant(id);
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Update a tenant' })
  updateTenant(@Param('id') id: string, @Body() dto: AdminUpdateTenantDto) {
    return this.adminService.updateTenant(id, dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users across tenants' })
  getUsers(@Query() query: { page?: string; limit?: string }) {
    return this.adminService.getUsers(query);
  }
}
