import { IsString, IsOptional, IsBoolean, IsInt, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Detailing Street' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'detailing-street-indore' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: 'automotive_detailing' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ example: '+919876500001' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'hello@detailingstreet.in' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Indore' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Madhya Pradesh' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '22AAAAA0000A1Z5' })
  @IsString()
  @IsOptional()
  gstNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({ example: {} })
  @IsObject()
  @IsOptional()
  workingHours?: Record<string, any>;

  @ApiPropertyOptional({ example: 6 })
  @IsInt()
  @IsOptional()
  maxCapacity?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
