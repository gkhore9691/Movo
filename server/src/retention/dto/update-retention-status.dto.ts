import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RetentionStatus } from '../../common/enums/index.js';

export class UpdateRetentionStatusDto {
  @ApiProperty({ enum: RetentionStatus })
  @IsEnum(RetentionStatus)
  status: RetentionStatus;
}
