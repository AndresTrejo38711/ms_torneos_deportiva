import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { winningPayout } from './bet-rules';
import { Bet } from './entities/bet.entity';
import { BetSelection, BetStatus } from './entities/bet.enums';

// Cierra las apuestas pendientes de un partido: las liquida cuando se registra su resultado o las
// anula cuando se cancela. Solo toca las PENDIENTE, así que una apuesta nunca se liquida dos veces.
//
// No depende de nadie (solo de la tabla de apuestas): lo usan los partidos, de los que BetsService
// depende. Recibe el EntityManager de la transacción del partido, para que el resultado y la
// liquidación queden juntos o no quede ninguno.
@Injectable()
export class BetSettlementService {
  constructor(
    @InjectRepository(Bet)
    private readonly betRepository: Repository<Bet>,
  ) {}

  // Ganada: valor × cuota. Perdida: 0. Devuelve las apuestas liquidadas (con su aficionado), para
  // escribirles.
  async settle(
    matchId: number,
    winner: BetSelection,
    manager?: EntityManager,
  ): Promise<Bet[]> {
    return this.close(matchId, manager, (bet) =>
      bet.selection === winner
        ? {
            status: BetStatus.GANADA,
            payout: winningPayout(bet.amount, bet.odds),
          }
        : { status: BetStatus.PERDIDA, payout: 0 },
    );
  }

  // El partido se canceló: se devuelve lo apostado.
  async voidAll(matchId: number, manager?: EntityManager): Promise<Bet[]> {
    return this.close(matchId, manager, (bet) => ({
      status: BetStatus.ANULADA,
      payout: bet.amount,
    }));
  }

  private async close(
    matchId: number,
    manager: EntityManager | undefined,
    decide: (bet: Bet) => { status: BetStatus; payout: number },
  ): Promise<Bet[]> {
    const repository = manager?.getRepository(Bet) ?? this.betRepository;
    const pending = await repository.find({
      where: { match: { id: matchId }, status: BetStatus.PENDIENTE },
      relations: { fan: true },
      order: { id: 'ASC' },
    });
    const now = new Date();
    for (const bet of pending) {
      const { status, payout } = decide(bet);
      bet.status = status;
      bet.payout = payout;
      bet.settledAt = now;
      await repository.update(bet.id, { status, payout, settledAt: now });
    }
    return pending;
  }
}
