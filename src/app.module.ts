import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PlayerProfilesModule } from './player-profiles/player-profiles.module';
import { PlayerSkillsModule } from './player-skills/player-skills.module';
import { PlayersModule } from './players/players.module';
import { SecurityModule } from './security/security.module';
import { SkillsModule } from './skills/skills.module';
import { SportsModule } from './sports/sports.module';
import { TeamPlayersModule } from './team-players/team-players.module';
import { TeamSportsModule } from './team-sports/team-sports.module';
import { TeamsModule } from './teams/teams.module';

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

    // Un módulo por recurso del Anexo 2.
    SportsModule, // HU-GD-01
    TeamsModule, // HU-GD-02
    TeamSportsModule, // HU-GD-03
    PlayersModule, // HU-GD-04
    TeamPlayersModule, // HU-GD-05
    SkillsModule, // HU-GD-06
    PlayerSkillsModule, // HU-GD-07
    PlayerProfilesModule, // HU-GD-08
  ],
})
export class AppModule {}
