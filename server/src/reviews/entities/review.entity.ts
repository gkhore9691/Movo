import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ReviewStatus } from '../../common/enums/index.js';
import { Customer } from '../../customers/entities/customer.entity.js';
import { Job } from '../../jobs/entities/job.entity.js';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Job, { nullable: true })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ name: 'job_id', type: 'uuid', nullable: true })
  jobId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', default: '' })
  comment: string;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.REQUESTED,
  })
  status: ReviewStatus;

  @Column({ type: 'varchar', nullable: true })
  googleReviewUrl: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
