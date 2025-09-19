import { ClientProxy } from '@nestjs/microservices';
import {
  catchError,
  firstValueFrom,
  retry,
  throwError,
  timeout,
  timer,
} from 'rxjs';

type RpcOptions = {
  timeoutMs?: number;
  retries?: number; // сколько раз повторять ПОСЛЕ первой попытки
  backoffMs?: number; // базовая задержка
  jitterMs?: number; // разброс задержки
};

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  // часто приходят объекты с message
  if (typeof err === 'object' && err && 'message' in err) {
    const msg = String((err as { message: unknown }).message);
    return new Error(msg);
  }
  return new Error(String(err));
}

export async function rpc<T>(
  client: ClientProxy,
  pattern: string,
  payload: unknown,
  opts: RpcOptions = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const retries = opts.retries ?? 1;
  const backoffMs = opts.backoffMs ?? 200;
  const jitterMs = opts.jitterMs ?? 200;

  const source$ = client.send<T>(pattern, payload).pipe(
    timeout(timeoutMs),
    retry({
      count: retries,
      delay: (_error: unknown, retryIndex: number) => {
        // экспоненциальный бэк-офф + джиттер
        const base = backoffMs * Math.pow(2, retryIndex);
        const jitter = Math.floor(Math.random() * jitterMs);
        return timer(base + jitter);
      },
    }),
    catchError((err: unknown) => throwError(() => toError(err))),
  );

  // firstValueFrom<T>(Observable<T>) → Promise<T>
  return await firstValueFrom(source$);
}
