import * as Joi from 'joi';

export const envSchema = Joi.object({
  PORT: Joi.number().integer().default(3001),
  API_PREFIX: Joi.string().default('api'),
  CORS_ORIGIN: Joi.string().allow('', '*').default('*'), // "*,http://localhost:5173"

  RABBITMQ_URL: Joi.string().uri().required(),
  RMQ_AUTH_QUEUE: Joi.string().default('auth'),
  RMQ_USERS_QUEUE: Joi.string().default('users'),

  RMQ_VIDEOS_QUEUE: Joi.string().default('videos'),
  VIDEO_UPLOAD_DIR: Joi.string().default('/app/uploads/videos'),
  REDIS_PASSWORD: Joi.string().min(8).required(),
});
