import { IsNotEmpty, IsString, IsNumber, IsEmail, IsBoolean, IsEnum, IsOptional, ValidateIf } from 'class-validator';

export class CreatePaymentIntentDto {
  // @IsNotEmpty({ message: 'Payment method ID is required' })
  // @IsString({ message: 'Payment method ID must be a string' })
  paymentMethodId: string;

  // Tappable ID is required unless boardId or reactionId is present
  @ValidateIf((dto: CreatePaymentIntentDto) => !dto.boardId && !dto.reactionId)
  @IsNotEmpty({ message: 'Tappable ID is required if Board ID or Reaction ID is not provided' })
  @IsString({ message: 'Tappable ID must be a string' })
  tappableId: string;

  @IsNotEmpty({ message: 'Payment purpose is required' })
  @IsEnum(['tip', 'vanish', 'replace', 'normal', 'reaction'], { message: 'Payment purpose must be one of tip,replace,reaction,vanish, or normal' })
  paymentPurpose: 'tip' | 'normal' | 'vanish' | 'replace' | 'reaction'; // New field for payment purpose

  // Board ID is required if the payment purpose is 'tip' and reactionId is not provided
  @ValidateIf((dto: CreatePaymentIntentDto) => dto.paymentPurpose === 'tip' && !dto.reactionId)
  @IsNotEmpty({ message: 'Board ID is required when payment purpose is tip and Reaction ID is not provided' })
  @IsString({ message: 'Board ID must be a string' })
  boardId: string;

  // Reaction ID is required if the payment purpose is 'tip' and boardId is not provided
  @ValidateIf((dto: CreatePaymentIntentDto) => dto.paymentPurpose === 'tip' && !dto.boardId)
  @IsNotEmpty({ message: 'Reaction ID is required when payment purpose is tip and Board ID is not provided' })
  @IsString({ message: 'Reaction ID must be a string' })
  reactionId: string;

  // Vanish ID is required if the payment purpose is 'vanish'
  @ValidateIf((dto: CreatePaymentIntentDto) => dto.paymentPurpose === 'vanish')
  @IsNotEmpty({ message: 'Vanish ID is required when payment purpose is vanish' })
  @IsString({ message: 'Vanish ID must be a string' })
  vanishId: string;

  // Replace Tappable ID is required if the payment purpose is 'replace'
  @ValidateIf((dto: CreatePaymentIntentDto) => dto.paymentPurpose === 'replace')
  @IsNotEmpty({ message: 'Replace Tappable ID is required when payment purpose is replace' })
  @IsString({ message: 'Replace Tappable ID must be a string' })
  replaceTappableId: string;

  // Amount is required if the payment purpose is 'tip'
  @ValidateIf((dto: CreatePaymentIntentDto) => dto.paymentPurpose === 'tip')
  @IsNotEmpty({ message: 'Tip amount is required when payment purpose is tip' })
  @IsNumber({}, { message: 'Tip amount must be a number' })
  tipAmount: number;

  @IsOptional()
  @IsNumber()
  totalBuyQuantity:number;

  // @IsOptional()
  // @IsString({ message: 'Vanish ID must be a string' })
  // vanishId: string;

  // @IsOptional()
  // @IsString({ message: 'Replace Tappable ID must be a string' })
  // replaceTappableId: string;

}
