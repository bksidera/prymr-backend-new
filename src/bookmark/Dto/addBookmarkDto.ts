import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";


export class addBookmarkDto{
    
    @IsString()
    @IsOptional()
    title:string;
   
  
    @IsUUID("4", { each: true })
    @IsArray()
    bookFolderIds:[];

    @IsString()
    @IsOptional()
    @IsUUID()
    boardId:string;

    @IsString()
    @IsOptional()
    @IsUUID()
    saleAdId:string;

    @IsString()
    bookmarkFeatureType:string;
    
}