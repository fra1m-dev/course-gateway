import * as Joi from 'joi';

export const envSchema = Joi.object({
  RABBITMQ_URL: Joi.string().uri().required(),
  RMQ_AUTH_QUEUE: Joi.string().default('auth'),
  RMQ_USERS_QUEUE: Joi.string().default('users'),
  PORT: Joi.number().default(3005),
});
