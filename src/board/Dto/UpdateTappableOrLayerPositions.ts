import { IsBoolean, IsUUID } from "class-validator";

export class UpdateTappableOrLayerPositions{

    @IsUUID()
    tappableId:string;
 
    @IsBoolean()
    isSubLayer:boolean

    top:string;

    left:string;

    height:string;

    width:string;
    
}