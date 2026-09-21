import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsArray,
  IsDateString,
  IsString,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds: string[];

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  time: string;

  @ApiProperty()
  @IsNumber()
  estimatedPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  deposit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
