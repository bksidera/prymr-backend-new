import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { RegisterUserDto } from './Dto/RegisterUserDto';

import { JwtAuthGuard, LocalAuthGuard } from 'src/guards/guards.service';

import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

import { EditProfileDetailDto } from './Dto/EditProfileDetailDto';
import { CompleteProfileDetailDto } from './Dto/CompleteProfileDetailDto';
import { RequestUserDto } from './Dto/RequestUserDto';
import { VerifyForgotPassword } from './Dto/VerifyForgotPassword';
import { ContactDto } from './Dto/ContactDto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(REQUEST) private readonly request: Request,
    private readonly jwtService: JwtService,
  ) {}

  @Post('createUser')
  async createUser(@Res() res: Response, @Body() data: RegisterUserDto) {
    return await this.authService.createUser(res, data);
  }

  @Post('validateSecurityKey')
  async validateSecurityKey(@Res() res: Response, @Query('securityKey') securityKey: string) {
    return await this.authService.validateSecurityKey(res, securityKey);
  }

  @Delete('deleteSecurityKey')
  async deleteSecurityKey(@Res() res: Response, @Query('securityKey') securityKey: string) {
    return await this.authService.deleteSecurityKey(res, securityKey);
  }
  @Put('updateSecurityKey')
  async updateSecurityKey(@Res() res: Response, @Query('oldSecurityKey') oldSecurityKey: string, @Query('newSecurityKey') newSecurityKey: string) {
    return await this.authService.updateSecurityKey(res, oldSecurityKey, newSecurityKey);
  }

  @Post('sendOtpToVerifyEmail')
  async sendOtpToVerifyEmail(@Query('email') email: string,@Res() res) {
    return this.authService.sendOtpToVerifyEmail(email,res);
  }
  
  @Post('verifyEmailOTP')
  async verifyEmailOTP(
    @Query('email') email: string,
    @Query('otp') otp: string,
    @Res() res
  ) {
    return this.authService.verifyEmailOTP(email, otp,res);
  }


  @Post('sendRequestToBecomeCreator')
  @UseGuards(JwtAuthGuard)
  async sendRequestToBecomeCreator(@Res() res: Response) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.authService.sendRequestToBecomeCreator(res,aUser);
  }

  @Post('loginUser')
  @UseGuards(LocalAuthGuard)
  async loginUser(@Res() res: Response,){
    const aUser:RequestUserDto = this.request['user'];

    return await this.authService.loginUser(res,aUser)
  }

  //it sending the user mail and  new token
  @Post('forgotPassword')
  async forgotPassword(@Res() res: Response, @Query('email') email: string) {
    return await this.authService.forgotPassword(res, email);
  }


  /**
   *
   * @param res
   * @param data
   * @returns
   * pass the token,password and confirmPassword
   */
  @Post('verifyForgotPassword')
  async verifyForgotPassword(
    @Res() res: Response,
    @Body() data: VerifyForgotPassword,
  ) {
    return this.authService.verifyForgotPassword(data, res);
  }

  @Post('completeProfile')
  @UseGuards(JwtAuthGuard)
  async completeProfile(@Res() res: Response, @Body() data: CompleteProfileDetailDto) {
    const user = this.request['user'];
    return await this.authService.completeProfile(res, data,user);
  }




//login user can see the all details profile 
//it returns the login user details
@Get("getProfileDetails")
@UseGuards(JwtAuthGuard)
async getProfileDetails(@Res() res: Response) {
  const user = this.request['user'];
  return await this.authService.getProfileDetails(res, user);
}

@Post('uploadProfileBackgroundImage')
@UseGuards(JwtAuthGuard)
async uploadProfileBackgroundImage(@Res() res: Response, @Query("image") image:string) {
  const user = this.request['user'];
  return await this.authService.uploadProfileBackgroundImage(res, image,user);
}
@Post('uploadProfileIcon')
@UseGuards(JwtAuthGuard)
async uploadProfileIcon(@Res() res: Response, @Body() image:string) {
  const user = this.request['user'];
  return await this.authService.uploadProfileIcon(res, image,user);
}

@Post('addProfileDescription')
@UseGuards(JwtAuthGuard)
async addProfileDescription(@Res() res: Response, @Query("description") description:string) {
  const user = this.request['user'];
  return await this.authService.addProfileDescription(res, description,user);
}


//@todo in case that user already followed to that user then display the more data
@Get("getSomeOneProfileDetails")
// @UseGuards(JwtAuthGuard)
async getSomeOneProfileDetails(@Res() res: Response,@Query("userId")userId:String) {
  // const user = this.request['user'];
  return await this.authService.getSomeOneProfileDetails(res,userId);
}

//here display all user contacts(follower user)
@Get("fetchUserContacts")
@UseGuards(JwtAuthGuard)
async fetchUserContacts(@Res() res: Response) {
  const aUser = this.request['user'];
  return await this.authService.fetchUserContacts(res,aUser);
}

//here display 
@Get("fetchUnknownUserProfileDetails")
@UseGuards(JwtAuthGuard)
async fetchUnknownUserProfileDetails(@Res() res: Response,@Query("userId")userId:string) {
  const aUser:RequestUserDto = this.request['user'];
  return await this.authService.fetchUnknownUserProfileDetails(res,userId,aUser);
}

@Post('addProfileBio')
@UseGuards(JwtAuthGuard)
async addProfileBio(@Res() res: Response, @Query("addBio") addBio:string) {
  const aUser:RequestUserDto = this.request['user'];
  return await this.authService.addProfileBio(res, addBio,aUser);
}

@Post('addProfileCV')
@UseGuards(JwtAuthGuard)
async addProfileCV(@Res() res: Response, @Query("addProfileCV") addProfileCV:string) {
  const aUser:RequestUserDto = this.request['user'];
  return await this.authService.addProfileCV(res, addProfileCV,aUser);
}

@Post('addProfileNews')
@UseGuards(JwtAuthGuard)
async addProfileNews(@Res() res: Response, @Query("addProfileNews") addProfileNews:string) {
  const aUser:RequestUserDto = this.request['user'];
  return await this.authService.addProfileNews(res, addProfileNews,aUser);
}

@Get('getProfileBio')
// @UseGuards(JwtAuthGuard)
async getProfileBio(@Res() res: Response,@Query("flag")flag:boolean) {
  // const aUser:RequestUserDto = this.request['user'];
  return await this.authService.getProfileBio(res,flag);
}

@Get('getProfileCV')
@UseGuards(JwtAuthGuard)
async getProfileCV(@Res() res: Response) {
  const aUser:RequestUserDto = this.request['user'];
  return await this.authService.getProfileCV(res, aUser);
}

@Get('getProfileNews')
@UseGuards(JwtAuthGuard)
async getProfileNews(@Res() res: Response) {
  const aUser:RequestUserDto = this.request['user'];
  return await this.authService.getProfileNews(res,aUser);
}

//It send the mail get the contact info send the mail
@Post('contact')
@UseGuards(JwtAuthGuard)
async contact(@Res() res: Response, @Body() data:ContactDto) {
  const aUser:RequestUserDto = this.request['user'];
  return await this.authService.contact(res,data,aUser);
}

//ben public profile info (bio, CV, news)
@Get('getPublicProfileInfo')
async getPublicProfileInfo(@Res() res: Response,@Query("userName")userName:string) {
  return await this.authService.getPublicProfileInfo(res,userName);
}

//ghost user profile info 
@Get('getPrivateProfileInfo')
@UseGuards(JwtAuthGuard)
async getPrivateProfileInfo(@Res() res: Response) {
  const aUser:RequestUserDto = this.request['user'];
  return await this.authService.getPrivateProfileInfo(res,aUser);
}

@Post('removeProfileIcon')
@UseGuards(JwtAuthGuard)
async removeProfileIcon(@Res() res,@Body() data: any) {
  const aUser: RequestUserDto = this.request['user'];
  return await this.authService.removeProfileIcon(res,aUser);
}

@Put("updateProfileDetails")
@UseGuards(JwtAuthGuard)
async updateProfileDetails(@Res() res: Response,@Body()data:EditProfileDetailDto) {
  const user = this.request['user'];
  return await this.authService.updateProfileDetails(res, user,data);
}

  
  // @Put('editProfileDetails')
  // @UseGuards(JwtAuthGuard)
  // async editProfileDetails(
  //   @Res() res: Response,
  //   @Body() data: EditProfileDetailDto,
  // ) {
  //   const aUser = this.request['user'];
  //   return await this.authService.editProfileDetails(res, aUser, data);
  // }


@Get('fetchAdminEmail')
async fetchAdminEmail(@Res() res: Response) {
  return await this.authService.fetchAdminEmail(res);
}


}
