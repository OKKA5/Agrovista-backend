import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { RefreshToken, RefreshTokenDocument } from '../schemas/refresh-token.schema';
import { AuthResponseDto } from './dto/auth-response.dto';

export interface TokenUser {
  _id: Types.ObjectId;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class TokensService {
        private readonly MAX_SESSIONS = 5;

        constructor(
                @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
                private jwtService: JwtService,
        ) { }

        private hashToken(token: string): string {
                return crypto.createHash('sha256').update(token).digest('hex');
        }

        async generateTokens(user: TokenUser, platform: string, sessionId?: string, mustChangePassword = false): Promise<AuthResponseDto> {
                const sid = sessionId || uuidv4();

                const payload = { sub: user._id, email: user.email, role: user.role, sessionId: sid };
                const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
                const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

                const hashedRefreshToken = this.hashToken(refreshToken);

                // Cap max sessions
                const count = await this.refreshTokenModel.countDocuments({ userId: user._id });
                if (count >= this.MAX_SESSIONS) {
                        const oldest = await this.refreshTokenModel
                                .findOne({ userId: user._id })
                                .sort({ createdAt: 1 });
                        if (oldest) await oldest.deleteOne();
                }

                await this.refreshTokenModel.create({
                        userId: user._id,
                        hashedToken: hashedRefreshToken,
                        sessionId: sid,
                        platform,
                        createdAt: new Date(),
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                });

                return {
                        message: 'Login successful',
                        accessToken,
                        refreshToken,
                        mustChangePassword,
                        user: {
                                id: user._id.toString(),
                                email: user.email,
                                firstName: user.firstName,
                                lastName: user.lastName,
                                role: user.role,
                        },
                };
        }

        async validateAndRotate(rawToken: string): Promise<{ userId: string; sessionId: string; role: string }> {
                let payload: any;
                try {
                        payload = this.jwtService.verify(rawToken);
                } catch {
                        throw new UnauthorizedException('Invalid or expired token');
                }

                const hashedToken = this.hashToken(rawToken);
                const storedToken = await this.refreshTokenModel.findOne({ hashedToken: hashedToken });

                if (!storedToken) {
                        if (payload.sessionId) {
                                await this.refreshTokenModel.deleteMany({
                                        userId: payload.sub,
                                        sessionId: payload.sessionId,
                                });
                        }
                        throw new UnauthorizedException('Token reuse detected. Session revoked.');
                }

                await storedToken.deleteOne();

                return { userId: payload.sub, sessionId: storedToken.sessionId, role: payload.role };
        }

        async revokeAllForUser(userId: Types.ObjectId | string): Promise<void> {
                await this.refreshTokenModel.deleteMany({ userId });
        }
}
