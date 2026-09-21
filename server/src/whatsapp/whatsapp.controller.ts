import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { WhatsAppService } from './whatsapp.service.js';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('connect')
  @ApiOperation({ summary: 'Start WhatsApp connection (generates QR)' })
  connect(@CurrentUser() user: any) {
    return this.whatsappService.connect(user.tenantId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get WhatsApp connection status' })
  getStatus(@CurrentUser() user: any) {
    return this.whatsappService.getStatus(user.tenantId);
  }

  @Post('disconnect')
  @ApiOperation({ summary: 'Disconnect WhatsApp' })
  disconnect(@CurrentUser() user: any) {
    return this.whatsappService.disconnect(user.tenantId);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a WhatsApp text message' })
  sendMessage(
    @CurrentUser() user: any,
    @Body() dto: { phone: string; message: string },
  ) {
    return this.whatsappService.sendText(user.tenantId, dto.phone, dto.message);
  }
}
