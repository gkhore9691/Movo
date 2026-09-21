import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('automations')
export class Automation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  trigger: string;

  @Column({ type: 'text', array: true, default: '{}' })
  conditions: string[];

  @Column({ type: 'jsonb', default: '[]' })
  actions: Array<{ type: string; label: string; delay?: string }>;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastRun: Date;

  @Column({ type: 'int', default: 0 })
  runsCount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
