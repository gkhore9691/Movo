import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AutomationsService } from './automations.service.js';
import { CreateAutomationDto } from './dto/create-automation.dto.js';
import { UpdateAutomationDto } from './dto/update-automation.dto.js';
import { ToggleAutomationDto } from './dto/toggle-automation.dto.js';

@ApiTags('Automations')
@ApiBearerAuth()
@Controller('automations')
export class AutomationsController {
  constructor(private readonly service: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all automations' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an automation by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an automation' })
  create(@CurrentUser() user: any, @Body() dto: CreateAutomationDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an automation' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateAutomationDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle automation enabled state' })
  toggle(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: ToggleAutomationDto) {
    return this.service.toggle(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an automation' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
