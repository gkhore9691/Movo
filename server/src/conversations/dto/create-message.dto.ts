import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { MessageSender } from '../../common/enums/index.js';

export class CreateMessageDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: MessageSender })
  @IsEnum(MessageSender)
  sender: MessageSender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  read?: boolean;
}
