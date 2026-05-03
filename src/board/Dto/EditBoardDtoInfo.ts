import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class EditBoardDtoInfo {
  @IsUUID()
  boardImageId: string;

  @IsUUID()
  boardId: string;

  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  subTitle: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsBoolean()
  // @IsOptional()
  allowComments: boolean;
}
