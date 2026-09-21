import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ConversationsService } from './conversations.service.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all conversations' })
  findAll(@CurrentUser() user: any) {
    return this.conversationsService.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation with messages' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.conversationsService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a conversation' })
  create(@CurrentUser() user: any, @Body() dto: CreateConversationDto) {
    return this.conversationsService.create(user.tenantId, dto);
  }

  @Patch(':id/toggle-ai')
  @ApiOperation({ summary: 'Toggle AI handling for a conversation' })
  toggleAi(@CurrentUser() user: any, @Param('id') id: string) {
    return this.conversationsService.toggleAiHandling(user.tenantId, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add a message to a conversation' })
  addMessage(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateMessageDto) {
    return this.conversationsService.addMessage(user.tenantId, id, dto);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get paginated messages for a conversation' })
  getMessages(@CurrentUser() user: any, @Param('id') id: string, @Query() pagination: PaginationDto) {
    return this.conversationsService.getMessages(user.tenantId, id, pagination);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.conversationsService.remove(user.tenantId, id);
  }
}
