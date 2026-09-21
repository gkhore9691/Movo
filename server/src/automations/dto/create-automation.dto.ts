import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateAutomationDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trigger?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  conditions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  actions?: Array<{ type: string; label: string; delay?: string }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
