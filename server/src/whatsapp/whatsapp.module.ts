import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Tenant } from '../tenants/entities/tenant.entity.js';
import { Customer } from '../customers/entities/customer.entity.js';
import { Conversation } from '../conversations/entities/conversation.entity.js';
import { Message } from '../conversations/entities/message.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { WhatsAppService } from './whatsapp.service.js';
import { WhatsAppController } from './whatsapp.controller.js';
import { WhatsAppGateway } from './whatsapp.gateway.js';
import { ClaudeAiService } from './claude-ai.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Customer, Conversation, Message, Service]),
    AuthModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppGateway, ClaudeAiService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
