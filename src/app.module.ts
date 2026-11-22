import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BetsModule } from './bets/bets.module';
import { FanPaymentMethodsModule } from './fan-payment-methods/fan-payment-methods.module';
import { FanTeamsModule } from './fan-teams/fan-teams.module';
import { FansModule } from './fans/fans.module';
import { GroupTeamsModule } from './group-teams/group-teams.module';
import { GroupsModule } from './groups/groups.module';
import { LocalitiesModule } from './localities/localities.module';
import { MatchesModule } from './matches/matches.module';
import { PhasesModule } from './phases/phases.module';
import { PlayerProfilesModule } from './player-profiles/player-profiles.module';
import { PlayerSkillsModule } from './player-skills/player-skills.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { PlayersModule } from './players/players.module';
import { ScoresModule } from './scores/scores.module';
import { SecurityModule } from './security/security.module';
import { SkillsModule } from './skills/skills.module';
import { SportsModule } from './sports/sports.module';
import { TeamPlayersModule } from './team-players/team-players.module';
import { TeamSportsModule } from './team-sports/team-sports.module';
import { TeamsModule } from './teams/teams.module';
import { TicketsModule } from './tickets/tickets.module';
import { TournamentDevelopmentModule } from './tournament-development/tournament-development.module';
import { TournamentTeamsModule } from './tournament-teams/tournament-teams.module';
import { TournamentVenuesModule } from './tournament-venues/tournament-venues.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { TrackingModule } from './tracking/tracking.module';
import { VenuesModule } from './venues/venues.module';

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

    // Anexo 3 (Gestión de Competencias).
    TournamentsModule, // HU-GC-01
    TournamentTeamsModule, // HU-GC-02
    PhasesModule, // HU-GC-03 y HU-GC-05
    GroupsModule, // HU-GC-04
    GroupTeamsModule, // HU-GC-04 (equipos de cada grupo)
    MatchesModule, // HU-GC-06 y HU-GC-07 (resultado)
    ScoresModule, // HU-GC-07 (anotaciones)
    TournamentDevelopmentModule, // HU-GC-08
    TrackingModule, // HU-GC-09 (seguimiento en vivo)
    FansModule, // HU-GC-10 y HU-GC-11 (aficionados)
    PaymentMethodsModule, // HU-GC-10 (catálogo)
    FanPaymentMethodsModule, // HU-GC-10
    BetsModule, // HU-GC-11

    // Anexo 4 (Gestión de escenarios).
    VenuesModule, // HU-GE-01
    TournamentVenuesModule, // HU-GE-02
    LocalitiesModule, // HU-GE-03
    TicketsModule, // HU-GE-04
    FanTeamsModule, // HU-GE-05
  ],
})
export class AppModule {}
