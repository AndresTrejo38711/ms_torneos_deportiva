import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

const SCORE_RANGE = 'debe ser un número entero entre 0 y 999';
const PENALTIES_RANGE = 'deben ser un número entero entre 0 y 99';

// Cuerpo de PUT /matches/{id}/result (HU-GC-07). Ejemplos:
// { "homeScore": 2, "awayScore": 1 }
// { "homeScore": 1, "awayScore": 1, "homePenalties": 4, "awayPenalties": 3 }
//
// No lleva ids de equipos: los marcadores son del local y del visitante del partido, así que no se
// puede registrar el resultado de un equipo que no juega. Los penales solo van en una fase final con
// el marcador empatado; eso lo revisa el service, que conoce la fase.
export class RegisterResultDto {
  @IsNotEmpty({ message: 'El marcador del local es obligatorio' })
  @IsInt({ message: `El marcador del local ${SCORE_RANGE}` })
  @Min(0, { message: `El marcador del local ${SCORE_RANGE}` })
  @Max(999, { message: `El marcador del local ${SCORE_RANGE}` })
  homeScore: number;

  @IsNotEmpty({ message: 'El marcador del visitante es obligatorio' })
  @IsInt({ message: `El marcador del visitante ${SCORE_RANGE}` })
  @Min(0, { message: `El marcador del visitante ${SCORE_RANGE}` })
  @Max(999, { message: `El marcador del visitante ${SCORE_RANGE}` })
  awayScore: number;

  @IsOptional()
  @IsInt({ message: `Los penales del local ${PENALTIES_RANGE}` })
  @Min(0, { message: `Los penales del local ${PENALTIES_RANGE}` })
  @Max(99, { message: `Los penales del local ${PENALTIES_RANGE}` })
  homePenalties?: number | null;

  @IsOptional()
  @IsInt({ message: `Los penales del visitante ${PENALTIES_RANGE}` })
  @Min(0, { message: `Los penales del visitante ${PENALTIES_RANGE}` })
  @Max(99, { message: `Los penales del visitante ${PENALTIES_RANGE}` })
  awayPenalties?: number | null;
}
