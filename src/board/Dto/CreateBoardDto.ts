import { IsJSON, IsOptional, IsString } from 'class-validator';

export class CreateBoardDto {

  pages: [
    {
      imageUrl: string;
      jsonElement:{
        version:string;
        objects:[]
      }
    },
  ];

  @IsString()
  @IsOptional()
  title: string;


  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  boardStatus: string; //status=> draft,finished, completed,
}

// @IsJSON()
// jsonElement:string;

// jsonComment:string;
