import { Module } from '@nestjs/common';
import { AskMovoService } from './ask-movo.service.js';
import { AskMovoController } from './ask-movo.controller.js';

@Module({
  controllers: [AskMovoController],
  providers: [AskMovoService],
})
export class AskMovoModule {}
