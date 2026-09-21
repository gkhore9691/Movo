import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity.js';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ type: 'varchar' })
  make: string;

  @Column({ type: 'varchar' })
  model: string;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ type: 'varchar', nullable: true })
  registrationNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  @Column({ name: 'current_job_id', type: 'uuid', nullable: true })
  currentJobId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
