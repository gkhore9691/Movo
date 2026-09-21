import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({ example: 'Full Body PPF' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Complete paint protection film coverage' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  basePrice: number;

  @ApiPropertyOptional({ example: 45000 })
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ example: '4-5 days' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ example: 'Protection' })
  @IsOptional()
  @IsString()
  category?: string;
}
