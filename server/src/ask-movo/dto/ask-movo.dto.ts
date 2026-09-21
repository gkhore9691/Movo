import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AskMovoDto {
  @ApiProperty()
  @IsString()
  query: string;
}
