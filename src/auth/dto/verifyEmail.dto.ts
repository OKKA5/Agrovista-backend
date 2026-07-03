import { IsEmail, IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString({ message: 'Code must be a string' })
  code: string;
}