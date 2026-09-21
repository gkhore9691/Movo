import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '../../common/enums/index.js';

export class CreateStaffDto {
  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: StaffRole, default: StaffRole.TECHNICIAN })
  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'ravi@movo.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;
}
