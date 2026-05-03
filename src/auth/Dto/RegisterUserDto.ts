import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MinLength } from 'class-validator';


export class RegisterUserDto {
    @IsString()
    @IsNotEmpty()
    firstName: string;

    // @IsString()
    lastName: string;

    @IsString()
    userName: string;
    
    @IsString()
    @IsUrl()
    profileIcon:string;
    
    @IsString()
    @IsUrl()
    initialProfileIcon:string;


    @IsString()
    @IsEmail({}, { message: 'Please enter a valid email address' })
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/, { message: 'Password must contain at least one digit, one special character, and one uppercase letter' })
    password: string;


}

export class RegisterUserDto1 {

    @IsString()
    @IsEmail()
    email: string;

    @IsString()
    wallet_address: string;
}