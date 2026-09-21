import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs';

import { Tenant } from '../tenants/entities/tenant.entity.js';
import { Customer } from '../customers/entities/customer.entity.js';
import { Conversation } from '../conversations/entities/conversation.entity.js';
import { Message } from '../conversations/entities/message.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { MessageSender } from '../common/enums/index.js';
import { ClaudeAiService } from './claude-ai.service.js';
import { WhatsAppGateway } from './whatsapp.gateway.js';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private connections: Map<string, any> = new Map();
  private qrCodes: Map<string, string> = new Map();
  private connecting: Set<string> = new Set();

  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,
    private claudeAi: ClaudeAiService,
    private gateway: WhatsAppGateway,
  ) {}

  async onModuleInit() {
    try {
      const tenants = await this.tenantRepo.find({
        where: { waConnected: true },
      });
      for (const tenant of tenants) {
        try {
          this.logger.log(`Reconnecting WhatsApp for tenant: ${tenant.name}`);
          await this.connect(tenant.id);
        } catch (err) {
          this.logger.error(
            `Failed to reconnect WA for tenant ${tenant.id}: ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to load tenants for WA reconnect: ${(err as Error).message}`,
      );
    }
  }

  async connect(tenantId: string) {
    if (this.connections.has(tenantId)) {
      return {
        connected: true,
        qr: null,
        message: 'Already connected',
      };
    }

    if (this.connecting.has(tenantId)) {
      return {
        connected: false,
        qr: this.qrCodes.get(tenantId) || null,
        message: 'Connection in progress',
      };
    }

    this.connecting.add(tenantId);

    try {
      const sessionDir = path.join(process.cwd(), 'wa-sessions', tenantId);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      const sock = makeWASocket({
        auth: state,
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCodes.set(tenantId, qr);
          this.gateway.emitQR(tenantId, qr);
          this.logger.log(`QR code generated for tenant: ${tenantId}`);
        }

        if (connection === 'open') {
          this.connecting.delete(tenantId);
          this.connections.set(tenantId, sock);
          this.qrCodes.delete(tenantId);

          await this.tenantRepo.update(tenantId, { waConnected: true });
          this.gateway.emitConnectionStatus(tenantId, { connected: true });
          this.logger.log(`WhatsApp connected for tenant: ${tenantId}`);
        }

        if (connection === 'close') {
          this.connecting.delete(tenantId);
          this.connections.delete(tenantId);

          const statusCode =
            (lastDisconnect?.error as any)?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;

          if (loggedOut) {
            this.logger.warn(
              `WhatsApp logged out for tenant: ${tenantId}, clearing session`,
            );
            try {
              fs.rmSync(sessionDir, { recursive: true, force: true });
            } catch {
              // ignore cleanup errors
            }
            await this.tenantRepo.update(tenantId, { waConnected: false });
            this.gateway.emitConnectionStatus(tenantId, { connected: false });
          } else {
            this.logger.warn(
              `WhatsApp disconnected for tenant: ${tenantId} (code: ${statusCode}), reconnecting...`,
            );
            setTimeout(() => {
              this.connect(tenantId).catch((err) =>
                this.logger.error(
                  `Reconnect failed for ${tenantId}: ${(err as Error).message}`,
                ),
              );
            }, 3000);
          }
        }
      });

      sock.ev.on('messages.upsert', (upsert: any) => {
        this.onIncomingMessage(tenantId, upsert).catch((err) =>
          this.logger.error(
            `Error handling incoming message: ${(err as Error).message}`,
          ),
        );
      });

      return {
        connected: false,
        qr: this.qrCodes.get(tenantId) || null,
        message: 'Connecting... scan QR code when it appears',
      };
    } catch (err) {
      this.connecting.delete(tenantId);
      this.logger.error(
        `Failed to connect WA for ${tenantId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  private async onIncomingMessage(
    tenantId: string,
    { messages, type }: { messages: any[]; type: string },
  ) {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        // Skip our own messages
        if (msg.key.fromMe) continue;

        // Skip groups and broadcast
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid) continue;
        if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast')
          continue;

        const phone = remoteJid.replace('@s.whatsapp.net', '');
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '';
        const messageText = text || '[Media message]';

        // Find or create customer
        let customer = await this.customerRepo.findOne({
          where: { phone, tenantId },
        });

        if (!customer) {
          customer = this.customerRepo.create({
            name: msg.pushName || phone,
            phone,
            tenantId,
            tags: ['whatsapp'],
          });
          customer = await this.customerRepo.save(customer);
          this.logger.log(
            `Created new customer from WhatsApp: ${customer.name} (${phone})`,
          );
        }

        // Find or create conversation
        let conversation = await this.conversationRepo.findOne({
          where: { waJid: remoteJid, tenantId },
        });

        if (!conversation) {
          conversation = this.conversationRepo.create({
            tenantId,
            customerId: customer.id,
            waJid: remoteJid,
            aiHandling: true,
          });
          conversation = await this.conversationRepo.save(conversation);
        }

        // Save the incoming message
        const savedMessage = await this.messageRepo.save(
          this.messageRepo.create({
            tenantId,
            conversationId: conversation.id,
            content: messageText,
            sender: MessageSender.CUSTOMER,
            timestamp: new Date(),
            waMessageId: msg.key.id || null,
          }),
        );

        // Update conversation
        await this.conversationRepo.update(conversation.id, {
          lastMessage: messageText,
          unreadCount: () => '"unreadCount" + 1',
        });

        // Emit via WebSocket
        this.gateway.emitNewMessage(tenantId, conversation.id, savedMessage);

        // AI reply if enabled
        if (conversation.aiHandling) {
          await this.handleAiReply(
            tenantId,
            conversation,
            customer,
            messageText,
          );
        }
      } catch (err) {
        this.logger.error(
          `Error processing message from ${msg.key?.remoteJid}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async handleAiReply(
    tenantId: string,
    conversation: Conversation,
    customer: Customer,
    incomingMessage: string,
  ) {
    try {
      const tenant = await this.tenantRepo.findOne({
        where: { id: tenantId },
      });
      if (!tenant) return;

      // Get conversation history
      const recentMessages = await this.messageRepo.find({
        where: { conversationId: conversation.id },
        order: { timestamp: 'ASC' },
        take: 10,
      });

      const conversationHistory = recentMessages
        .filter((m) => m.content !== incomingMessage || m.sender !== MessageSender.CUSTOMER)
        .map((m) => ({
          role:
            m.sender === MessageSender.CUSTOMER ? 'user' : 'assistant',
          content: m.content,
        }));

      // Get services
      const services = await this.serviceRepo.find({
        where: { tenantId },
      });

      const reply = await this.claudeAi.generateReply({
        tenantName: tenant.name,
        services,
        customerName: customer.name,
        conversationHistory,
        incomingMessage,
      });

      if (reply) {
        // Send via WhatsApp
        const sock = this.connections.get(tenantId);
        if (sock) {
          await sock.sendMessage(conversation.waJid, { text: reply });
        }

        // Save AI message
        const aiMessage = await this.messageRepo.save(
          this.messageRepo.create({
            tenantId,
            conversationId: conversation.id,
            content: reply,
            sender: MessageSender.AI,
            timestamp: new Date(),
          }),
        );

        // Update conversation last message
        await this.conversationRepo.update(conversation.id, {
          lastMessage: reply,
        });

        // Emit AI response via WebSocket
        this.gateway.emitNewMessage(tenantId, conversation.id, aiMessage);
      }
    } catch (err) {
      this.logger.error(
        `AI reply error for conversation ${conversation.id}: ${(err as Error).message}`,
      );
    }
  }

  async sendText(tenantId: string, phone: string, text: string) {
    const sock = this.connections.get(tenantId);
    if (!sock) {
      throw new Error('WhatsApp not connected for this tenant');
    }

    const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

    try {
      const result = await sock.sendMessage(jid, { text });
      return { success: true, messageId: result?.key?.id };
    } catch (err) {
      this.logger.error(`Send message error: ${(err as Error).message}`);
      throw err;
    }
  }

  async sendDocument(
    tenantId: string,
    phone: string,
    buffer: Buffer,
    filename: string,
    caption?: string,
  ) {
    const sock = this.connections.get(tenantId);
    if (!sock) {
      throw new Error('WhatsApp not connected for this tenant');
    }

    const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

    try {
      const result = await sock.sendMessage(jid, {
        document: buffer,
        mimetype: 'application/pdf',
        fileName: filename,
        caption,
      });
      return { success: true, messageId: result?.key?.id };
    } catch (err) {
      this.logger.error(`Send document error: ${(err as Error).message}`);
      throw err;
    }
  }

  getStatus(tenantId: string) {
    return {
      connected: this.connections.has(tenantId),
      qr: this.qrCodes.get(tenantId) || null,
    };
  }

  async disconnect(tenantId: string) {
    const sock = this.connections.get(tenantId);
    if (sock) {
      try {
        sock.end(undefined);
      } catch {
        // ignore disconnect errors
      }
      this.connections.delete(tenantId);
    }
    this.qrCodes.delete(tenantId);
    this.connecting.delete(tenantId);

    await this.tenantRepo.update(tenantId, { waConnected: false });
    this.gateway.emitConnectionStatus(tenantId, { connected: false });

    return { success: true, message: 'WhatsApp disconnected' };
  }
}
