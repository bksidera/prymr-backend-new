import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";

export class editBookmarkCollectionDto {

    @IsString()
    @IsOptional()
    title:string; //update the title name also

    @IsUUID()
    @IsString()
    bookMarkFolderId:string  //validate the folder id is exits or not if not then show error 

    @IsArray()
    @IsOptional()
    @IsUUID("4", { each: true })
    deleteBoardId:[]  // collect the all id to to delete  the on that collection


}
