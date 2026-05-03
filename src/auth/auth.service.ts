import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BcryptService } from 'src/bcrypt/bcrypt.service';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { ResponseService } from 'src/response/response.service';
import { RegisterUserDto } from './Dto/RegisterUserDto';
import { MailService } from 'src/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { RequestUserDto } from './Dto/RequestUserDto';
import { ConstantsService } from 'src/constants/constants.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EditProfileDetailDto } from './Dto/EditProfileDetailDto';
import { PrismaClient } from '@prisma/client';
import { CompleteProfileDetailDto } from './Dto/CompleteProfileDetailDto';
import { IsEmail, IsUUID, IsUrl } from 'class-validator';
import { VerifyForgotPassword } from './Dto/VerifyForgotPassword';
import { ContactDto } from './Dto/ContactDto';
import Stripe from 'stripe';

const prisma = new PrismaClient();
@Injectable()
export class AuthService {
  private stripe: Stripe;
  constructor(
    private readonly prismaService: PrismaService,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtService,
    private readonly responseService: ResponseService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly constantsService: ConstantsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.stripe = new Stripe(
      process.env.STRIPE_SECRET_KEY,
      { timeout: 120000 },
    );
  }

  async validateSecurityKey(res, securityKey: string) {
    try {
      if (securityKey?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Security key must required',
          {},
          res,
        );
      }

      let securityKeyFind = await this.prismaService.securityKeys.findFirst({
        where: {
          key: securityKey,
        },
      });

      if (!securityKeyFind) {
        return await this.responseService.NOT_FOUND(
          'Invalid security key',
          {},
          res,
        );
      }
      return await this.responseService.success(
        'success',
        'Security key is valid',
        { status: true },
        res,
      );
    } catch (error) {}
  }

  async deleteSecurityKey(res, securityKey: string) {
    try {
      if (securityKey?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Security key must required',
          {},
          res,
        );
      }

      let securityKeyFind = await this.prismaService.securityKeys.findFirst({
        where: {
          key: securityKey,
        },
      });

      if (!securityKeyFind) {
        return await this.responseService.NOT_FOUND(
          'Invalid security key',
          {},
          res,
        );
      }
      await this.prismaService.securityKeys.delete({
        where: { id: securityKeyFind.id },
      });
      return await this.responseService.success(
        'success',
        'Security key deleted success',
        { status: true },
        res,
      );
    } catch (error) {}
  }
  async updateSecurityKey(res, oldSecurityKey: string, newSecurityKey: string) {
    try {
      if (oldSecurityKey?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Old security key must required',
          {},
          res,
        );
      }
      if (newSecurityKey?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'New security key must required',
          {},
          res,
        );
      }

      if (oldSecurityKey == newSecurityKey) {
        return await this.responseService.NOT_FOUND(
          'Old and new security key must be different',
          {},
          res,
        );
      }

      if (newSecurityKey.length != 6) {
        return await this.responseService.NOT_FOUND(
          'New security key must be 6 digit',
          {},
          res,
        );
      }

      let securityKeyFind = await this.prismaService.securityKeys.findFirst({
        where: {
          key: oldSecurityKey,
        },
      });

      if (!securityKeyFind) {
        return await this.responseService.NOT_FOUND(
          'Invalid security key',
          {},
          res,
        );
      }

      await this.prismaService.securityKeys.update({
        where: { id: securityKeyFind.id },
        data: {
          key: newSecurityKey,
        },
      });

      return await this.responseService.success(
        'success',
        'Security key updated success',
        { status: true },
        res,
      );
    } catch (error) {}
  }
  /**
   *
   * @param res
   * @param data
   * @param aUser
   * @returns
   *
   * add username,
   */
  async completeProfile(
    res,
    data: CompleteProfileDetailDto,
    aUser: RequestUserDto,
  ) {
    const prisma = this.prismaService;
    const responseService = this.responseService;

    try {
      // Validate first name and last name
      if (
        !data ||
        data.firstName.trim().length === 0 ||
        data.lastName.trim().length === 0
      ) {
        return await this.responseService.NOT_FOUND(
          'First name and last name are required',
          {},
          res,
        );
      }

      // Validate user name
      if (!data.userName || data.userName.trim().length === 0) {
        return await responseService.NOT_FOUND(
          'User name is required',
          {},
          res,
        );
      }

      // Start a transaction
      return await prisma.$transaction(async (prisma) => {
        // Check if the username already exists
        const validateUserName = await prisma.user.findFirst({
          where: {
            userName: data.userName.trim().toLowerCase(),
            NOT: { id: aUser.id },
          },
        });
        if (validateUserName) {
          return await this.responseService.NOT_FOUND(
            'Username already exists, please choose another.',
            {},
            res,
          );
        }

        let profileIcon;
        if (data.profileIcon && data.profileIcon?.trim().length > 0) {
          profileIcon = data.profileIcon;
        }

        // Find the user by ID
        const user = await prisma.user.findFirst({ where: { id: aUser.id } });
        if (!user) {
          return await this.responseService.NOT_FOUND(
            'User not found',
            {},
            res,
          );
        }

        // Update the user's profile
        await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            userName: data.userName?.trim()?.toLowerCase(),
            profileIcon: profileIcon,
            profile_is_completed: true,
          },
        });

        return await this.responseService.success(
          'success',
          'User profile completed',
          {},
          res,
        );
      });
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  // async sendEmailToVerifyEmail(res, data: VerifyEmailDataDto) {
  //   try {
  //     if (data.id?.trim().length == 0) {
  //       return await this.responseService.NOT_FOUND(
  //         'Id not found! please provide the correct id',
  //         {},
  //         res,
  //       );
  //     }
  //     // const user = await this.prismaService.user.findFirst({ where: { socialId: data.id.trim() } });
  //     // if (!user) {
  //     //     return await this.responseService.NOT_FOUND("Id is not found", {}, res)
  //     // }
  //     // if (!user.is_Verified) {
  //     //     if (!user?.email) {
  //     //         const findEmail = await this.prismaService.user.findFirst(
  //     //             {
  //     //                 where: { email: data.email?.trim().toLowerCase() }
  //     //             });
  //     //         if (findEmail) {
  //     //             return await this.responseService.NOT_FOUND("Email already exits, please use another email", {}, res)
  //     //         }

  //     //         const generateOtp = (): string => Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
  //     //         const email = data.email?.trim().toLowerCase();
  //     //         await this.cacheManager.set(email, generateOtp(), 10 * 6000000); //save the otp

  //     //         // Prepare mail details
  //     //         const test = "kiran.mobilefirst@gmail.com"
  //     //         const mailDetails = {
  //     //             fileName: "VerifyEmailOTP.ejs",
  //     //             userEmailList: [test],
  //     //             data: { otp: generateOtp() },
  //     //             subject: "Password reset",
  //     //             text: ""
  //     //         };

  //     //         const emailMsg = await this.mailService.sendMail(mailDetails);
  //     //         return await this.responseService.success("success", emailMsg, {}, res);

  //     //     } else {
  //     //         return await this.responseService.NOT_FOUND("Email is already exits!", {}, res)
  //     //     }
  //     // } else {
  //     //     return await this.responseService.NOT_FOUND("Email is already verified", {}, res)
  //     // }
  //   } catch (error) {
  //     return await this.responseService.INTERNAL_SERVER_ERROR(
  //       'Internal server error',
  //       error.toString(),
  //       res,
  //     );
  //   }
  // }

  // async verifyOTP(res, otp, aUser: RequestUserDto, email: string) {
  //   try {
  //     if (!email || email?.trim().length == 0) {
  //       return await this.responseService.NOT_FOUND(
  //         'email is not found',
  //         {},
  //         res,
  //       );
  //     }
  //     const user = await this.prismaService.user.findFirst({
  //       where: { id: aUser.userId },
  //     });
  //     if (!user) {
  //       return await this.responseService.NOT_FOUND(
  //         'User is not found',
  //         {},
  //         res,
  //       );
  //     }
  //     email = email?.trim().toLowerCase();
  //     const cacheOtp = await this.cacheManager.get(`OTP${email}`); //
  //     if (!cacheOtp) {
  //       return await this.responseService.NOT_FOUND('otp expired', {}, res);
  //     }

  //     if (!(cacheOtp == otp)) {
  //       return await this.responseService.NOT_FOUND('Wrong OTP', {}, res);
  //     }
  //     await this.cacheManager.del(`OTP${email}`);

  //     if (user.is_Verified) {
  //       return await this.responseService.NOT_FOUND(
  //         'User already verified',
  //         {},
  //         res,
  //       );
  //     }
  //     const validateEmail = await this.prismaService.user.findFirst({
  //       where: { email: email.trim().toLowerCase() },
  //     });
  //     if (validateEmail) {
  //       return await this.responseService.NOT_FOUND(
  //         'email already verified',
  //         {},
  //         res,
  //       );
  //     }

  //     await this.prismaService.user.update({
  //       where: { id: user.id },
  //       data: {
  //         email: email?.trim().toLowerCase(),
  //         is_Verified: true,
  //       },
  //     });

  //     return await this.responseService.success(
  //       'success',
  //       'OTP verify success',
  //       {},
  //       res,
  //     );
  //   } catch (error) {
  //     return await this.responseService.INTERNAL_SERVER_ERROR(
  //       'Internal server error',
  //       error.toString(),
  //       res,
  //     );
  //   }
  // }

  async getProfileDetails(res, aUser: RequestUserDto) {
    try {
      const user = await this.prismaService.user.findFirst({
        where: { id: aUser.id },
      });
      if (!user) {
        return await this.responseService.NOT_FOUND('User not found', {}, res);
      }

      const countTotalBoard = await this.prismaService.board.count({
        where: { userId: aUser.id },
      });

      const countFollower = await this.prismaService.userFollow.count({
        where: { followerId: aUser.id },
      });
      const countFollowingUser = await this.prismaService.userFollow.count({
        where: { userId: aUser.id },
      });

      const userProfile = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileIcon: user.profileIcon,
        profileBackGroundImage: user.profileBackGroundImg,
        profileDescription: user.profileDescription,
        userName: user.userName,
        profileIsCompleted: user.profile_is_completed,
        createdAt: user.createdAt,
        follower: countFollower,
        following: countFollowingUser,
        board: countTotalBoard,
      };

      return await this.responseService.success(
        'success',
        'User profile details',
        userProfile,
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async uploadProfileBackgroundImage(
    res,
    image: string,
    aUser: RequestUserDto,
  ) {
    try {
      if (!image && image?.trim().length != 0) {
        return await this.responseService.NOT_FOUND(
          'Pass the image url',
          {},
          res,
        );
      }

      const user = await this.prismaService.user.findFirst({
        where: { id: aUser.id },
      });
      if (!user) {
        return await this.responseService.UNAUTHORIZED(
          'UNAUTHORIZED user',
          res,
        );
      }
      await this.prismaService.user.update({
        where: { id: aUser.id },
        data: {
          profileBackGroundImg: image,
        },
      });
      return await this.responseService.success(
        'success',
        'Profile background image uploaded success',
        { profileImage: image },
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }
  async uploadProfileIcon(res, image1, aUser: RequestUserDto) {
    try {
      const { image } = image1;

      if (!image && image?.trim().length != 0) {
        return await this.responseService.NOT_FOUND(
          'Pass the image url',
          {},
          res,
        );
      }

      const user = await this.prismaService.user.findFirst({
        where: { id: aUser.id },
      });
      if (!user) {
        return await this.responseService.UNAUTHORIZED(
          'UNAUTHORIZED user',
          res,
        );
      }
      await this.prismaService.user.update({
        where: { id: aUser.id },
        data: {
          profileIcon: image,
        },
      });
      return await this.responseService.success(
        'success',
        'Profile icon image uploaded success',
        { profileImage: image },
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async addProfileDescription(res, description: string, aUser: RequestUserDto) {
    try {
      if (!description || description?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Description must required',
          {},
          res,
        );
      }

      const user = await this.prismaService.user.findFirst({
        where: { id: aUser.id },
      });
      if (!user) {
        return await this.responseService.UNAUTHORIZED(
          'UNAUTHORIZED user',
          res,
        );
      }
      await this.prismaService.user.update({
        where: { id: aUser.id },
        data: {
          profileDescription: description,
        },
      });
      return await this.responseService.success(
        'success',
        'Profile description added success',
        {},
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async getSomeOneProfileDetails(res, userId) {
    try {
      if (!userId || !IsUUID(userId)) {
        return await this.responseService.NOT_FOUND(
          'User id not found. User id must be UUID',
          {},
          res,
        );
      }
      const user = await this.prismaService.user.findFirst({
        where: { id: userId },
      });
      if (!user) {
        return await this.responseService.NOT_FOUND('User not found', {}, res);
      }

      const countTotalBoard = await this.prismaService.board.count({
        where: { userId: userId },
      });

      const countFollower = await this.prismaService.userFollow.count({
        where: { followerId: userId },
      });
      const countFollowingUser = await this.prismaService.userFollow.count({
        where: { userId: userId },
      });

      const userProfile = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileIcon: user.profileIcon,
        profileBackGroundImage: user.profileBackGroundImg,
        profileDescription: user.profileDescription,
        userName: user.userName,
        // profileIsCompleted: user.profile_is_completed,
        createdAt: user.createdAt,
        follower: countFollower,
        following: countFollowingUser,
        board: countTotalBoard,
      };

      return await this.responseService.success(
        'success',
        'User profile details',
        userProfile,
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async fetchUserContacts(res, aUser: RequestUserDto) {
    try {
      const user = await this.prismaService.user.findFirst({
        where: { id: aUser.id },
      });
      if (!user) {
        return await this.responseService.UNAUTHORIZED(
          'UNAUTHORIZED user',
          res,
        );
      }
      const contactedUser = await this.prismaService.userFollow.findMany({
        where: { userId: aUser.id },
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              userName: true,
              profileIcon: true,
            },
          },
        },
      });
      if (!contactedUser || contactedUser.length == 0) {
        return await this.responseService.success(
          'success',
          'No contact user found',
          {},
          res,
        );
      }
      const sanitizedData = [];
      for (const user of contactedUser) {
        const obj = {
          id: user.user.id,
          firstName: user.user.firstName,
          lastName: user.user.lastName,
          userName: user.user.userName,
          profileIcon: user.user.userName,
        };

        sanitizedData.push(obj);
      }
      return await this.responseService.success(
        'success',
        'Contacts fetched successfully',
        sanitizedData,
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async fetchUnknownUserProfileDetails(res, userId, aUser: RequestUserDto) {
    try {
      const user = await this.prismaService.user.findFirst({
        where: { id: userId },
      });
      if (!user) {
        return await this.responseService.NOT_FOUND('User not found', {}, res);
      }

      const countTotalBoard = await this.prismaService.board.count({
        where: { userId: userId },
      });

      const countFollower = await this.prismaService.userFollow.count({
        where: { followerId: userId.id },
      });
      const countFollowingUser = await this.prismaService.userFollow.count({
        where: { userId: userId },
      });

      const isLoginUserIsFollowingOrNot =
        await this.prismaService.userFollow.findFirst({
          where: {
            userId: aUser.id,
            followerId: userId,
          },
        });

      const userProfile = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileIcon: user.profileIcon,
        profileBackGroundImage: user.profileBackGroundImg,
        profileDescription: user.profileDescription,
        userName: user.userName,
        profileIsCompleted: user.profile_is_completed,
        createdAt: user.createdAt,
        follower: countFollower,
        following: countFollowingUser,
        board: countTotalBoard,
        isLoginUserIsFollowingOrNot: !isLoginUserIsFollowingOrNot
          ? false
          : true,
      };

      return await this.responseService.success(
        'success',
        'User profile details',
        userProfile,
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  /**
   * 
   * @param res 
   * @param data 
   * @returns 
    algo
    first check the userName and email address is valid or not the save the all the data and pass 
    login time.
   */

  //@kiran
  async createUser(res, data: RegisterUserDto) {
    try {
      //email and password dto validate here not need to handle
      if (!data.userName || data.userName?.trim()?.length == 0) {
        return await this.responseService.NOT_FOUND(
          'Pass the proper userName',
          {},
          res,
        );
      }

      if (
        !data.firstName ||
        data.firstName?.trim().length == 0
        // !data.lastName ||
        // data.lastName?.trim().length == 0
      ) {
        return await this.responseService.NOT_FOUND(
          'Pass the firstName and last name must be valid',
          {},
          res,
        );
      }

      const validateUsernameAndEmail = await this.prismaService.user.findFirst({
        where: {
          OR: [
            {
              userName: {
                equals: data.userName?.trim(),
                mode: 'insensitive',
              },
            },
            { email: data.email?.trim()?.toLowerCase() },
          ],
        },
        select: {
          userName: true,
          email: true,
        },
      });

      if (validateUsernameAndEmail) {
        if (
          validateUsernameAndEmail.email == data.email?.trim()?.toLowerCase()
        ) {
          return await this.responseService.NOT_FOUND(
            'Email is already exits!',
            {},
            res,
          );
        } else {
          return await this.responseService.NOT_FOUND(
            'Sorry! There’s already Prymr account with that username!',
            {},
            res,
          );
        }
      }

      //-------------------------------------------------------------------------------------
      // this is an normal verification process flow it provide to security
      let email = data.email.toLowerCase();
      const cacheOtp = await this.cacheManager.get(
        `VERIFYOTPSECOND${email.toLowerCase().trim()}`,
      );
      // if (!cacheOtp) {
      //   return await this.responseService.NOT_FOUND('Please first verify your email,Email is not verified!', {}, res);
      // }
      // await this.cacheManager.del(`VERIFYOTPSECOND${email.toLowerCase().trim()}`);
      //--------------------------------------------------------------------------------
      const password = await this.bcryptService.plainToHash(data.password);

      const newData = await this.prismaService.user.create({
        data: {
          email: data.email?.trim()?.toLowerCase(),
          password: password,
          userName: data.userName?.trim(),
          firstName: data.firstName?.trim(),
          lastName: data?.lastName,
          profileIcon: data?.profileIcon,
          initialProfileIcon: data.initialProfileIcon,
          role: await this.constantsService.newUserRole.standardUser, // note this api through generate only normal user
        },
      });

      const tokenData = {
        id: newData.id,
        userName: newData.userName,
        email: newData.email,
        firstName: newData.firstName,
        lastName: newData?.lastName,
        profileImage: newData?.profileIcon,
        initialProfileIcon: newData?.initialProfileIcon,
        role: newData.role,
      };
      const token = await this.jwtService.sign(tokenData);

      return await this.responseService.success(
        'success',
        'User created success',
        {
          id: newData.id,
          userName: newData.userName,
          email: newData.email,
          firstName: newData.firstName,
          lastName: newData?.lastName,
          role: newData.role,
          profileImage: newData?.profileIcon,
          initialProfileIcon: newData?.initialProfileIcon,
          creatorRequestsStatus: null,
          token: token,
          isAdmin: false,
          isCompletedPaymentProcess: 'not_started',
        },
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async sendOtpToVerifyEmail(email, res) {
    try {
      if (!IsEmail(email)) {
        return await this.responseService.NOT_FOUND(
          'Invalid email address. Please provide a valid email.',
          {},
          res,
        );
      }
      const validateUsernameAndEmail = await this.prismaService.user.findFirst({
        where: {
          email: email?.trim()?.toLowerCase(),
        },
        select: {
          email: true,
        },
      });

      if (validateUsernameAndEmail) {
        return await this.responseService.NOT_FOUND(
          'Email is already exits!',
          {},
          res,
        );
      }
      let otp = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
      console.log('OTP:', otp);
      await this.cacheManager.set(
        `verifyOTP${email?.trim()?.toLowerCase()}`,
        otp,
        60 * 60000,
      ); //10 min

      // Prepare mail details
      const mailDetails = {
        fileName: 'SendOtpToVerifyEmail.ejs',
        userEmailList: [email],
        data: { otp },
        subject: 'Verify Email',
        text: '',
      };
      // Send mail
      const mail = await this.mailService.sendMail(mailDetails);

      // Return success response
      return await this.responseService.success('success', mail, {}, res);
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async verifyEmailOTP(email, otp: string, res) {
    try {
      if (!IsEmail(email)) {
        return await this.responseService.NOT_FOUND(
          'Invalid email address. Please provide a valid email.',
          {},
          res,
        );
      }
      const otpRegex = /^\d{6}$/;
      if (!otpRegex.test(otp)) {
        return await this.responseService.NOT_FOUND(
          'Invalid OTP. Please provide a 6-digit OTP.',
          {},
          res,
        );
      }
      email = email.toLowerCase().trim();
      const cacheOtp = await this.cacheManager.get(
        `verifyOTP${email?.trim()?.toLowerCase()}`,
      );
      if (!cacheOtp) {
        return await this.responseService.NOT_FOUND('OTP Expired!', {}, res);
      }

      if (!(cacheOtp == otp)) {
        return await this.responseService.NOT_FOUND('Wrong Otp', {}, res);
      }
      await this.cacheManager.del(`verifyOTP${email?.trim()?.toLowerCase()}`);
      let OTP = Math.floor(1000 + Math.random() * 9000);
      await this.cacheManager.set(
        `VERIFYOTPSECOND${email.toLowerCase().trim()}`,
        OTP,
        60 * 60000,
      ); // 1 H

      return await this.responseService.success(
        'success',
        "'OTP verify Success",
        {},
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async sendRequestToBecomeCreator(res, aUser: RequestUserDto) {
    try {
      if (
        aUser.role !== (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED('Invalid user', res);
      }

      const user = await this.prismaService.user.findFirst({
        where: {
          id: aUser.id,
        },
      });

      //validate the is alrady send req
      const findRequest =
        await this.prismaService.userCreatorRequests.findFirst({
          where: {
            userId: aUser.id,
          },
          select: {
            status: true,
          },
        });
      if (findRequest) {
        if (
          findRequest.status ===
          (await this.constantsService.requestCreator.Approved)
        ) {
          return await this.responseService.success(
            'success',
            'Your request already approved',
            {},
            res,
          );
        } else if (
          findRequest.status ===
          (await this.constantsService.requestCreator.Blocked)
        ) {
          return await this.responseService.success(
            'success',
            'Your Account is blocked you cannot send request',
            {},
            res,
          );
        } else if (
          findRequest.status ===
          (await this.constantsService.requestCreator.Rejected)
        ) {
          return await this.responseService.success(
            'success',
            'Your Request is rejected please check the reason',
            {},
            res,
          );
        } else if (
          findRequest.status ===
          (await this.constantsService.requestCreator.Requested)
        ) {
          return await this.responseService.success(
            'success',
            'Your Request is in-progress',
            {},
            res,
          );
        }
      }

      await this.prismaService.userCreatorRequests.create({
        data: {
          userId: aUser.id,
          status: await this.constantsService.requestCreator.Requested,
        },
      });

      const mailDetails = {
        fileName: 'CreatorRequest.ejs',
        userEmailList: [
          user.email,
          // 'kiran.mobilefirst@gmail.com',
          // 'ben@prymr.xyz',
          // 'erik@prymr.xyz',
        ],
        data: {
          name: `${user?.firstName ? user?.firstName : ''} ${user?.lastName ? user?.lastName : ''}`,
          email: user.email,
          // approvalLink: 'https://prymr-development-akshada.vercel.app/',
          approvalLink: 'https://www.prymr.xyz/fakefroot/',
        },
        subject: 'Public Creator Account Request',
        text: '',
      };

      // Send mails
      const mail = await this.mailService.sendMail(mailDetails);
      return await this.responseService.success(
        'success',
        'An email was sent to the email associated with your account, Thank you!',
        {},
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async loginUser(res, aUser: RequestUserDto) {
    try {
      let msg =
        'Account exists but not fully onboarded. Sending new onboarding link.';
      let url;
      let sellerStripeId;
      if (!aUser) {
        return await this.responseService.UNAUTHORIZED(
          'UNAUTHORIZED user',
          res,
        );
      }

      let status;
      const userCreatorRequestsStatus =
        await this.prismaService.userCreatorRequests.findFirst({
          where: {
            userId: aUser.id,
          },
        });

      if (!userCreatorRequestsStatus) {
        status = null;
      } else {
        status = userCreatorRequestsStatus.status;
      }

      const totalFollowers = await this.prismaService.userFollow.count({
        where: {
          userId: aUser.id, // the logged-in user's ID
        },
      });

      const totalFollowing = await this.prismaService.userFollow.count({
        where: {
          followerId: aUser.id, // the logged-in user's ID
        },
      });

      const tokenData = {
        id: aUser.id,
        userName: aUser.userName,
        email: aUser.email,
        firstName: aUser.firstName,
        role: aUser.role,
        lastName: aUser.lastName,
        profileImage: aUser?.profileImage,
        initialProfileIcon: aUser?.initialProfileIcon,
        isAdmin: aUser.isAdmin,
        isCompletedPaymentProcess: aUser.isCompletedPaymentProcess,
      };

      if (
        aUser.role == (await this.constantsService.newUserRole.publicCreator)
      ) {
        sellerStripeId = await this.prismaService.sellerAccount.findFirst({
          where: {
            users: {
              some: {
                id: aUser.id,
              },
            },
          },
        });

        if (sellerStripeId) {
          try {
              const account = await this.stripe.accounts.retrieve(
            sellerStripeId.sellerAccountId,
          );
          const transfersCapability = account.capabilities?.transfers;
          if (!transfersCapability || transfersCapability !== 'active') {
            // The user hasn't finished onboarding
            const accountLink = await this.stripe.accountLinks.create({
              account: sellerStripeId.sellerAccountId,
              refresh_url: this.configService.get('FRONTEND_BASE_URL'),
              return_url: `${this.configService.get('FRONTEND_BASE_URL')}/user-profile?sellerAccountId=${sellerStripeId.sellerAccountId}`,
              type: 'account_onboarding',
            });
            url = accountLink.url;
          } else {
            await this.prismaService.user.update({
              where: {
                id: aUser.id,
              },
              data: {
                isStripeOnBoardingDone: true,
              },
            });
          }
          } catch (error) {
            msg=null,
            sellerStripeId=null

          }
        }
      }
      const token = await this.jwtService.sign(tokenData);
      return await this.responseService.success(
        'success',
        'user login success',
        {
          id: aUser.id,
          userName: aUser.userName,
          email: aUser.email,
          firstName: aUser.firstName,
          lastName: aUser.lastName,
          role: aUser.role,
          profileImage: aUser?.profileImage ? aUser?.profileImage : null,
          initialProfileIcon: aUser?.initialProfileIcon,
          creatorRequestsStatus: status,
          isAdmin: aUser.isAdmin,
          isCompletedPaymentProcess: aUser.isCompletedPaymentProcess,
          totalFollowers: totalFollowers,
          totalFollowing: totalFollowing,
          isStripeAttached: sellerStripeId ? true : false,
          msg: url ? msg : null,
          stripeOnboardingUrl: url ? url : null,
          token: token,
        },
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }
  async forgotPassword(res, email: string) {
    try {
      if (!email || email.trim().length === 0) {
        return await this.responseService.NOT_FOUND(
          'Email is required',
          {},
          res,
        );
      }

      const user = await this.prismaService.user.findFirst({
        where: { email: email?.trim()?.toLowerCase() },
      });

      if (!user) {
        return await this.responseService.NOT_FOUND(
          'User not found! Please create a new account',
          {},
          res,
        );
      }

      const token = this.jwtService.sign(
        {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          userName: user.lastName,
          email: user.email,
          createdAt: user.createdAt,
          tokenIsToForgotPassword: true,
        },
        { expiresIn: '10m' },
      ); // Example: Signing with userId instead of user object

      // const username =
      //   user.firstName && user.lastName
      //     ? `${user.firstName} ${user.lastName}`
      //     : user.firstName || user.lastName || 'User';
      const username = user.userName;

      // Construct the reset password link
      const resetLink = `${this.configService.get('FRONTEND_BASE_URL')}/resetpassword?token=${token}`;

      // Prepare mail details
      const mailDetails = {
        fileName: 'ForgotPassword.ejs',
        userEmailList: [user.email],
        data: { username: username, resetLink },
        subject: 'Password reset',
        text: '',
      };

      // Send mail
      const mail = await this.mailService.sendMail(mailDetails);

      // Return success response
      return await this.responseService.success('success', mail, {}, res);
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async verifyForgotPassword(data: VerifyForgotPassword, res) {
    try {
      if (!data.token || data?.token?.trim().length == 0) {
        return this.responseService.NOT_FOUND(
          'Token not found, Please pass the token',
          {},
          res,
        );
      }
      if (!data.password) {
        return this.responseService.NOT_FOUND('Password not found', {}, res);
      }
      if (!data.confirmPassword) {
        return this.responseService.NOT_FOUND('Password not found', {}, res);
      }
      if (data.password != data.confirmPassword) {
        return this.responseService.NOT_FOUND(
          'Password and confirm password should be same',
          {},
          res,
        );
      }
      let aUser: RequestUserDto = await this.jwtService.verify(data.token);
      if (!aUser.tokenIsToForgotPassword) {
        return this.responseService.NOT_FOUND('invalid token 1024', {}, res);
      }
      if (!aUser) {
        return this.responseService.NOT_FOUND('invalid token', {}, res);
      }
      const findUser = await this.prismaService.user.findFirst({
        where: { id: aUser.id },
      });

      if (!findUser) {
        return this.responseService.NOT_FOUND('User not found', {}, res);
      }

      await this.prismaService.user.update({
        where: {
          id: aUser.id, // Provide the user's ID here
        },
        data: {
          password: await this.bcryptService.plainToHash(data.password),
        },
      });

      return await this.responseService.success(
        'success',
        'Password update success. Please login with new password',
        {},
        res,
      );
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return this.responseService.NOT_FOUND('Token expired', {}, res);
        // throw new Error('Token expired');
      }
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async addProfileBio(res, addBio: string, aUser: RequestUserDto) {
    try {
      if (
        aUser.role === (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED(
          `You don't  have permission this api`,
          res,
        );
      }
      if (!addBio || addBio?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Bio must required',
          {},
          res,
        );
      }

      const user = await this.prismaService.user.findFirst({
        where: { id: aUser.id },
      });
      if (!user) {
        return await this.responseService.UNAUTHORIZED(
          'UNAUTHORIZED user',
          res,
        );
      }
      await this.prismaService.user.update({
        where: { id: aUser.id },
        data: {
          bio: addBio,
        },
      });
      return await this.responseService.success(
        'success',
        'Profile Bio added success',
        {},
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async addProfileCV(res, addProfileCV: string, aUser: RequestUserDto) {
    try {
      if (
        aUser.role === (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED(
          `You don't  have permission this api`,
          res,
        );
      }
      if (!addProfileCV || addProfileCV?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'addProfileCV must required',
          {},
          res,
        );
      }

      const user = await this.prismaService.user.findFirst({
        where: { id: aUser.id },
      });
      if (!user) {
        return await this.responseService.UNAUTHORIZED(
          'UNAUTHORIZED user',
          res,
        );
      }
      await this.prismaService.user.update({
        where: { id: aUser.id },
        data: {
          cv: addProfileCV,
        },
      });
      return await this.responseService.success(
        'success',
        'Profile CV added success',
        {},
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async addProfileNews(res, addProfileNews: string, aUser: RequestUserDto) {
    try {
      if (
        aUser.role === (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED(
          `You don't  have permission this api`,
          res,
        );
      }
      if (!addProfileNews || addProfileNews?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'addProfileNews must required',
          {},
          res,
        );
      }

      const user = await this.prismaService.user.findFirst({
        where: { id: aUser.id },
      });
      if (!user) {
        return await this.responseService.UNAUTHORIZED(
          'UNAUTHORIZED user',
          res,
        );
      }
      await this.prismaService.user.update({
        where: { id: aUser.id },
        data: {
          news: addProfileNews,
        },
      });
      return await this.responseService.success(
        'success',
        'Profile News added success',
        {},
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  /* ------------no use this 3 api----------------------------------------------------------------------------------*/
  async getProfileBio(res, flag: boolean) {
    try {
      let userRole = '';
      if (flag) {
        userRole = await this.constantsService.userRole.privateUser;
      } else {
        userRole = await this.constantsService.userRole.publicUser;
      }
      const user = await this.prismaService.user.findFirst({
        where: {
          role: userRole,
        },
        select: {
          bio: true,
        },
      });
      return await this.responseService.success(
        'success',
        'User Bio fetched success',
        { bio: user.bio },
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }
  async getProfileCV(res, aUser: RequestUserDto) {
    try {
      const user = await this.prismaService.user.findFirst({
        where: {
          id: aUser.id,
        },
        select: {
          cv: true,
        },
      });
      return await this.responseService.success(
        'success',
        'User CV fetched success',
        { CV: user.cv },
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }
  async getProfileNews(res, aUser: RequestUserDto) {
    try {
      const user = await this.prismaService.user.findFirst({
        where: {
          id: aUser.id,
        },
        select: {
          news: true,
        },
      });
      return await this.responseService.success(
        'success',
        'User news fetched success',
        { news: user.news },
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }
  /* ------------no use this 3 api----------------------------------------------------------------------------------*/

  async contact(res, data: ContactDto, aUser) {
    try {
      // if (aUser.role != (await this.constantsService.userRole.)) {
      //   return await this.responseService.UNAUTHORIZED(
      //     'You cannot access this api, You dont have permission',
      //     res,
      //   );
      // }

      if (!data?.name || data.name?.trim()?.length == 0) {
        return await this.responseService.NOT_FOUND(
          'Pass the userName',
          {},
          res,
        );
      }
      if (!data.firstName || data.firstName?.trim()?.length == 0) {
        return await this.responseService.NOT_FOUND(
          'First name must require',
          {},
          res,
        );
      }
      if (!data.message || data.message?.trim()?.length == 0) {
        return await this.responseService.NOT_FOUND(
          'Message must require',
          {},
          res,
        );
      }
      if (!data.subject || data.subject?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Subject must require',
          {},
          res,
        );
      }

      let user = await this.prismaService.user.findFirst({
        where: {
          userName: {
            equals: data.name?.trim(),
            mode: 'insensitive',
          },
        },
        select: {
          email: true,
        },
      });
      if (!user) {
        return await this.responseService.NOT_FOUND(
          'Invalid userName',
          {},
          res,
        );
      }
      // Prepare mail details
      const mailDetails = {
        fileName: 'Contact.ejs',
        userEmailList: [
          // 'support@prymr.xyz',
          user.email,
          // 'kiran.mobilefirst@gmail.com',
          // 'akshada.yelawande@mobilefirstapplications.com',
        ],
        data: {
          firstName: data.firstName,
          email: data.email,
          subject: data.subject,
          message: data.message,
        },
        subject: 'New Contact Request',
        text: '',
      };

      // Send mail
      const mail = await this.mailService.sendMail(mailDetails);

      // Return success response
      return await this.responseService.success('success', mail, {}, res);
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async getPublicProfileInfo(res, userName) {
    try {
      let params;
      let defaultUserId;
      if (!userName || /^\s*$/.test(userName)) {
        const findDefaultCreatorId = await this.prismaService.user.findFirst({
          where: {
            // userName:"prymr",
            isDefaultCreatorUser: true,
            isDeleted: false,
            role: await this.constantsService.newUserRole.publicCreator,
          },
          select: {
            userName: true,
            id: true,
          },
        });

        if (!findDefaultCreatorId) {
          return await this.responseService.NOT_FOUND(
            'something is wrong no default user found',
            {},
            res,
          );
        }
        defaultUserId = findDefaultCreatorId.id;
        params = 'prymr';
      } else {
        const findCreatorId = await this.prismaService.user.findFirst({
          where: {
            userName: {
              equals: userName?.trim().toLowerCase(),
              mode: 'insensitive',
            },
            isDefaultCreatorUser: false,
            isDeleted: false,
            role: await this.constantsService.newUserRole.publicCreator,
          },
          select: {
            userName: true,
            id: true,
          },
        });

        if (!findCreatorId) {
          const findDefaultCreatorId = await this.prismaService.user.findFirst({
            where: {
              isDefaultCreatorUser: true,
              isDeleted: false,
              role: await this.constantsService.newUserRole.publicCreator,
            },
            select: {
              userName: true,
              id: true,
            },
          });

          if (!findDefaultCreatorId) {
            return await this.responseService.NOT_FOUND(
              'something is wrong no default user found',
              {},
              res,
            );
          }
          return await this.responseService.NOT_FOUND(
            `User Name is not valid, Please go the default user profile`,
            { defaultCreatorUserName: findDefaultCreatorId.userName },
            res,
          );

          defaultUserId = findDefaultCreatorId.id;
          params = 'prymr';
        } else {
          defaultUserId = findCreatorId.id;
          params = userName;
        }
      }

      const user = await this.prismaService.user.findFirst({
        where: {
          id: defaultUserId,
          role: await this.constantsService.newUserRole.publicCreator,
        },
        select: {
          id: true,
          userName: true,
          bio: true,
          cv: true,
          news: true,
        },
      });

      if (!user) {
        return await this.responseService.NOT_FOUND(
          'User  not found!',
          {},
          res,
        );
      }

      return await this.responseService.success(
        'success',
        'Profile info fetched success',
        { params: params, data: user },
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async getPrivateProfileInfo(res, aUser: RequestUserDto) {
    try {
      if (aUser.role != (await this.constantsService.userRole.privateUser)) {
        return await this.responseService.UNAUTHORIZED(
          `You don't  have permission this api`,
          res,
        );
      }
      const user = await this.prismaService.user.findFirst({
        where: {
          role: await this.constantsService.userRole.privateUser,
        },
        select: {
          id: true,
          userName: true,
          bio: true,
          cv: true,
          news: true,
        },
      });

      if (!user) {
        return await this.responseService.NOT_FOUND('User not found!', {}, res);
      }

      return await this.responseService.success(
        'success',
        'Private info fetched success',
        { data: user },
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async removeProfileIcon(res, aUser: RequestUserDto) {
    try {
      const user = await this.prismaService.user.findFirst({
        where: {
          id: aUser.id,
        },
        select: {
          profileIcon: true,
        },
      });

      if (!user) {
        return await this.responseService.UNAUTHORIZED('User not found', res);
      }
      await this.prismaService.user.update({
        where: {
          id: aUser.id,
        },
        data: {
          profileIcon: null,
        },
      });
      return await this.responseService.success(
        'success',
        'Profile icon removed successfully',
        {},
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async updateProfileDetails(
    res,
    aUser: RequestUserDto,
    data: EditProfileDetailDto,
  ) {
    try {
      const user = await this.prismaService.user.findFirst({
        where: { id: aUser.id },
      });
      // no update the email
      // if (data.email && data.email?.trim()?.length != 0) {
      //   const validateEmail = await this.prismaService.user.findFirst({
      //     where: {
      //       email: data.email.trim().toLowerCase(),
      //       NOT: { id: aUser.id },
      //     },
      //   });
      //   if (validateEmail) {
      //     return await this.responseService.NOT_FOUND(
      //       'Email id is already exists! provide the correct email id.',
      //       {},
      //       res,
      //     );
      //   }
      //   await this.prismaService.user.update({
      //     where: { id: aUser.id },
      //     data: {
      //       email: data.email.trim().toLowerCase(),
      //     },
      //   });
      // }

      if (data.userName && data.userName?.trim()?.length != 0) {
        const validateEmail = await this.prismaService.user.findFirst({
          where: {
            userName: data.userName.trim().toLowerCase(),
            NOT: { id: aUser.id },
          },
        });
        if (validateEmail) {
          return await this.responseService.NOT_FOUND(
            'User Name is already exists! provide the correct User name.',
            {},
            res,
          );
        }
        await this.prismaService.user.update({
          where: { id: aUser.id },
          data: {
            userName: data.userName.trim().toLowerCase(),
          },
        });
      }

      if (data.profileUrl && data.profileUrl?.trim().length != 0) {
        await this.prismaService.user.update({
          where: { id: aUser.id },
          data: {
            profileIcon: data.profileUrl,
          },
        });
      }

      if (data.firstName && data.firstName?.trim().length != 0) {
        await this.prismaService.user.update({
          where: { id: aUser.id },
          data: {
            firstName: data.firstName,
          },
        });
      }

      if (data.lastName && data.lastName?.trim().length != 0) {
        await this.prismaService.user.update({
          where: { id: aUser.id },
          data: {
            lastName: data.lastName,
          },
        });
      }
      return await this.responseService.success(
        'success',
        'Profile updated success',
        {},
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async fetchAdminEmail(res) {
    try {
      let admin = await this.prismaService.user.findFirst({
        where: {
          isDefaultCreatorUser: true,
        },
        select: {
          id: true,
          role: true,
          email: true,
        },
      });

      if (!admin) {
        return await this.responseService.NOT_FOUND(
          'Admin email not found',
          {},
          res,
        );
      }
      return await this.responseService.success(
        'success',
        'Admin email fetch success',
        { data: admin },
        res,
      );
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }
}
