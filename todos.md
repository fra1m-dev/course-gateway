### TODOs
| Filename | line # | TODO |
|:------|:------:|:------|
| [src/app.module.ts](src/app.module.ts#L1) | 1 | удалить закомментированный код после проверки работоспособности |
| [src/common/rmq/rmq.module.ts](src/common/rmq/rmq.module.ts#L1) | 1 | разобраться какие аргументы очереди/соединения нужны |
| [src/modules/auth/auth.service.ts](src/modules/auth/auth.service.ts#L1) | 1 | Проверить название патернов: 'auth.createCredentials', 'auth.issueTokens', 'auth.hash'. Провить их логику в микросервисе auth |
| [src/modules/users/users.controller.ts](src/modules/users/users.controller.ts#L1) | 1 | Проверить работоспособность контроллера |
| [src/modules/users/users.controller.ts](src/modules/users/users.controller.ts#L65) | 65 | Подумай нужно ли обрабтывать ошибку после создания хеша |
| [src/modules/users/users.controller.ts](src/modules/users/users.controller.ts#L92) | 92 | реализовать едпоинт логина |
| [src/modules/users/users.service.ts](src/modules/users/users.service.ts#L1) | 1 | Проверить название патернов: 'users.getByEmail', 'users.create'. Провить их логику в микросервисе auth |
| [src/modules/users/users.service.ts](src/modules/users/users.service.ts#L14) | 14 | Возможно нужно чтобы { email: string } вместо { email: Pick<CreateUserDto, 'email'> } |
| [src/needToTest/common/registerRmqClient.spec.ts](src/needToTest/common/registerRmqClient.spec.ts#L1) | 1 | написать тесты к registerRmqClient заново, сейчас не работают |
| [src/needToTest/common/rpc.spec.ts](src/needToTest/common/rpc.spec.ts#L1) | 1 | написать тесты к rpc заново, сейчас не работают |
