import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RetentionCustomer } from './entities/retention-customer.entity.js';
import { RetentionService } from './retention.service.js';
import { RetentionController } from './retention.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([RetentionCustomer])],
  controllers: [RetentionController],
  providers: [RetentionService],
  exports: [RetentionService, TypeOrmModule],
})
export class RetentionModule {}
