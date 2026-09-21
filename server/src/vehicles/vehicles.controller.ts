import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { VehiclesService } from './vehicles.service.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'List vehicles' })
  @ApiQuery({ name: 'customerId', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query() pagination: PaginationDto,
    @Query('customerId') customerId?: string,
  ) {
    return this.vehiclesService.findAll(user.tenantId, { ...pagination, customerId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  findOne(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create vehicle' })
  create(@CurrentUser() user: any, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle' })
  update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vehicle' })
  remove(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.remove(user.tenantId, id);
  }
}
