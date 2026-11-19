import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { PhaseType } from '../phases/entities/phase-type.enum';
import { MatchBettingDto } from './dto/match-betting.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { MATCH_STATUS_LABEL, MatchStatus } from './entities/match-status.enum';
import { Match } from './entities/match.entity';
import { matchLabel } from './match-label';
import { MatchesService } from './matches.service';

// HU-GC-11 · Cuotas de un partido y si recibe apuestas. Las fija el administrador. Está aparte de
// MatchesService porque es otra HU con sus propias reglas (S de SOLID).
@Injectable()
export class MatchBettingService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly matchesService: MatchesService,
  ) {}

  // Solo con el partido programado. Las apuestas ya hechas conservan su cuota.
  async configure(id: number, dto: MatchBettingDto): Promise<MatchResponseDto> {
    const match = await this.matchesService.findOne(id);
    if (match.status !== MatchStatus.PROGRAMADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} está ${MATCH_STATUS_LABEL[match.status]}: las cuotas solo se fijan mientras está programado`,
      );
    }

    const hasDraw = dto.drawOdds !== undefined && dto.drawOdds !== null;
    if (match.phase.type === PhaseType.GRUPOS && !hasDraw) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `En la fase de grupos hay empate: la cuota del empate es obligatoria en ${matchLabel(match)}`,
      );
    }
    if (match.phase.type === PhaseType.FINAL && hasDraw) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `"${match.phase.name}" es una fase final y no hay empate: el partido no lleva cuota de empate`,
      );
    }

    await this.matchRepository.update(id, {
      homeOdds: dto.homeOdds,
      drawOdds: hasDraw ? dto.drawOdds : null,
      awayOdds: dto.awayOdds,
      bettingOpen: dto.open,
    });
    return this.matchesService.findOne(id);
  }
}
