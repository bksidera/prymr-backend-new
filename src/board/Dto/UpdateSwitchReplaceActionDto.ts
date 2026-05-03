import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class UpdateSwitchReplaceActionDto {
  @IsUUID()
  @IsNotEmpty() // Ensures UUID is not empty
  layerId: string;

  @IsOptional()
  @IsString()
  layerName: string;

  @IsOptional()
  @IsArray() // Ensure it's an array
  @IsString({ each: true }) // Ensure each element of the array is a string
  @IsNotEmpty({ each: true }) // Ensure no empty strings are in the array
  contentImagesLinks: string[];

//   @IsOptional()
//   @IsBoolean()
//   isInfoOverlay?: boolean; // Optional field

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isLockTappable?: boolean; // Optional field

  @IsOptional()
  @IsString()
  price?: string;

  // Only validate `actionName` when `isLockTappable` is true
  @ValidateIf((o) => o.isLockTappable === true)
  @IsIn(['Payment', 'Follow'], {
    message: `actionName must be either 'Payment' or 'Follow' when isLockTappable is true`,
  })
  actionName: string;

  @IsOptional()
  @IsString()
  layerNumber: string;

  @IsOptional()
  @IsString()
  top: string;

  @IsOptional()
  @IsString()
  left: string;

  @IsOptional()
  @IsString()
  width: string;

  @IsOptional()
  @IsString()
  height: string;


  @IsOptional()
  @IsBoolean()
  isInventoryEnabled: boolean;


  @IsOptional()
  @IsNumber()
  inventoryCount: number;

//   @IsBoolean()
//   isVanish: boolean;

//   @IsBoolean()
//   isReplace: boolean;
}
