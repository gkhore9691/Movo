import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
} from 'typeorm';
import { LeadStatus } from '../../common/enums/index.js';
import { Customer } from '../../customers/entities/customer.entity.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import { Service } from '../../services/entities/service.entity.js';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  vehicleMake: string | null;

  @Column({ type: 'varchar', nullable: true })
  vehicleModel: string | null;

  @Column({ type: 'int', nullable: true })
  vehicleYear: number | null;

  @Column({ type: 'varchar', nullable: true })
  vehicleRegistration: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId: string | null;

  @ManyToMany(() => Service, { eager: true })
  @JoinTable({
    name: 'lead_services',
    joinColumn: { name: 'lead_id' },
    inverseJoinColumn: { name: 'service_id' },
  })
  services: Service[];

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Column({
    name: 'quoted_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  quotedPrice: number;

  @Column({ type: 'varchar', nullable: true })
  source: string | null;

  @Column({ type: 'text', default: '' })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'follow_up_date', type: 'timestamptz', nullable: true })
  followUpDate: Date | null;
}
