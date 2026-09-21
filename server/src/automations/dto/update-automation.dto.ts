import { PartialType } from '@nestjs/swagger';
import { CreateAutomationDto } from './create-automation.dto.js';

export class UpdateAutomationDto extends PartialType(CreateAutomationDto) {}
