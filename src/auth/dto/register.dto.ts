import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "John" })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "+1234567890" })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    example: "Password@123",
    description: "At least 8 characters",
  })
  @IsString()
  @MinLength(8)
  password!: string;
  
  @ApiProperty({ example: "EG1309" })
  @IsString()
  locationId!: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isModerator?: boolean;
}
