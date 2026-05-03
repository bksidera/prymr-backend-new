import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AddBoardCommentDto {
  @IsString()
  comment: string;

  @IsUUID()
  boardId: string;

  @IsUUID()
  boardImageId: string;

  @IsUUID()
  @IsOptional()
  parentCommentId: string;
}
//why we are getting the boardId and imageId:
/**
 * so here it will be come in feature one board and multiple image so we are getting the boardImageId.
 */