import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findAll(tenantId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 20, search, sortBy, sortOrder = 'DESC' } = paginationDto;

    const qb = this.customerRepository.createQueryBuilder('customer');

    qb.where('customer.tenant_id = :tenantId', { tenantId });

    if (search) {
      qb.andWhere(
        'customer.name ILIKE :search OR customer.phone ILIKE :search OR customer.email ILIKE :search',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`customer.${sortBy}`, sortOrder);
    } else {
      qb.orderBy('customer.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total };
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.customerRepository.findOne({ where: { id, tenantId } });
    if (!customer) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }
    return customer;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    const customer = this.customerRepository.create({ ...dto, tenantId });
    return this.customerRepository.save(customer);
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.findOne(tenantId, id);
    Object.assign(customer, dto);
    return this.customerRepository.save(customer);
  }

  async updateNotes(tenantId: string, id: string, notes: string) {
    const customer = await this.findOne(tenantId, id);
    customer.notes = notes;
    return this.customerRepository.save(customer);
  }

  async remove(tenantId: string, id: string) {
    const customer = await this.findOne(tenantId, id);
    await this.customerRepository.remove(customer);
    return { deleted: true };
  }
}
