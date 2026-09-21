import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { NotificationType } from '../../common/enums/index.js';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionUrl?: string;
}
