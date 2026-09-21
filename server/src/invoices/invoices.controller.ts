import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { InvoicesService } from './invoices.service.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto.js';
import { PayInvoiceDto } from './dto/pay-invoice.dto.js';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List all invoices' })
  findAll(@CurrentUser() user: any) {
    return this.invoicesService.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  findOne(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  create(@CurrentUser() user: any, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(user.tenantId, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update invoice status' })
  updateStatus(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.invoicesService.updateStatus(user.tenantId, id, dto);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  pay(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PayInvoiceDto) {
    return this.invoicesService.pay(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an invoice' })
  remove(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.remove(user.tenantId, id);
  }
}
