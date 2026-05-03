import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';




export class AddSwitchReplaceActionDto {
  @IsUUID()
  @IsNotEmpty() // Ensures UUID is not empty
  tappableId: string;

  @IsOptional()
  @IsString()
  layerName: string;

  @IsOptional()
  @IsArray() // Ensure it's an array
  @IsString({ each: true }) // Ensure each element of the array is a string
  @IsNotEmpty({ each: true }) // Ensure no empty strings are in the array
  contentImagesLinks: string[];

  // @IsOptional()
  @IsBoolean()
  isInfoOverlay?: boolean; // Optional field

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

  // @IsOptional()
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
  isVanish: boolean;

  @IsOptional()
  @IsBoolean()
  isReplace: boolean;


  @IsOptional()
  @IsBoolean()
  isInventoryEnabled: boolean;

  // Apply validation conditionally based on isInventoryEnabled
  @ValidateIf(o => o.isInventoryEnabled === true) // Only validate if isInventoryEnabled is true
  @IsNumber()
  @Min(1, { message: 'Inventory count must be greater than zero when inventory is enabled' })
  inventoryCount: number;
}
