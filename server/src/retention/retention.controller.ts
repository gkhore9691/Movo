import { Controller, Get, Patch, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RetentionService } from './retention.service.js';
import { UpdateRetentionStatusDto } from './dto/update-retention-status.dto.js';

@ApiTags('Retention')
@ApiBearerAuth()
@Controller('retention')
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @Get()
  @ApiOperation({ summary: 'List all retention customers' })
  findAll(@CurrentUser() user: any) {
    return this.retentionService.findAll(user.tenantId);
  }

  @Patch(':customerId/status')
  @ApiOperation({ summary: 'Update retention status for a customer' })
  updateStatus(
    @CurrentUser() user: any,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateRetentionStatusDto,
  ) {
    return this.retentionService.updateStatus(user.tenantId, customerId, dto);
  }

  @Post('recalculate')
  @ApiOperation({ summary: 'Recalculate days since visit for all records' })
  recalculate(@CurrentUser() user: any) {
    return this.retentionService.recalculate(user.tenantId);
  }
}
