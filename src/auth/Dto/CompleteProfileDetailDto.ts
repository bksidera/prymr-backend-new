import { IsEmail, IsOptional, IsString } from "class-validator";

export class CompleteProfileDetailDto{

    @IsString()
    firstName:string;

    @IsString()
    lastName:string;

    @IsString()
    userName:string;

    @IsString()
    @IsOptional()
    profileIcon:string;

 
}