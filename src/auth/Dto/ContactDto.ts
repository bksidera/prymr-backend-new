import { IsEAN, IsEmail, IsString } from "class-validator";

export class ContactDto{

    @IsString()
    firstName:string;

    @IsString()
    @IsEmail()
    email:string;

    @IsString()
    subject:string;

    @IsString()
    message:string

    @IsString()
    name:string;
}
