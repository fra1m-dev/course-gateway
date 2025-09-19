import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from 'src/modules/users/users.controller';
import { UsersService } from 'src/modules/users/users.service';
import { AuthService } from 'src/modules/auth/auth.service';
import type { ClientProxy } from '@nestjs/microservices';
import { USERS_CLIENT, AUTH_CLIENT } from 'src/common/rmq/rmq.module';

// 👇 импортируем guard-классы, чтобы переопределить их
import { JwtAuthGuard, RolesGuard } from '@fra1m-dev/contracts-auth';

describe('UsersController', () => {
  let module: TestingModule;

  const usersClientMock: Partial<ClientProxy> = {
    send: jest.fn(),
    emit: jest.fn(),
  };
  const authClientMock: Partial<ClientProxy> = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        AuthService,
        { provide: USERS_CLIENT, useValue: usersClientMock },
        { provide: AUTH_CLIENT, useValue: authClientMock },
      ],
    })
      // 👉 здесь отключаем реальные guard’ы, чтобы не требовались JwtService и пр.
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
  });

  it('should be defined', () => {
    const ctrl = module.get(UsersController);
    expect(ctrl).toBeDefined();
  });
});
