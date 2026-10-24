import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SignInDto {
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  turnstileToken: string;
}
