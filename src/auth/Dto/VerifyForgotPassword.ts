import { IsJWT, IsString, Matches, MinLength } from "class-validator";


export class VerifyForgotPassword {

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/, { message: 'Password must contain at least one digit, one special character, and one uppercase letter' })
    password: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/, { message: 'Password must contain at least one digit, one special character, and one uppercase letter' })
    confirmPassword: string;

    @IsString()
    @IsJWT()
    token: string;

}