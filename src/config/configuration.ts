import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IsString, IsOptional } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  NODE_ENV: string;

  @IsOptional()
  PORT: string;

  @IsString()
  DATABASE_URI: string;

  @IsOptional()
  REDIS_HOST: string;

  @IsOptional()
  REDIS_PORT: string;

  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  JWT_EXPIRATION: string;
}

export default () => {
  const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
      uri: process.env.DATABASE_URI || 'mongodb://localhost:27017/agrovista',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      expiration: parseInt(process.env.JWT_EXPIRATION || '86400', 10),
    },
  };

  const dto = plainToInstance(EnvironmentVariables, config);
  validate(dto).then((errors) => {
    if (errors.length > 0) {
      console.warn('Configuration validation warnings:', errors);
    }
  });

  return config;
};