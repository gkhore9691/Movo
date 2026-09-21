import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobStatus } from '../../common/enums/index.js';
import { Customer } from '../../customers/entities/customer.entity.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import { Staff } from '../../staff/entities/staff.entity.js';
import { Service } from '../../services/entities/service.entity.js';
@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Customer, { eager: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Vehicle, { eager: false })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.ENQUIRY })
  status: JobStatus;

  @ManyToOne(() => Staff, { eager: false, nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedStaff: Staff | null;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string | null;

  @ManyToMany(() => Service, { eager: true })
  @JoinTable({
    name: 'job_services',
    joinColumn: { name: 'job_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'service_id', referencedColumnName: 'id' },
  })
  services: Service[];

  @Column({
    name: 'estimated_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  estimatedPrice: number;

  @Column({
    name: 'actual_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  actualPrice: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  deposit: number;

  @Column({ type: 'text', default: '' })
  notes: string;

  @Column({ type: 'text', array: true, default: '{}' })
  photos: string[];

  @OneToMany('JobTimelineEntry', 'job', {
    cascade: true,
    eager: true,
  })
  timeline: any[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
