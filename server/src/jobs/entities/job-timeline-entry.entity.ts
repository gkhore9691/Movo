import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JobStatus } from '../../common/enums/index.js';
import { Staff } from '../../staff/entities/staff.entity.js';

@Entity('job_timeline_entries')
export class JobTimelineEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne('Job', 'timeline', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: any;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ type: 'enum', enum: JobStatus })
  stage: JobStatus;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @ManyToOne(() => Staff, { eager: false, nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Staff | null;

  @Column({ name: 'employee_id', type: 'uuid', nullable: true })
  employeeId: string | null;

  @Column({ type: 'text', default: '' })
  notes: string;

  @Column({ type: 'text', array: true, default: '{}' })
  photos: string[];
}
