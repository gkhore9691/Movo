import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotesDto {
  @ApiProperty({ example: 'Prefers ceramic coating. Has a BMW X5.' })
  @IsString()
  notes: string;
}
