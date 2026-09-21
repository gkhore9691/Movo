import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AskMovoService } from './ask-movo.service.js';
import { AskMovoDto } from './dto/ask-movo.dto.js';

@ApiTags('AskMovo')
@ApiBearerAuth()
@Controller('ask-movo')
export class AskMovoController {
  constructor(private readonly askMovoService: AskMovoService) {}

  @Post()
  @ApiOperation({ summary: 'Ask Movo AI assistant a question' })
  ask(@CurrentUser() user: any, @Body() dto: AskMovoDto) {
    return this.askMovoService.ask(user.tenantId, dto.query);
  }
}
