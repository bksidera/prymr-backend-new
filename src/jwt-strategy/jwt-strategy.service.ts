import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prismaService: PrismaService,
    // private readonly userService:UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  // Automatic calla this method when we use 'JwtAuthGuard'
  // JWT Token Validation
  async validate(payload) {
    if (!payload) {
      throw new HttpException(
        {
          status: HttpStatus.OK,
          message: 'UNAUTHORIZED User',
          data: {},
        },
        HttpStatus.OK,
      );
    }
    const user = await this.prismaService.user.findFirst({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        userName: true,
        lastName: true,
        // wallet_address:true,
        role:true,
        profile_is_completed: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.OK,
          message: 'UNAUTHORIZED User',
          data: {},
        },
        HttpStatus.OK,
      );
    }

    return {
      id: user.id,
      userName: user.userName,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role:user.role,
      // walletAddress:user.wallet_address,
      createdAt: user.createdAt,
    };
  }
}


