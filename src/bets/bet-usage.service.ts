import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Bet } from './entities/bet.entity';
import { BetStatus } from './entities/bet.enums';

// Responde preguntas sobre las apuestas sin depender de nadie: cuántas usan un partido o un método de
// pago, y a qué aficionados escribirles. Como MatchUsageService: lo usan los partidos, las
// anotaciones y los métodos de pago, de los que BetsService depende (S y D de SOLID).
@Injectable()
export class BetUsageService {
  constructor(
    @InjectRepository(Bet)
    private readonly betRepository: Repository<Bet>,
  ) {}

  // Apuestas de un partido (de cualquier estado).
  countForMatch(matchId: number): Promise<number> {
    return this.betRepository.count({ where: { match: { id: matchId } } });
  }

  // Apuestas ya liquidadas de un partido (ganadas o perdidas).
  countSettledForMatch(matchId: number): Promise<number> {
    return this.betRepository.count({
      where: {
        match: { id: matchId },
        status: In([BetStatus.GANADA, BetStatus.PERDIDA]),
      },
    });
  }

  // Apuestas pagadas con un método de pago.
  countForPaymentMethod(paymentMethodId: number): Promise<number> {
    return this.betRepository.count({
      where: { paymentMethod: { id: paymentMethodId } },
    });
  }

  // Correos de quienes apostaron en un partido (las apuestas canceladas no cuentan).
  async fanEmailsForMatch(matchId: number): Promise<string[]> {
    const bets = await this.betRepository.find({
      where: { match: { id: matchId }, status: Not(BetStatus.CANCELADA) },
      relations: { fan: true },
    });
    return distinctEmails(bets);
  }

  // Correos de quienes apostaron en partidos anteriores de estos equipos (HU-GC-06, criterio 13).
  async fanEmailsForTeams(
    teamIds: number[],
    excludeMatchId: number,
  ): Promise<string[]> {
    const bets = await this.betRepository
      .createQueryBuilder('bet')
      .innerJoinAndSelect('bet.fan', 'fan')
      .innerJoin('bet.match', 'game')
      .where('game.id <> :excludeMatchId', { excludeMatchId })
      .andWhere('bet.status <> :cancelled', { cancelled: BetStatus.CANCELADA })
      .andWhere(
        '(game.home_team_id IN (:...teamIds) OR game.away_team_id IN (:...teamIds))',
        { teamIds },
      )
      .getMany();
    return distinctEmails(bets);
  }
}

function distinctEmails(bets: Bet[]): string[] {
  return [...new Set(bets.map((bet) => bet.fan.email))];
}
