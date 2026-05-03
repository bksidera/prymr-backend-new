import { IsString, IsUrl, IsUUID } from "class-validator";

export class EditBoardBackgroundImageDto{
    
    @IsUUID()
    boardImageId:string;

    @IsString()
    @IsUrl()
    imageUrl:string;
}   