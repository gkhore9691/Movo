import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Raj Mehta' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+91 98765 43210' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'raj@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '123 MG Road, Mumbai' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  customerSince?: string;

  @ApiPropertyOptional({ example: 45000 })
  @IsOptional()
  @IsNumber()
  lifetimeSpend?: number;

  @ApiPropertyOptional({ example: 'VIP customer, prefers weekends' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: ['vip', 'repeat'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
