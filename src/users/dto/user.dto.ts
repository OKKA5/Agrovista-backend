import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../schemas/user.schema';

export class UserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({ required: false })
  verificationToken?: string;

  @ApiProperty({ required: false })
  phoneNumber?: string;
}