import { IsAlpha, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateAdsDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  assetType: string;

  @IsString()
  originalPrice: string;

  @IsString()
  @IsOptional()
  discountPrice: string;

  @IsArray()
  images: [];
}
