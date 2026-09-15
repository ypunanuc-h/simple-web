import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { buildValidationPipe } from './common/validation-pipe';
import { envOrDefault } from './common/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // whitelist + forbidNonWhitelisted ทำให้ AC-E08 และ AC-L20 ผ่านโดยไม่ต้องเขียนโค้ดเอง
  // คือ field หรือ query param ที่ไม่รู้จักถูกปฏิเสธด้วย 400 ไม่ใช่ข้ามไปเงียบ ๆ
  // exceptionFactory แปลง error เป็น ValidationFailedError ให้ filter จัดการต่อจุดเดียว (S5a)
  app.useGlobalPipes(buildValidationPipe());

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(Number(envOrDefault('API_PORT', '3000')), '0.0.0.0');
}

void bootstrap();
