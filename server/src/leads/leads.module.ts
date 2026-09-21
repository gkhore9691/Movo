import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { Customer } from '../customers/entities/customer.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { LeadsService } from './leads.service.js';
import { LeadsController } from './leads.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Service, Customer, Vehicle])],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
