import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto.js';
import { PayInvoiceDto } from './dto/pay-invoice.dto.js';
import { InvoiceStatus } from '../common/enums/index.js';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
  ) {}

  findAll(tenantId: string) {
    return this.invoiceRepo.find({ where: { tenantId }, relations: ['customer', 'job'] });
  }

  async findOne(tenantId: string, id: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, tenantId },
      relations: ['customer', 'job'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  create(tenantId: string, dto: CreateInvoiceDto) {
    const invoice = this.invoiceRepo.create({ ...dto, tenantId });
    return this.invoiceRepo.save(invoice);
  }

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(tenantId, id);
    Object.assign(invoice, dto);
    return this.invoiceRepo.save(invoice);
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateInvoiceStatusDto) {
    const invoice = await this.findOne(tenantId, id);
    invoice.status = dto.status;
    if (dto.paymentMethod) {
      invoice.paymentMethod = dto.paymentMethod;
    }
    return this.invoiceRepo.save(invoice);
  }

  async pay(tenantId: string, id: string, dto: PayInvoiceDto) {
    const invoice = await this.findOne(tenantId, id);
    invoice.status = InvoiceStatus.PAID;
    invoice.balance = 0;
    invoice.paidAt = new Date();
    invoice.paymentMethod = dto.paymentMethod;
    return this.invoiceRepo.save(invoice);
  }

  async remove(tenantId: string, id: string) {
    const invoice = await this.findOne(tenantId, id);
    await this.invoiceRepo.remove(invoice);
  }
}
