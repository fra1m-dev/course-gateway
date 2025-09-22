// FIXME: Написать тесты к rpc заново, сейчас не работают
// import type { ClientProxy } from '@nestjs/microservices';
// import { of, throwError, NEVER, delay, timer as rxTimer } from 'rxjs';
// import * as rx from 'rxjs';
// import { rpc } from 'src/common/rpc/rpc.util';

// type ClientProxyMock = { send: jest.Mock; emit: jest.Mock };

// describe('rpc()', () => {
//   let mock: ClientProxyMock;
//   let client: ClientProxy;
//   let timerSpy: jest.SpyInstance;
//   let mathRandomSpy: jest.SpyInstance;

//   beforeEach(() => {
//     mock = { send: jest.fn(), emit: jest.fn() };
//     client = mock as unknown as ClientProxy;

//     // Делает джиттер детерминированным (0)
//     mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
//   });

//   afterEach(() => {
//     timerSpy?.mockRestore?.();
//     mathRandomSpy?.mockRestore?.();
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
//     // любой retry-delay → делаем мгновенным
//     timerSpy = jest.spyOn(rx, 'timer').mockImplementation(() => of(0));

//     let attempt = 0;
//     mock.send.mockImplementation(() => {
//       attempt += 1;
//       if (attempt < 2) return throwError(() => new Error('boom'));
//       return of('OK');
//     });

//     const p = rpc<string>(
//       client,
//       'svc.op',
//       { a: 1 },
//       { timeoutMs: 1000, retries: 2, backoffMs: 0, jitterMs: 0 },
//     );

//     await expect(p).resolves.toBe('OK');
//     expect(mock.send).toHaveBeenCalledTimes(2);
//   });

//   it('бросает ошибку после исчерпания ретраев', async () => {
//     // ретраи происходят сразу
//     timerSpy = jest.spyOn(rx, 'timer').mockImplementation(() => of(0));
//     mock.send.mockReturnValue(throwError(() => new Error('fatal')));

//     const p = rpc(
//       client,
//       'svc.fail',
//       {},
//       { retries: 1, backoffMs: 0, jitterMs: 0, timeoutMs: 500 },
//     );

//     expect.assertions(2);
//     try {
//       await p;
//     } catch (e) {
//       const msg = (e as Error)?.message ?? String(e);
//       expect(msg.includes('fatal')).toBe(true);
//     }
//     expect(mock.send).toHaveBeenCalledTimes(2); // 1-я попытка + 1 ретрай
//   });

//   it('таймаут триггерит повтор, затем успех', async () => {
//     // retry после таймаута — сразу
//     timerSpy = jest.spyOn(rx, 'timer').mockImplementation(() => of(0));

//     let attempt = 0;
//     mock.send.mockImplementation(() => {
//       attempt += 1;
//       if (attempt === 1) return NEVER; // ждём timeout
//       return of('OK'); // ретрай — успех
//     });

//     const start = Date.now();
//     const res = await rpc<string>(
//       client,
//       'svc.timeout',
//       {},
//       { timeoutMs: 50, retries: 1, backoffMs: 0, jitterMs: 0 },
//     );
//     const tookMs = Date.now() - start;

//     expect(res).toBe('OK');
//     expect(mock.send).toHaveBeenCalledTimes(2);
//     // sanity: реально подождали ~50мс (timeout сработал)
//     expect(tookMs).toBeGreaterThanOrEqual(45);
//   });

//   it('не выбегает за timeout, если ответ приходит достаточно быстро', async () => {
//     mock.send.mockReturnValue(of('SLOW_OK').pipe(delay(10)));
//     const result = await rpc<string>(client, 'svc.slow', {}, { timeoutMs: 50 });
//     expect(result).toBe('SLOW_OK');
//   });
// });
