import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MessageSender } from '../../common/enums/index.js';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne('Conversation', 'messages', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: any;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: MessageSender })
  sender: MessageSender;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @Column({ type: 'varchar', nullable: true })
  waMessageId: string | null;

  @Column({ type: 'varchar', nullable: true })
  mediaUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  mediaType: string | null;

  @Column({ type: 'varchar', nullable: true })
  deliveryStatus: string | null;
}
