import { IsEmail, IsOptional, IsString, IsUUID, IsUrl } from "class-validator";

export class EditProfileDetailDto {

    @IsString()
    @IsOptional()
    firstName: string;

    @IsString()
    @IsOptional()
    lastName: string;

    @IsString()
    @IsOptional()
    userName: string;

    // @IsString()
    // @IsOptional()
    // @IsEmail()
    // email: string

    @IsString()
    @IsOptional()
    // @IsUrl()
    profileUrl:string;
}