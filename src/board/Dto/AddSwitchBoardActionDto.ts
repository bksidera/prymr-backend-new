import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, ValidateIf } from "class-validator";

export class AddSwitchBoardActionDto {

    @IsUUID()
    tappableId: string;

    // Validate isReplaceSale only if replaceAction is not 'follow'
    // @ValidateIf(o => o.replaceAction !== 'follow')
    // @IsOptional()
    // @IsBoolean()
    // isReplaceSale: boolean;

    @ValidateIf(o => o.replaceAction !== 'follow')
    @IsOptional()
    @IsBoolean()
    isLockTappable:boolean;

    // Validate replacePrice only if isReplaceSale is true and replaceAction is not 'follow'
    @ValidateIf(o => o.isLockTappable === true && o.isLockTappable !== 'follow')
    @IsString({ message: 'replacePrice must be a string' })
    vanishPrice: string;

    @IsOptional()
    @IsIn(['Vanish'], { message: 'switchAction must be  Vanish' })
    switchAction: string;

    // Validate replaceAction, if 'follow', then no validation on isReplaceSale or replacePrice
    @IsOptional()
    @IsIn(['follow', 'payment'], { message: 'vanishAction must be either follow or payment' })
    vanishAction: string;


    @IsOptional()
    @IsString()
    vanishDescription:string;
}
