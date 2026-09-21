import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsArray,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { LeadStatus } from '../../common/enums/index.js';

export class CreateLeadDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleMake?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  vehicleYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleRegistration?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds: string[];

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quotedPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}
