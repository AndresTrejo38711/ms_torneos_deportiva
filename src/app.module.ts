import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    // Lee el .env de la raíz. Si una variable también existe en el sistema (por ejemplo,
    // DB_PASSWORD en las variables de entorno de Windows), gana la del sistema.
    ConfigModule.forRoot({ isGlobal: true }),

    // Equivalente al spring.datasource + spring.jpa de ms_torneos_security.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '3306')),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        // Registra solas las entidades que cada módulo declara con TypeOrmModule.forFeature.
        autoLoadEntities: true,
        // Crea y ajusta las tablas al arrancar (como ddl-auto=update). Ojo: si se renombra un
        // campo de una entidad, borra la columna vieja con sus datos. Solo para desarrollo.
        synchronize: true,
        // DB_LOGGING=true muestra el SQL en la consola (como spring.jpa.show-sql).
        logging: config.get<string>('DB_LOGGING') === 'true',
      }),
    }),

    SecurityModule,
  ],
})
export class AppModule {}
