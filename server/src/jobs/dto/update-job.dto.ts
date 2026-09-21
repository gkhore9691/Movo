import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { CreateJobDto } from './create-job.dto.js';

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @ApiPropertyOptional({ description: 'Actual price after job completion' })
  @IsOptional()
  @IsNumber()
  actualPrice?: number;
}
