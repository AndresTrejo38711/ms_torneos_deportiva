import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { createValidationPipe } from './common/validation/validation.pipe';

// Prefijo de todas las rutas. Es también el prefijo de las URLs que se registran en los permisos
// de ms_torneos_security, y el que el proxy de Vite manda a este microservicio.
const API_PREFIX = 'api/deportiva';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(app.get(ConfigService).get<string>('PORT', '8182'));
  await app.listen(port);

  Logger.log(
    `ms_torneos_deportiva escuchando en http://localhost:${port}/${API_PREFIX}`,
    'Bootstrap',
  );
}
void bootstrap();
