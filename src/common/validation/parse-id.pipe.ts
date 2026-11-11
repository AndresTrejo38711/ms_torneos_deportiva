import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ApplicationException } from '../errors/application.exception';
import { ErrorCase } from '../errors/error-case.enum';

// Revisa el id de la URL (/sports/5). Si no es un entero mayor que 0, por ejemplo /sports/abc o
// /sports/-3, responde 400 en vez de buscar un registro que no puede existir.
// Uso: @Param('id', ParseIdPipe) id: number
//
// Llega como número porque el ValidationPipe global ya lo convirtió ("abc" llega como NaN);
// por eso el mensaje no repite el valor recibido.
@Injectable()
export class ParseIdPipe implements PipeTransform<string | number, number> {
  transform(value: string | number, metadata: ArgumentMetadata): number {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El ${metadata.data ?? 'id'} de la URL debe ser un número entero mayor que 0`,
      );
    }
    return id;
  }
}
