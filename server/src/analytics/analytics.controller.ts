import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AnalyticsService } from './analytics.service.js';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter'] })
  getRevenueStats(@CurrentUser() user: any, @Query('period') period?: string) {
    return this.analyticsService.getRevenueStats(user.tenantId, period);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get job statistics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter'] })
  getJobStats(@CurrentUser() user: any, @Query('period') _period?: string) {
    return this.analyticsService.getJobStats(user.tenantId);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customer statistics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter'] })
  getCustomerStats(@CurrentUser() user: any, @Query('period') _period?: string) {
    return this.analyticsService.getCustomerStats(user.tenantId);
  }

  @Get('leads')
  @ApiOperation({ summary: 'Get lead statistics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter'] })
  getLeadStats(@CurrentUser() user: any, @Query('period') _period?: string) {
    return this.analyticsService.getLeadStats(user.tenantId);
  }

  @Get('services')
  @ApiOperation({ summary: 'Get revenue per service type' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter'] })
  getServiceRevenue(@CurrentUser() user: any, @Query('period') _period?: string) {
    return this.analyticsService.getServiceRevenue(user.tenantId);
  }

  @Get('staff-workload')
  @ApiOperation({ summary: 'Get staff workload statistics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter'] })
  getStaffWorkload(@CurrentUser() user: any, @Query('period') _period?: string) {
    return this.analyticsService.getStaffWorkload(user.tenantId);
  }
}
