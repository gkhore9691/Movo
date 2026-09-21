import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { Service } from '../services/entities/service.entity.js';

@Injectable()
export class ClaudeAiService {
  private readonly logger = new Logger(ClaudeAiService.name);
  private client: Anthropic | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not set — AI replies disabled');
    }
  }

  async generateReply(context: {
    tenantName: string;
    services: Service[];
    customerName: string;
    conversationHistory: Array<{ role: string; content: string }>;
    incomingMessage: string;
  }): Promise<string | null> {
    if (!this.client) return null;

    try {
      const servicesCatalog = this.formatServices(context.services);

      const systemPrompt = `You are a helpful customer service assistant for ${context.tenantName}, an automotive detailing studio.

Your service catalog:
${servicesCatalog}

Rules:
- Respond in the same language the customer uses (Hindi, English, or Hinglish)
- Be concise — max 2-3 short paragraphs
- Never invent prices — only quote from the catalog above
- If asked about availability, suggest they visit or call
- If the question is beyond your scope, say you'll have a team member follow up
- Be warm and professional
- Format prices with ₹ symbol
- Don't use markdown formatting — this is a WhatsApp message`;

      const messages = [
        ...context.conversationHistory.slice(-10).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: context.incomingMessage },
      ];

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages,
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock ? (textBlock as Anthropic.TextBlock).text : null;
    } catch (err) {
      this.logger.error(`Claude API error: ${(err as Error).message}`);
      return null;
    }
  }

  private formatServices(services: Service[]): string {
    const byCategory: Record<string, Service[]> = {};
    for (const s of services) {
      const cat = s.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(s);
    }
    return Object.entries(byCategory)
      .map(
        ([cat, svcs]) =>
          `${cat}:\n${svcs
            .map(
              (s) =>
                `  - ${s.name}: ₹${s.basePrice}${s.maxPrice ? ` - ₹${s.maxPrice}` : ''} (${s.duration || 'varies'})`,
            )
            .join('\n')}`,
      )
      .join('\n\n');
  }
}
