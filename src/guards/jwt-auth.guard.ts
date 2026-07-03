import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
                err: any,
                user: TUser,
                info: any,
                context: ExecutionContext,
                status?: any,
        ): TUser {
                if (err || !user) {
                        throw err || new UnauthorizedException();
                }
                return user;
        }
}