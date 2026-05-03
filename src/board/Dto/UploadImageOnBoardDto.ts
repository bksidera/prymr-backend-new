import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class UploadImageOnBoardDto {
  @IsUUID()
  boardImageId: string;

  @IsString()
  left: string;

  @IsString()
  top: string;

  @IsString()
  @IsNotEmpty()
  layerName: string;

  @IsString()
  width: string;

  @IsString()
  height: string;

  @IsOptional()
  @IsUUID()
  tappableId: string;

  @IsString()
  @IsUrl()
  image: string; //tappable master image

  // @IsArray()
  // //   @ArrayNotEmpty()
  //   @IsUrl({}, { each: true })
  //   addContentImagesLinks: string[];

  //   @IsString()
  //   @IsNotEmpty()
  //   title: string;

  //   @IsString()
  //   @IsNotEmpty()
  //   description: string;

  //   @IsString()
  //   @IsNotEmpty()
  //   layerName: string; //layer name it will help full for uniqueness

  //   @IsString()
  //   @IsNotEmpty()
  //   actionName: string;

  //   @IsBoolean()
  //   @IsOptional()
  //   isSaleItem:boolean

  //   @IsString()
  //   @IsOptional()
  //   subTitle:string;

  //   @IsInt()
  //   @IsOptional()
  //   price:bigint

  //   @IsString()
  //   @IsOptional()
  //   assetType:string;
}
