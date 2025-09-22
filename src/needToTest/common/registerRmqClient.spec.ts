// FIXME: Написать тесты к registerRmqClient заново, сейчас не работают
// import { jest } from '@jest/globals';
// import type { ClientProxy } from '@nestjs/microservices';
// import { of, throwError, NEVER, delay } from 'rxjs';
// import { rpc } from 'src/common/rpc/rpc.util';

// // Узкий тип мока, который нам реально нужен
// type ClientProxyMock = {
//   send: jest.Mock;
//   emit: jest.Mock;
// };

// describe('rpc()', () => {
//   let mock: ClientProxyMock;
//   let client: ClientProxy; // будет просто «как будто» ClientProxy

//   beforeEach(() => {
//     mock = {
//       send: jest.fn(),
//       emit: jest.fn(),
//     };
//     client = mock as unknown as ClientProxy;
//   });

//   it('возвращает значение при успешном ответе', async () => {
//     mock.send.mockReturnValue(of({ ok: true }));

//     const res = await rpc<{ ok: boolean }>(
//       client,
//       'users.ping',
//       { ping: 1 },
//       { timeoutMs: 1000 },
//     );

//     expect(res).toEqual({ ok: true });
//     expect(mock.send).toHaveBeenCalledWith('users.ping', { ping: 1 });
//   });

//   it('ретраит при ошибке и в итоге успешен', async () => {
//     let attempt = 0;
//     mock.send.mockImplementation(() => {
//       attempt += 1;
//       if (attempt < 2) return throwError(() => new Error('boom'));
//       return of('OK');
//     });

//     const res = await rpc<string>(
//       client,
//       'svc.op',
//       { a: 1 },
//       { timeoutMs: 1000, retries: 2, backoffMs: 0, jitterMs: 0 },
//     );

//     expect(res).toBe('OK');
//     expect(mock.send).toHaveBeenCalledTimes(2);
//   });

//   it('бросает ошибку после исчерпания ретраев', async () => {
//     mock.send.mockReturnValue(throwError(() => new Error('fatal')));

//     expect.assertions(2);
//     try {
//       await rpc(
//         client,
//         'svc.fail',
//         {},
//         { retries: 1, backoffMs: 0, jitterMs: 0, timeoutMs: 500 },
//       );
//     } catch (e) {
//       const msg = (e as Error).message ?? String(e);
//       expect(msg.includes('fatal')).toBe(true);
//     }
//     expect(mock.send).toHaveBeenCalledTimes(2); // 1 попытка + 1 ретрай
//   });

//   it('таймаут триггерит повтор, затем успех', async () => {
//     jest.useFakeTimers();
//     try {
//       let attempt = 0;
//       mock.send.mockImplementation(() => {
//         attempt += 1;
//         if (attempt === 1) return NEVER; // первая попытка — не эмитит → timeout
//         return of('OK'); // вторая — ок
//       });

//       const promise = rpc<string>(
//         client,
//         'svc.timeout',
//         {},
//         { timeoutMs: 50, retries: 1, backoffMs: 0, jitterMs: 0 },
//       );

//       // Прокручиваем время — срабатывает timeout первой попытки
//       jest.advanceTimersByTime(60);

//       await expect(promise).resolves.toBe('OK');
//       expect(mock.send).toHaveBeenCalledTimes(2);
//     } finally {
//       jest.useRealTimers();
//     }
//   });

//   it('не выбегает за timeout, если ответ приходит достаточно быстро', async () => {
//     mock.send.mockReturnValue(of('SLOW_OK').pipe(delay(10)));

//     const result = await rpc<string>(client, 'svc.slow', {}, { timeoutMs: 50 });
//     expect(result).toBe('SLOW_OK');
//   });
// });
