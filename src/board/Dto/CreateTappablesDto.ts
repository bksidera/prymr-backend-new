import { IsArray, IsString, IsUrl, ArrayNotEmpty, IsNotEmpty, IsUUID, IsBoolean, IsOptional, IsInt, ValidateIf, IsNumber, Min } from 'class-validator';
import { UUID } from 'crypto';

export class CreateTappableDto {

  @IsOptional()
  tappableId:any;

  @IsArray()
//   @ArrayNotEmpty()
  @IsUrl({}, { each: true })
  addContentImagesLinks: string[];

  @IsString()
  @IsOptional()
  tappableImage: string; //tappable master image

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  layerName: string; //layer name it will help full for uniqueness

  @IsString()
  @IsNotEmpty()
  actionName: string;

  @IsUUID()
  imageId:string

  
  @IsString()
  left:string;

  @IsString()
  top:string;

  @IsString()
  height:string;
  
  @IsString()
  width:string;


  @IsBoolean()
  @IsOptional()
  isSaleItem:boolean

  @IsString()
  @IsOptional()
  subTitle:string;



  @IsInt()
  @IsOptional()
  price:bigint

  // @IsString()
  // @IsOptional()
  // assetType:string;
  
  @IsOptional()
  @IsBoolean()
  isInventoryEnabled: boolean;

  // Apply validation conditionally based on isInventoryEnabled
  @ValidateIf(o => o.isInventoryEnabled === true) // Only validate if isInventoryEnabled is true
  @IsNumber()
  @Min(1, { message: 'Inventory count must be greater than zero when inventory is enabled' })
  inventoryCount: number;
}