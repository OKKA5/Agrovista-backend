import {
        Injectable,
        CanActivate,
        ExecutionContext,
} from '@nestjs/common';
import { Platform } from '../schemas/refresh-token.schema';


@Injectable()
export class PlatformGuard implements CanActivate {
        canActivate(context: ExecutionContext): boolean {
                const request = context.switchToHttp().getRequest();

                const explicit = request.headers['x-platform'];
                if (explicit && Object.values(Platform).includes(explicit)) {
                        request.platform = explicit;
                        return true;
                }

                const origin = request.headers['origin'];
                const secFetchDest = request.headers['sec-fetch-dest'];

                request.platform = (origin || secFetchDest)
                        ? Platform.WEB
                        : Platform.MOBILE;

                return true;
        }
}
