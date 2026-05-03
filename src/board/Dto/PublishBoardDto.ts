import { IsBoolean, IsIn, IsOptional, IsUrl, IsUUID } from "class-validator";

export class PublishBoard{
    
    @IsUUID()
    collectionId:string;

    @IsUUID()
    boardImageId:string;

    @IsBoolean()
    isPrivateBoard:boolean

    @IsIn(['published', 'draft'])
    boardStatus: string;

    @IsOptional()
    @IsUrl()
    boardImageScr:string;

}