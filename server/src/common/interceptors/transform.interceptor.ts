import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((responseData: unknown) => {
        if (
          responseData !== null &&
          typeof responseData === 'object' &&
          'data' in responseData &&
          'total' in responseData
        ) {
          const paginated = responseData as PaginatedResult<unknown>;
          const request = context.switchToHttp().getRequest();
          const page = parseInt(request.query?.page, 10) || 1;
          const limit = parseInt(request.query?.limit, 10) || 20;

          return {
            success: true,
            data: paginated.data,
            meta: {
              total: paginated.total,
              page,
              limit,
            },
          };
        }

        return {
          success: true,
          data: responseData,
        };
      }),
    );
  }
}
