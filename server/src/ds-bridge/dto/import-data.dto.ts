import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ── DS Booking (scraped from /bookings) ──────────────────────────────────────

export class DsBookingDto {
  @ApiProperty() bookingNo: string;
  @ApiProperty() customerNumber: string;
  @ApiPropertyOptional() carBikeNumber?: string;
  @ApiPropertyOptional() serviceRemarks?: string;
  @ApiPropertyOptional() branch?: string;
  @ApiPropertyOptional() preferredDateTime?: string;

  // Extended fields from edit modal (optional)
  @ApiPropertyOptional() ecname?: string;
  @ApiPropertyOptional() ecnumber?: string;
  @ApiPropertyOptional() ecemail?: string;
  @ApiPropertyOptional() ecaddress?: string;
  @ApiPropertyOptional() ecity?: string;
  @ApiPropertyOptional() ecarname?: string;
  @ApiPropertyOptional() ecarnumber?: string;
  @ApiPropertyOptional() ecarcolor?: string;
  @ApiPropertyOptional() eprice?: string;
  @ApiPropertyOptional() eadvprice?: string;
  @ApiPropertyOptional() epackage?: string;
  @ApiPropertyOptional() eremark?: string;
}

// ── DS Query (scraped from /queryList) ───────────────────────────────────────

export class DsQueryDto {
  @ApiPropertyOptional() priority?: string;
  @ApiProperty() clientName: string;
  @ApiPropertyOptional() email?: string;
  @ApiProperty() mobileNo: string;
  @ApiPropertyOptional() user?: string;
  @ApiPropertyOptional() workshop?: string;
  @ApiPropertyOptional() status?: string;
}

// ── DS Invoice (scraped from /invoice_list) ──────────────────────────────────

export class DsInvoiceDto {
  @ApiProperty() invoice: string;
  @ApiPropertyOptional() customer?: string;
  @ApiPropertyOptional() bookingId?: string;
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional() payDate?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() detailLink?: string;
}

// ── DS Follow-up (scraped from /followup) ────────────────────────────────────

export class DsFollowupDto {
  @ApiPropertyOptional() priority?: string;
  @ApiPropertyOptional() clientName?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() mobileNo?: string;
  @ApiPropertyOptional() admin?: string;
  @ApiPropertyOptional() workshop?: string;
  @ApiPropertyOptional() followupDate?: string;
  @ApiPropertyOptional() status?: string;
}

// ── DS Maintenance (scraped from /maintenance_history) ───────────────────────

export class DsMaintenanceDto {
  @ApiPropertyOptional() bookingId?: string;
  @ApiPropertyOptional() date?: string;
  @ApiPropertyOptional() time?: string;
  @ApiPropertyOptional() servicedAt?: string;
  @ApiPropertyOptional() comment?: string;
}

// ── DS Warranty (scraped from /warranty) ─────────────────────────────────────

export class DsWarrantyDto {
  @ApiPropertyOptional() dueDate?: string;
  @ApiPropertyOptional() appointment?: string;
  @ApiPropertyOptional() status?: string;
  @ApiPropertyOptional() completedOn?: string;
  @ApiPropertyOptional() servicedAt?: string;
  @ApiPropertyOptional() reminderSms?: string;
}

// ── Combined import payload ──────────────────────────────────────────────────

export class ImportDataDto {
  @ApiProperty({ type: [DsBookingDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DsBookingDto)
  bookings?: DsBookingDto[];

  @ApiProperty({ type: [DsQueryDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DsQueryDto)
  queries?: DsQueryDto[];

  @ApiProperty({ type: [DsInvoiceDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DsInvoiceDto)
  invoices?: DsInvoiceDto[];

  @ApiProperty({ type: [DsFollowupDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DsFollowupDto)
  followups?: DsFollowupDto[];

  @ApiProperty({ type: [DsMaintenanceDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DsMaintenanceDto)
  maintenance?: DsMaintenanceDto[];

  @ApiProperty({ type: [DsWarrantyDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DsWarrantyDto)
  warranty?: DsWarrantyDto[];
}
