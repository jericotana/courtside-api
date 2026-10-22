import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDate,
  IsUUID,
} from 'class-validator';

export class StartGameDto {
  @IsUUID() id: string;
  @Type(() => Date) @IsDate() startedAt: Date;
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  playerIds: string[];
}
