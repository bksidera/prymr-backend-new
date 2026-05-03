import { IsOptional, IsString } from "class-validator";

export class CreateNewCollectionDto{
    
    @IsString()
    collectionName:string

    @IsString()
    @IsOptional()
    description:string
}