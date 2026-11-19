import { PaymentDataFieldsDto } from './payment-data-fields.dto';

// PUT reemplaza los datos del método: mismas reglas que al crear, según su tipo. El tipo del catálogo
// no cambia (si quedó mal, se elimina y se registra otro).
export class UpdateFanPaymentMethodDto extends PaymentDataFieldsDto {}
