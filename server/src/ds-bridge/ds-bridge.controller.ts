import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DsBridgeService } from './ds-bridge.service.js';
import { ImportDataDto } from './dto/import-data.dto.js';

@ApiTags('DS Bridge')
@ApiBearerAuth()
@Controller('ds-bridge')
export class DsBridgeController {
  constructor(private readonly dsBridgeService: DsBridgeService) {}

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import data from DS CRM JSON',
    description:
      'Accepts scraped DS CRM data (bookings, queries, invoices, follow-ups) and imports them into Movo.',
  })
  @ApiResponse({ status: 200, description: 'Import completed with summary' })
  async importData(@CurrentUser() user: any, @Body() dto: ImportDataDto) {
    return this.dsBridgeService.importAll(user.tenantId, dto);
  }

  @Post('scrape')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger DS CRM scrape and import',
    description:
      'Runs the Playwright scraper against admin.detailingstreet.com, then imports the data. This may take 1-2 minutes.',
  })
  @ApiResponse({ status: 200, description: 'Scrape and import completed' })
  async triggerScrape(@CurrentUser() user: any) {
    return this.dsBridgeService.triggerScrape(user.tenantId);
  }

  @Post('push-booking')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Push a booking to DS CRM',
    description:
      'Creates a new booking in the Detailing Street CRM by automating the new_booking form.',
  })
  @ApiResponse({ status: 200, description: 'Booking pushed (or queued)' })
  async pushBooking(
    @CurrentUser() user: any,
    @Body()
    body: {
      name: string;
      email: string;
      phone: string;
      carName: string;
      carNumber: string;
      carColor: string;
      date: string;
      time: string;
      price: number;
      advance: number;
      package: string;
      remark: string;
    },
  ) {
    return this.dsBridgeService.pushBookingToDS(body);
  }
}
