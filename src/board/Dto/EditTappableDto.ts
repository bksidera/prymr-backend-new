import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class EditTappableDto {
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  addContentImagesLinks: string[];

  @IsOptional()
  @IsString()
  tappableImage: string; //tappable master image


@IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  layerName: string; //layer name it will help full for uniqueness

  @IsOptional()
  @IsString()
  actionName: string;

  @IsUUID()
  imageId: string;

  @IsUUID()
  tappableId: string;

  @IsOptional()
  @IsString()
  left: string;

  @IsOptional()
  @IsString()
  top: string;

  @IsOptional()
  @IsBoolean()
  isSaleItem: boolean;

  @IsOptional()
  @IsString()
  subTitle: string;

  @IsOptional()
  @IsInt()
  price: bigint;

  @IsOptional()
  @IsString()
  assetType: string;
}
