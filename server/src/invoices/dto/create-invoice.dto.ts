import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { InvoiceStatus } from '../../common/enums/index.js';

export class CreateInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  deposit?: number;

  @ApiProperty()
  @IsNumber()
  balance: number;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
