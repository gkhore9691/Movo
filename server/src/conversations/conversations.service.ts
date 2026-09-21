import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity.js';
import { Message } from './entities/message.entity.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { MessageSender } from '../common/enums/index.js';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  findAll(tenantId: string) {
    return this.conversationRepo.find({
      where: { tenantId },
      relations: ['customer'],
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const conversation = await this.conversationRepo
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.customer', 'customer')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .where('conversation.id = :id', { id })
      .andWhere('conversation.tenant_id = :tenantId', { tenantId })
      .orderBy('messages.timestamp', 'ASC')
      .getOne();

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    return conversation;
  }

  create(tenantId: string, dto: CreateConversationDto) {
    const conversation = this.conversationRepo.create({
      customerId: dto.customerId,
      tenantId,
    });
    return this.conversationRepo.save(conversation);
  }

  async toggleAiHandling(tenantId: string, id: string) {
    const conversation = await this.conversationRepo.findOneBy({ id, tenantId });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    conversation.aiHandling = !conversation.aiHandling;
    return this.conversationRepo.save(conversation);
  }

  async addMessage(tenantId: string, conversationId: string, dto: CreateMessageDto) {
    const conversation = await this.conversationRepo.findOneBy({
      id: conversationId,
      tenantId,
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const message = this.messageRepo.create({
      conversationId,
      content: dto.content,
      sender: dto.sender,
      read: dto.read ?? false,
      timestamp: new Date(),
      tenantId,
    });
    const savedMessage = await this.messageRepo.save(message);

    conversation.lastMessage = dto.content;
    if (dto.sender === MessageSender.CUSTOMER) {
      conversation.unreadCount += 1;
    }
    await this.conversationRepo.save(conversation);

    return savedMessage;
  }

  async getMessages(tenantId: string, conversationId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [data, total] = await this.messageRepo.findAndCount({
      where: { conversationId, tenantId },
      order: { timestamp: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async remove(tenantId: string, id: string) {
    const conversation = await this.conversationRepo.findOneBy({ id, tenantId });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    await this.conversationRepo.remove(conversation);
  }
}
