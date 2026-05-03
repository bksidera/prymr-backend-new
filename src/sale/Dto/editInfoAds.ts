import { IsArray, IsOptional, IsString, IsUUID, isUUID } from 'class-validator';

export class EditInfoAds {
  @IsUUID()
  adsId: string;

  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  assetType: string;

  @IsString()
  @IsOptional()
  originalPrice: string;

  @IsString()
  @IsOptional()
  discountPrice: string;

  @IsArray()
  @IsOptional()
  images: [];
}
