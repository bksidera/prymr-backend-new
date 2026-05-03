// business-type.dto.ts
import { IsIn, IsString } from 'class-validator';

export class BusinessTypeDto {
  @IsString()
  @IsIn(['individual', 'company', 'non_profit', 'government_entity'], {
    message: 'Invalid business type. Allowed types are individual, company, non_profit, government_entity.',
  })
  businessType: string;
}
