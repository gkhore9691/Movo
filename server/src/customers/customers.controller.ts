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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { UpdateNotesDto } from './dto/update-notes.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers with pagination' })
  findAll(@CurrentUser() user: any, @Query() paginationDto: PaginationDto) {
    return this.customersService.findAll(user.tenantId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by id' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  create(@CurrentUser() user: any, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(user.tenantId, id, dto);
  }

  @Patch(':id/notes')
  @ApiOperation({ summary: 'Update customer notes' })
  updateNotes(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateNotesDto) {
    return this.customersService.updateNotes(user.tenantId, id, dto.notes);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.remove(user.tenantId, id);
  }
}
