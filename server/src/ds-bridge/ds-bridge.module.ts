import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { DsBridgeService } from './ds-bridge.service.js';
import { DsBridgeController } from './ds-bridge.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Vehicle,
      Booking,
      Lead,
      Invoice,
      Service,
    ]),
  ],
  controllers: [DsBridgeController],
  providers: [DsBridgeService],
  exports: [DsBridgeService],
})
export class DsBridgeModule {}
