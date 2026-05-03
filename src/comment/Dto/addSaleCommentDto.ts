import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AddSaleCommentDto {
  @IsString()
  comment: string;

  @IsUUID()
  adsSaleId: string;

  @IsUUID()
  @IsOptional()
  parentId: string;
}
