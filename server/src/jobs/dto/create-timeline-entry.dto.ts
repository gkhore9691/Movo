import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsUUID, IsOptional, IsString, IsArray } from 'class-validator';
import { JobStatus } from '../../common/enums/index.js';

export class CreateTimelineEntryDto {
  @ApiProperty({ enum: JobStatus })
  @IsEnum(JobStatus)
  stage: JobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  photos?: string[];
}
