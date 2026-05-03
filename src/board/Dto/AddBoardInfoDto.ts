import {
  IsBoolean,
  IsJSON,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AddBoardInfoDto {
  @IsUUID()
  boardId: string;

  @IsUUID()
  boardImageId: string;

  // @IsString()
  // imageUrl: string;

  //below is old flow


  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsBoolean() // in this feature added again
  allowComments: boolean;

  @IsString()
  @IsOptional()
  subTitle: string;

    // @IsString()
    // @IsOptional()
    // boardStatus: string; //status=> draft,finished, completed,
}

// @IsJSON()
// jsonElement:string;

// jsonComment:string;
