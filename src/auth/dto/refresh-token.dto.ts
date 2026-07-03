import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
        @ApiProperty()
        @IsString()
        @Matches(
                /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
                { message: 'refreshToken must be a valid JWT format' },
        )
        refreshToken!: string;
}
