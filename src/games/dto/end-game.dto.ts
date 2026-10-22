import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class EndGameDto {
  @Type(() => Date) @IsDate() endedAt: Date;
}
