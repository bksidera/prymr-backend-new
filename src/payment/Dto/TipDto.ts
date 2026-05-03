import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';

export enum TipFeatureName {
  BOARD = 'BoardTipPayment',
  USER = 'UserTipPayment',
  REACTION = 'ReactionTipPayment',
}

export class TipDto {
  @IsOptional()
  @IsEnum(TipFeatureName, {
    message:
      'featureName must be either BoardTipPayment or UserTipPayment or ReactionTipPayment',
  })
  featureName?: TipFeatureName;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  boardId?: string;

  amount: number;

  paymentMethodId: string;
}
