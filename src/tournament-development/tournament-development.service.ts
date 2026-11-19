import { Injectable } from '@nestjs/common';
import { GroupsService } from '../groups/groups.service';
import { MatchResponseDto } from '../matches/dto/match-response.dto';
import { MatchesService } from '../matches/matches.service';
import { PhaseResponseDto } from '../phases/dto/phase-response.dto';
import { PhaseType } from '../phases/entities/phase-type.enum';
import { PhasesService } from '../phases/phases.service';
import { ScoresService } from '../scores/scores.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { buildBracket } from './bracket';
import { countByStatus, summarize } from './development-summary';
import {
  DevelopmentMatchDto,
  GroupStandingsDto,
  PhaseDevelopmentDto,
  TournamentDevelopmentDto,
} from './dto/tournament-development.dto';
import { computeStandings } from './standings';

// HU-GC-08 · Consultar el desarrollo de un torneo. Solo lee: junta lo que ya responden los services
// de torneos, fases, grupos, partidos y anotaciones, y calcula la tabla de posiciones
// (standings.ts), las llaves (bracket.ts) y el resumen (development-summary.ts).
@Injectable()
export class TournamentDevelopmentService {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly phasesService: PhasesService,
    private readonly groupsService: GroupsService,
    private readonly matchesService: MatchesService,
    private readonly scoresService: ScoresService,
  ) {}

  // Todo sale filtrado por el torneo pedido: sus fases, sus grupos y los partidos de esas fases.
  async findOne(tournamentId: number): Promise<TournamentDevelopmentDto> {
    const tournament = await this.tournamentsService.findOne(tournamentId); // 404 si no existe
    const phases = await this.phasesService.findByTournament(tournamentId);
    const matches = await this.withScores(
      await this.matchesService.findByTournament(tournamentId),
    );

    const developments: PhaseDevelopmentDto[] = [];
    for (const phase of phases) {
      const phaseMatches = matches.filter(
        (match) => match.phase.id === phase.id,
      );
      developments.push(await this.developPhase(phase, phaseMatches));
    }

    return {
      tournament,
      summary: summarize(tournament.teamsCount, developments),
      phases: developments,
    };
  }

  // ---------------------------------------------------------------------------------------------

  private async developPhase(
    phase: PhaseResponseDto,
    matches: DevelopmentMatchDto[],
  ): Promise<PhaseDevelopmentDto> {
    const isGroupPhase = phase.type === PhaseType.GRUPOS;
    return {
      id: phase.id,
      name: phase.name,
      type: phase.type,
      order: phase.order,
      qualifiersPerGroup: phase.qualifiersPerGroup,
      teamsCount: phase.teamsCount,
      ...countByStatus(matches),
      groups: isGroupPhase ? await this.standingsOf(phase, matches) : null,
      bracket: isGroupPhase
        ? null
        : buildBracket(Number(phase.teamsCount), matches),
      matches,
    };
  }

  // Cada grupo con su tabla: sus equipos y los partidos que se jugaron en él.
  private async standingsOf(
    phase: PhaseResponseDto,
    matches: DevelopmentMatchDto[],
  ): Promise<GroupStandingsDto[]> {
    const groups = await this.groupsService.findByPhase(phase.id);
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      standings: computeStandings(
        group.teams,
        matches.filter((match) => match.group?.id === group.id),
        Number(phase.qualifiersPerGroup),
      ),
    }));
  }

  // Le pone a cada partido sus anotaciones (una sola consulta para todos).
  private async withScores(
    matches: MatchResponseDto[],
  ): Promise<DevelopmentMatchDto[]> {
    const scores = await this.scoresService.findByMatches(
      matches.map((match) => match.id),
    );
    return matches.map((match) =>
      Object.assign(match, { scores: scores.get(match.id) ?? [] }),
    );
  }
}
