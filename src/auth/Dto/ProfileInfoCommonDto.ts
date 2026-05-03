import { IsOptional, IsString } from "class-validator";


export class ProfileInfoCommonDto{
 
    @IsString()
    @IsOptional()
    addBio:string;

    @IsString()
    @IsOptional()
    addProfileCV:string;

    @IsString()
    @IsOptional()
    addProfileNews:string;
}