import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PulseService } from './pulse.service.js';

@ApiTags('Pulse')
@ApiBearerAuth()
@Controller('pulse')
export class PulseController {
  constructor(private readonly pulseService: PulseService) {}

  @Get()
  @ApiOperation({ summary: 'Get pulse dashboard data' })
  getDashboard(@CurrentUser() user: any) {
    return this.pulseService.getDashboard(user.tenantId);
  }
}
