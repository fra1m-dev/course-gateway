# Gateway (API)

HTTP‑шлюз для платформы обучения. Берет на себя валидацию, авторизацию, работу с
куками и проксирование запросов в микросервисы через RabbitMQ. Для скорости и
защиты от дубликатов использует Redis.

## Быстрый старт
Зависимости: Node.js, RabbitMQ, Redis, поднятые микросервисы (auth/users/courses/etc).

```bash
npm install
npm run start:dev
```

По умолчанию API доступно на `http://localhost:3001/api/v1`.

## Архитектура
```
Client -> HTTP (Nest) -> Controllers -> Services -> RMQ RPC -> микросервисы
                     |                     |
                     |                     +-> patterns: src/contracts/patterns.ts
                     |
                     +-> Redis (кэш, локи, сессии)
```

## Жизненный цикл запроса
1) Генерация/проброс `x-request-id`
2) CORS, Helmet, глобальная валидация DTO
3) JWT‑авторизация (Authorization: Bearer ...)
4) Controllers -> Services -> RPC (timeout + retries)
5) Логи Pino + ответ

## Модули
- `users` — регистрация, логин, refresh/logout, профиль и статистика
- `auth` — генерация/валидация токенов через RMQ
- `courses` — CRUD курсов + загрузка PDF
- `lessons` — создание и отдача контента уроков
- `quizzes` — CRUD квизов
- `analytics` — отправка результатов квизов + агрегации
- `specializations` — справочник специализаций
- `videos` — загрузка, стриминг и скачивание видео
- `health` — liveness/readiness
- `ws` — realtime‑модуль есть в коде, но сейчас не подключен в `src/app.module.ts`

## API (v1)
Базовый URL: `http://localhost:3001/api/v1`

Users:
- `POST /users/registration`
- `POST /users/login`
- `POST /users/refresh`
- `POST /users/logout`
- `GET /users/all`
- `GET /users/me/stats`

Courses:
- `POST /courses/create`
- `GET /courses/getAllCourses`
- `PATCH /courses/update`
- `DELETE /courses/delete`
- `GET /courses/:id/file`

Lessons:
- `POST /lessons/create`
- `GET /lessons/all`
- `GET /lessons/:id/content`

Videos:
- `POST /videos/create`
- `GET /videos/all`
- `GET /videos/:id`
- `GET /videos/:id/stream`
- `GET /videos/:id/download`
- `PATCH /videos/:id`
- `DELETE /videos/:id`

Quizzes:
- `POST /quiz/create`
- `GET /quiz/all`
- `PATCH /quiz/update`
- `DELETE /quiz/delete`

Analytics:
- `POST /quiz/submit`

Specializations:
- `GET /specializations/all`
- `POST /specializations/create`
- `PATCH /specializations/:id`

Health:
- `GET /health/live`
- `GET /health/ready`

## Авторизация и роли
- Access‑токен в заголовке `Authorization: Bearer <token>`
- Refresh‑токен хранится в httpOnly cookie `refreshToken`
- Роли: `user`, `student`, `teacher`, `admin`
- JWT проверяется по публичному ключу (RS256)

## Кэш и Redis
- `CacheHelper` использует Redis как write‑through для кэша и локов
- HTTP‑кэш включен глобально, но кэширует только публичные GET на `/users/*`
- Префикс ключей: `gw:`

## RMQ и RPC
- RPC‑паттерны описаны в `src/contracts/patterns.ts`
- Helper `rpc` делает timeout + retry с backoff
- Очереди (по умолчанию): `auth`, `users`, `ws`, `courses`, `specializations`,
  `analytics`, `lessons`, `quizzes`, `videos`
  - для specializations используется переменная `RMQ_SPECIALIZATION_QUEUE`
    (в общем реестре — `RMQ_SPECIALIZATIONS_QUEUE`)

## Загрузка файлов
- Только PDF
- Сохраняются в `./uploads/courses` (относительно cwd)
- Для корректного удаления/стриминга `UPLOAD_DIR` должен совпадать с местом хранения

## Переменные окружения
Файл `.env` читается в dev; в production env‑файлы не загружаются.

| Переменная | Обязательная | Дефолт | Описание |
| --- | --- | --- | --- |
| `PORT` | нет | `3001` | порт API |
| `API_PREFIX` | нет | `api` | префикс роутов |
| `CORS_ORIGIN` | нет | `*` | список origin через запятую |
| `RABBITMQ_URL` | да | — | адрес RabbitMQ |
| `REDIS_PASSWORD` | да | — | пароль Redis |
| `REDIS_PASSWORD_FILE` | нет | — | файл с паролем Redis |
| `REDIS_HOST` | нет | `redis` | host Redis |
| `REDIS_PORT` | нет | `6379` | port Redis |
| `JWT_PUBLIC_KEY` | да* | — | публичный ключ RS256 |
| `JWT_PUBLIC_KEY_PATH` | да* | — | путь к публичному ключу |
| `UPLOAD_DIR` | нет | `/app/uploads/courses` | каталог файлов курсов |
| `VIDEO_UPLOAD_DIR` | нет | `/app/uploads/videos` | каталог файлов видео |
| `LOG_LEVEL` | нет | `info` | уровень логов |
| `LOG_PRETTY` | нет | `false` | pretty‑лог в dev |
| `SERVICE_NAME` | нет | `app` | имя сервиса в логах |
| `SERVICE_VERSION` | нет | `0.0.0` | версия сервиса |
| `RMQ_*_QUEUE` | нет | — | имена очередей (см. выше) |
| `RMQ_DLX` | нет | `dlx` | dead‑letter exchange |
| `RMQ_MESSAGE_TTL_MS` | нет | — | TTL сообщений |
| `RMQ_MAX_LENGTH` | нет | — | max length очереди |

\* нужен один из `JWT_PUBLIC_KEY` или `JWT_PUBLIC_KEY_PATH`.

Пример:
```env
PORT=3001
API_PREFIX=api
RABBITMQ_URL=amqp://guest:guest@localhost:5672
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret123
JWT_PUBLIC_KEY_PATH=./keys/jwt.pub
```

## Скрипты
- `npm run start:dev` — запуск с watch
- `npm run start:prod` — прод‑запуск из `dist`
- `npm run build` — сборка
- `npm run test` — юнит‑тесты
- `npm run lint` — eslint
- `npm run todos:md` — собрать TODO/FIXME

## Docker
`Dockerfile` включает стадии `build`, `runner`, `dev`.
Учти: контейнер экспонирует `3002`, а приложение по умолчанию слушает `3001`
(поставь `PORT=3002`, если используешь стандартный Dockerfile).

## Полезные файлы
- `src/main.ts` — точка входа
- `src/app.module.ts` — композиция модулей
- `src/app.service.ts` — bootstrap, middleware, CORS
- `src/common/rmq/rmq.module.ts` — подключение RMQ‑клиентов
- `src/common/redis/redis.service.ts` — кэш/локи
- `src/common/secure/*` — guards и JWT
- `todos.md` — текущие TODO/FIXME
