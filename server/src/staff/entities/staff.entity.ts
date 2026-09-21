import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StaffRole } from '../../common/enums/index.js';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: StaffRole, default: StaffRole.TECHNICIAN })
  role: StaffRole;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ default: '' })
  avatar: string;

  @Column({ type: 'int', default: 0 })
  activeJobs: number;

  @Column({ type: 'int', default: 0 })
  completedJobs: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
