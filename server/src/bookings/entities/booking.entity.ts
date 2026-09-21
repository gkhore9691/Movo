import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from '../../common/enums/index.js';
import { Customer } from '../../customers/entities/customer.entity.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import { Service } from '../../services/entities/service.entity.js';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId: string | null;

  @ManyToMany(() => Service, { eager: true })
  @JoinTable({
    name: 'booking_services',
    joinColumn: { name: 'booking_id' },
    inverseJoinColumn: { name: 'service_id' },
  })
  services: Service[];

  @Column({ type: 'date' })
  date: string;

  @Column()
  time: string;

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
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  deposit: number;

  @Column({ type: 'text', default: '' })
  notes: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
