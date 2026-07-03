import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from '../schemas/user.schema';
import { Admin, AdminSchema } from '../schemas/admin.schema';
import { JwtStrategy } from '../config/jwt.strategy';
import { MailModule } from '../mail/mail.module';
import { RefreshToken, RefreshTokenSchema } from '../schemas/refresh-token.schema';
import { TokensService } from './token.service';
import { LocationsModule } from '../locations/locations.module';

@Module({
        imports: [
                MongooseModule.forFeature([
                        { name: User.name, schema: UserSchema },
                        { name: Admin.name, schema: AdminSchema },
                        { name: RefreshToken.name, schema: RefreshTokenSchema }
                ]),
                PassportModule.register({ defaultStrategy: 'jwt' }),
                JwtModule.registerAsync({
                        imports: [ConfigModule],
                        useFactory: async (configService: ConfigService) => ({
                                secret: configService.get<string>('JWT_SECRET'),
                                signOptions: {
                                        expiresIn: configService.get<number>('JWT_EXPIRATION') + 's',
                                },
                        }),
                        inject: [ConfigService],
                }),
                MailModule,
                LocationsModule
        ],
        controllers: [AuthController],
        providers: [AuthService, TokensService, JwtStrategy],
        exports: [AuthService, JwtModule, MongooseModule],
})
export class AuthModule { }
