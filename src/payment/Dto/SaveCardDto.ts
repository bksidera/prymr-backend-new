// src/payments/dto/save-card.dto.ts
import { IsNotEmpty } from 'class-validator';

export class SaveCardDto {
  // @IsNotEmpty()
  // customerId: string;

  @IsNotEmpty()
  paymentMethodId: string;
}
