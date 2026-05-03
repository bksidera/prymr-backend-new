import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { PrismaService } from 'src/prisma/prisma.service';
import { Strategy } from 'passport-local';
import { BcryptService } from 'src/bcrypt/bcrypt.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {

    constructor(private readonly prismaService: PrismaService,
        private readonly bcryptService: BcryptService
    ) {
        super();
    }

    //  This method automatic calls when user passes username and password from body.
    //  *****MUST MUST MUST MUST username and password field*****
    async validate(username: string, password: string): Promise<any> {
        const unknownUser = await this.prismaService.user.findFirst({
            where: {
                OR: [
                    { userName: {equals:username?.trim(),mode:"insensitive"} },
                    { email: {
                        equals:username?.trim(),
                        mode:"insensitive"
                    } },
                ],
            },
            select: {
                id: true,
                userName: true,
                email: true,
                firstName: true,
                lastName: true,
                password: true,
                profile_is_completed:true,
                createdAt: true,
                role:true,
                profileIcon:true,
                initialProfileIcon:true,
                isDefaultCreatorUser:true,
                sellerAccountId:true,
                sellerAccount: {
                    select: {
                        verified: true, // Fetch the verified field from the SellerAccount table
                    }
                }

            }
        });

        if (!unknownUser) {
            throw new HttpException({
                status: HttpStatus.OK,
                message: 'UNAUTHORIZED User',
                data: {},
            }, HttpStatus.OK);
        }

        const isPasswordMatch = await this.bcryptService.compareHash(password, unknownUser.password);

        if (!isPasswordMatch) {
            throw new HttpException({
                status: HttpStatus.OK,
                message: 'Incorrect Password',
                data: {},
            }, HttpStatus.OK);
        }
         // Logic for determining the payment process status
         let isCompletedPaymentProcess: string;

         if (!unknownUser.sellerAccountId) {
            isCompletedPaymentProcess = 'not_started'; // SellerAccountId is null
        } else if (unknownUser.sellerAccount && !unknownUser.sellerAccount.verified) {
            isCompletedPaymentProcess = 'incomplete'; // SellerAccountId exists but not verified
        } else if (unknownUser.sellerAccount && unknownUser.sellerAccount.verified) {
            isCompletedPaymentProcess = 'verified'; // SellerAccountId exists and verified is true
        }
        
        const user = {
            id: unknownUser.id,
            userName: unknownUser.userName,
            email: unknownUser.email,
            firstName: unknownUser.firstName,
            lastName: unknownUser.lastName,
            profile_is_completed:unknownUser.profile_is_completed,
            role:unknownUser.role,
            createdAt: unknownUser.createdAt,
            profileImage:unknownUser?.profileIcon?unknownUser?.profileIcon:null,
            initialProfileIcon:unknownUser?.initialProfileIcon?unknownUser?.initialProfileIcon:null,
            isAdmin:unknownUser.isDefaultCreatorUser,
            isCompletedPaymentProcess:isCompletedPaymentProcess,
        }
        return user; // Return the user object if authentication succeeds
    }
}







