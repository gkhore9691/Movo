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
import { ServicesService } from './services.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';

@ApiTags('Services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiQuery({ name: 'category', required: false })
  findAll(@CurrentUser() user: any, @Query('category') category?: string) {
    return this.servicesService.findAll(user.tenantId, category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by id' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.servicesService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  create(@CurrentUser() user: any, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a service' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.servicesService.remove(user.tenantId, id);
  }
}
