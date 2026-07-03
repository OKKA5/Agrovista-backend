import {
        Injectable,
        NestInterceptor,
        ExecutionContext,
        CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { Platform } from '../schemas/refresh-token.schema';

@Injectable()
export class AuthResponseInterceptor implements NestInterceptor {
        intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
                const request = context.switchToHttp().getRequest();
                const platform: Platform = request.platform;

                return next.handle().pipe(
                        map((data: any) => {

                                // no refreshToken ? (happens for some auth fucntions)
                                // just return the data 
                                if (!data?.refreshToken) {
                                        return data;
                                }

                                // if there's a refreshToken and Platform ain't web then it's ok to return it in the body
                                if (platform !== Platform.WEB) {
                                        return data;
                                }


                                const ageInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

                                const response = context.switchToHttp().getResponse<Response>();

                                response.cookie('refresh_token', data.refreshToken, {
                                        httpOnly: true,
                                        secure: false, //set false for dev , set true for production
                                        sameSite: 'strict',
                                        path: '/api/v1/auth',
                                        maxAge: ageInMs,
                                });

                                const { refreshToken, ...rest } = data;
                                return rest;
                        }),
                );
        }
}
