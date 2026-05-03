import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class RequestUserDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  userName: string;

  @IsString()
  @IsOptional()
  role: string;

  @IsString()
  @IsOptional()
  profileImage:string

  @IsString()
  @IsOptional()
  initialProfileIcon:true

  @IsOptional()
  @IsBoolean()
  tokenIsToForgotPassword: boolean;

  @IsOptional()
  @IsBoolean()
  isAdmin:boolean
  // @IsString()
  // walletAddress: string;

  @IsOptional()
  @IsString()
  isCompletedPaymentProcess: 'not_started' | 'incomplete' | 'verified'; // Updated to string with specific values
  }
