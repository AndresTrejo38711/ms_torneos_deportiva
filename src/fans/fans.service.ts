import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { AuthenticatedUser } from '../security/authenticated-user';
import { Fan } from './entities/fan.entity';

// El aficionado que hace la petición, como fila de esta base.
@Injectable()
export class FansService {
  constructor(
    @InjectRepository(Fan)
    private readonly fanRepository: Repository<Fan>,
  ) {}

  // Lo busca por su id de ms_torneos_security; si es su primera vez, lo crea. Si cambió de correo
  // allá, lo actualiza aquí.
  async resolve(user: AuthenticatedUser): Promise<Fan> {
    const fan = await this.fanRepository.findOneBy({ userId: user.id });
    if (fan) {
      if (fan.email !== user.email) {
        fan.email = user.email;
        await this.fanRepository.update(fan.id, { email: user.email });
      }
      return fan;
    }
    try {
      return await this.fanRepository.save(
        this.fanRepository.create({ userId: user.id, email: user.email }),
      );
    } catch (error) {
      // Dos primeras peticiones al mismo tiempo: la otra ya lo creó.
      if (error instanceof QueryFailedError) {
        const created = await this.fanRepository.findOneBy({
          userId: user.id,
        });
        if (created) {
          return created;
        }
      }
      throw error;
    }
  }
}
