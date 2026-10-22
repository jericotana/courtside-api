import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsIn,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { type EventType, eventType } from '../../db/schema';
import { Type } from 'class-transformer';

export class RecordEventDto {
  @IsUUID() id: string;
  @IsIn(eventType.enumValues) type: EventType;

  @ValidateIf((e) => e.type !== 'undo') @IsUUID() playerId?: string;
  @ValidateIf((e) => e.type === 'undo') @IsUUID() targetEventId?: string;

  @Type(() => Date) @IsDate() at: Date;
}

export class RecordEventsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => RecordEventDto)
  events: RecordEventDto[];
}
