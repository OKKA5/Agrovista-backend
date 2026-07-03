import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { RefreshTokenDto } from "../auth/dto/refresh-token.dto";
import { Platform } from "../schemas/refresh-token.schema";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

export const ExtractRefreshToken = createParamDecorator(
        async (data: unknown, ctx: ExecutionContext): Promise<RefreshTokenDto> => {
                const req = ctx.switchToHttp().getRequest();


                const rawToken = req.platform === Platform.WEB
                        ? req.cookies?.['refresh_token']
                        : req.body?.refreshToken;

                if (!rawToken) {
                        throw new UnauthorizedException('Missing refresh token');
                }

                const dto = plainToInstance(RefreshTokenDto, { refreshToken: rawToken });
                const errors = await validate(dto);

                if (errors.length > 0) {
                        const messages = errors.flatMap(err =>
                                Object.values(err.constraints || {}),
                        );
                        throw new UnauthorizedException(messages.join(', '));
                }

                return dto;
        },
);
