import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleAutomationDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
