import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { IsUUID } from 'class-validator';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { PaginationDto } from 'src/board/Dto/PaginationDto';
import { ConstantsService } from 'src/constants/constants.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';

@Injectable()
export class SocialService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly responseService: ResponseService,
    private readonly constantsService: ConstantsService,
  ) {}

  async followUser(res, aUser: RequestUserDto, followedUserName:string) {
    try {
      if (!followedUserName) {
        return await this.responseService.NOT_FOUND(
          'userName must require',
          {},
          res,
        );
      }
      let validateUserName=await this.prismaService.user.findFirst({
        where:{
          userName:{
            equals:followedUserName.trim(),
            mode:'insensitive'
          },
          role:await this.constantsService.newUserRole.publicCreator
        }
      })

      if (!validateUserName) {
        return await this.responseService.NOT_FOUND('User not found,pass the correct user name', {}, res);
      }

      if (aUser.id == validateUserName.id) {
        return await this.responseService.NOT_FOUND('Invalid Id', {}, res);
      }
     

     
      const activity = await await this.prismaService.userFollow.findFirst({
        where: { userId: aUser.id, followerId: validateUserName.id },
      });
      //unfollow time delete the record
      if (activity) {
        await this.prismaService.userFollow.delete({
          where: { id: activity.id },
        });
        return await this.responseService.success(
          'success',
          'successfully unfollowed user',
          {},
          res,
        );
      } else {
        //if not found the record then create the record
        await this.prismaService.userFollow.create({
          data: {
            userId: aUser.id,
            followerId: validateUserName.id,
          },
        });
      }
      return await this.responseService.success(
        'success',
        'You are successfully followed',
        {},
        res,
      );
    } catch (error) {
      return await this.responseService.NOT_FOUND(
        'INTERNAL SERVER ERROR',
        error.toString(),
        res,
      );
    }
  }

  async fetchFollowerUserOrFollowingUser(
    res,
    paginationDto: PaginationDto,
    followUsers: boolean | string, // it might come as string or boolean
    aUser: RequestUserDto,
    // searchText: string
  )  {
    try {

       // Convert string "true" or "false" to boolean if necessary
    if (typeof followUsers === 'string') {
      followUsers = followUsers.toLowerCase() === 'true';
    }

   
      const { page, pageSize } = paginationDto;

      // Check for valid page and pageSize
      if (!page || page <= 0) {
        return await this.responseService.NOT_FOUND(
          'Page must be greater than 0',
          {},
          res,
        );
      }
      if (!pageSize || pageSize <= 0) {
        return await this.responseService.NOT_FOUND(
          'Page size must be greater than 0',
          {},
          res,
        );
      }
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;

      let data=[];
      let customWhereClause: Prisma.UserFollowWhereInput = {};
      //logging user followed user list
      if (followUsers) {
        customWhereClause.userId = aUser.id;
        const totalFollowers = await this.prismaService.userFollow.count({
          where: customWhereClause,
        });
        // if(searchText || searchText.trim().length!=0){
        //     customWhereClause.follower={
        //         userName:{
        //             contains:searchText,
        //             mode:"insensitive"
        //         }
        //     }
        // }
        let followerUserList  = await this.prismaService.userFollow.findMany({
          where: customWhereClause,
          take: pageSizeNum,
          skip,
          select: {
            id: true,
            createdAt:true,
            follower: {
              select: {
                id: true,
                profileIcon: true,
                initialProfileIcon: true,
                firstName: true,
                lastName: true,
                userName: true,
                role:true,
              },
            },
          },
        });
          

         let datas= followerUserList.map((user)=>({
                     id:user.id,
                     profileIcon:user.follower.profileIcon,
                     initialProfileIcon:user?.follower?.initialProfileIcon,
                     userName:user.follower.userName,
                     firstName:user.follower.firstName,
                     lastName:user.follower.lastName,
                     role:user.follower?.role,
                     createdAt:user.createdAt
        }))

        return await this.responseService.success(
          'success',
          'follower user list fetched success',
          { count: totalFollowers, data: datas },
          res,
        );
      } else {
        customWhereClause.followerId = aUser.id;
        const totalFollowing = await this.prismaService.userFollow.count({
          where: customWhereClause,
        });
        
        // if(searchText || searchText.trim().length!=0){
        //     customWhereClause.user={
        //         userName:{
        //             contains:searchText,
        //             mode:"insensitive"
        //         }
        //     }
        // }
        // customWhereClause.userId = aUser.id;
        const followingUserList = await this.prismaService.userFollow.findMany({
          where: customWhereClause,
          take: pageSizeNum,
          skip,
          select: {
            id: true,
            createdAt:true,
            user: {
              select: {
                id: true,
                profileIcon: true,
                initialProfileIcon: true,
                firstName: true,
                lastName: true,
                userName: true,
                role:true
              },
            },
          },
        });

        
        let datas= followingUserList.map((user)=>({
          id:user.id,
          profileIcon:user.user.profileIcon,
          initialProfileIcon:user?.user?.initialProfileIcon,
          userName:user.user.userName,
          firstName:user.user.firstName,
          lastName:user.user.lastName,
          role:user?.user?.role,
          createdAt:user.createdAt
}))
        return await this.responseService.success(
          'success',
          'following user list fetched success',
          { count: totalFollowing, data: datas },
          res,
        );  
      }
    } catch (error) {
      return await this.responseService.NOT_FOUND(
        'INTERNAL SERVER ERROR',
        error.toString(),
        res,
      );
    }
  }

//   async fetchFollowerUserOrFollowingUser(
//     res,
//     paginationDto: PaginationDto,
//     followUsers: boolean | string, // it might come as string or boolean
//     aUser: RequestUserDto,
//     // searchText: string
//   )  {
//     try {

//        // Convert string "true" or "false" to boolean if necessary
//     if (typeof followUsers === 'string') {
//       followUsers = followUsers.toLowerCase() === 'true';
//     }

   
//       const { page, pageSize } = paginationDto;

//       // Check for valid page and pageSize
//       if (!page || page <= 0) {
//         return await this.responseService.NOT_FOUND(
//           'Page must be greater than 0',
//           {},
//           res,
//         );
//       }
//       if (!pageSize || pageSize <= 0) {
//         return await this.responseService.NOT_FOUND(
//           'Page size must be greater than 0',
//           {},
//           res,
//         );
//       }
//       const pageNum = Number(page);
//       const pageSizeNum = Number(pageSize);
//       const skip = (pageNum - 1) * pageSizeNum;

//       let data=[];
//       let customWhereClause: Prisma.UserFollowWhereInput = {};
//       //logging user followed user list
//       if (followUsers) {
//         customWhereClause.userId = aUser.id;
//         const totalFollowers = await this.prismaService.userFollow.count({
//           where: customWhereClause,
//         });
//         // if(searchText || searchText.trim().length!=0){
//         //     customWhereClause.follower={
//         //         userName:{
//         //             contains:searchText,
//         //             mode:"insensitive"
//         //         }
//         //     }
//         // }
//         let followerUserList  = await this.prismaService.userFollow.findMany({
//           where: customWhereClause,
//           take: pageSizeNum,
//           skip,
//           select: {
//             id: true,
//             createdAt:true,
//             follower: {
//               select: {
//                 id: true,
//                 profileIcon: true,
//                 initialProfileIcon: true,
//                 firstName: true,
//                 lastName: true,
//                 userName: true,
//               },
//             },
//           },
//         });
          

//          let datas= followerUserList.map((user)=>({
//                      id:user.id,
//                      profileIcon:user.follower.profileIcon,
//                      initialProfileIcon:user?.follower?.initialProfileIcon,
//                      userName:user.follower.userName,
//                      firstName:user.follower.firstName,
//                      lastName:user.follower.lastName,
//                      createdAt:user.createdAt
//         }))

//         return await this.responseService.success(
//           'success',
//           'follower user list fetched success',
//           { count: totalFollowers, data: datas },
//           res,
//         );
//       } else {
//         customWhereClause.followerId = aUser.id;
//         const totalFollowing = await this.prismaService.userFollow.count({
//           where: customWhereClause,
//         });
        
//         // if(searchText || searchText.trim().length!=0){
//         //     customWhereClause.user={
//         //         userName:{
//         //             contains:searchText,
//         //             mode:"insensitive"
//         //         }
//         //     }
//         // }
//         // customWhereClause.userId = aUser.id;
//         const followingUserList = await this.prismaService.userFollow.findMany({
//           where: customWhereClause,
//           take: pageSizeNum,
//           skip,
//           select: {
//             id: true,
//             createdAt:true,
//             user: {
//               select: {
//                 id: true,
//                 profileIcon: true,
//                 initialProfileIcon: true,
//                 firstName: true,
//                 lastName: true,
//                 userName: true,
//               },
//             },
//           },
//         });

        
//         let datas= followingUserList.map((user)=>({
//           id:user.id,
//           profileIcon:user.user.profileIcon,
//           initialProfileIcon:user?.user?.initialProfileIcon,
//           userName:user.user.userName,
//           firstName:user.user.firstName,
//           lastName:user.user.lastName,
//           createdAt:user.createdAt
// }))
//         return await this.responseService.success(
//           'success',
//           'following user list fetched success',
//           { count: totalFollowing, data: datas },
//           res,
//         );  
//       }
//     } catch (error) {
//       return await this.responseService.NOT_FOUND(
//         'INTERNAL SERVER ERROR',
//         error.toString(),
//         res,
//       );
//     }
//   }

  async followBoard(res, aUser: RequestUserDto, boardId) {
    try {
      if (!boardId && !IsUUID(boardId)) {
        return await this.responseService.NOT_FOUND(
          'User id must be UUID',
          {},
          res,
        );
      }

      const isBoardExits = await this.prismaService.board.findFirst({
        where: {
          id: boardId,
        },
      });

      if (!isBoardExits) {
        return await this.responseService.NOT_FOUND('Board not found', {}, res);
      }

      const isAlreadyBoardFollowed =
        await this.prismaService.followBoard.findFirst({
          where: {
            userId: aUser.id,
            boardId: boardId,
          },
        });

      if (isAlreadyBoardFollowed) {
        await this.prismaService.followBoard.delete({
          where: {
            id: isAlreadyBoardFollowed.id,
          },
        });
        return await this.responseService.success(
          'success',
          'Board unfollow success',
          {},
          res,
        );
      }

      await this.prismaService.followBoard.create({
        data: {
          userId: aUser.id,
          boardId: boardId,
        },
      });

      return await this.responseService.success(
        'success',
        'You are successfully followed board',
        {},
        res,
      );
    } catch (error) {
      return await this.responseService.NOT_FOUND(
        'INTERNAL SERVER ERROR',
        error.toString(),
        res,
      );
    }
  }
}
