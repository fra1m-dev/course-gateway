// src/common/redis/http-cache.interceptor.ts
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

function sortedQueryString(query: Record<string, any> = {}) {
  const keys = Object.keys(query).sort();
  return keys
    .map((k) => `${k}=${encodeURIComponent(String(query[k]))}`)
    .join('&');
}

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  // кэшируем только GET
  protected override isRequestCacheable(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    return req?.method === 'GET';
  }

  // ключ: публичные GET — url+query; приватные (с пользователем) — +userId
  protected override trackBy(ctx: ExecutionContext): string | undefined {
    const req = ctx.switchToHttp().getRequest();
    if (!req) return undefined;
    if (req.method !== 'GET') return undefined;

    const base = `${req.originalUrl?.split('?')[0] ?? req.url}`;
    const qs = sortedQueryString(req.query ?? {});
    // если есть аутентификация и нужен user-scoped кэш —
    // подставим идентификатор (подстрой под свою payload)
    const userId =
      req.user?.id ?? req.user?.sub ?? req.auth?.userId ?? undefined;

    return userId ? `u:${userId}|${base}?${qs}` : `pub|${base}?${qs}`;
  }
}
