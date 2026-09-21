import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Automation } from './entities/automation.entity.js';
import { AutomationsService } from './automations.service.js';
import { AutomationsController } from './automations.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Automation])],
  controllers: [AutomationsController],
  providers: [AutomationsService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
