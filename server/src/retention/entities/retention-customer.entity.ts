import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RetentionStatus } from '../../common/enums/index.js';
import { Customer } from '../../customers/entities/customer.entity.js';

const decimalTransformer = {
  to: (v: number) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

@Entity('retention_customers')
export class RetentionCustomer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', type: 'uuid', unique: true })
  customerId: string;

  @Column({ type: 'timestamptz' })
  lastVisit: Date;

  @Column({ type: 'int' })
  daysSinceVisit: number;

  @Column({ type: 'varchar', nullable: true })
  recommendedService: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  estimatedValue: number;

  @Column({
    type: 'enum',
    enum: RetentionStatus,
    default: RetentionStatus.DUE,
  })
  status: RetentionStatus;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
