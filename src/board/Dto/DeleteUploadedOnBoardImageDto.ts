import { IsUUID } from "class-validator";

export class DeleteUploadedOnBoardImageDto{

    @IsUUID()
    boardImageId:string;

    
    @IsUUID()
    layerImagedId:string;  //it means tappable table uuid 
}