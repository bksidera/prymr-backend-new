import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';
import { CreateBoardDto } from './Dto/CreateBoardDto';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { ConstantsService } from 'src/constants/constants.service';
import { PaginationDto } from './Dto/PaginationDto';
import { json } from 'stream/consumers';
import {
  isArray,
  IsBoolean,
  isBoolean,
  IsCreditCard,
  isURL,
  IsUUID,
  isUUID,
} from 'class-validator';
import { EditBoardDtoInfo } from './Dto/EditBoardDtoInfo';
import { Prisma, PrismaClient } from '@prisma/client';
import { AddBoardInfoDto } from './Dto/AddBoardInfoDto';
import { CreateNewCollectionDto } from './Dto/CreateNewCollectionDto';
import { CreateTappableDto } from './Dto/CreateTappablesDto';
import { PublishBoard } from './Dto/PublishBoardDto';
import { EditBoardBackgroundImageDto } from './Dto/EditBoardBackgroundImageDto';
import { AddReactionDto } from './Dto/AddReactionDto';
import { ReplyReactionCommentDto } from './Dto/ReplyReactionCommentDto';
import { EditTappableDto } from './Dto/EditTappableDto';
import { UploadImageOnBoardDto } from './Dto/UploadImageOnBoardDto';
import { DeleteUploadedOnBoardImageDto } from './Dto/DeleteUploadedOnBoardImageDto';
import { AddSwitchReplaceActionDto } from './Dto/AddSwitchReplaceActionDto';
import { AddSwitchBoardActionDto } from './Dto/AddSwitchBoardActionDto';
import { CommonService } from 'src/common/common.service';
import { UpdateSwitchReplaceActionDto } from './Dto/UpdateSwitchReplaceActionDto';
import { UpdateTappableOrLayerPositions } from './Dto/UpdateTappableOrLayerPositions';
import { PaymentService } from 'src/payment/payment.service';
import { response } from 'express';

@Injectable()
export class BoardService {
  constructor(
    private readonly responseService: ResponseService,
    private readonly prismaService: PrismaService,
    private readonly constantsService: ConstantsService,
    private readonly commonService: CommonService,
    private readonly paymentService: PaymentService,
  ) {}

  async createBoard(res, imageUrl, aUser: RequestUserDto) {
    try {
      if (aUser.role === (await this.constantsService.userRole.user)) {
        return await this.responseService.NOT_FOUND(
          'Invalid permission',
          {},
          res,
        );
      }

      if (!imageUrl || !isURL(imageUrl)) {
        return await this.responseService.NOT_FOUND(
          'imageUrl must require url',
          {},
          res,
        );
      }

      return await this.prismaService.$transaction(async (prisma) => {
        try {
          const board = await prisma.board.create({
            data: {
              userId: aUser.id,
              BoardImages: {
                create: {
                  imageUrl: imageUrl,
                  boardStatus:
                    await this.constantsService.boardStatus.inProgress,
                },
              },
            },
            select: {
              id: true,
              BoardImages: {
                select: {
                  id: true,
                },
              },
            },
          });
          const data = {
            boardId: board.id,
            boardImageId: board.BoardImages[0].id,
          };

          return await this.responseService.success(
            'success',
            'Board created successfully',
            { data: data },
            res,
          );
        } catch (error) {
          return await this.responseService.INTERNAL_SERVER_ERROR(
            'Internal server error',
            error.toString(),
            res,
          );
        }
      });
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async deleteBoard(res, boardId, aUser: RequestUserDto) {
    try {
      if (!isUUID(boardId)) {
        return await this.responseService.NOT_FOUND(
          'boardId must be uuid',
          {},
          res,
        );
      }

      const validateBoard = await this.prismaService.board.findFirst({
        where: {
          id: boardId,
          userId: aUser.id,
          isDeleted: false,
        },
      });

      if (!validateBoard) {
        return await this.responseService.NOT_FOUND(
          'Pass the correct valid boardId',
          {},
          res,
        );
      }

      await this.prismaService.board.update({
        where: {
          id: boardId,
        },
        data: {
          isDeleted: true,
        },
      });
      return await this.responseService.success(
        'success',
        'Board deleted success',
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
  // async createBoard(res, data, aUser: RequestUserDto) {
  //   try {
  //     let boardStatus;
  //     if (
  //       data?.boardStatus?.toLowerCase() ===
  //       (await this.constantsService.boardStatus.draft)
  //     ) {
  //       boardStatus = await this.constantsService.boardStatus.draft;
  //     }

  //     if (!boardStatus) {
  //       boardStatus = await this.constantsService.boardStatus.finished;
  //     }

  //     const user = await this.prismaService.user.findFirst({
  //       where: { id: aUser.id },
  //     });

  //     if (!user) {
  //       return await this.responseService.NOT_FOUND('User not found', {}, res);
  //     }


  //         const board = await prisma.board.create({
  //           data: {
  //             userId: user.id,
  //             // title: title,
  //             // description: description,
  //           },
  //         });



  async fetchUserBoards(
    res,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
  ) {
    try {
      const { page, pageSize } = paginationDto;

      if (page) {
        if (!pageSize) {
          return await this.responseService.NOT_FOUND(
            'pageSize is must be greater than 0',
            {},
            res,
          );
        }
      } else if (pageSize) {
        if (!page) {
          return await this.responseService.NOT_FOUND(
            'page is must be greater than 0',
            {},
            res,
          );
        }
      }

      if (!page || page <= 0) {
        return await this.responseService.NOT_FOUND(
          'page is must be greater than 0',
          {},
          res,
        );
      }
      if (!+pageSize || +pageSize <= 0) {
        return await this.responseService.NOT_FOUND(
          'pageSize is must be greater than 0',
          {},
          res,
        );
      }
      const skip = (Number(page) - 1) * Number(pageSize);
      const whereClause: any = {};

      const boards = await this.prismaService.board.findMany({
        where: {
          userId: aUser.id,
          isDeleted: false,
        },
        skip,
        take: Number(pageSize),
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          user: {
            select: {
              userName: true,
            },
          },
          BoardImages: {
            select: {
              id: true,
              title: true,
              description: true,
              boardStatus: true,
              imageUrl: true,
              // jsonElement: true,
              // jsonComment: true,
              createdAt: true,
            },
          },
        },
      });
      const count = await this.prismaService.board.count({
        where: { userId: aUser.id, isDeleted: false },
      });
      if (count == 0) {
        return await this.responseService.success(
          'success',
          'Board not found',
          {},
          res,
        );
      }

      const sanitizedBoards = [];

      for (const { id, user, BoardImages } of boards) {
        const obj = {
          id: id,
          userName: user.userName,
          board: BoardImages,
        };
        sanitizedBoards.push(obj);
      }
      return await this.responseService.success(
        'success',
        'Fetched user board details',
        { count, sanitizedBoards },
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

  async getEditBoardDetails(res, boardId: string, aUser: RequestUserDto) {
    try {
      if (!boardId || !isUUID(boardId)) {
        return await this.responseService.NOT_FOUND(
          'Board id must require',
          {},
          res,
        );
      }
      const board = await this.prismaService.board.findFirst({
        where: { id: boardId, userId: aUser.id, isDeleted: false },
        select: {
          id: true,
          userId: true,
          createdAt: true,
          user: {
            select: {
              userName: true,
            },
          },
          BoardImages: {
            select: {
              imageUrl: true,
              title: true,
              description: true,
              boardStatus: true,
              jsonElement: true,
              jsonComment: true,
            },
          },
        },
      });

      if (!board) {
        return await this.responseService.NOT_FOUND('Board not found', {}, res);
      }
      const data = {
        id: board.id,
        userName: board.user?.userName ? board.user?.userName : null,
        createdAt: board.createdAt,
        userId: board.userId,
        boardImages: board.BoardImages,
      };
      return await this.responseService.success(
        'success',
        'Board data fetched successfully',
        data,
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

  async fetchUserFeed1(
    res,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
  ) {
    try {
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

      // Fetch followed users' IDs
      const followedUsersIds = await this.prismaService.userFollow
        .findMany({
          where: { userId: aUser.id },
          select: { followerId: true },
        })
        .then((follows) => follows.map((follow) => follow.followerId));

      let followedUsersPosts = [];

      const customWhereClause: Prisma.BoardWhereInput = {
        userId: { in: followedUsersIds },
        isDeleted: false,
      };

      followedUsersIds.push(aUser.id);
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;

      // Fetch followed users' posts with pagination
      followedUsersPosts = await this.prismaService.board.findMany({
        where: customWhereClause,
        orderBy: { createdAt: 'desc' },
        take: pageSizeNum + 1,
        skip: skip,
        select: {
          id: true,
          user: {
            select: {
              userName: true,
              firstName: true,
              lastName: true,
            },
          },
          BoardImages: {
            where: {
              boardStatus: {
                not: 'draft',
              },
            },
            select: {
              id: true,
              boardStatus: true,
              jsonElement: true,
              boardId: true,
              title: true,
              description: true,
              imageUrl: true,
              createdAt: true,
            },
          },
        },
      });

      // Count total posts
      const count = await this.prismaService.board.count({
        where: customWhereClause,
      });
      // console.info(count);
      /**
       case if i have pageNum+1
          10+1 >9
          false
       */

      let hasMoreFollower = true;

      if (Number(pageSizeNum) + 1 > followedUsersPosts.length) {
        hasMoreFollower = false;
      }
      // 10+1=11 <=10 total returns the 1p records
      //                 10<=10 false
      if (Number(pageSizeNum) + 1 <= followedUsersPosts.length) {
        followedUsersPosts.pop();
      }

      return await this.responseService.success(
        'success',
        'Feed  fetched successfully(following user)',
        {
          count: count,
          hasMoreFollower: hasMoreFollower,
          data: followedUsersPosts,
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

  async findSomeNonFriend(remainingTake: number, whereClause) {
    const notFriends = await this.prismaService.board.findMany({
      where: whereClause,
      take: remainingTake,
      skip: 0,
      select: {
        id: true,
        BoardImages: {
          where: {
            boardStatus: {
              not: 'draft',
            },
          },
          select: {
            id: true,
            boardStatus: true,
            title: true,
            description: true,
            imageUrl: true,
            createdAt: true,
          },
        },
      },
    });
    return notFriends;
  }

  async getBoards(
    customWhereClauseForFriends: Prisma.BoardWhereInput,
    customWhereClauseForNotFriends: Prisma.BoardWhereInput,
    activeWhereClause: Prisma.BoardWhereInput,
    cursor: string,
    pageSize: number,
  ) {
    const boards = await this.prismaService.board.findMany({
      where: activeWhereClause,
      cursor: cursor ? { id: cursor } : undefined,
      select: {
        id: true,
        BoardImages: true,
      },
      take: pageSize + 1,
    });

    if (boards.length <= pageSize) {
      const data = [...boards];
      activeWhereClause = customWhereClauseForNotFriends;
      cursor = undefined;
      const notFriendsBoards = await this.getBoards(
        customWhereClauseForFriends,
        customWhereClauseForNotFriends,
        activeWhereClause,
        cursor,
        pageSize,
      );

      data.push(...notFriendsBoards);
    } else {
      return boards;
    }
  }

  async fetchUserFeed2(
    res,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
  ) {
    try {
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

      // Fetch followed users' IDs
      const followedUsersIds = await this.prismaService.userFollow
        .findMany({
          where: { userId: aUser.id },
          select: { followerId: true },
        })
        .then((follows) => follows.map((follow) => follow.followerId));

      followedUsersIds.push(aUser.id);
      let followedUsersPosts = [];

      const customWhereClauseForNotFriends: Prisma.BoardWhereInput = {
        userId: { notIn: followedUsersIds },
      };

      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;

      // Fetch followed users' posts with pagination
      followedUsersPosts = await this.prismaService.board.findMany({
        where: customWhereClauseForNotFriends,
        orderBy: { createdAt: 'desc' },
        take: pageSizeNum + 1,
        skip: skip,
        select: {
          id: true,
          user: {
            select: {
              userName: true,
              firstName: true,
              lastName: true,
            },
          },
          BoardImages: {
            where: {
              boardStatus: {
                not: 'draft',
              },
            },
            select: {
              id: true,
              jsonElement: true,
              boardId: true,
              boardStatus: true,
              title: true,
              description: true,
              imageUrl: true,
              createdAt: true,
            },
          },
        },
      });

      // Count total posts
      const count = await this.prismaService.board.count({
        where: customWhereClauseForNotFriends,
      });

      let hasMore = true;

      if (Number(pageSizeNum) + 1 > followedUsersPosts.length) {
        hasMore = false;
      }

      if (Number(pageSizeNum) + 1 <= followedUsersPosts.length) {
        followedUsersPosts.pop();
      }

      // if(followedUsersPosts.length!=1){

      //   followedUsersPosts.pop();
      // }
      return await this.responseService.success(
        'success',
        'Feed non following fetched successfully',
        { count: count, hasMore: hasMore, data: followedUsersPosts },
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
   * @param aUser 
   * @returns 
    -this is a first step to create a board
    -only saving to board title, description and comment permission.
   */
  async addBoardInfo(res, data: AddBoardInfoDto, aUser: RequestUserDto) {
    try {
      if (
        aUser.role == (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.NOT_FOUND(
          `You don't have permission to add boardInformation`,
          {},
          res,
        );
      }
      const validateBoardIdAndImageId =
        await this.prismaService.board.findFirst({
          where: {
            id: data.boardId,
            userId: aUser.id,
            isDeleted: false,
            BoardImages: {
              some: {
                id: data.boardImageId,
              },
            },
          },
        });

      if (!validateBoardIdAndImageId) {
        return await this.responseService.NOT_FOUND(
          'Pass the correct boardId and boardImageId',
          {},
          res,
        );
      }

      if (!isBoolean(data.allowComments)) {
        return await this.responseService.NOT_FOUND(
          `allowComments should be true or false`,
          {},
          res,
        );
      }

      // if (!data.title || data.title?.trim()?.length == 0) {
      //   return await this.responseService.NOT_FOUND(
      //     'Board title must require',
      //     {},
      //     res,
      //   );
      // }

      // if (!data.description || data.description?.trim()?.length == 0) {
      //   return await this.responseService.NOT_FOUND(
      //     'Board description must require',
      //     {},
      //     res,
      //   );
      // }

      return await this.prismaService.$transaction(async (prisma) => {
        try {
          const board = await prisma.board.update({
            where: {
              id: data.boardId,
              BoardImages: {
                some: {
                  id: data.boardImageId,
                },
              },
            },

            data: {
              userId: aUser.id,
              allowComments: data.allowComments, //this is  we are using add board info time
              // title: title,
              // description: description,
            },
          });

          const newBoardImage = await prisma.boardImages.update({
            where: {
              id: data.boardImageId,
            },
            data: {
              // imageUrl: data.imageUrl,
              boardId: board.id,
              title: data?.title,
              description: data?.description,
              subTitle: data?.subTitle,
              allowComments: data?.allowComments, //per board wise added comments options// 1 aug 2024
            },
            select: {
              id: true,
              boardId: true,
              createdAt: true,
            },
          });

          return await this.responseService.success(
            'success',
            'Board info added successfully',
            {
              boardImageId: newBoardImage.id,
              boardId: newBoardImage.boardId,
              createdAt: newBoardImage.createdAt,
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
      });
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  //     if (!user) {
  //       return await this.responseService.NOT_FOUND('User not found', {}, res);
  //     }

  //     if (!data.title || data.title?.trim()?.length == 0) {
  //       return await this.responseService.NOT_FOUND(
  //         'Board title must require',
  //         {},
  //         res,
  //       );
  //     }

  //     if (!data.description || data.description?.trim()?.length == 0) {
  //       return await this.responseService.NOT_FOUND(
  //         'Board description must require',
  //         {},
  //         res,
  //       );
  //     }




  async fetchRecentPublicUserBoard(
    res,
    tappablePageSize: number,
    paginationDto: PaginationDto,
    userName: string,
  ) {
    try {
      const { page, pageSize } = paginationDto;
      let params;
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

      if (!tappablePageSize || tappablePageSize <= 0) {
        return await this.responseService.NOT_FOUND(
          'tappablePageSize must be greater than 0',
          {},
          res,
        );
      }

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
            userName: userName?.trim().toLowerCase(),
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
          defaultUserId = findDefaultCreatorId.id;
          params = 'prymr';
        } else {
          defaultUserId = findCreatorId.id;
          params = userName;
        }
      }

      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;
      const count = await this.prismaService.board.count({
        where: {
          isDeleted: false,
          BoardImages: {
            every: {
              boardStatus: await this.constantsService.boardStatus.published,
            },
          },
          userId: defaultUserId,
        },
      });
      const boards = await this.prismaService.board.findMany({
        where: {
          isDeleted: false,
          BoardImages: {
            every: {
              boardStatus: await this.constantsService.boardStatus.published,
            },
          },
          userId: defaultUserId,
        },
        take: pageSizeNum,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              profileIcon: true,
              initialProfileIcon: true,
              userName: true,
            },
          },

          BoardImages: {
            select: {
              id: true,
              imageUrl: true,
              description: true,
              title: true,
              createdAt: true,
              _count: {
                select: {
                  BoardImagesCommentLikes: true,
                  boardImagesComments: true,
                },
              },
              tappable: {
                where: {
                  isDeleted: false,
                },
                take: +tappablePageSize,
                skip: 0,
                select: {
                  id: true, //this is tappable id when click on the tappable then fetch the tappable details and actions
                  tappableImage: true,
                  ContentImagesLinks: true,
                  isTappable: true, //if is not tappable then no create the blue icon
                  isVanish: true,
                  isReplace: true,
                  switchId: true,
                },
              },
            },
          },
        },
      });

      const formattedBoards = boards.map((board) => {
        return {
          id: board.id,
          user: {
            id: board.user.id,
            profileIcon: board.user?.profileIcon
              ? board.user?.profileIcon
              : board?.user?.initialProfileIcon,
            userName: board.user.userName,
          },
          BoardImages: board.BoardImages.map((image) => ({
            id: image.id,
            imageUrl: image.imageUrl,
            description: image.description,
            title: image.title,
            createdAt: image.createdAt,
            commentLikesCount: image._count.BoardImagesCommentLikes,
            commentsCount: image._count.boardImagesComments,
            tappable: image?.tappable,
          })),
        };
      });

      return await this.responseService.success(
        'success',
        'Recent board fetched success',
        { count: count, param: params, data: formattedBoards },
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
  //no need to update
  async fetchRecentBoardPrivateUserBoard(
    res,
    tappablePageSize: number,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
  ) {
    try {
      if (aUser.role != (await this.constantsService.userRole.privateUser)) {
        return await this.responseService.UNAUTHORIZED(
          `Invalid user, you cannot have permission of this api`,
          res,
        );
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

      if (!tappablePageSize || tappablePageSize <= 0) {
        return await this.responseService.NOT_FOUND(
          'tappablePageSize must be greater than 0',
          {},
          res,
        );
      }

      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;

      const count = await this.prismaService.board.count({
        where: {
          isDeleted: false,
          BoardImages: {
            every: {
              boardStatus: await this.constantsService.boardStatus.published,
            },
          },
          user: {
            id: aUser.id,
            NOT: {
              role: this.constantsService.userRole.publicUser,
            },
          },
        },
      });
      const boards = await this.prismaService.board.findMany({
        where: {
          isDeleted: false,
          BoardImages: {
            every: {
              boardStatus: await this.constantsService.boardStatus.published,
            },
          },
          user: {
            id: aUser.id,
            role: this.constantsService.userRole.privateUser,
          },
        },
        take: pageSizeNum,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              profileIcon: true,
              initialProfileIcon: true,
              userName: true,
            },
          },
          BoardImages: {
            select: {
              id: true,
              imageUrl: true,
              description: true,
              title: true,
              createdAt: true,
              _count: {
                select: {
                  BoardImagesCommentLikes: true,
                  boardImagesComments: true,
                },
              },
              tappable: {
                take: +tappablePageSize,
                skip: 0,
                select: {
                  id: true, //this is tappable id when click on the tappable then fetch the tappable details and actions
                  tappableImage: true,
                  ContentImagesLinks: true,
                  isTappable: true,
                },
              },
            },
          },
        },
      });

      const formattedBoards = boards.map((board) => {
        return {
          id: board.id,
          user: {
            id: board.user.id,
            profileIcon: board.user?.profileIcon
              ? board.user?.profileIcon
              : board?.user?.initialProfileIcon,
            userName: board.user.userName,
          },
          BoardImages: board.BoardImages.map((image) => ({
            id: image.id,
            imageUrl: image.imageUrl,
            description: image.description,
            title: image.title,
            createdAt: image.createdAt,
            commentLikesCount: image._count.BoardImagesCommentLikes,
            commentsCount: image._count.boardImagesComments,
            tappable: image.tappable,
          })),
        };
      });

      return await this.responseService.success(
        'success',
        'Recent board fetched success',
        { count: count, data: formattedBoards },
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

  //inprogress flow
  async fetchPrivateUserBoardTappable(
    res,
    boardImageId,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
  ) {
    try {
      if (aUser.role != (await this.constantsService.userRole.privateUser)) {
        return await this.responseService.UNAUTHORIZED(
          'You cannot access this api',
          res,
        );
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

      if (!boardImageId || !IsUUID(boardImageId)) {
        return await this.responseService.NOT_FOUND(
          'boardImageId must be uuid',
          {},
          res,
        );
      }
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;

      const count = await this.prismaService.tappable.count({
        where: {
          boardImageId: boardImageId,
          boardImage: {
            board: {
              userId: aUser.id,
            },
          },
        },
      });

      if (count == 0) {
        return await this.responseService.NOT_FOUND(
          'No tappable found',
          {},
          res,
        );
      }

      let tappable = await this.prismaService.tappable.findMany({
        where: {
          boardImageId: boardImageId,
          boardImage: {
            board: {
              userId: aUser.id,
            },
          },
        },
        select: {
          id: true,
          isTappable: true,
          tappableImage: true,
          ContentImagesLinks: true,
          createdAt: true,
        },
        take: +pageSize,
        skip,
      });

      return await this.responseService.success(
        'success',
        'Private user tappable fetched success',
        { count: count, data: tappable },
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

  async fetchPublicUserBoardTappable(res, boardImageId, paginationDto) {
    try {
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

      if (!boardImageId || !IsUUID(boardImageId)) {
        return await this.responseService.NOT_FOUND(
          'boardImageId must be uuid',
          {},
          res,
        );
      }

      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;

      const count = await this.prismaService.tappable.count({
        where: {
          boardImageId: boardImageId,
          isDeleted: false,
          boardImage: {
            board: {
              user: {
                role: await this.constantsService.newUserRole.publicCreator,
              },
            },
          },
        },
      });

      if (count == 0) {
        return await this.responseService.NOT_FOUND(
          'No tappable found',
          {},
          res,
        );
      }

      let tappable = await this.prismaService.tappable.findMany({
        where: {
          boardImageId: boardImageId,
          isDeleted: false,
          boardImage: {
            board: {
              user: {
                role: await this.constantsService.newUserRole.publicCreator,
              },
            },
          },
        },
        select: {
          id: true,
          isTappable: true,
          tappableImage: true,
          ContentImagesLinks: true,
          createdAt: true,
        },
        take: +pageSize,
        skip,
      });

      return await this.responseService.success(
        'success',
        'Public user tappable fetched success',
        { count: count, data: tappable },
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

  async createNewCollection(
    res,
    data: CreateNewCollectionDto,
    aUser: RequestUserDto,
  ) {
    try {
      if (!data.collectionName || data.collectionName?.trim()?.length == 0) {
        return await this.responseService.NOT_FOUND(
          'Collection name must require',
          {},
          res,
        );
      } //data.collectionName?.trim()
      const findCollection = await this.prismaService.collection.findFirst({
        where: {
          collectionName: {
            equals: data.collectionName?.trim(),
            mode: 'insensitive',
          },
          userId: aUser.id,
        },
      });
      if (findCollection) {
        return await this.responseService.NOT_FOUND(
          'Collection name already exits',
          {},
          res,
        );
      }
      await this.prismaService.collection.create({
        data: {
          collectionName: data.collectionName?.trim(),
          userId: aUser.id,
          description: data?.description,
        },
      });
      return await this.responseService.success(
        'success',
        `Collection ${data.collectionName} created success`,
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

  async fetchPublicUserCollections(res, paginationDto, aUser: RequestUserDto) {
    try {
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

      const count = await this.prismaService.collection.count({
        where: {
          user: {
            id: aUser.id,
            role: this.constantsService.newUserRole.publicCreator,
            isDeleted: false,
          },
        },
      });
      const collections = await this.prismaService.collection.findMany({
        where: {
          user: {
            id: aUser.id,
            role: this.constantsService.newUserRole.publicCreator,
          },
        },
        take: +pageSizeNum,
        skip,
        select: {
          id: true,
          collectionName: true,
          createdAt: true,
          Board: {
            where: {
              isDeleted: false,
            },
            take: 4,
            select: {
              boardImageScr: true,
              BoardImages: {
                take: 1,
                select: {
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      if (!collections) {
        return await this.responseService.NOT_FOUND(
          'No collection found, Please create new collection',
          {},
          res,
        );
      }

      return await this.responseService.success(
        'success',
        'Collection fetched success',
        { count: count, data: collections },
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
  //no need to update mlt.
  async fetchPrivateUserCollections(res, paginationDto, aUser: RequestUserDto) {
    try {
      if (aUser.role != (await this.constantsService.userRole.privateUser)) {
        return await this.responseService.NOT_FOUND(
          'Invalid user, You cannot access this api',
          {},
          res,
        );
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

      const count = await this.prismaService.collection.count({
        where: {
          user: {
            id: aUser.id,
            role: this.constantsService.userRole.privateUser,
          },
        },
      });
      const collections = await this.prismaService.collection.findMany({
        where: {
          user: {
            id: aUser.id,
            role: this.constantsService.userRole.privateUser,
          },
        },
        take: +pageSizeNum,
        skip,
        select: {
          id: true,
          collectionName: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      if (!collections) {
        return await this.responseService.NOT_FOUND(
          'No collection found, Please create new collection',
          {},
          res,
        );
      }

      return await this.responseService.success(
        'success',
        'Collection fetched success private user',
        { count: count, data: collections },
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

  async viewSingleCollectionBoards(
    res,
    aUser: RequestUserDto,
    collectionId,
    paginationDto: PaginationDto,
  ) {
    try {
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

      if (!collectionId || !isUUID(collectionId)) {
        return await this.responseService.NOT_FOUND(
          'collectionId invalid',
          {},
          res,
        );
      }

      const validateCollection = await this.prismaService.collection.findFirst({
        where: {
          id: collectionId,
          userId: aUser.id,
        },
      });

      if (!validateCollection) {
        return await this.responseService.NOT_FOUND(
          'Collection not found',
          {},
          res,
        );
      }
      const count = await this.prismaService.collection.count({
        where: {
          id: collectionId,
          userId: aUser.id,
        },
      });

      const collection = await this.prismaService.collection.findMany({
        where: {
          id: collectionId,
          userId: aUser.id,
        },
        take: pageSizeNum,
        skip,
        select: {
          id: true,
          collectionName: true,
          user: {
            select: {
              userName: true,
            },
          },
          Board: {
            select: {
              id: true,
              BoardImages: {
                select: {
                  title: true,
                  imageUrl: true,
                  description: true,
                  boardStatus: true,
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (collection?.length === 0 || collection[0]?.Board?.length === 0) {
        return await this.responseService.NOT_FOUND(
          'Collection is empty',
          {},
          res,
        );
      }

      const data = collection.map((item) => ({
        collectionId: item.id,
        collectionName: item.collectionName,
        userName: item.user.userName,
        boards: item.Board
          ? item.Board.map((board) => ({
              boardId: board.id,
              boardImages: board.BoardImages,
            }))
          : [],
      }));

      return await this.responseService.success(
        'success',
        'collection fetched success',
        { count: count, data: data },
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
  /*-----------------------------------------------------------------------------------------
@Todo when done front end side all flow then here add the rout name proper
 -co-ordinate flow is remaining
 -validate all the flow and table again
 note: this flow is created temporary
-------------------------------------------------------------------------------------------
*/
  async createTappable(res, data: CreateTappableDto, aUser: RequestUserDto) {
    try {
      if (
        aUser.role === (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED(
          'Invalid permission to this api',
          res,
        );
      }

      if (data.isSaleItem) {
        const findUser = await this.prismaService.user.findFirst({
          where: {
            id: aUser.id,
          },
          select: {
            sellerAccountId: true,
          },
        });
        if (!findUser.sellerAccountId) {
          return await this.responseService.NOT_FOUND(
            'Please link your account to make payment',
            {},
            res,
          );
        }
        if (data.price <= 0) {
          return await this.responseService.NOT_FOUND(
            'Price must be greater than zero',
            {},
            res,
          );
        }
        // if (!data.assetType || data.assetType.trim().length === 0) {
        //   return await this.responseService.NOT_FOUND(
        //     'Asset type is required [physical or digital]',
        //     {},
        //     res,
        //   );
        // }


        if (data.subTitle && data.subTitle.trim().length === 0) {
          return await this.responseService.NOT_FOUND(
            'Subtitle must be non-empty if provided',
            {},
            res,
          );
        }
      }

      if (data.description.trim().length === 0) {
        return await this.responseService.NOT_FOUND(
          'Description is required',
          {},
          res,
        );
      }

      if (data.layerName.trim().length === 0) {
        return await this.responseService.NOT_FOUND(
          'Layer name is required',
          {},
          res,
        );
      }

      if (data.title.trim().length === 0) {
        return await this.responseService.NOT_FOUND(
          'Title is required',
          {},
          res,
        );
      }

      if (data.tappableImage) {
        if (data.tappableImage.trim().length === 0) {
          return await this.responseService.NOT_FOUND(
            'Tappable image is required',
            {},
            res,
          );
        }
      }

      // Validate the image ID
      const isValidImageId = await this.prismaService.boardImages.findFirst({
        where: {
          isDeleted: false,
          id: data.imageId,
          board: {
            userId: aUser.id,
          },
        },
      });

      if (!isValidImageId) {
        return await this.responseService.NOT_FOUND(
          'Invalid image ID, please provide a correct image ID',
          {},
          res,
        );
      }

      const tappableData: any = {
        userId: aUser.id,
        boardId: isValidImageId.boardId,
        actionName: 'addContain',
        ContentImagesLinks: data.addContentImagesLinks,
        layerName: data.layerName,
        tappableImage: data?.tappableImage ? data?.tappableImage : null,
        title: data.title,
        description: data.description,
        boardImageId: data.imageId,
        top: data.top,
        left: data.left,
        isSaleItem: data.isSaleItem ?? false,
        subTitle: data.subTitle ?? null,
        isTappable: true,
        width: data?.width,
        height: data?.height,
      };

      if (data.isSaleItem) {
        // tappableData.assetType = data.assetType;
        tappableData.price = data.price;
      }

      if (data.isInventoryEnabled) {
        if (data.inventoryCount <= 0) {
          return await this.responseService.NOT_FOUND(
            'inventoryCount must require',
            {},
            res,
          );
        }
        // isInventoryEnabled
        tappableData.isInventoryEnabled = data.isInventoryEnabled;
        tappableData.inventoryCount = data.inventoryCount;
        tappableData.inventoryAvailableCount = data.inventoryCount;
      }

      if (data.tappableId) {
        if (!IsUUID(data?.tappableId)) {
          return await this.responseService.NOT_FOUND(
            'tappable id must be uuid',
            {},
            res,
          );
        }
        const validateIsTappable = await this.prismaService.tappable.findFirst({
          where: {
            id: data?.tappableId,
            // isTappable: false, //we can only replace the image to tappable
            userId: aUser.id,
          },
        });

        if (!validateIsTappable) {
          return await this.responseService.NOT_FOUND(
            'tappableId is not valid pass the correct tappableId',
            {},
            res,
          );
        }

        const newTapable = await this.prismaService.tappable.update({
          where: { id: data.tappableId },
          data: tappableData,
        });

        return await this.responseService.success(
          'success',
          'Tappable added successfully',
          { tappableId: newTapable.id },
          res,
        );
      }

      const newTapable = await this.prismaService.tappable.create({
        data: tappableData,
      });

      return await this.responseService.success(
        'success',
        'Tappable added successfully',
        { tappableId: newTapable.id },
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
  async uploadImageOnBoard(
    res,
    data: UploadImageOnBoardDto,
    aUser: RequestUserDto,
  ) {
    try {
      if (
        aUser.role === (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED(
          'Invalid permission to this api',
          res,
        );
      }

      if (data.layerName.trim().length === 0) {
        return await this.responseService.NOT_FOUND(
          'Layer name is required',
          {},
          res,
        );
      }

      const customWhereClause: Prisma.BoardImagesWhereInput = {
        isDeleted: false,
        id: data.boardImageId,
        board: {
          userId: aUser.id,
        },
      };

      if (data.tappableId) {
        customWhereClause.tappable = {
          some: {
            id: data.tappableId,
          },
        };
      }

      // Validate the image ID
      const isValidImageId = await this.prismaService.boardImages.findFirst({
        where: customWhereClause,
      });

      if (!isValidImageId) {
        return await this.responseService.NOT_FOUND(
          'Invalid image ID, please provide a correct image ID',
          {},
          res,
        );
      }

      const validateTappable = await this.prismaService.tappable.findFirst({
        where: {
          id: data.tappableId,
        },
        select: {
          isTappable: true,
        },
      });
      //if tappable id is already exist the update
      if (data.tappableId) {
        const tappableData: any = {
          userId: aUser.id,
          boardId: isValidImageId.boardId,
          boardImageId: data.boardImageId,
          top: data.top,
          left: data.left,
          width: data.width,
          height: data.height,
          layerName: data.layerName,
          isTappable: validateTappable.isTappable ? true : false,
          ContentImagesLinks: [data.image],
          isDeleted: false,
          // updatedAt:data.
          // actionName: 'addContain',
          // ContentImagesLinks: data.addContentImagesLinks,
          // tappableImage: data.tappableImage,
          // title: data.title,
          // description: data.description,
        };

        const newTapable = await this.prismaService.tappable.update({
          where: {
            id: data.tappableId,
          },
          data: tappableData,
        });

        return await this.responseService.success(
          'success',
          'Board Image Updated successfully',
          { tappableId: newTapable.id, updatedAt: newTapable.updatedAt },
          res,
        );
      } else {
        //new tappable block
        const tappableData: any = {
          userId: aUser.id,
          boardId: isValidImageId.boardId,
          boardImageId: data.boardImageId,
          top: data.top,
          left: data.left,
          width: data.width,
          height: data.height,
          layerName: data.layerName,
          isTappable: false,
          ContentImagesLinks: [data.image],
          // actionName: 'addContain',
          // ContentImagesLinks: data.addContentImagesLinks,
          // tappableImage: data.tappableImage,
          // title: data.title,
          // description: data.description,
        };

        const newTapable = await this.prismaService.tappable.create({
          data: tappableData,
        });

        return await this.responseService.success(
          'success',
          'Board Image added successfully',
          { tappableId: newTapable.id, updatedAt: newTapable.updatedAt },
          res,
        );
      }
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async deleteUploadedOnBoardImage(
    res,
    data: DeleteUploadedOnBoardImageDto,
    aUser: RequestUserDto,
  ) {
    try {
      if (
        aUser.role == (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED('Invalid user', res);
      }

      const validateImage = await this.prismaService.tappable.findFirst({
        where: {
          id: data.layerImagedId,
          boardImageId: data.boardImageId,
          userId: aUser.id,
        },
        select: {
          id: true,
          isReplace: true,
          isTappable: true,
          isVanish: true,
        },
      });

      if (!validateImage) {
        return await this.responseService.NOT_FOUND(
          'Pass the correct layerId and image Id',
          {},
          res,
        );
      }

      if (
        !validateImage.isReplace ||
        !validateImage.isReplace ||
        !validateImage.isTappable
      ) {
        await this.prismaService.tappable.update({
          where: {
            id: validateImage.id,
          },
          data: {
            isDeleted: true,
          },
        });
      } else {
        await this.prismaService.tappable.delete({
          where: {
            id: validateImage.id,
          },
        });
      }

      return await this.responseService.success(
        'success',
        'Image deleted success',
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
  //need to test
  async updateTappable(res, data: EditTappableDto, aUser: RequestUserDto) {
    try {
      if (
        aUser.role === (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED(
          'Invalid permission to this api',
          res,
        );
      }
      const editTappableData: any = {};


      //   if (data.price <= 0) {
      //     return await this.responseService.NOT_FOUND(
      //       'Pass the correct price',
      //       {},
      //       res,
      //     );
      //   }
      //   editTappableData.price = data.price;
      // }

      const validateTappable = await this.prismaService.tappable.findFirst({
        where: {
          id: data.tappableId,
          boardImageId: data.imageId,
          isTappable: false,
        },
      });

      if (!validateTappable) {
        return await this.responseService.NOT_FOUND(
          'Invalid image ID or tappableId, please provide a correct image ID and tappableId',
          {},
          res,
        );
      }

      if (data.actionName || data.actionName?.trim()?.length !== 0) {
        editTappableData.actionName = data.actionName;
      }

      if (data.addContentImagesLinks?.length != 0) {
        await this.prismaService.tappable.update({
          where: {
            id: validateTappable.id,
          },
          data: {
            ContentImagesLinks: [],
          },
        });

        editTappableData.ContentImagesLinks = data.addContentImagesLinks;
      }

      if (data?.description?.trim().length !== 0) {
        editTappableData.description = data.description;
      }

      if (data?.title?.trim()?.length !== 0) {
        editTappableData.title = data.title;
      }

      if (data?.subTitle?.trim()?.length !== 0) {
        editTappableData.subTitle = data.subTitle;
      }
      if (data.tappableImage?.trim()?.length !== 0) {
        editTappableData.tappableImage = data.tappableImage;
      }

      if (data.layerName?.trim().length !== 0) {
        editTappableData.layerName = data.layerName;
      }
      if (data.top) {
        editTappableData.top = data.top;
      }

      if (data.left) {
        editTappableData.left = data.left;
      }

      await this.prismaService.tappable.update({
        where: {
          id: data.tappableId,
        },
        data: editTappableData,
      });

      return await this.responseService.success(
        'success',
        'Tappable updated successfully',
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

  //any tappable click then fetch the data here no need to jwt.
  async fetchTappableContain(res, imageId, tappableId, aUser: RequestUserDto) {
    try {
      if (!imageId || !isUUID(imageId)) {
        return await this.responseService.NOT_FOUND(
          'imageId must be uuid',
          {},
          res,
        );
      }

      if (!tappableId || !isUUID(tappableId)) {
        return await this.responseService.NOT_FOUND(
          'tappableId must be a valid UUID',
          {},
          res,
        );
      }
      //action should be info
      const tappable = await this.prismaService.tappable.findFirst({
        where: {
          id: tappableId,
          boardImageId: imageId,
          isTappable: true,
        },
        select: {
          id: true,
          actionName: true,
          layerName: true,
          title: true,
          description: true,
          top: true,
          left: true,
          width: true,
          height: true,
          boardImageId: true,
          tappableImage: true,
          ContentImagesLinks: true,
          price: true,
          inventoryAvailableCount: true,
          isInventoryEnabled: true,
          subTitle: true,
          // assetType: true,
          createdAt: true,
          isSaleItem: true,
          isReplace: true,
          isVanish: true,
          isTappable: true,
        },
      });

      if (!tappable) {
        return await this.responseService.NOT_FOUND(
          'Tappable not found! Please provide a valid imageId and tappableId',
          {},
          res,
        );
      }

      const isPurchaseLoginUser =
        await this.prismaService.transaction.findFirst({
          where: {
            tappableId: tappableId,
            customer: {
              users: {
                every: {
                  id: aUser.id,
                },
              },
            },
          },
        });

      const data = {
        tappableId: tappable.id,
        boardImageId: tappable.boardImageId,
        title: tappable.title,
        tappableDescription: tappable.description,
        top: tappable.top,
        left: tappable.left,
        width: tappable.width,
        height: tappable.height,
        price: tappable?.price ? tappable?.price?.toString() : null,
        // assetType: tappable.assetType,
        tappablePrymrImage: tappable.tappableImage,
        tappableSliderImages: tappable.ContentImagesLinks,
        isPurchaseLoginUser: !!isPurchaseLoginUser,
        cratedAt: tappable.createdAt,
        isSaleItem: tappable.isSaleItem,
        isReplace: tappable.isReplace,
        isVanish: tappable.isVanish,
        isTappable: tappable.isTappable,
        inventoryAvailableCount: tappable?.inventoryAvailableCount?.toString(),
        isOutOfStock: tappable?.inventoryAvailableCount <= 0,
        isInventoryEnabled: tappable.isInventoryEnabled,
      };

      return await this.responseService.success(
        'success',
        'Tappable fetched success',
        data,
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

  async fetchPublicUserCollectionBoards(
    res,
    collectionId,
    paginationDto: PaginationDto,
  ) {
    try {
      if (!collectionId || !isUUID(collectionId)) {
        return await this.responseService.NOT_FOUND(
          'collectionId must be uuid',
          {},
          res,
        );
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

      const validateCollection = await this.prismaService.collection.findFirst({
        where: {
          id: collectionId,
          user: {
            role: await this.constantsService.newUserRole.publicCreator,
          },
        },
      });

      if (!validateCollection) {
        return await this.responseService.NOT_FOUND(
          'Invalid collection id',
          {},
          res,
        );
      }

      const collection = await this.prismaService.collection.findMany({
        where: {
          id: collectionId,
          user: {
            role: await this.constantsService.newUserRole.publicCreator,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          collectionName: true,
          description: true,
          Board: {
            take: pageSizeNum,
            skip,
            where: {
              isDeleted: false,
            },
            select: {
              id: true,
              boardImageScr: true,
              BoardImages: {
                select: {
                  id: true,
                  imageUrl: true,
                  title: true,
                  description: true,
                  createdAt: true,
                  updatedAt: true,
                  tappable: {
                    select: {
                      id: true,
                      ContentImagesLinks: true,
                      isTappable: true,
                      isReplace: true,
                      isVanish: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!collection) {
        return await this.responseService.NOT_FOUND(
          'Collection is empty',
          {},
          res,
        );
      }

      const response = collection.map((col) => ({
        id: col.id,
        collectionName: col.collectionName,
        description: col.description,
        boards: col.Board?.map((board) => ({
          id: board.id,
          boardImageScr: board.boardImageScr,
          images: board.BoardImages?.map((image) => ({
            id: image.id,
            imageUrl: image.imageUrl,
            title: image.title,
            description: image.description,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt,
            tappables: image.tappable?.map((tappable) => ({
              id: tappable.id,
              isTappable: tappable.isTappable,
              isReplace: tappable.isReplace,
              isVanish: tappable.isVanish,
              // Only the first ContentImageLink if not null
              contentImageLink:
                tappable?.ContentImagesLinks &&
                tappable?.ContentImagesLinks?.length > 0
                  ? tappable?.ContentImagesLinks[0]
                  : null,
            })),
          })),
        })),
      }));
      return await this.responseService.success(
        'success',
        'Boards fetched success',
        { data: response },
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

  async fetchPrivateUserCollectionBoards(
    res,
    collectionId,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
  ) {
    try {
      if (aUser.role != (await this.constantsService.userRole.privateUser)) {
        return await this.responseService.UNAUTHORIZED(
          'You cannot access this api.',
          res,
        );
      }
      if (!collectionId || !isUUID(collectionId)) {
        return await this.responseService.NOT_FOUND(
          'collectionId must be uuid',
          {},
          res,
        );
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

      const validateCollection = await this.prismaService.collection.findFirst({
        where: {
          id: collectionId,
          user: {
            id: aUser.id,

            role: await this.constantsService.userRole.privateUser,
          },
        },
      });

      if (!validateCollection) {
        return await this.responseService.NOT_FOUND(
          'Invalid collection id, Pass the correct collectionId',
          {},
          res,
        );
      }

      const collection = await this.prismaService.collection.findMany({
        where: {
          id: collectionId,
          user: {
            id: aUser.id,
            role: await this.constantsService.userRole.privateUser,
          },
        },

        select: {
          id: true,
          collectionName: true,
          description: true,
          Board: {
            where: {
              isDeleted: false,
            },
            take: pageSizeNum,
            skip,
            select: {
              id: true,
              BoardImages: {
                select: {
                  id: true,
                  imageUrl: true,
                  title: true,
                  description: true,
                  createdAt: true,
                  updatedAt: true,
                  tappable: {
                    select: {
                      id: true,
                      ContentImagesLinks: true,
                      isTappable: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!collection) {
        return await this.responseService.NOT_FOUND(
          'Collection is empty',
          {},
          res,
        );
      }

      const response = collection.map((col) => ({
        id: col.id,
        collectionName: col.collectionName,
        description: col.description,
        boards: col.Board?.map((board) => ({
          id: board.id,
          images: board.BoardImages?.map((image) => ({
            id: image.id,
            imageUrl: image.imageUrl,
            title: image.title,
            description: image.description,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt,
            tappables: image.tappable?.map((tappable) => ({
              id: tappable.id,
              // Only the first ContentImageLink if not null
              contentImageLink:
                tappable?.ContentImagesLinks &&
                tappable?.ContentImagesLinks?.length > 0
                  ? tappable?.ContentImagesLinks[0]
                  : null,
            })),
          })),
        })),
      }));

      return await this.responseService.success(
        'success',
        'Boards fetched success',
        { data: response },
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

  async fetchSavedBoard(
    res,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
    tappablePageSize: string,
    filterBy: string,
  ) {
    try {
      let filter = '';
      if (!filterBy) {
        filter = 'all';
      }

      if (aUser.role === (await this.constantsService.userRole.user)) {
        return await this.responseService.UNAUTHORIZED('Invalid user', res);
      }

      if (!+tappablePageSize || +tappablePageSize <= 0) {
        return await this.responseService.NOT_FOUND(
          'tappablePageSize should be greater than zero',
          {},
          res,
        );
      }

      if (filterBy?.trim()?.toLowerCase()) {
        switch (filterBy?.trim()?.toLowerCase()) {
          case 'draft':
            filter = 'draft';
            break;
          case 'published':
            filter = 'published';
            break;
          case 'all':
            break;
          default:
            return await this.responseService.NOT_FOUND(
              'filter should be [draft,all,publish]',
              {},
              res,
            );
        }
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
      let customWhereClause: Prisma.BoardWhereInput = {};
      if (filter == 'all') {
        customWhereClause.userId = aUser.id;
      } else if (filter == 'draft') {
        (customWhereClause.userId = aUser.id),
          (customWhereClause.BoardImages.every.boardStatus = 'draft');
      } else {
        (customWhereClause.userId = aUser.id),
          (customWhereClause.BoardImages.every.boardStatus = 'published');
      }
      const count = await this.prismaService.board.count({
        where: customWhereClause,
      });
      const boards = await this.prismaService.board.findMany({
        where: customWhereClause,
        select: {
          BoardImages: {
            select: {
              id: true,
              boardId: true,
              imageUrl: true,
              updatedAt: true,
              boardStatus: true,
              tappable: {
                select: {
                  id: true,
                  // assetType: true,
                  tappableImage: true,
                  ContentImagesLinks: true,
                },
              },
            },
            take: +tappablePageSize,
          },
        },
        take: +pageSizeNum,
        skip,
      });

      let data = boards.map((board) => ({
        board: board.BoardImages.map((board) => ({
          boardId: board.boardId,
          boardImageId: board.id,
          boardImage: board.imageUrl,
          lastEdited: board.updatedAt,
          isEditable: true, //and this flag through open the layer this thing manage the front end .
          tappable: board.tappable
            ? {
                tappable: board.tappable.map((tappable) => ({
                  tappableId: tappable.id,
                  // assetType: tappable.assetType,
                  tappableImage: tappable?.tappableImage
                    ? tappable.tappableImage
                    : null,
                  otherContainSliderImage: tappable?.ContentImagesLinks
                    ? tappable?.ContentImagesLinks
                    : [],
                })),
              }
            : [],
        })),
      }));

      return await this.responseService.success(
        'success',
        'Saved board fetched success',
        { count: count, data },
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

  async fetchBoardEditInfo(res, boardImageId, aUser: RequestUserDto) {
    try {
      if (
        aUser.role === (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.NOT_FOUND('Invalid user', {}, res);
      }
      if (!boardImageId || !isUUID(boardImageId)) {
        return await this.responseService.NOT_FOUND(
          'boardImageId must be uuid',
          {},
          res,
        );
      }
      const boardInfo = await this.prismaService.boardImages.findFirst({
        where: {
          isDeleted: false,
          id: boardImageId,
          board: {
            userId: aUser.id,
          },
        },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          description: true,
          allowComments: true,
          subTitle: true,
        },
      });

      if (!boardInfo) {
        return await this.responseService.NOT_FOUND(
          'Board info not found, Pass the correct board image id',
          {},
          res,
        );
      }
      return await this.responseService.success(
        'success',
        'Board edit info fetched success',
        { data: boardInfo },
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

  //done
  async fetchEditTappableInfo(
    res,
    boardImageId,
    tappableId,
    aUser: RequestUserDto,
  ) {
    try {
      if (
        aUser.role === (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED('Invalid user', res);
      }

      if (!IsUUID(boardImageId) || !IsUUID(tappableId)) {
        return await this.responseService.NOT_FOUND(
          'pass the valid boardImageId and tappableId',
          {},
          res,
        );
      }
      const validateTappable = await this.prismaService.tappable.findFirst({
        where: {
          id: tappableId,
          boardImageId: boardImageId,
          isTappable: true,
          boardImage: {
            board: {
              userId: aUser.id,
            },
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          // assetType: true,
          isSaleItem: true,
          layerName: true,
          subTitle: true,
          price: true,
          top: true,
          left: true,
          width: true,
          height: true,
          actionName: true,
          ContentImagesLinks: true,
        },
      });

      if (!validateTappable) {
        return await this.responseService.NOT_FOUND(
          'Check the boardImageId and tappableId, tappable not found',
          {},
          res,
        );
      }

      const data = {
        tappableId: validateTappable.id,
        title: validateTappable?.title,
        description: validateTappable?.description,
        // assetType: validateTappable?.assetType,
        isSaleItem: validateTappable?.isSaleItem,
        layerName: validateTappable?.layerName,
        subTitle: validateTappable?.subTitle,
        price: validateTappable?.price
          ? validateTappable?.price?.toString()
          : null, // Serialize BigInt to string
        top: validateTappable?.top,
        left: validateTappable?.left,
        width: validateTappable.width,
        height: validateTappable.height,
        actionName: validateTappable?.actionName,
        contentImagesLinks: validateTappable?.ContentImagesLinks, // This should already be an array of strings
      };

      return await this.responseService.success(
        'success',
        'Tappable fetched successfully',
        { data: data },
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

  //done
  async saveBoardSchema(
    res,
    data: { boardImageId: string; jsonElement: string },
    aUser: RequestUserDto,
  ) {
    try {
      if (!data.boardImageId || !isUUID(data.boardImageId)) {
        return await this.responseService.NOT_FOUND('boardImageId must be a valid UUID', {}, res);
      }
      const boardImage = await this.prismaService.boardImages.findFirst({
        where: { id: data.boardImageId, board: { userId: aUser.id }, isDeleted: false },
      });
      if (!boardImage) {
        return await this.responseService.NOT_FOUND('boardImageId not found or not owned by user', {}, res);
      }
      await this.prismaService.boardImages.update({
        where: { id: data.boardImageId },
        data: { jsonElement: data.jsonElement },
      });
      return await this.responseService.success('success', 'Board schema saved', {}, res);
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR('Internal server error', error.toString(), res);
    }
  }

  async fetchMyCollections(res, aUser: RequestUserDto) {
    try {
      const isCreator =
        aUser.role === (await this.constantsService.newUserRole.publicCreator) ||
        aUser.role === (await this.constantsService.userRole.privateUser);
      if (!isCreator) {
        return await this.responseService.NOT_FOUND('Only creators can access collections', {}, res);
      }
      let collections = await this.prismaService.collection.findMany({
        where: { userId: aUser.id },
        select: { id: true, collectionName: true },
        orderBy: { createdAt: 'asc' },
      });
      if (collections.length === 0) {
        const created = await this.prismaService.collection.create({
          data: { userId: aUser.id, collectionName: 'My Boards' },
          select: { id: true, collectionName: true },
        });
        collections = [created];
      }
      return await this.responseService.success('success', 'Collections fetched', { data: collections }, res);
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR('Internal server error', error.toString(), res);
    }
  }

  async editBoardInfo(res, data: EditBoardDtoInfo, aUser: RequestUserDto) {
    try {
      if (
        aUser.role == (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.NOT_FOUND(
          `You don't have permission to add boardInformation`,
          {},
          res,
        );
      }
      const validateBoardIdAndImageId =
        await this.prismaService.board.findFirst({
          where: {
            isDeleted: false,
            id: data.boardId,
            userId: aUser.id,
            BoardImages: {
              some: {
                id: data.boardImageId,
              },
            },
          },
        });
      if (!validateBoardIdAndImageId) {
        return await this.responseService.NOT_FOUND(
          'Invalid boardId and boardImageId',
          {},
          res,
        );
      }
      let customUpdateClause: any = {};

      if (data?.description?.trim()?.length !== 0) {
        customUpdateClause.description = data.description;
      }
      if (data?.subTitle?.trim()?.length !== 0) {
        customUpdateClause.subTitle = data.subTitle;
      }
      if (data?.title?.trim()?.length !== 0) {
        customUpdateClause.title = data.title;
      }
      customUpdateClause.allowComments = data.allowComments;

      await this.prismaService.boardImages.update({
        where: {
          id: data.boardImageId,
        },
        data: customUpdateClause,
      });
      return await this.responseService.success(
        'success',
        'Board info edited success',
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

  async publishBoard(res, data: PublishBoard, aUser: RequestUserDto) {
    try {
      if (
        aUser.role == (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.NOT_FOUND(
          'Invalid user, You cannot access this api',
          {},
          res,
        );
      }
      const validateCollection = await this.prismaService.collection.findFirst({
        where: {
          userId: aUser.id,
          id: data.collectionId,
        },
      });
      if (!validateCollection) {
        return await this.responseService.NOT_FOUND(
          'Pass the correct collection id, collectionId is invalid',
          {},
          res,
        );
      }

      const validateBoardImageId =
        await this.prismaService.boardImages.findFirst({
          where: {
            isDeleted: false,
            id: data.boardImageId,
            board: {
              userId: aUser.id,
            },
          },
        });
      if (!validateBoardImageId) {
        return await this.responseService.NOT_FOUND(
          'Pass the correct boardImageId,boardImageId is invalid',
          {},
          res,
        );
      }

      let updateBoardData: any = {};
      if (data.boardImageScr) {
        updateBoardData.boardImageScr = data?.boardImageScr;
      }

      updateBoardData.collectionId = data.collectionId;
      console.info(updateBoardData);
      let rep = await this.prismaService.boardImages.update({
        where: {
          isDeleted: false,
          id: data.boardImageId,
          board: {
            userId: aUser.id,
          },
        },
        data: {
          boardStatus: data.boardStatus?.trim(),
          isPrivateBoard: data.isPrivateBoard,
          board: {
            update: updateBoardData,
          },
        },
        select: {
          boardStatus: true,
          isPrivateBoard: true,
          board: {
            select: {
              collectionId: true,
              boardImageScr: true,
            },
          },
        },
      });

      return await this.responseService.success(
        'success',
        'Board published success',
        { data: rep },
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

  //no need mlt
  async fetchPrivateUserDraftsBoards(
    res,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
    searchText: string,
  ) {
    try {
      if (aUser.role !== (await this.constantsService.userRole.privateUser)) {
        return await this.responseService.UNAUTHORIZED('Invalid user', res);
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

      let customWhereClause: Prisma.BoardWhereInput = {
        userId: aUser.id,
        BoardImages: {
          some: {
            boardStatus: await this.constantsService.boardStatus.draft,
          },
        },
      };

      if (searchText && searchText.trim().length !== 0) {
        customWhereClause.BoardImages.some.title = {
          contains: searchText,
          mode: 'insensitive',
        };
      }

      const count = await this.prismaService.board.count({
        where: customWhereClause,
      });

      const draftBoards = await this.prismaService.board.findMany({
        where: customWhereClause,
        select: {
          id: true,
          BoardImages: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              createdAt: true,
              tappable: {
                select: {
                  id: true,
                  ContentImagesLinks: true,
                },
                take: 10, //default getting 10 because of data load
              },
            },
          },
        },
        take: pageSizeNum,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
      });

      const formattedDraftBoards = draftBoards.map((board) => ({
        boardId: board.id,
        boardImages: board.BoardImages.map((image) => ({
          imageId: image.id,
          title: image.title,
          imageUrl: image.imageUrl,
          createdAt: image.createdAt,
          tappable: image.tappable.map((tappable) => ({
            tappableId: tappable.id,
            contentImagesLinks: tappable.ContentImagesLinks,
          })),
        })),
      }));
      return await this.responseService.success(
        'success',
        'Draft board images fetched success private user',
        { count, data: formattedDraftBoards },
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

  //no need mlt
  async fetchPublicUserDraftsBoards(
    res,
    paginationDto: PaginationDto,
    searchText: string,
  ) {
    try {
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

      let customWhereClause: Prisma.BoardWhereInput = {
        user: {
          role: await this.constantsService.userRole.publicUser,
        },
        BoardImages: {
          some: {
            boardStatus: await this.constantsService.boardStatus.draft,
          },
        },
      };

      if (searchText && searchText.trim().length !== 0) {
        customWhereClause.BoardImages.some.title = {
          contains: searchText,
          mode: 'insensitive',
        };
      }

      const count = await this.prismaService.board.count({
        where: customWhereClause,
      });

      const draftBoards = await this.prismaService.board.findMany({
        where: customWhereClause,
        select: {
          id: true,
          BoardImages: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              createdAt: true,
              tappable: {
                select: {
                  id: true,
                  ContentImagesLinks: true,
                },
                take: 10, //default getting 10 because of data load
              },
            },
          },
        },
        take: pageSizeNum,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
      });

      const formattedDraftBoards = draftBoards.map((board) => ({
        boardId: board.id,
        boardImages: board.BoardImages.map((image) => ({
          imageId: image.id,
          title: image.title,
          imageUrl: image.imageUrl,
          createdAt: image.createdAt,
          tappable: image.tappable.map((tappable) => ({
            tappableId: tappable.id,
            contentImagesLinks: tappable.ContentImagesLinks,
          })),
        })),
      }));
      return await this.responseService.success(
        'success',
        'Draft board images fetched success public user',
        { count, data: formattedDraftBoards },
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

  async editBoardBackgroundImage(
    res,
    aUser: RequestUserDto,
    data: EditBoardBackgroundImageDto,
  ) {
    try {
      if (
        aUser.role === (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED(
          'Invalid permission of this api',
          res,
        );
      }

      const validateBoardImageId =
        await this.prismaService.boardImages.findFirst({
          where: {
            isDeleted: false,
            id: data.boardImageId,
            board: {
              userId: aUser.id,
            },
          },
        });

      if (!validateBoardImageId) {
        return await this.responseService.NOT_FOUND(
          'boardImage not found,pass the correct boardImageId',
          {},
          res,
        );
      }
      await this.prismaService.boardImages.update({
        where: {
          id: validateBoardImageId.id,
          // isDeleted: true,
        },
        data: {
          imageUrl: data.imageUrl,
        },
      });

      return await this.responseService.success(
        'success',
        'Board image edited success',
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

  async fetchPublicUserBoardDetails(res, boardId) {
    try {
      if (!boardId || !IsUUID(boardId)) {
        return await this.responseService.NOT_FOUND(
          'boardId must be uuid',
          {},
          res,
        );
      }

      const privateOwnerBoard = await this.prismaService.board.findFirst({
        where: {
          id: boardId,
          isDeleted: false,
          user: {
            NOT: {
              role: await this.constantsService.newUserRole.publicCreator,
            },
          },
        },
      });

      if (privateOwnerBoard) {
        return await this.responseService.NOT_FOUND(
          'Invalid board id boardId,Pass the correct public user board Id',
          {},
          res,
        );
      }
      const board = await this.prismaService.board.findFirst({
        where: {
          id: boardId,
          isDeleted: false,
          user: {
            role: await this.constantsService.newUserRole.publicCreator,
          },
        },
        select: {
          id: true,
          createdAt: true,
          user: {
            select: {
              userName: true,
              profileIcon: true,
              initialProfileIcon: true,
            },
          },
          BoardImages: {
            select: {
              id: true,
              imageUrl: true,
              boardStatus: true,
              title: true,
              description: true,
              subTitle: true,
              updatedAt: true,
              allowComments: true,
              jsonElement: true,
              tappable: {
                select: {
                  id: true,
                  ContentImagesLinks: true,
                },
              },
            },
          },
        },
      });

      const responseData = {
        boardId: board.id,
        createdAt: board.createdAt,
        user: {
          name: board.user.userName,
          // icon: board.user?.profileIcon ? board.user?.profileIcon : null,
          icon: board.user?.profileIcon
            ? board.user?.profileIcon
            : board?.user?.initialProfileIcon,
        },
        images: board.BoardImages.map((image) => ({
          id: image.id,
          url: image.imageUrl,
          status: image.boardStatus,
          title: image?.title,
          description: image?.description,
          subTitle: image?.subTitle,
          lastEditedAt: image.updatedAt,
          allowComments: image.allowComments,
          jsonElement: image.jsonElement,
          tappables: image.tappable.map((tappable) => ({
            id: tappable.id,
            contentLinks: tappable.ContentImagesLinks,
          })),
        })),
      };

      return await this.responseService.success(
        'success',
        'Single board details fetched success',
        { data: responseData },
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

  //no need mlt
  async fetchPrivateUserBoardDetails(res, boardId, aUser: RequestUserDto) {
    try {
      if (!boardId || !IsUUID(boardId)) {
        return await this.responseService.NOT_FOUND(
          'boardId must be uuid',
          {},
          res,
        );
      }

      let customWhereClause: Prisma.BoardWhereInput = {};

      if (aUser.role === (await this.constantsService.userRole.user)) {
        customWhereClause = {
          id: boardId,
          user: {
            NOT: {
              role: await this.constantsService.userRole.privateUser,
            },
          },
        };
      }

      if (aUser.role === (await this.constantsService.userRole.privateUser)) {
        customWhereClause = {
          id: boardId,
          user: {
            id: aUser.id,
            NOT: {
              role: await this.constantsService.userRole.publicUser,
            },
          },
        };
      }

      if (aUser.role === (await this.constantsService.userRole.publicUser)) {
        customWhereClause = {
          id: boardId,
          user: {
            id: aUser.id,
            NOT: {
              role: await this.constantsService.userRole.privateUser,
            },
          },
        };
      }

      const validateBoard = await this.prismaService.board.findFirst({
        where: customWhereClause,
      });

      if (!validateBoard) {
        return await this.responseService.NOT_FOUND(
          'Invalid board id boardId,Pass the correct public user board Id',
          {},
          res,
        );
      }
      const board = await this.prismaService.board.findFirst({
        where: customWhereClause,
        select: {
          id: true,
          createdAt: true,
          postInteractions: true,
          user: {
            select: {
              userName: true,
              profileIcon: true,
              initialProfileIcon: true,
            },
          },
          BoardImages: {
            select: {
              id: true,
              imageUrl: true,
              boardStatus: true,
              title: true,
              description: true,
              subTitle: true,
              updatedAt: true,
              allowComments: true,
              tappable: {
                select: {
                  id: true,
                  ContentImagesLinks: true,
                },
              },
            },
          },
        },
      });

      const responseData = {
        boardId: board.id,
        createdAt: board.createdAt,
        user: {
          name: board.user.userName,
          // icon: board.user?.profileIcon ? board.user?.profileIcon : null,
          icon: board.user?.profileIcon
            ? board.user?.profileIcon
            : board?.user?.initialProfileIcon,
        },
        images: board.BoardImages.map((image) => ({
          id: image.id,
          url: image.imageUrl,
          status: image.boardStatus,
          title: image?.title,
          description: image?.description,
          subTitle: image?.subTitle,
          lastEditedAt: image.updatedAt,
          allowComments: image.allowComments,
          tappables: image.tappable.map((tappable) => ({
            id: tappable.id,
            contentLinks: tappable.ContentImagesLinks,
          })),
        })),
      };

      //To increasing here post interaction counter
      if (aUser.role === (await this.constantsService.userRole.user)) {
        await this.prismaService.board.update({
          where: {
            isDeleted: false,
            id: board.id,
          },
          data: {
            postInteractions: Number(board.postInteractions) + 1,
          },
        });
      }

      return await this.responseService.success(
        'success',
        'Single board details fetched success',
        { data: responseData },
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

  //no need mlt   @Kiran
  async fetchPrivateUserTappableNonPagination(
    res,
    boardId,
    imageId,
    aUser: RequestUserDto,
  ) {
    try {
      if (aUser.role !== (await this.constantsService.userRole.privateUser)) {
        return await this.responseService.UNAUTHORIZED('Invalid user', res);
      }

      if (!boardId || !IsUUID(boardId) || !imageId || !isUUID(imageId)) {
        return await this.responseService.NOT_FOUND(
          'board id and image id must be UUID',
          {},
          res,
        );
      }
      const validate = await this.prismaService.boardImages.findFirst({
        where: {
          isDeleted: false,
          id: imageId,
          boardId: boardId,
        },
      });

      if (!validate) {
        return await this.responseService.NOT_FOUND(
          'Pass the correct boardId and board image id',
          {},
          res,
        );
      }
      const customWhereClauseReactions: Prisma.ReactionWhereInput = {
        boardImageId: imageId,
        boardImage: {
          boardId: boardId,
        },
        parentId: null,
        userId: aUser.id,
      };
      const reactionCount = await this.prismaService.reaction.count({
        where: customWhereClauseReactions,
      });
      const reactions = await this.prismaService.reaction.findMany({
        where: customWhereClauseReactions,
        select: {
          id: true,
          left: true,
          top: true,
          width: true,
          height: true,
          emoji: true,
          createdAt: true,
          user: {
            select: {
              profileIcon: true,
              initialProfileIcon: true,
            },
          },
        },
      });

      const customWhereClauseTapables: Prisma.TappableWhereInput = {
        boardImageId: imageId,
        boardImage: {
          boardId: boardId,
          board: {
            userId: aUser.id,
          },
        },
      };

      const countTappable = await this.prismaService.tappable.count({
        where: customWhereClauseTapables,
      });

      const tappable = await this.prismaService.tappable.findMany({
        where: customWhereClauseTapables,
        select: {
          id: true,
          actionName: true,
          top: true,
          left: true,
          width: true,
          height: true,
          isTappable: true,
          tappableImage: true,
          ContentImagesLinks: true,
        },
      });

      if (!tappable) {
        return await this.responseService.NOT_FOUND(
          'Tappables not found, Pass the correct ImageId and boardId',
          {},
          res,
        );
      }

      const tappables = tappable.map((tappable) => ({
        tappableId: tappable.id,
        countTappable: countTappable,
        onTapAction: tappable.actionName,
        left: tappable.left,
        top: tappable.top,
        width: tappable?.width ? tappable.width : null,
        height: tappable?.height ? tappable?.height : null,
        type: 'tappable',
        tappableImage: tappable?.tappableImage,
        isTappable: tappable.isTappable,
        ContentImagesLinks: tappable?.ContentImagesLinks,
      }));

      const reaction = reactions.map((reaction) => ({
        reactionId: reaction.id,
        left: reaction.left,
        top: reaction.top,
        createdAt: reaction.createdAt,
        type: 'reaction',
        emoji: reaction.emoji,
        width: reaction?.width ? reaction.width : null,
        height: reaction?.height ? reaction?.height : null,
        profileIcon: reaction.user?.profileIcon
          ? reaction.user?.profileIcon
          : null,
        initialProfileIcon: reaction?.user?.initialProfileIcon
          ? reaction?.user?.initialProfileIcon
          : null,
      }));

      return await this.responseService.success(
        'success',
        'Tappables fetched success',
        {
          reactionCount: reactionCount,
          tappables: tappables,
          reactions: reaction,
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

  async fetchPublicUserTappableNonPagination(res, boardId, imageId) {
    try {
      if (!boardId || !IsUUID(boardId) || !imageId || !isUUID(imageId)) {
        return await this.responseService.NOT_FOUND(
          'board id and image id must be UUID',
          {},
          res,
        );
      }
   let userId;
      const validate = await this.prismaService.boardImages.findFirst({
        where: {
          isDeleted: false,
          id: imageId,
          boardId: boardId,
        },
      });

      if (!validate) {
        return await this.responseService.NOT_FOUND(
          'Pass the correct boardId and board image id',
          {},
          res,
        );
      }

      const customWhereClauseReactions: Prisma.ReactionWhereInput = {
        boardImageId: imageId,
        boardImage: {
          boardId: boardId,
        },
        parentId: null,
      };
      const reactionCount = await this.prismaService.reaction.count({
        where: customWhereClauseReactions,
      });
      const reactions = await this.prismaService.reaction.findMany({
        where: customWhereClauseReactions,
        select: {
          id: true,
          left: true,
          top: true,
          width: true,
          height: true,
          emoji: true,
          createdAt: true,
          user: {
            select: {
              profileIcon: true,
              initialProfileIcon: true,
            },
          },
        },
      });

      const customWhereClauseTapables: Prisma.TappableWhereInput = {
        boardImageId: imageId,
        isDeleted: false,
        boardImage: {
          boardId: boardId,
          board: {
            user: {
              role: await this.constantsService.newUserRole.publicCreator,
            },
          },
        },
      };

      const countTappable = await this.prismaService.tappable.count({
        where: customWhereClauseTapables,
      });
      const tappable = await this.prismaService.tappable.findMany({
        where: customWhereClauseTapables,
        select: {
          id: true,
          actionName: true,
          top: true,
          left: true,
          width: true,
          height: true,
          createdAt: true,
          updatedAt: true,
          isTappable: true,
          tappableImage: true,
          ContentImagesLinks: true,
          replaceTappable: {
            where: {
              isDeleted: false,
            },
            select: {
              id: true,
              ContentImagesLinks: true,
              isDeleted: true,
            },
          },
          switchId: true,
          isReplace: true, //layer wise change the containt
          isVanish: true, //vanish means change if pay or follow or if no action
        },
      });
      if (!tappable) {
        return await this.responseService.NOT_FOUND(
          'Tappables not found, Pass the correct ImageId and boardId',
          {},
          res,
        );
      }

      let board = await this.prismaService.board.findFirst({
        where: {
          id: boardId,
        },
        select: {
          userId: true,
        },
      });

      let stripe = await this.prismaService.user.findFirst({
        where: {
          id: board?.userId,
        },
        select:{
          isStripeOnBoardingDone:true
        }
      });

      const tappables = tappable.map((tappable) => ({
        tappableId: tappable.id,
        onTapAction: tappable.actionName,
        left: tappable.left,
        top: tappable.top,
        createdAt: tappable.createdAt,
        updatedAt: tappable.updatedAt,
        type: 'tappable',
        width: tappable.width,
        height: tappable.height,
        isTappable: tappable.isTappable,
        tappableImage: tappable?.tappableImage,
        ContentImagesLinks: tappable?.ContentImagesLinks,
        isReplace: tappable.isReplace, //layer wise change the containt
        isVanish: tappable.isVanish,
        replaceTappable: tappable?.replaceTappable,
        vanishId: tappable?.switchId,
      }));

      const reaction = reactions.map((reaction) => ({
        reactionId: reaction.id,
        left: reaction.left,
        top: reaction.top,
        emoji: reaction.emoji,
        width: reaction?.width ? reaction.width : null,
        height: reaction?.height ? reaction?.height : null,
        createdAt: reaction.createdAt,
        type: 'reaction',
        profileIcon: reaction.user?.profileIcon
          ? reaction.user?.profileIcon
          : null,
        initialProfileIcon: reaction?.user?.initialProfileIcon
          ? reaction?.user?.initialProfileIcon
          : null,
      }));

      return await this.responseService.success(
        'success',
        'Tappables fetched success public user',
        {
          userId: board?.userId,
          isStripeAttached: stripe.isStripeOnBoardingDone === true,
          reactionCount: reactionCount,
          tappableCount: countTappable,
          tappables: tappables,
          reactions: reaction,
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

  //can private user and public user add the reactions ?
  async addReaction(res, data: AddReactionDto, aUser: RequestUserDto) {
    try {
      const { paymentIntentId } = data;
      const allowedTypes = ['emoji', 'photo', 'video', 'text'];

      if (data.contentUrl?.trim() && !allowedTypes.includes(data.reactionType?.trim())) {
        return await this.responseService.NOT_FOUND(
          'Reaction type must be one of [emoji, photo, video, text]',
          {},
          res,
        );
      }

      if (
        !data.contentText?.trim() &&
        !data.contentUrl?.trim() &&
        !data.emoji?.trim()
      ) {
        return await this.responseService.NOT_FOUND(
          'contentText, contentUrl, or emoji is required',
          {},
          res,
        );
      }

      const validateBoardImageId =
        await this.prismaService.boardImages.findFirst({
          where: {
            isDeleted: false,
            id: data.boardImageId,
            board: {
              user: {
                NOT: {
                  role: await this.constantsService.userRole.user,
                },
              },
            },
          },
        });

      if (!validateBoardImageId) {
        return await this.responseService.NOT_FOUND(
          'Board imageId is invalid',
          {},
          res,
        );
      }

      // Reaction-plus-capture flow:
      // 1. Insert reaction in 'pending' state (DB only).
      // 2. Capture Stripe + create newTransaction row.
      // 3. Atomic update: link newTransaction.reactionId and flip reaction.status to 'confirmed'.
      // If step 2 fails: roll back the pending reaction (no payment happened).
      // If step 3 fails: the webhook handler backfills reactionId via paymentIntentId
      //   idempotency, so payment is not lost.
      const reaction = await this.prismaService.reaction.create({
        data: {
          boardImageId: data.boardImageId,
          contentType: data.reactionType,
          contentUrl: data.contentUrl,
          contentText: data.contentText,
          backgroundCapture: data.backgroundCapture,
          top: data.top,
          left: data.left,
          userId: aUser.id,
          emoji: data?.emoji,
          status: paymentIntentId ? 'pending' : 'confirmed',
          paymentIntentId: paymentIntentId ?? null,
        },
      });

      if (paymentIntentId) {
        const captureResult =
          await this.paymentService.captureReactionTipPayment(
            paymentIntentId,
            aUser,
          );

        if (!captureResult.status) {
          await this.prismaService.reaction.delete({
            where: { id: reaction.id },
          });
          return await this.responseService.NOT_FOUND(
            'Payment capture failed',
            { msg: captureResult.msg },
            res,
          );
        }

        await this.prismaService.$transaction([
          this.prismaService.newTransaction.update({
            where: { id: captureResult.id },
            data: { reactionId: reaction.id },
          }),
          this.prismaService.reaction.update({
            where: { id: reaction.id },
            data: { status: 'confirmed' },
          }),
        ]);
      }

      return await this.responseService.success(
        'success',
        'Reaction added successfully',
        { id: reaction.id },
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
  async addGestUserReaction(res, data: AddReactionDto) {
    try {
      // let { paymentIntentId } = data;
      const reaction = ['emoji', 'photo', 'video'];
      if (data.contentUrl || data.contentUrl?.trim()?.length !== 0) {
        if (!reaction.includes(data.reactionType.trim())) {
          await this.responseService.NOT_FOUND(
            'Reaction type should be [emoji,photo,video',
            {},
            res,
          );
        }
      }

      if (
        !data.contentText?.trim() &&
        !data.contentUrl?.trim() &&
        !data.emoji?.trim()
      ) {
        return await this.responseService.NOT_FOUND(
          'contentText or contentUrl must require',
          {},
          res,
        );
      }

      const validateBoardImageId =
        await this.prismaService.boardImages.findFirst({
          where: {
            isDeleted: false,
            id: data.boardImageId,
            board: {
              user: {
                NOT: {
                  role: await this.constantsService.userRole.user,
                },
              },
            },
          },
        });

      if (!validateBoardImageId) {
        return await this.responseService.NOT_FOUND(
          'Board imageId is invalid',
          {},
          res,
        );
      }

      // @kiran
      let transactionId: any;

      let newReaction = await this.prismaService.reaction.create({
        data: {
          boardImageId: data.boardImageId,
          contentType: data.reactionType,
          contentUrl: data.contentUrl,
          contentText: data.contentText,
          backgroundCapture: data.backgroundCapture,
          top: data.top,
          left: data.left,
          // userId: aUser.id,
          emoji: data?.emoji,
        },
      });

      // if (paymentIntentId) {
      //   // payment id mng
      //   await this.prismaService.newTransaction.update({
      //     where: { id: transactionId },
      //     data: {
      //       reactionId: id,
      //     },
      //   });
      // }
      return await this.responseService.success(
        'success',
        'Reaction added success',
        {response:newReaction},
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

  async deleteReaction(res, reactionId, aUser: RequestUserDto) {
    try {
      if (!reactionId || !IsUUID(reactionId)) {
        return await this.responseService.NOT_FOUND(
          'reactionId must be UUID',
          {},
          res,
        );
      }

      // Find if the logged-in user is the author of the reaction
      const isAuthor = await this.prismaService.reaction.findFirst({
        where: {
          id: reactionId,
        },
        select: {
          boardImage: {
            select: {
              board: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      // If the user is the author or board owner, proceed with deletion
      if (isAuthor?.boardImage?.board?.userId === aUser.id) {
        // First, delete likes associated with the reaction
        await this.prismaService.reactionLikes.deleteMany({
          where: {
            reactionId: reactionId,
          },
        });

        // Recursively delete all child reactions
        await this.recursiveDeleteReactions(reactionId);

        // Finally, delete the main reaction
        await this.prismaService.reaction.delete({
          where: {
            id: reactionId,
          },
        });

        return await this.responseService.success(
          'success',
          'Reaction and related replies deleted successfully',
          {},
          res,
        );
      }

      // If the user is not the author, validate if they own the reaction
      const validateReaction = await this.prismaService.reaction.findFirst({
        where: {
          id: reactionId,
          userId: aUser.id,
        },
      });

      if (!validateReaction) {
        return await this.responseService.NOT_FOUND(
          'Reaction not found, Pass the valid reactionId',
          {},
          res,
        );
      }

      // First, delete likes associated with the reaction
      await this.prismaService.reactionLikes.deleteMany({
        where: {
          reactionId: reactionId,
        },
      });

      // Recursively delete all child reactions
      await this.recursiveDeleteReactions(reactionId);

      // Finally, delete the main reaction
      await this.prismaService.reaction.delete({
        where: {
          id: reactionId,
        },
      });

      return await this.responseService.success(
        'success',
        'Reaction and related replies deleted successfully',
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

  // Helper function to recursively delete child reactions
  private async recursiveDeleteReactions(parentId: string) {
    // Find all child reactions with the given parentId
    const childReactions = await this.prismaService.reaction.findMany({
      where: {
        parentId: parentId,
      },
    });

    // Recursively delete each child reaction
    for (const child of childReactions) {
      // First, delete likes associated with the child reaction
      await this.prismaService.reactionLikes.deleteMany({
        where: {
          reactionId: child.id,
        },
      });

      // Recursively delete any children of the current child reaction
      await this.recursiveDeleteReactions(child.id);
      // Finally, delete the child reaction itself
      await this.prismaService.reaction.delete({
        where: {
          id: child.id,
        },
      });
    }
  }

  async addReactionLikes(res, imageId, reactionId, aUser: RequestUserDto) {
    try {
      // if (aUser.role === (await this.constantsService.userRole.privateUser)) {
      //   return await this.responseService.NOT_FOUND('Invalid user', {}, res);
      // }
      if (!isUUID(imageId) || !isUUID(reactionId)) {
        return await this.responseService.NOT_FOUND(
          'ImageId and reactionId must be mandatory',
          {},
          res,
        );
      }
      const validateReaction = await this.prismaService.reaction.findFirst({
        where: {
          boardImageId: imageId,
          id: reactionId,
        },
      });
      if (!validateReaction) {
        return await this.responseService.NOT_FOUND(
          'Reaction not found,Pass correct reactionId and imageId',
          {},
          res,
        );
      }

      const findLike = await this.prismaService.reactionLikes.findFirst({
        where: {
          reactionId: reactionId,
          userId: aUser.id,
        },
      });

      if (findLike) {
        await this.prismaService.reactionLikes.delete({
          where: {
            id: findLike.id,
          },
        });
        return await this.responseService.success(
          'success',
          'Reaction Like deleted success',
          {},
          res,
        );
      } else {
        await this.prismaService.reactionLikes.create({
          data: {
            userId: aUser.id,
            reactionId: reactionId,
          },
        });
        return await this.responseService.success(
          'success',
          'Reaction Like added success',
          {},
          res,
        );
      }
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async viewAllReactionComments(res, imageId, paginationDto, parentReactionId) {
    try {
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
      if (!imageId || !IsUUID(imageId)) {
        return await this.responseService.NOT_FOUND(
          'image id must be uuid',
          {},
          res,
        );
      }
      let customWhereClause: Prisma.ReactionWhereInput = {
        boardImageId: imageId,
        user: {
          role: await this.constantsService.newUserRole.publicCreator,
        },
        parentId: null,
      };
      if (parentReactionId) {
        //it  finding the sub comments
        if (!IsUUID(parentReactionId)) {
          return await this.responseService.NOT_FOUND(
            'parent reaction id must be uuid',
            {},
            res,
          );
        }
        customWhereClause.parentId = parentReactionId;
      }
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;

      const count = await this.prismaService.reaction.count({
        where: customWhereClause,
      });
      if (count == 0) {
        return await this.responseService.NOT_FOUND(
          'No Reactions found,Pass the correct imageId',
          {},
          res,
        );
      }
      const reaction = await this.prismaService.reaction.findMany({
        where: customWhereClause,
        take: pageSizeNum,
        skip,
        select: {
          id: true,
          contentUrl: true,
          contentType: true,
          contentText: true, // this is all the all comment parent comments
          top: true,
          left: true,
          createdAt: true,
          _count: {
            select: {
              ReactionLikes: true,
              replies: true,
            },
          },
        },
      });

      return await this.responseService.success(
        'success',
        'Reactions fetched success',
        { count: count, data: reaction },
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
  //on reply time - text , video, emoji
  async replyReactionComment(
    res,
    data: ReplyReactionCommentDto,
    aUser: RequestUserDto,
  ) {
    try {
      //validate  the reaction id
      const isValidReactionId = await this.prismaService.reaction.findFirst({
        where: {
          boardImageId: data.boardImageId,
          id: data.reactionId,
        },
      });

      if (!isValidReactionId) {
        return await this.responseService.NOT_FOUND(
          'Pass the correct reaction id and image id',
          {},
          res,
        );
      }
      //top and left no need to pass the child comments
      await this.prismaService.reaction.create({
        data: {
          parentId: data.reactionId,
          boardImageId: data.boardImageId,
          contentText: data.contentText,
          contentType: data.reactionType,
          contentUrl: data.contentUrl,
          userId: aUser.id,
        },
      });

      return await this.responseService.success(
        'success',
        'Reply added successfully',
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

  async viewSingleBoardImageTapables(
    res,
    imageId,
    boardId,
    aUser: RequestUserDto,
  ) {
    try {
      if (
        aUser.role === (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED('Invalid user', res);
      }
      if (!isUUID(imageId) || !isUUID(boardId)) {
        return await this.responseService.NOT_FOUND(
          'ImageId and boardId should be mandatory',
          {},
          res,
        );
      }

      let customWhereClause: Prisma.TappableWhereInput = {
        boardImageId: imageId,
        isDeleted: false,
        boardImage: {
          boardId: boardId,
          board: {
            userId: aUser.id,
          },
        },
      };
      const count = await this.prismaService.tappable.count({
        where: customWhereClause,
      });

      if (count == 0) {
        return await this.responseService.NOT_FOUND(
          'Tappables not found,Check the payload',
          {},
          res,
        );
      }
      const tappables = await this.prismaService.tappable.findMany({
        where: customWhereClause,
        select: {
          id: true,
          isTappable: true,
          isVanish: true,
          isReplace: true,
          boardImage: {
            select: {
              title: true,
            },
          },
          ContentImagesLinks: true,
          tappableImage: true, // this means when not found content image then tappable image will be display
          createdAt: true,
        },
      });

      const data = tappables.map((t) => ({
        tappableId: t.id,
        isTappable: t.isTappable,
        isVanish: t.isVanish,
        isReplace: t.isReplace,
        boardTitle: t.boardImage?.title ? t.boardImage?.title : null,
        tappableImage: t?.tappableImage ? t?.tappableImage : null,
        sliderFirstImage: t?.ContentImagesLinks[0]
          ? t?.ContentImagesLinks[0]
          : null,
      }));

      return await this.responseService.success(
        'success',
        'Tappables fetched success',
        { count: count, data },
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

  async fetchBoardReactionPins(res, boardImageId: string) {
    try {
      if (!boardImageId || !isUUID(boardImageId)) {
        return await this.responseService.NOT_FOUND(
          'boardImageId must be a valid UUID',
          {},
          res,
        );
      }
      const reactions = await this.prismaService.reaction.findMany({
        where: { boardImageId, parentId: null },
        select: {
          id: true,
          top: true,
          left: true,
          normalizedX: true,
          normalizedY: true,
          emoji: true,
          contentType: true,
          user: {
            select: {
              profileIcon: true,
              initialProfileIcon: true,
              userName: true,
            },
          },
          _count: {
            select: { newTransaction: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      // Flatten _count into a hasPayment boolean for the frontend
      const data = reactions.map(({ _count, ...r }) => ({
        ...r,
        hasPayment: (_count?.newTransaction ?? 0) > 0,
      }));
      return await this.responseService.success(
        'success',
        'Board reaction pins fetched',
        { data },
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

  async fetchReactionInfo(res, reactionId) {
    try {
      if (!isUUID(reactionId)) {
        return await this.responseService.NOT_FOUND(
          'Pass the reaction id',
          {},
          res,
        );
      }
      const reaction = await this.prismaService.reaction.findFirst({
        where: {
          id: reactionId,
        },
        select: {
          contentText: true,
          contentType: true,
          contentUrl: true,
          createdAt: true,
          backgroundCapture: true,
          emoji: true,
          _count: {
            select: {
              ReactionLikes: true,
            },
          },

          user: {
            select: {
              userName: true,
              profileIcon: true,
              initialProfileIcon: true,
              id: true,
            },
          },
          newTransaction: {
            select: {
              totalAmount: true,
              price: true,
              senderUser: {
                select: {
                  id: true,
                  profileIcon: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });
      if (!reaction) {
        return await this.responseService.NOT_FOUND(
          'Reaction not found pass the correct reaction id',
          {},
          res,
        );
      }

      const data = {
        contentText: reaction.contentText,
        totalLikes: reaction._count.ReactionLikes,
        contentType: reaction.contentType,
        contentUrl: reaction.contentUrl,
        createdAt: reaction.createdAt,
        emoji: reaction?.emoji,
        backgroundCapture: reaction?.backgroundCapture,
        user: {
          userName: reaction.user?.userName,
          profileIcon: reaction.user?.profileIcon
            ? reaction.user?.profileIcon
            : reaction.user?.initialProfileIcon,
          id: reaction.user?.id,
        },
        youCanDeleteThisReaction: false,
      };

      return await this.responseService.success(
        'success',
        'Reaction data fetched success',
        { data: reaction },
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
  async fetchLoggedUserReactionInfo(res, reactionId, aUser: RequestUserDto) {
    try {
      if (!isUUID(reactionId)) {
        return await this.responseService.NOT_FOUND(
          'Pass the reaction id',
          {},
          res,
        );
      }
      let isAuthor = false;
      const isBoardAuthor = await this.prismaService.reaction.findFirst({
        where: {
          id: reactionId,
        },
        select: {
          boardImage: {
            select: {
              board: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      if (isBoardAuthor?.boardImage?.board?.userId == aUser?.id) {
        isAuthor = true;
      }

      const reaction = await this.prismaService.reaction.findFirst({
        where: {
          id: reactionId,
        },
        select: {
          contentText: true,
          contentType: true,
          contentUrl: true,
          createdAt: true,
          emoji: true,
          backgroundCapture: true,
          _count: {
            select: {
              ReactionLikes: true,
            },
          },

          user: {
            select: {
              userName: true,
              profileIcon: true,
              initialProfileIcon: true,
              id: true,
            },
          },
        },
      });
      if (!reaction) {
        return await this.responseService.NOT_FOUND(
          'Reaction not found pass the correct reaction id',
          {},
          res,
        );
      }
      
      let transaction=await this.prismaService.newTransaction.findFirst({
        where:{
          reactionId
        },select:{
          totalAmount:true

        }
      })
      const data = {
        contentText: reaction.contentText,
        totalLikes: reaction._count.ReactionLikes,
        contentType: reaction.contentType,
        contentUrl: reaction.contentUrl,
        createdAt: reaction.createdAt,
        emoji: reaction.emoji,
        backgroundCapture: reaction.backgroundCapture,
        isPaid:transaction?true:false,
        priceAmt:transaction?.totalAmount?.toString()||"0",
        user: {
          id: reaction.user?.id,
          userName: reaction.user?.userName,
          profileIcon: reaction.user?.profileIcon
            ? reaction.user?.profileIcon
            : reaction.user?.initialProfileIcon,
        },
        youCanDeleteThisReaction:
          reaction.user?.id === aUser.id ? true : isAuthor,
      };
      return await this.responseService.success(
        'success',
        'Reaction data fetched success',
        { data: data },
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
  async fetchGestUserReactionInfo(res, reactionId) {
    try {
      if (!isUUID(reactionId)) {
        return await this.responseService.NOT_FOUND(
          'Pass the reaction id',
          {},
          res,
        );
      }
      let isAuthor = false;
      const isBoardAuthor = await this.prismaService.reaction.findFirst({
        where: {
          id: reactionId,
        },
        select: {
          boardImage: {
            select: {
              board: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      // if (isBoardAuthor?.boardImage?.board?.userId == aUser.id) {
      //   isAuthor = true;
      // }

      const reaction = await this.prismaService.reaction.findFirst({
        where: {
          id: reactionId,
        },
        select: {
          contentText: true,
          contentType: true,
          contentUrl: true,
          createdAt: true,
          emoji: true,
          backgroundCapture: true,
          _count: {
            select: {
              ReactionLikes: true,
            },
          },

          user: {
            select: {
              userName: true,
              profileIcon: true,
              initialProfileIcon: true,
              id: true,
            },
          },
        },
      });
      if (!reaction) {
        return await this.responseService.NOT_FOUND(
          'Reaction not found pass the correct reaction id',
          {},
          res,
        );
      }
      
      let transaction=await this.prismaService.newTransaction.findFirst({
        where:{
          reactionId
        },select:{
          totalAmount:true

        }
      })
      const data = {
        contentText: reaction.contentText,
        totalLikes: reaction._count.ReactionLikes,
        contentType: reaction.contentType,
        contentUrl: reaction.contentUrl,
        createdAt: reaction.createdAt,
        emoji: reaction.emoji,
        backgroundCapture: reaction.backgroundCapture,
        isPaid:transaction?true:false,
        priceAmt:transaction?.totalAmount?.toString()||"0",
        user: {
          id: reaction.user?.id,
          userName: reaction.user?.userName,
          profileIcon: reaction.user?.profileIcon
            ? reaction.user?.profileIcon
            : reaction.user?.initialProfileIcon,
        },
        youCanDeleteThisReaction:false,
      };
      return await this.responseService.success(
        'success',
        'Reaction data fetched success',
        { data: data },
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
  async addImage(res, data) {
    try {
      if (!data.imageUrl) {
        return await this.responseService.NOT_FOUND('imageUrl is nf', {}, res);
      }
      const tappable = await this.prismaService.image.create({
        data: {
          imageUrl: data.imageUrl,
          tappables: data.tappable,
        },
      });
      return await this.responseService.success(
        'success',
        'tappable created',
        tappable,
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

  async fetchImages(res) {
    try {
      const data = await this.prismaService.image.findMany({
        select: {
          id: true,
          imageUrl: true,
          tappables: true,
          createdAt: true,
        },
      });

      return await this.responseService.success(
        'success',
        'tappables fetched success',
        data,
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
  //--------------------------------Welcome to MVP--------------------------------------------------

  //no need mlt
  async fetchPrivateUserDraftBoards(
    res,
    paginationDto: PaginationDto,
    searchText: string,
    aUser: RequestUserDto,
  ) {
    try {
      if (aUser.role !== (await this.constantsService.userRole.privateUser)) {
        return await this.responseService.UNAUTHORIZED('Invalid User', res);
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

      const customUpdateClause: Prisma.BoardWhereInput = {
        userId: aUser.id,
        BoardImages: {
          some: {
            boardStatus: await this.constantsService.boardStatus.draft,
          },
        },
      };

      // If searchText is provided and not empty, add the title filter
      if (searchText?.trim()) {
        customUpdateClause.BoardImages.some.title = {
          contains: searchText.trim(),
          mode: 'insensitive',
        };
      }

      //when click on card then later call the other api, no need to pass the more data
      const draftBoards = await this.prismaService.board.findMany({
        where: customUpdateClause,
        select: {
          BoardImages: {
            select: {
              boardId: true,
              imageUrl: true,
              title: true,
              createdAt: true,
              tappable: {
                select: {
                  tappableImage: true,
                  ContentImagesLinks: true,
                },
              },
            },
          },
        },
        skip,
        take: pageSizeNum,
      });

      return await this.responseService.success(
        'success',
        'Fetch Private user board success',
        draftBoards,
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
  //no need mlt
  async fetchPublicUserDraftBoards(
    res,
    paginationDto: PaginationDto,
    searchText: string,
  ) {
    try {
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

      const customUpdateClause: Prisma.BoardWhereInput = {
        user: {
          role: await this.constantsService.userRole.publicUser,
        },
        BoardImages: {
          some: {
            boardStatus: await this.constantsService.boardStatus.draft,
          },
        },
      };

      // If searchText is provided and not empty, add the title filter
      if (searchText?.trim()) {
        customUpdateClause.BoardImages.some.title = {
          contains: searchText.trim(),
          mode: 'insensitive',
        };
      }

      //when click on card then later call the other api, no need to pass the more data
      const draftBoards = await this.prismaService.board.findMany({
        where: customUpdateClause,
        select: {
          BoardImages: {
            select: {
              boardId: true,
              imageUrl: true,
              title: true,
              createdAt: true,
              tappable: {
                select: {
                  tappableImage: true,
                  ContentImagesLinks: true,
                },
              },
            },
          },
        },
        skip,
        take: pageSizeNum,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return await this.responseService.success(
        'success',
        'Fetch Private user board success',
        draftBoards,
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
  //no need mlt
  async fetchPrivateUserDraftsBoardSuggestion(
    res,
    aUser: RequestUserDto,
    searchText: string,
  ) {
    try {
      if (aUser.role !== (await this.constantsService.userRole.privateUser)) {
        return await this.responseService.UNAUTHORIZED(
          'Invalid user user',
          res,
        );
      }
      if (!searchText && searchText.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'searchText must require',
          {},
          res,
        );
      }

      let customWhereClause: Prisma.BoardWhereInput = {
        userId: aUser.id,
        BoardImages: {
          some: {
            boardStatus: await this.constantsService.boardStatus.draft,
          },
        },
      };

      customWhereClause.BoardImages.some.title = {
        contains: searchText,
        mode: 'insensitive',
      };

      const count = await this.prismaService.board.count({
        where: customWhereClause,
      });

      const draftBoardsTitles = await this.prismaService.board.findMany({
        where: customWhereClause,
        select: {
          id: true,
          BoardImages: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const responseArray = draftBoardsTitles.map((board) => ({
        boardId: board.id,
        boardImagesTitle: board.BoardImages.map((image) => ({
          imageId: image.id,
          title: image.title,
        })),
      }));
      return await this.responseService.success(
        'success',
        'Draft board images title fetched success private user',
        { count, data: responseArray },
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
  //no need mlt
  async fetchPublicUserDraftsBoardSuggestion(res, searchText: string) {
    try {
      if (!searchText && searchText.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'searchText must require',
          {},
          res,
        );
      }

      let customWhereClause: Prisma.BoardWhereInput = {
        user: {
          role: await this.constantsService.userRole.publicUser,
        },
        BoardImages: {
          some: {
            boardStatus: await this.constantsService.boardStatus.draft,
          },
        },
      };

      customWhereClause.BoardImages.some.title = {
        contains: searchText,
        mode: 'insensitive',
      };

      const count = await this.prismaService.board.count({
        where: customWhereClause,
      });

      const draftBoardsTitles = await this.prismaService.board.findMany({
        where: customWhereClause,
        select: {
          id: true,
          BoardImages: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const responseArray = draftBoardsTitles.map((board) => ({
        boardId: board.id,
        boardImagesTitle: board.BoardImages.map((image) => ({
          imageId: image.id,
          title: image.title,
        })),
      }));
      return await this.responseService.success(
        'success',
        'Draft board images title fetched success public user',
        { count, data: responseArray },
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
  //no need mlt
  async fetchPublicUserCollectionNameSuggestions(res, searchText: string) {
    try {
      if (!searchText && searchText.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'searchText must require',
          {},
          res,
        );
      }
      let customWhereClause: Prisma.CollectionWhereInput = {
        user: {
          role: await this.constantsService.userRole.publicUser,
        },
        collectionName: {
          contains: searchText,
          mode: 'insensitive',
        },
      };

      const count = await this.prismaService.collection.count({
        where: customWhereClause,
      });

      const collections = await this.prismaService.collection.findMany({
        where: customWhereClause,
        select: {
          id: true,
          collectionName: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return await this.responseService.success(
        'success',
        'Collections names fetched success',
        { count, data: collections },
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
  //no need mlt
  async fetchPrivateUserCollectionNameSuggestions(
    res,
    searchText: string,
    aUser: RequestUserDto,
  ) {
    try {
      if (aUser.role !== (await this.constantsService.userRole.privateUser))
        if (!searchText && searchText.trim().length == 0) {
          return await this.responseService.UNAUTHORIZED('Invalid user', res);
        }
      let customWhereClause: Prisma.CollectionWhereInput = {
        userId: aUser.id,
        collectionName: {
          contains: searchText,
          mode: 'insensitive',
        },
      };

      const count = await this.prismaService.collection.count({
        where: customWhereClause,
      });

      const collections = await this.prismaService.collection.findMany({
        where: customWhereClause,
        select: {
          id: true,
          collectionName: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return await this.responseService.success(
        'success',
        'Collections names fetched success',
        { count, data: collections },
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
  //no need mlt
  async fetchPrivateUserCollectionsWithSearch(
    res,
    searchText: string,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
  ) {
    try {
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

      const customWhereClause: Prisma.CollectionWhereInput = {
        userId: aUser.id,
      };

      if (searchText && searchText?.trim().length != 0) {
        customWhereClause.collectionName = {
          contains: searchText,
          mode: 'insensitive',
        };
      }
      const collections = await this.prismaService.collection.findMany({
        where: customWhereClause,
        take: pageSizeNum,
        skip,
        select: {
          id: true,
          collectionName: true,
          createdAt: true,
        },
      });

      return await this.responseService.success(
        'success',
        'Collection fetched success',
        collections,
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
  //no need mlt
  async fetchPublicUserCollectionsWithSearch(
    res,
    searchText: string,
    paginationDto: PaginationDto,
  ) {
    try {
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

      const customWhereClause: Prisma.CollectionWhereInput = {
        user: {
          role: this.constantsService.userRole.publicUser,
        },
      };

      if (searchText && searchText?.trim().length != 0) {
        customWhereClause.collectionName = {
          contains: searchText,
          mode: 'insensitive',
        };
      }
      const collections = await this.prismaService.collection.findMany({
        where: customWhereClause,
        take: pageSizeNum,
        skip,
        select: {
          id: true,
          collectionName: true,
          createdAt: true,
        },
      });

      return await this.responseService.success(
        'success',
        'Collection fetched success',
        collections,
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
  //layers api requ.
  //when click te layers then send the tappable ids and add content first image
  async fetchAllBoardLayersImages(
    res,
    boardId,
    boardImageId,
    aUser: RequestUserDto,
  ) {
    try {
      if (
        aUser.role === (await this.constantsService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED('Invalid user', res);
      }
      if (!boardId || !IsUUID(boardId)) {
        return await this.responseService.NOT_FOUND(
          'Pass the Board id',
          {},
          res,
        );
      }

      const validateBoardId = await this.prismaService.board.findFirst({
        where: {
          isDeleted: false,
          id: boardId,
          userId: aUser.id,
          BoardImages: {
            some: {
              id: boardImageId,
            },
          },
        },
      });

      if (!validateBoardId) {
        return await this.responseService.NOT_FOUND(
          'Board id is incorrect,Pass the Board id',
          {},
          res,
        );
      }

      const fetchAllLayers = await this.prismaService.tappable.findMany({
        where: {
          boardId: boardId,
          boardImageId: boardImageId,
          isDeleted: false,
          replaceTappable: {
            some: {
              // isDeleted:false
            },
          },
        },
        select: {
          id: true,
          ContentImagesLinks: true,
          isReplace: true,
          isVanish: true,
          isTappable: true,
          actionName: true,
          boardId: true,
          description: true,
          switchId: true,
          title: true,
          width: true,
          height: true,
          top: true,
          left: true,
          inventoryCount: true,
          isInventoryEnabled: true,
          replaceTappable: {
            orderBy: {
              createdAt: 'asc', //first created it will show the first
            },
            where: {
              isDeleted: false,
            },
            select: {
              id: true,
              layerName: true,
              isInfoOverlay: true,
              ContentImagesLinks: true,
              layerNumber: true,
              top: true,
              left: true,
              height: true,
              width: true,
              isReplace: true,
              isVanish: true,
              isLockTappable: true,
              infoOverlayImage: true,
              inventoryCount: true,
              isInventoryEnabled: true,
            },
          },
        },
      });

      // Initialize the data array with mapped values
      const data = fetchAllLayers.map((layer) => {
        const replaceActions = [];

        // Iterate over replaceTappable to dynamically set vanishImage if `isVanish` is true
        layer.replaceTappable.forEach((tappable, index) => {
          const updatedTappable = {
            ...tappable,
            vanishImage: null,
            inventoryCount: tappable.inventoryCount?.toString(),
          };

          // If the current tappable has `isVanish: true`, set vanishImage for the previous item
          if (tappable.isVanish && index > 0) {
            // Update vanishImage of the previous item in replaceActions
            // replaceActions[replaceActions.length - 1].vanishImage = tappable.ContentImagesLinks?.[0] || null;
            replaceActions[replaceActions.length - 1].vanishImage =
              'https://prymrstorage.s3.amazonaws.com/prymrFile_273ce4d5-b95a-49e3-830d-14a24b1e45c4.png';
          }

          // Push the current tappable into replaceActions
          replaceActions.push(updatedTappable);
        });

        // Return the final structured layer object
        return {
          tappableId: layer.id,
          isReplace: layer.isReplace,
          isVanish: layer.isVanish,
          isTappable: layer.isTappable,
          actionName: layer.actionName,
          boardId: layer.boardId,
          description: layer.description,
          switchId: layer.switchId,
          title: layer.title,
          width: layer.width,
          height: layer.height,
          top: layer.top,
          left: layer.left,
          inventoryCount: layer.inventoryCount?.toString(),
          isInventoryEnabled: layer.isInventoryEnabled,
          contentImage: layer.ContentImagesLinks?.[0] || null,
          replaceActions,
        };
      });

      return await this.responseService.success(
        'success',
        'All layers Images fetched success',
        data,
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
  ///-------------------------------Home screen collection api---------------------------------------
  //done
  async fetchPublicUserCollectionsOnHomeFeed(
    res,
    paginationDto,
    userName: string,
  ) {
    try {
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
      } else {
        const findCreatorId = await this.prismaService.user.findFirst({
          where: {
            // userName: userName?.trim().toLowerCase(),
            // isDefaultCreatorUser: false,
            userName: {
              equals: userName?.trim(),
              mode: 'insensitive',
            },
            isDeleted: false,
          },
          select: {
            userName: true,
            id: true,
          },
        });
        if (!findCreatorId) {
          const defaultCreatorUser = await this.prismaService.user.findFirst({
            where: {
              isDefaultCreatorUser: true,
            },
            select: {
              userName: true,
            },
          });
          return await this.responseService.NOT_FOUND(
            `User Name is not valid, Please go the default user profile`,
            { defaultCreatorUserName: defaultCreatorUser.userName },
            res,
          );

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
          defaultUserId = findDefaultCreatorId.id;
        } else {
          defaultUserId = findCreatorId.id;
        }
      }

      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;

      const count = await this.prismaService.collection.count({
        where: {
          userId: defaultUserId,
        },
      });
      const collections = await this.prismaService.collection.findMany({
        where: {
          userId: defaultUserId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: +pageSizeNum,
        skip,
        select: {
          id: true,
          collectionName: true,
          createdAt: true,
          Board: {
            where: {
              isDeleted: false,
            },
            select: {
              id: true, ///kiran8605
              boardImageScr: true,
              BoardImages: {
                select: {
                  id: true,

                  imageUrl: true,
                },
                take: 1,
              },
            },
            take: 4,
          },
        },
      });
      if (!collections) {
        return await this.responseService.NOT_FOUND(
          'No collection found, Please create new collection',
          {},
          res,
        );
      }

      return await this.responseService.success(
        'success',
        'Collection fetched success',
        { count: count, data: collections },
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
  //no need mlt
  async fetchPrivateCollectionsOnHomeFeed(
    res,
    paginationDto,
    aUser: RequestUserDto,
  ) {
    try {
      if (aUser.role != (await this.constantsService.userRole.privateUser)) {
        return await this.responseService.NOT_FOUND(
          'Invalid user, You cannot access this api',
          {},
          res,
        );
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

      const count = await this.prismaService.collection.count({
        where: {
          user: {
            id: aUser.id,
            role: this.constantsService.userRole.privateUser,
          },
        },
      });
      const collections = await this.prismaService.collection.findMany({
        where: {
          user: {
            id: aUser.id,
            role: this.constantsService.userRole.privateUser,
          },
        },
        take: +pageSizeNum,
        skip,
        select: {
          id: true,
          collectionName: true,
          createdAt: true,
          Board: {
            where: {
              isDeleted: false,
            },
            select: {
              id: true,
              BoardImages: {
                select: {
                  id: true,
                  imageUrl: true,
                },
                take: 1,
              },
            },
            take: 4,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      if (!collections) {
        return await this.responseService.NOT_FOUND(
          'No collection found, Please create new collection',
          {},
          res,
        );
      }

      return await this.responseService.success(
        'success',
        'Collection fetched success private user',
        { count: count, data: collections },
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

  //same tappable id have already replace action then this delete first and add on vanish action here
  async addSwitchBoardAction(
    res,
    data: AddSwitchBoardActionDto,
    aUser: RequestUserDto,
  ) {
    try {
      if (
        aUser.role !== (await this.constantsService.newUserRole.publicCreator)
      ) {
        return await this.responseService.UNAUTHORIZED('Invalid User', res);
      }

      return await this.responseService.success(
        'success',
        'Do not use this api, new flow wise use  addReplaceSwitchAction api. and pass the data and pass the is vanish flag is true',
        {},
        res,
      );
      const validateTappableId = await this.prismaService.tappable.findFirst({
        where: {
          id: data.tappableId,
          userId: aUser.id,
        },
      });
      if (!validateTappableId) {
        return await this.responseService.NOT_FOUND(
          'Invalid tappable Id, Pass the correct tappable id',
          {},
          res,
        );
      }

      const validateAlreadyExitSwitchAction =
        await this.prismaService.tappable.findFirst({
          where: {
            id: data.tappableId,
            userId: aUser.id,
          },
          select: {
            isVanish: true, //if is switch is true then already have switch action added
            switchId: true,
            isReplace: true,
          },
        });

      //if here is already replace action then delete first
      if (validateAlreadyExitSwitchAction.isReplace) {
        await this.prismaService.replaceTappable.deleteMany({
          where: {
            tappableId: data.tappableId,
          },
        }); //here no need to change the flag replace=false updating below
      }

      //if replace action is follow then no need to isReplace should be false and price no need
      //if already have data then it only update
      if (validateAlreadyExitSwitchAction.switchId) {
        if (validateAlreadyExitSwitchAction.isVanish) {
          await this.prismaService.tappable.update({
            where: {
              id: data.tappableId,
            },
            data: {
              isTappable: false,
              isVanish: true,
              isReplace: false,
              switch: {
                update: {
                  isLockTappable: data?.isLockTappable, // replace lock he ki nahi
                  vanishDescription: data?.vanishDescription,
                  // isReplaceSale:data.isReplaceSale, //replace action is sale or not
                  vanishAction: data.vanishAction, // is follow or payment
                  vanishPrice: data.vanishPrice,
                  switchAction: data.switchAction, //replace/vanish
                },
              },
            },
          });
          return await this.responseService.success(
            'success',
            'Updated switch action is done',
            {},
            res,
          );
        } else {
          return await this.responseService.NOT_FOUND(
            'Inside database have some missed data',
            {},
            res,
          );
        }
      } else {
        //if already switch then it only update
        await this.prismaService.tappable.update({
          where: {
            id: data.tappableId,
          },
          data: {
            isTappable: false,
            isVanish: true,
            isReplace: false,
            switch: {
              create: {
                vanishDescription: data.vanishDescription,
                // isReplaceSale:data.isReplaceSale, //replace action is sale or not
                vanishAction: data.vanishAction, // is follow or payment
                vanishPrice: data.vanishPrice,
                switchAction: data.switchAction, //replace/vanish
                isLockTappable: data.isLockTappable,
              },
            },
          },
        });

        return await this.responseService.success(
          'success',
          'Added switch action is done',
          {},
          res,
        );
      }

      // const validateAlreadyExitSwitchAction=await this.prismaService.tappable.findFirst({
      //   where:{
      //     switch:{

      //     }
      //   }
      // })

      return await this.responseService.NOT_FOUND(
        'Something is wrong,no created switch',
        {},
        res,
      );

      // return await this.responseService.success("success","Added switch action is done",{},res);
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async fetchSwitchBoardInfo(res, switchId, aUser: RequestUserDto) {
    try {
      if (!IsUUID(switchId)) {
        return await this.responseService.NOT_FOUND(
          'switchId must be a valid UUID',
          {},
          res,
        );
      }
      const validateIsSwitchOrNot =
        await this.prismaService.replaceTappable.findUnique({
          where: {
            id: switchId,
          },
          select: {
            id: true,
            isLockTappable: true,
            price: true,
            ContentImagesLinks: true,
            title: true,
            description: true,
            layerName: true,
            isVanish: true,
            height: true,
            width: true,
            top: true,
            left: true,
            actionName: true,
            isInfoOverlay: true,
            layerNumber: true,
            // isReplaceSale:true,
            // vanishAction: true,
            // switchAction: true,
            // vanishPrice: true,
            // vanishDescription: true,
            createdAt: true,
          },
        });
      if (!validateIsSwitchOrNot) {
        return await this.responseService.NOT_FOUND(
          'Invalid switchId',
          {},
          res,
        );
      }
      let isPurchaseLoginUser = await this.prismaService.transaction.findFirst({
        where: {
          switchId: validateIsSwitchOrNot.id,
          // customerId:aUser.id,
          customer: {
            users: {
              some: {
                id: aUser.id,
              },
            },
          },
        },
      });

      let data = {
        id: validateIsSwitchOrNot.id,
        isLockTappable: validateIsSwitchOrNot.isLockTappable,
        vanishAction: validateIsSwitchOrNot.actionName,
        vanishPrice: validateIsSwitchOrNot.price,
        vanishDescription: validateIsSwitchOrNot.description,
        isPurchaseLoginUser: !!isPurchaseLoginUser,
        height: validateIsSwitchOrNot.height,
        width: validateIsSwitchOrNot.width,
        top: validateIsSwitchOrNot.top,
        left: validateIsSwitchOrNot.left,
        createdAt: validateIsSwitchOrNot.createdAt,
      };

      return await this.responseService.success(
        'success',
        'Switch Record fetched success',
        data,
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

  //@todo here we need to add one condition is remaing if last layer can add the info-overlay then we cannot add the agin layer
  async addReplaceSwitchBoardAction(
    res,
    data: AddSwitchReplaceActionDto,
    aUser: RequestUserDto,
  ) {
    try {
      if (
        aUser.role !== (await this.constantsService.newUserRole.publicCreator)
      ) {
        return await this.responseService.UNAUTHORIZED('Invalid User', res);
      }

      if (!this.commonService.validateFlags(data)) {
        return await this.responseService.NOT_FOUND(
          'Only one of isVanish, isReplace, or isInfoOverlay can be true',
          {},
          res,
        );
      }

      // if layer name is already exits then only update
      if (data.layerName?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Layer name must require',
          {},
          res,
        );
      }

      if (!data.layerNumber || data.layerNumber?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Layer number must require',
          {},
          res,
        );
      }

      //if layerName is same then update the existing code on that layer
      let newLayerName = data.layerName.toLowerCase().replace(/\s+/g, ' ');

      const findTappable = await this.prismaService.tappable.findFirst({
        where: {
          id: data.tappableId,
          userId: aUser.id,
        },
        select: {
          id: true,
          isVanish: true,
          isReplace: true,
          switchId: true,
        },
      });
      if (!findTappable) {
        return await this.responseService.NOT_FOUND(
          'Invalid tappableId',
          {},
          res,
        );
      } else {
        //if tappable is valid then find the already exit or not

        /**@Note some used this already tappable id to make switch vanish flow so first we have to delete this records and add here this tappable id 
          thorough actions
         */
        if (findTappable.isVanish) {
          if (findTappable.switchId) {
            await this.prismaService.switch.delete({
              where: {
                id: findTappable.switchId,
              },
            });
          }
        }

        let customWhereClause: Prisma.ReplaceTappableWhereInput = {
          tappableId: data.tappableId,
          userId: aUser.id,
          layerName: newLayerName,
        };
        const validTappable =
          await this.prismaService.replaceTappable.findFirst({
            where: customWhereClause,
            select: {
              id: true,
              layerName: true,
              isInfoOverlay: true,
            },
          });


        let validateLayerNumber =
          await this.prismaService.replaceTappable.findFirst({
            where: {
              userId: aUser.id,
              tappableId: data.tappableId,
              layerNumber: data.layerNumber.trim(),
            },
          });
        if (validateLayerNumber) {
          return await this.responseService.NOT_FOUND(
            'Layer number already exits',
            {},
            res,
          );
        }

        let validateLayer = await this.prismaService.replaceTappable.findMany({
          where: {
            userId: aUser.id,
            tappableId: data.tappableId,
          },
          select: {
            layerNumber: true,
            id: true,
          },
        });
        ///--------------------new changes-----------------------------------------
        // console.info(validateLayer.length);
        if (validateLayer.length > 0) {
          const convertedLayers = validateLayer.map((layer) => ({
            layerNumber: parseInt(layer.layerNumber, 10), // Convert to number
            id: layer.id,
          }));

          // Sort by layerNumber in descending order to get the greatest number first
          convertedLayers.sort((a, b) => b.layerNumber - a.layerNumber);

          // The greatest layerNumber and corresponding id will be the first element
          const greatestLayer = convertedLayers[0];
          const greatestLayerId = greatestLayer.id;
          console.info(greatestLayer.layerNumber);

          //if already info overlay then we do not add to any cotaint
          let isAddedInfo = await this.prismaService.replaceTappable.findFirst({
            where: {
              id: greatestLayerId,
            },
            select: {
              layerNumber: true,
              id: true,
              isInfoOverlay: true,
            },
          });
          if (isAddedInfo.isInfoOverlay) {
            return await this.responseService.NOT_FOUND(
              'you can not add the replace action because previews layer already added info-overlay',
              {},
              res,
            );
          } else {
            if (data.isInfoOverlay) {
              await this.prismaService.replaceTappable.update({
                where: {
                  id: greatestLayerId,
                  NOT: {
                    isInfoOverlay: true,
                  },
                },
                data: {
                  infoOverlayImage: data.contentImagesLinks,
                },
              });
            }
          }
        }

        await this.prismaService.replaceTappable.create({
          data: {
            ContentImagesLinks: data?.contentImagesLinks,
            title: data?.title,
            description: data?.description,
            price: data?.price,
            isInfoOverlay: data?.isInfoOverlay,
            isVanish: data.isVanish,
            isReplace: data.isReplace,
            isLockTappable: data?.isLockTappable,
            userId: aUser.id,
            layerName: newLayerName,
            tappableId: data?.tappableId,
            actionName: data?.actionName,
            layerNumber: data.layerNumber,
            width: data?.width,
            height: data?.height,
            top: data?.top,
            left: data?.left,
            isInventoryEnabled: data?.isInventoryEnabled,
            inventoryCount: data?.inventoryCount,
            inventoryAvailableCount: data?.inventoryCount,
          },
        });

        await this.prismaService.tappable.update({
          where: { id: data.tappableId },
          data: {
            isReplace: true,
            isVanish: false,
            isTappable: false,
          },
        });

        // }
        return await this.responseService.success(
          'success',
          'Replace action added success',
          {},
          res,
        );
      }
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async updateLayerMetaData(
    res,
    data: UpdateSwitchReplaceActionDto,
    aUser: RequestUserDto,
  ) {
    try {
      const validateLayer = await this.prismaService.replaceTappable.findFirst({
        where: {
          id: data.layerId,
          userId: aUser.id,
        },
      });

      if (!validateLayer) {
        return await this.responseService.NOT_FOUND('Invalid layerId', {}, res);
      }

      let customUpdateClause: Prisma.ReplaceTappableUpdateInput = {};

      if (data.contentImagesLinks?.length != 0) {
        customUpdateClause.ContentImagesLinks = data.contentImagesLinks;
      }
      if (data.title?.trim()) {
        customUpdateClause.title = data.title;
      }

      if (data.description?.trim()) {
        customUpdateClause.description = data.description;
      }
      if (data.price?.trim()) {
        customUpdateClause.price = data.price;
      }
      if (data.description?.trim()) {
        customUpdateClause.description = data.description;
      }
      if (typeof data.isLockTappable === 'boolean') {
        customUpdateClause.isLockTappable = data.isLockTappable; //need to test proper
      }
      if (data.layerName?.trim()) {
        customUpdateClause.layerName = data.layerName;
      }
      if (data.layerNumber?.trim()) {
        customUpdateClause.layerNumber = data.layerNumber;
      }
      if (data.actionName?.trim()) {
        customUpdateClause.actionName = data.actionName;
      }
      if (data.width?.trim()) {
        customUpdateClause.width = data.width;
      }
      if (data.height?.trim()) {
        customUpdateClause.height = data.height;
      }
      if (data.top?.trim()) {
        customUpdateClause.top = data.top;
      }
      if (data.left?.trim()) {
        customUpdateClause.left = data.left;
      }
      if (data.isInventoryEnabled) {
        customUpdateClause.isInventoryEnabled = data.isInventoryEnabled;
      }
      if (data.inventoryCount) {
        customUpdateClause.inventoryCount = Number(data.inventoryCount);
        customUpdateClause.inventoryAvailableCount = Number(
          data.inventoryCount,
        );
      }

      let updatedData = await this.prismaService.replaceTappable.update({
        where: {
          id: data.layerId,
        },
        data: customUpdateClause,
      });

      return await this.responseService.success(
        'success',
        'Layer updated success',
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

  async updateTappableOrLayerPositions(
    res,
    data: UpdateTappableOrLayerPositions,
    aUser: RequestUserDto,
  ) {
    try {
      if (data.isSubLayer) {
        // it means it is replace inside sub layer

        let validateSubLayer =
          await this.prismaService.replaceTappable.findFirst({
            where: {
              id: data.tappableId,
              userId: aUser.id,
            },
          });
        if (!validateSubLayer) {
          return await this.responseService.NOT_FOUND(
            'Invalid layerId',
            {},
            res,
          );
        }

        let customUpdateClause: Prisma.ReplaceTappableUpdateInput = {};

        if (data.width?.trim()) {
          customUpdateClause.width = data.width;
        }
        if (data.height?.trim()) {
          customUpdateClause.height = data.height;
        }
        if (data.top?.trim()) {
          customUpdateClause.top = data.top;
        }
        if (data.left?.trim()) {
          customUpdateClause.left = data.left;
        }

        // if (data.isRedo) {
        customUpdateClause.isDeleted = false;
        // }

        let updatedData = await this.prismaService.replaceTappable.update({
          where: {
            id: data.tappableId,
          },
          data: customUpdateClause,
        });

        let newPositions = {
          id: updatedData.id,
          top: updatedData.top,
          left: updatedData.left,
          height: updatedData.height,
          width: updatedData.width,
          updatedAt: updatedData.updatedAt,
        };

        return await this.responseService.success(
          'success',
          'Layer position updated success',
          { data: newPositions },
          res,
        );
      } else {
        //it means it is a normal tappable position
        let validateSubLayer = await this.prismaService.tappable.findFirst({
          where: {
            id: data.tappableId,
            userId: aUser.id,
          },
        });
        if (!validateSubLayer) {
          return await this.responseService.NOT_FOUND(
            'Invalid tappableId',
            {},
            res,
          );
        }
        let customUpdateClause: Prisma.TappableUpdateInput = {};

        if (data.width?.trim()) {
          customUpdateClause.width = data.width.toString();
        }
        if (data.height?.trim()) {
          customUpdateClause.height = data.height.toString();
        }
        if (data.top?.trim()) {
          customUpdateClause.top = data.top.toString();
        }
        if (data.left?.trim()) {
          customUpdateClause.left = data.left.toString();
        }
        // if (data.isRedo) {
        customUpdateClause.isDeleted = false;
        // }

        let updatedData = await this.prismaService.tappable.update({
          where: {
            id: data.tappableId,
          },
          data: customUpdateClause,
        });

        let newPositions = {
          id: updatedData.id,
          top: updatedData.top,
          left: updatedData.left,
          height: updatedData.height,
          width: updatedData.width,
          updatedAt: updatedData.updatedAt,
        };

        return await this.responseService.success(
          'success',
          'Tappable position updated success',
          { data: newPositions },
          res,
        );
      }
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async getEditLayerMetaData(res, layerId, aUser: RequestUserDto) {
    try {
      if (!IsUUID(layerId)) {
        return await this.responseService.NOT_FOUND(
          'layerId must be uuid',
          {},
          res,
        );
      }

      const validateLayer = await this.prismaService.replaceTappable.findFirst({
        where: {
          id: layerId,
          // userId: aUser.id,
        },
        select: {
          id: true,
          actionName: true,
          ContentImagesLinks: true,
          layerName: true,
          isInfoOverlay: true,
          isVanish: true,
          isReplace: true,
          layerNumber: true,
          price: true,
          title: true,
          description: true,
          isLockTappable: true,
          lockTappableDescription: true,
          top: true,
          left: true,
          width: true,
          height: true,
          tappableId: true,
          userId: true,
          inventoryCount: true,
          isInventoryEnabled: true,
          inventoryAvailableCount: true,
        },
      });
      let data = {
        id: validateLayer.id,
        actionName: validateLayer.actionName,
        ContentImagesLinks: validateLayer.ContentImagesLinks,
        layerName: validateLayer.layerName,
        isInfoOverlay: validateLayer.isInfoOverlay,
        isVanish: validateLayer.isVanish,
        isReplace: validateLayer.isReplace,
        layerNumber: validateLayer.layerNumber,
        price: validateLayer.price?.toString(),
        title: validateLayer.title,
        description: validateLayer.description,
        isLockTappable: validateLayer.isLockTappable,
        lockTappableDescription: validateLayer.lockTappableDescription,
        top: validateLayer.top,
        left: validateLayer.left,
        width: validateLayer.width,
        height: validateLayer.height,
        tappableId: validateLayer.tappableId,
        userId: validateLayer.userId,
        inventoryCount: validateLayer.inventoryCount?.toString(),
        isInventoryEnabled: validateLayer.isInventoryEnabled,
        inventoryAvailableCount:
          validateLayer.inventoryAvailableCount?.toString(),
      };
      if (!validateLayer) {
        return await this.responseService.NOT_FOUND('Invalid layerId', {}, res);
      }

      return await this.responseService.success(
        'success',
        'Layer information fetched success',
        { data: data },
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
  async deleteSwitchLayer(res, layerId, aUser: RequestUserDto) {
    try {
      if (!IsUUID(layerId)) {
        return await this.responseService.NOT_FOUND(
          'layerId must be uudi',
          {},
          res,
        );
      }
      const findReplace = await this.prismaService.replaceTappable.findFirst({
        where: {
          id: layerId,
        },
        select: {
          userId: true,
        },
      });

      if (!findReplace) {
        return await this.responseService.NOT_FOUND('Invalid layerId', {}, res);
      }
      if (aUser.id !== findReplace.userId) {
        return await this.responseService.NOT_FOUND('Invalid user', {}, res);
      }
      await this.prismaService.replaceTappable.update({
        where: {
          id: layerId,
        },
        data: {
          isDeleted: true,
        },
      });
      return await this.responseService.success(
        'success',
        'Layer deleted success',
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

  //do not use this api new flow wise layer wise potions are different
  async fetchAllReplaceSwitchInfo(res, tappableId, aUser: RequestUserDto) {
    try {
      if (!IsUUID(tappableId)) {
        return await this.responseService.NOT_FOUND(
          'tappableId must be a valid UUID',
          {},
          res,
        );
      }

      // Fetch all replace tappables related to the tappableId
      const findReplace = await this.prismaService.replaceTappable.findMany({
        where: {
          tappableId: tappableId,
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'asc', //first will be show first
        },
        select: {
          id: true,
          userId: true,
          layerName: true,
          title: true,
          description: true,
          isLockTappable: true,
          isInfoOverlay: true,
          layerNumber: true,
          ContentImagesLinks: true,
          actionName: true,
          lockTappableDescription: true,
          tappableId: true,
          price: true,
          createdAt: true,
          updatedAt: true,
          width: true,
          height: true,
          left: true,
          top: true,
          isVanish: true,
          isInventoryEnabled: true,
          inventoryAvailableCount: true,
          isReplace: true,
          user: {
            select: {
              userName: true,
              profileIcon: true,
              initialProfileIcon: true,
            },
          },
        },
      });

      if (!findReplace.length) {
        return await this.responseService.NOT_FOUND(
          'Invalid Tappable ID',
          {},
          res,
        );
      }

      // Collect all replaceTappable IDs to check purchases in one query
      const replaceIds = findReplace.map((item) => item.id);

      // Fetch all transactions for these replaceIds and the logged-in user
      const transactions = await this.prismaService.transaction.findMany({
        where: {
          replaceId: { in: replaceIds },
          customer: {
            users: {
              some: {
                id: aUser.id,
              },
            },
          },
        },
        select: {
          replaceId: true, // Only need replaceId to match with tappables
        },
      });

      // Create a set of purchased replaceIds for easier lookup
      const purchasedReplaceIds = new Set(
        transactions.map((tx) => tx.replaceId),
      );

      // Prepare the final data by checking the purchase status
      const data = findReplace.map((item) => ({
        id: item.id,
        userId: item.userId,
        layerName: item.layerName,
        title: item.title,
        description: item.description,
        isLockTappable: item.isLockTappable,

        price: item.price,
        layerNumber: item.layerNumber,
        createdAt: item.createdAt,
        ContentImagesLinks: item.ContentImagesLinks,
        actionName: item.actionName,
        updatedAt: item.updatedAt,
        lockTappableDescription: item.lockTappableDescription,
        tappableId: item.tappableId,
        width: item.width,
        height: item.height,
        left: item.left,
        top: item.top,
        isVanish: item.isVanish,
        isReplace: item.isReplace,
        isInfoOverlay: item.isInfoOverlay,
        isOutOfStock: item?.inventoryAvailableCount <= 0,
        isInventoryEnabled: item?.isInventoryEnabled,
        inventoryAvailableCount: item?.inventoryAvailableCount?.toString(),
        isPurchaseLoginUser: purchasedReplaceIds.has(item.id), // Check if the replaceId exists in the purchase set
        user: {
          userName: item.user?.userName,
          profileIcon: item.user?.profileIcon,
          initialProfileIcon: item.user?.initialProfileIcon,
        },
      }));

      return await this.responseService.success(
        'success',
        'Switch Replace actions fetched successfully',
        { data },
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
  async fetchAllReplaceSwitchInfoGestUser(res, tappableId) {
    try {
      if (!IsUUID(tappableId)) {
        return await this.responseService.NOT_FOUND(
          'tappableId must be a valid UUID',
          {},
          res,
        );
      }

      // Fetch all replace tappables related to the tappableId
      const findReplace = await this.prismaService.replaceTappable.findMany({
        where: {
          tappableId: tappableId,
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'asc', //first will be show first
        },
        select: {
          id: true,
          userId: true,
          layerName: true,
          title: true,
          description: true,
          isLockTappable: true,
          isInfoOverlay: true,
          layerNumber: true,
          ContentImagesLinks: true,
          actionName: true,
          lockTappableDescription: true,
          tappableId: true,
          price: true,
          createdAt: true,
          updatedAt: true,
          width: true,
          height: true,
          left: true,
          top: true,
          isVanish: true,
          isInventoryEnabled: true,
          inventoryAvailableCount: true,
          isReplace: true,
          user: {
            select: {
              userName: true,
              profileIcon: true,
              initialProfileIcon: true,
            },
          },
        },
      });

      if (!findReplace.length) {
        return await this.responseService.NOT_FOUND(
          'Invalid Tappable ID',
          {},
          res,
        );
      }

      // Collect all replaceTappable IDs to check purchases in one query
      const replaceIds = findReplace.map((item) => item.id);


      // // Create a set of purchased replaceIds for easier lookup
      // const purchasedReplaceIds = new Set(
      //   transactions.map((tx) => tx.replaceId),
      // );

      // Prepare the final data by checking the purchase status
      const data = findReplace.map((item) => ({
        id: item.id,
        userId: item.userId,
        layerName: item.layerName,
        title: item.title,
        description: item.description,
        isLockTappable: item.isLockTappable,

        price: item.price,
        layerNumber: item.layerNumber,
        createdAt: item.createdAt,
        ContentImagesLinks: item.ContentImagesLinks,
        actionName: item.actionName,
        updatedAt: item.updatedAt,
        lockTappableDescription: item.lockTappableDescription,
        tappableId: item.tappableId,
        width: item.width,
        height: item.height,
        left: item.left,
        top: item.top,
        isVanish: item.isVanish,
        isReplace: item.isReplace,
        isInfoOverlay: item.isInfoOverlay,
        isOutOfStock: item?.inventoryAvailableCount <= 0,
        isInventoryEnabled: item?.isInventoryEnabled,
        inventoryAvailableCount: item?.inventoryAvailableCount?.toString(),
        // isPurchaseLoginUser: purchasedReplaceIds.has(item.id), // Check if the replaceId exists in the purchase set
        user: {
          userName: item.user?.userName,
          profileIcon: item.user?.profileIcon,
          initialProfileIcon: item.user?.initialProfileIcon,
        },
      }));

      return await this.responseService.success(
        'success',
        'Switch Replace actions fetched successfully',
        { data },
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

  async fetchRecentBoardOnHomePage1(
    res,
    // tappablePageSize: number,
    paginationDto: PaginationDto,
    userName: string,
    loginUserId: string,
  ) {
    try {
      const { page, pageSize } = paginationDto;
      let params;
      let profileIcon;
      let initialProfileIcon;
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

      // if (!tappablePageSize || tappablePageSize <= 0) {
      //   return await this.responseService.NOT_FOUND(
      //     'tappablePageSize must be greater than 0',
      //     {},
      //     res,
      //   );
      // }

      let followData: { isFollow: boolean; isSameUser: boolean } = {
        isFollow: false,
        isSameUser: false,
      };
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
            profileIcon: true,
            initialProfileIcon: true,
          },
        });
        console.info('teestereree');
        if (!findDefaultCreatorId) {
          return await this.responseService.NOT_FOUND(
            'something is wrong no default user found',
            {},
            res,
          );
        }
        defaultUserId = findDefaultCreatorId.id;
        ///defalut creatot ko follow kar raha he ki nahi check karna he

        if (isUUID(loginUserId)) {
          if (loginUserId == defaultUserId) {
            followData.isSameUser = true; // if login user and loing user is same manes both are same so he can not follow.
            followData.isFollow = false;
          } else {
            let validateUserIsFollowing =
              await this.prismaService.userFollow.findFirst({
                where: {
                  userId: loginUserId,
                  followerId: findDefaultCreatorId.id,
                },
              });
            if (validateUserIsFollowing) {
              followData.isSameUser = false; // if login user and loing user is same manes both are same so he can not follow.
              followData.isFollow = true;
            }
          }
        }
        params = 'prymr';
        profileIcon = findDefaultCreatorId.profileIcon;
        initialProfileIcon = findDefaultCreatorId.initialProfileIcon;
      } else {
        const findCreatorId = await this.prismaService.user.findFirst({
          where: {
            userName: {
              equals: userName?.trim().toLowerCase(),
              mode: 'insensitive',
            },
            // isDefaultCreatorUser: true,
            isDeleted: false,
            role: await this.constantsService.newUserRole.publicCreator,
          },
          select: {
            userName: true,
            id: true,
            profileIcon: true,
            initialProfileIcon: true,
          },
        });
        // console.info(findCreatorId);

        if (!findCreatorId) {
          const defaultCreatorUser = await this.prismaService.user.findFirst({
            where: {
              isDefaultCreatorUser: true,
            },
            select: {
              userName: true,
            },
          });

          return await this.responseService.NOT_FOUND(
            `User Name is not valid, Please go the default user profile`,
            { defaultCreatorUserName: defaultCreatorUser.userName },
            res,
          );
          const findDefaultCreatorId = await this.prismaService.user.findFirst({
            where: {
              isDefaultCreatorUser: true,
              isDeleted: false,
              role: await this.constantsService.newUserRole.publicCreator,
            },
            select: {
              userName: true,
              id: true,
              profileIcon: true,
              initialProfileIcon: true,
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
          profileIcon = findDefaultCreatorId.profileIcon;
          initialProfileIcon = findDefaultCreatorId.initialProfileIcon;
          //is follow kar he nahi
          if (isUUID(loginUserId)) {
            if (loginUserId == defaultUserId) {
              followData.isSameUser = true; // if login user and loing user is same manes both are same so he can not follow.
              followData.isFollow = false;
            } else {
              let validateUserIsFollowing =
                await this.prismaService.userFollow.findFirst({
                  where: {
                    userId: loginUserId,
                    followerId: findDefaultCreatorId.id,
                  },
                });
              if (validateUserIsFollowing) {
                followData.isSameUser = false; // if login user and loing user is same manes both are same so he can not follow.
                followData.isFollow = true;
              }
            }
          }
        } else {
          defaultUserId = findCreatorId.id;
          params = userName;
          profileIcon = findCreatorId.profileIcon;
          initialProfileIcon = findCreatorId.initialProfileIcon;
          ///is floow he ki nahi
          if (isUUID(loginUserId)) {
            if (loginUserId == defaultUserId) {
              followData.isSameUser = true; // if login user and loing user is same manes both are same so he can not follow.
              followData.isFollow = false;
            } else {
              let validateUserIsFollowing =
                await this.prismaService.userFollow.findFirst({
                  where: {
                    userId: loginUserId,
                    followerId: findCreatorId.id,
                  },
                });
              if (validateUserIsFollowing) {
                followData.isSameUser = false; // if login user and loing user is same manes both are same so he can not follow.
                followData.isFollow = true;
              }
            }
          }
        }
      }

      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;
      const count = await this.prismaService.board.count({
        where: {
          isDeleted: false,
          BoardImages: {
            every: {
              boardStatus: await this.constantsService.boardStatus.published,
            },
          },
          userId: defaultUserId,
        },
      });
      const boards = await this.prismaService.board.findMany({
        where: {
          isDeleted: false,
          BoardImages: {
            every: {
              boardStatus: await this.constantsService.boardStatus.published,
            },
          },
          userId: defaultUserId,
        },
        take: pageSizeNum,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          boardImageScr: true,
          user: {
            select: {
              id: true,
              profileIcon: true,
              initialProfileIcon: true,
              userName: true,
            },
          },

          BoardImages: {
            select: {
              id: true,
              imageUrl: true,
              description: true,
              title: true,
              createdAt: true,
              _count: {
                select: {
                  BoardImagesCommentLikes: true,
                  boardImagesComments: true,
                },
              },
              tappable: {
                where: {
                  isDeleted: false,
                },
                // take: +tappablePageSize,
                // skip: 0,
                select: {
                  id: true, //this is tappable id when click on the tappable then fetch the tappable details and actions
                  tappableImage: true,
                  ContentImagesLinks: true,
                  isTappable: true, //if is not tappable then no create the blue icon
                  isVanish: true,
                  isReplace: true,
                  switchId: true,
                  //------------------
                  actionName: true,
                  left: true,
                  top: true,
                  width: true,
                  height: true,
                  createdAt: true,
                  replaceTappable: {
                    select: {
                      isVanish: true,
                      isReplace: true,
                      isInfoOverlay: true,
                      id: true,
                    },
                  },
                },
              },
              Reaction: {
                select: {
                  id: true,
                  top: true,
                  left: true,
                  height: true,
                  width: true,
                  emoji: true,
                  createdAt: true,
                  user: {
                    select: {
                      userName: true,
                      initialProfileIcon: true,
                      profileIcon: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      //--------------------------------------------------------------------



      //---------------------------------

      const formattedBoards = boards.map((board) => {
        return {
          id: board.id,
          boardImageScr: board.boardImageScr,
          user: {
            id: board.user.id,
            profileIcon: board.user?.profileIcon
              ? board.user?.profileIcon
              : board?.user?.initialProfileIcon,
            userName: board.user.userName,
          },
          BoardImages: board.BoardImages.map((image) => ({
            id: image.id,
            imageUrl: image.imageUrl,
            description: image.description,
            title: image.title,
            createdAt: image.createdAt,
            commentLikesCount: image._count.BoardImagesCommentLikes,
            commentsCount: image._count.boardImagesComments,
            tappable: image?.tappable,
            reaction: image.Reaction,
          })),
        };
      });

      return await this.responseService.success(
        'success',
        'Recent board fetched success',
        {
          count: count,
          param: params,
          followData: followData,
          profileIcon: profileIcon,
          initialProfileIcon: initialProfileIcon,
          data: formattedBoards,
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


  //     // if (!tappablePageSize || tappablePageSize <= 0) {
  //     //   return await this.responseService.NOT_FOUND(
  //     //     'tappablePageSize must be greater than 0',
  //     //     {},
  //     //     res,
  //     //   );
  //     // }


  //       if (!findDefaultCreatorId) {
  //         return await this.responseService.NOT_FOUND(
  //           'something is wrong no default user found',
  //           {},
  //           res,
  //         );
  //       }
  //       defaultUserId = findDefaultCreatorId.id;
  //       ///defalut creatot ko follow kar raha he ki nahi check karna he


  //       if (!findCreatorId) {

  //       // return await this.responseService.NOT_FOUND("User name not found, If you want to go prymr profile ?",{},res);




  //       ///


  //       //




  //     //--------------------------------------------------------------------



  //     //---------------------------------



  //---------------before login api's--------------------------------------------------------

  //any tappable click then fetch the data here no need to jwt.
  async fetchPublicTappableContain(res, imageId, tappableId) {
    try {
      if (!imageId || !isUUID(imageId)) {
        return await this.responseService.NOT_FOUND(
          'imageId must be uuid',
          {},
          res,
        );
      }
      if (!tappableId || !isUUID(tappableId)) {
        return await this.responseService.NOT_FOUND(
          'tappableId must be a valid UUID',
          {},
          res,
        );
      }
      //action should be info
      const tappable = await this.prismaService.tappable.findFirst({
        where: {
          id: tappableId,
          boardImageId: imageId,
          isTappable: true,
        },
        select: {
          id: true,
          actionName: true,
          layerName: true,
          title: true,
          description: true,
          top: true,
          left: true,
          width: true,
          height: true,
          boardImageId: true,
          tappableImage: true,
          ContentImagesLinks: true,
          price: true,
          subTitle: true,
          // assetType: true,
          createdAt: true,
          isSaleItem: true,
        },
      });

      if (!tappable) {
        return await this.responseService.NOT_FOUND(
          'Tappable not found! Please provide a valid imageId and tappableId',
          {},
          res,
        );
      }

      const data = {
        tappableId: tappable.id,
        boardImageId: tappable.boardImageId,
        title: tappable.title,
        tappableDescription: tappable.description,
        top: tappable.top,
        left: tappable.left,
        width: tappable.width,
        height: tappable.height,
        price: tappable?.price ? tappable?.price?.toString() : null,
        // assetType: tappable.assetType,
        tappablePrymrImage: tappable.tappableImage,
        tappableSliderImages: tappable.ContentImagesLinks,
        cratedAt: tappable.createdAt,
        isSaleItem: tappable.isSaleItem,
        inventoryAvailableCount: '0',
        isInventoryEnabled: false,
      };

      return await this.responseService.success(
        'success',
        'Tappable fetched success',
        data,
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

  async fetchPublicVanishSwitchBoardInfo(res, switchId) {
    try {
      if (!IsUUID(switchId)) {
        return await this.responseService.NOT_FOUND(
          'switchId must be a valid UUID',
          {},
          res,
        );
      }
      const validateIsSwitchOrNot = await this.prismaService.switch.findUnique({
        where: {
          id: switchId,
        },
        select: {
          id: true,
          isLockTappable: true,
          // isReplaceSale:true,
          vanishAction: true,
          switchAction: true,
          vanishPrice: true,
          vanishDescription: true,
          createdAt: true,
        },
      });
      if (!validateIsSwitchOrNot) {
        return await this.responseService.NOT_FOUND(
          'Invalid switchId',
          {},
          res,
        );
      }

      let data = {
        id: validateIsSwitchOrNot.id,
        isLockTappable: validateIsSwitchOrNot.isLockTappable,
        vanishAction: validateIsSwitchOrNot.vanishAction,
        vanishPrice: validateIsSwitchOrNot.vanishPrice,
        vanishDescription: validateIsSwitchOrNot.vanishDescription,
        createdAt: validateIsSwitchOrNot.createdAt,
      };

      return await this.responseService.success(
        'success',
        'Switch Record fetched success',
        data,
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

  async fetchAllPublicReplaceSwitchInfo(res, tappableId) {
    try {
      if (!IsUUID(tappableId)) {
        return await this.responseService.NOT_FOUND(
          'tappableId must be a valid UUID',
          {},
          res,
        );
      }

      // Fetch all replace tappables related to the tappableId
      const findReplace = await this.prismaService.replaceTappable.findMany({
        where: {
          tappableId: tappableId,
        },
        select: {
          id: true,
          userId: true,
          layerName: true,
          title: true,
          description: true,
          isLockTappable: true,
          isInfoOverlay: true,
          price: true,
          createdAt: true,
          user: {
            select: {
              userName: true,
              profileIcon: true,
              initialProfileIcon: true,
            },
          },
        },
      });

      if (!findReplace.length) {
        return await this.responseService.NOT_FOUND(
          'Invalid Tappable ID',
          {},
          res,
        );
      }

      // Prepare the final data by checking the purchase status
      const data = findReplace.map((item) => ({
        id: item.id,
        userId: item.userId,
        layerName: item.layerName,
        title: item.title,
        description: item.description,
        isLockTappable: item.isLockTappable,
        isInfoOverlay: item.isInfoOverlay,
        price: item.price,
        createdAt: item.createdAt,
        user: {
          userName: item.user?.userName,
          profileIcon: item.user?.profileIcon,
          initialProfileIcon: item.user?.initialProfileIcon,
        },
      }));

      return await this.responseService.success(
        'success',
        'Switch Replace actions fetched successfully',
        { data },
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

  async fetchAllReplaceOrVanishInfo(res, layerId, aUser: RequestUserDto) {
    try {
      if (!IsUUID(layerId)) {
        return await this.responseService.NOT_FOUND(
          'tappableId must be a valid UUID',
          {},
          res,
        );
      }

      // Fetch all replace tappables related to the tappableId
      const findReplace = await this.prismaService.replaceTappable.findFirst({
        where: {
          id: layerId,
        },
        select: {
          id: true,
          userId: true,
          layerName: true,
          title: true,
          description: true,
          isLockTappable: true,
          isInfoOverlay: true,
          layerNumber: true,
          ContentImagesLinks: true,
          actionName: true,
          lockTappableDescription: true,
          tappableId: true,
          price: true,
          createdAt: true,
          width: true,
          height: true,
          left: true,
          top: true,
          isVanish: true,
          isReplace: true,
          isInventoryEnabled: true,
          inventoryAvailableCount: true,
          user: {
            select: {
              userName: true,
              profileIcon: true,
              initialProfileIcon: true,
            },
          },
        },
      });

      if (!findReplace) {
        return await this.responseService.NOT_FOUND(
          'Invalid replace id',
          {},
          res,
        );
      }
      // Collect all replaceTappable IDs to check purchases in one query
      // const replaceIds = findReplace.map((item) => item.id);

      // Fetch all transactions for these replaceIds and the logged-in user
      const transactions = await this.prismaService.transaction.findMany({
        where: {
          OR: [
            {
              replaceId: layerId,
            },
            {
              switchId: layerId,
            },
          ],
          // replaceId: { in: replaceIds },
          customer: {
            users: {
              some: {
                id: aUser.id,
              },
            },
          },
        },
        select: {
          replaceId: true, // Only need replaceId to match with tappables
        },
      });

      // Create a set of purchased replaceIds for easier lookup
      // const purchasedReplaceIds = new Set(
      //   transactions.map((tx) => tx.replaceId),
      // );

      // Prepare the final data by checking the purchase status
      const data = {
        id: findReplace.id,
        userId: findReplace.userId,
        layerName: findReplace.layerName,
        title: findReplace.title,
        description: findReplace.description,
        isLockTappable: findReplace.isLockTappable,

        price: findReplace.price,
        layerNumber: findReplace.layerNumber,
        createdAt: findReplace.createdAt,
        ContentImagesLinks: findReplace.ContentImagesLinks,
        actionName: findReplace.actionName,
        lockTappableDescription: findReplace.lockTappableDescription,
        tappableId: findReplace.tappableId,
        width: findReplace.width,
        height: findReplace.height,
        left: findReplace.left,
        top: findReplace.top,
        isVanish: findReplace.isVanish,
        isReplace: findReplace.isReplace,
        isInfoOverlay: findReplace.isInfoOverlay,
        inventoryAvailableCount:
          findReplace?.inventoryAvailableCount?.toString(),
        isInventoryEnabled: findReplace?.isInventoryEnabled,
        isPurchaseLoginUser: transactions.length > 0, // Check if the replaceId exists in the purchase set
        user: {
          userName: findReplace.user?.userName,
          profileIcon: findReplace.user?.profileIcon,
          initialProfileIcon: findReplace.user?.initialProfileIcon,
        },
      };

      return await this.responseService.success(
        'success',
        'Switch Replace actions fetched successfully',
        { data },
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
  async fetchAllReplaceOrVanishInfoPublic(res, layerId) {
    try {
      if (!IsUUID(layerId)) {
        return await this.responseService.NOT_FOUND(
          'tappableId must be a valid UUID',
          {},
          res,
        );
      }

      // Fetch all replace tappables related to the tappableId
      const findReplace = await this.prismaService.replaceTappable.findFirst({
        where: {
          id: layerId,
        },
        select: {
          id: true,
          userId: true,
          layerName: true,
          title: true,
          description: true,
          isLockTappable: true,
          isInfoOverlay: true,
          layerNumber: true,
          ContentImagesLinks: true,
          actionName: true,
          lockTappableDescription: true,
          tappableId: true,
          price: true,
          createdAt: true,
          width: true,
          height: true,
          left: true,
          top: true,
          isVanish: true,
          isReplace: true,
          inventoryAvailableCount: true,
          isInventoryEnabled: true,
          user: {
            select: {
              userName: true,
              profileIcon: true,
              initialProfileIcon: true,
            },
          },
        },
      });

      if (!findReplace) {
        return await this.responseService.NOT_FOUND(
          'Invalid replace id',
          {},
          res,
        );
      }
      // Collect all replaceTappable IDs to check purchases in one query
      // const replaceIds = findReplace.map((item) => item.id);


      // Create a set of purchased replaceIds for easier lookup
      // const purchasedReplaceIds = new Set(
      //   transactions.map((tx) => tx.replaceId),
      // );

      // Prepare the final data by checking the purchase status
      const data = {
        id: findReplace.id,
        userId: findReplace.userId,
        layerName: findReplace.layerName,
        title: findReplace.title,
        description: findReplace.description,
        isLockTappable: findReplace.isLockTappable,

        price: findReplace.price,
        layerNumber: findReplace.layerNumber,
        createdAt: findReplace.createdAt,
        ContentImagesLinks: findReplace.ContentImagesLinks,
        actionName: findReplace.actionName,
        lockTappableDescription: findReplace.lockTappableDescription,
        tappableId: findReplace.tappableId,
        width: findReplace.width,
        height: findReplace.height,
        left: findReplace.left,
        top: findReplace.top,
        isVanish: findReplace.isVanish,
        isReplace: findReplace.isReplace,
        isInfoOverlay: findReplace.isInfoOverlay,
        inventoryAvailableCount:
          findReplace.inventoryAvailableCount?.toString(),
        isInventoryEnabled: findReplace.isInventoryEnabled,
        isPurchaseLoginUser: false, // Check if the replaceId exists in the purchase set
        user: {
          userName: findReplace.user?.userName,
          profileIcon: findReplace.user?.profileIcon,
          initialProfileIcon: findReplace.user?.initialProfileIcon,
        },
      };

      return await this.responseService.success(
        'success',
        'Switch Replace actions fetched successfully',
        { data },
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

  async fetchPreviewData(res, boardId, boardImageId, aUser: RequestUserDto) {
    try {
      if (
        aUser.role !== (await this.constantsService.newUserRole.publicCreator)
      ) {
        return await this.responseService.UNAUTHORIZED(
          'Invalid user role',
          res,
        );
      }

      if (!isUUID(boardId)) {
        return await this.responseService.NOT_FOUND(
          'Invalid boardId pass the uuid',
          {},
          res,
        );
      }
      if (!isUUID(boardImageId)) {
        return await this.responseService.NOT_FOUND(
          'Invalid boardImageId pass the uuid',
          {},
          res,
        );
      }

      let board = await this.prismaService.boardImages.findFirst({
        where: {
          board: {
            id: boardId,
            userId: aUser.id,
          },
          id: boardImageId,
        },
        select: {
          boardId: true,
          title: true,

          boardStatus: true,
          imageUrl: true,
          tappable: {
            where: {
              isDeleted: false,
            },

            select: {
              id: true,
              title: true,
              description: true,
              ContentImagesLinks: true,
              isTappable: true,
              isReplace: true,
              isVanish: true,
              isSaleItem: true,
              subTitle: true,
              // assetType:true,
              height: true,
              width: true,
              top: true,
              left: true,
              price: true,
              tappableImage: true,
              actionName: true,
              layerName: true,
              updatedAt: true,
              replaceTappable: {
                where: {
                  isDeleted: false,
                },
                select: {
                  id: true,
                  actionName: true,
                  ContentImagesLinks: true,
                  description: true,
                  infoOverlayImage: true,
                  width: true,
                  height: true,
                  left: true,
                  top: true,
                  title: true,
                  isReplace: true,
                  isVanish: true,
                  isInfoOverlay: true,
                  isLockTappable: true,
                  layerName: true,
                  layerNumber: true,
                  lockTappableDescription: true,
                  updatedAt: true,
                  user: {
                    select: {
                      id: true,
                      userName: true,
                      profileIcon: true,
                      initialProfileIcon: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!board) {
        return await this.responseService.NOT_FOUND(
          'Board not found pass the correct Board id and image id',
          {},
          res,
        );
      }

      const transformedBoard = JSON.parse(
        JSON.stringify(board, (key, value) =>
          typeof value === 'bigint' ? value?.toString() : value,
        ),
      );

      return await this.responseService.success(
        'success',
        'Preview data fetched successfully',
        { data: transformedBoard },
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

  async fetchRecentBoardOnHomePage(
    res,
    paginationDto: PaginationDto,
    userName: string,
    loginUserId: string,
    boardId: string,
  ) {
    try {
      //initial phase
      let { page, pageSize } = paginationDto;
      let userId: any;
      let count = 0;
      const skip = (Number(page) - 1) * Number(pageSize);
      let followData: {
        isFollow: boolean;
        isSameUser: boolean;
        isStandardUser: boolean;
        standardUserId: string;
      } = {
        isFollow: false,
        isSameUser: false,
        isStandardUser: false,
        standardUserId: '',
      };
      //--------------- initial error phase --------------------------------------------------------------------
      if (!page || +page <= 0 || !pageSize || +pageSize <= 0) {
        return await this.responseService.NOT_FOUND(
          'Pass the correct page and pageSize',
          {},
          res,
        );
      }

      if (boardId && !isUUID(boardId)) {
        return await this.responseService.NOT_FOUND(
          'Pass the correct boardId',
          {},
          res,
        );
      }
      //-----------------------------Body phase ----------------------------------------------------------

      let customWhereClauseByBoardId: Prisma.BoardWhereInput = {
        BoardImages: {
          every: {
            boardStatus: await this.constantsService.boardStatus.published,
          },
        },
      };

      // if passed user name and that user is not creator
      if (userName) {
        if (userName?.trim().length == 0) {
          return await this.responseService.NOT_FOUND(
            'Invalid user name pass the correct user name',
            {},
            res,
          );
        }
        let user = await this.prismaService.user.findFirst({
          where: {
            userName: {
              equals: userName?.trim(),
              mode: 'insensitive',
            },
          },
          select: {
            id: true,
            role: true,
            profileIcon: true,
            initialProfileIcon: true,
          },
        });

        if (!user) {
          return await this.responseService.NOT_FOUND(
            'Invalid user name pass the correct user name',
            {},
            res,
          );
        }
        userId = user.id;
        customWhereClauseByBoardId = {
          isDeleted: false,
          BoardImages: {
            every: {
              boardStatus: await this.constantsService.boardStatus.published,
            },
          },
        };
        //if passed user name is not creator then show the all the users boards
        if (
          user.role !== (await this.constantsService.newUserRole.standardUser)
        ) {
          customWhereClauseByBoardId = {
            userId: user.id,
            isDeleted: false,
            BoardImages: {
              every: {
                boardStatus: await this.constantsService.boardStatus.published,
              },
            },
          };
        }

        count = await this.prismaService.board.count({
          where: customWhereClauseByBoardId,
        });

        let allBoard = await this.prismaService.board.findMany({
          where: customWhereClauseByBoardId,
          take: +pageSize,
          skip,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            boardImageScr: true,
            user: {
              select: {
                id: true,
                profileIcon: true,
                userName: true,
                initialProfileIcon: true,
              },
            },
            BoardImages: {
              select: {
                id: true,
                imageUrl: true,
                description: true,
                title: true,
                createdAt: true,
                _count: {
                  select: {
                    BoardImagesCommentLikes: true,
                    boardImagesComments: true,
                  },
                },
                tappable: true,
                Reaction: {
                  select: {
                    id: true,
                    backgroundCapture: true,
                    contentText: true,
                    contentType: true,
                    createdAt: true,
                    height: true,
                    emoji: true,
                    left: true,
                    top: true,
                    width: true,
                    contentUrl: true,
                    boardImageId: true,
                    user: {
                      select: {
                        userName: true,
                        id: true,
                        profileIcon: true,
                        initialProfileIcon: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // with user name prepare the data object
        // standard user followed or not just check

        //formatted data:
        const formattedBoards = allBoard.map((board) => {
          return {
            id: board.id,
            boardImageScr: board.boardImageScr,
            user: {
              id: board.user.id,
              profileIcon: board.user?.profileIcon
                ? board.user?.profileIcon
                : board?.user?.initialProfileIcon,
              userName: board.user.userName,
            },
            BoardImages: board.BoardImages.map((image) => ({
              id: image.id,
              imageUrl: image.imageUrl,
              description: image.description,
              title: image.title,
              createdAt: image.createdAt,
              commentLikesCount:
                image._count.BoardImagesCommentLikes?.toString(),
              commentsCount: image._count.boardImagesComments?.toString(),
              tappable: image?.tappable?.map((tap) => ({
                ContentImagesLinks: tap.ContentImagesLinks,
                actionName: tap.actionName,
                boardId: tap.boardId,
                boardImageId: tap.boardImageId,
                createdAt: tap.createdAt,
                description: tap.description,
                height: tap.height?.toString(),
                width: tap.width?.toString(),
                inventoryCount: tap.inventoryCount?.toString(),
                price: tap.price?.toString(),
                top: tap.top?.toString(),
                id: tap.id,
                isReplace: tap.isReplace,
                isTappable: tap.isTappable,
                isSaleItem: tap.isSaleItem,
                switchId: tap.switchId,
                userId: tap.userId,
              })),
              reaction: image.Reaction?.map((res) => ({
                res: res.id,
                backgroundCapture: res.backgroundCapture,
                boardImageId: res.boardImageId,
                contentText: res.contentText,
                contentType: res.contentType,
                createdAt: res.createdAt,
                emoji: res.emoji,
                height: res.height?.toString(),
                left: res.left?.toString(),
                top: res.top?.toString(),
                width: res.width?.toString(),
                ...res,
              })),
            })),
          };
        });

        //--CHECK THE USER NAME IS EXITS AND ROLE IS CREATOR THEN CHECK THE USER IS FOLLOWED OT NOT---

        if (loginUserId) {
          let validateUserIsFollowing =
            await this.prismaService.userFollow.findFirst({
              where: {
                userId: loginUserId,
                followerId: user.id, //checking the normal user is following user.
              },
            });

          if (validateUserIsFollowing) {
            followData.isFollow = true;
            followData.isSameUser = user?.id == loginUserId;
            followData.isStandardUser =
              user?.role ==
              (await this.constantsService.newUserRole.standardUser)
                ? false
                : true;
          }
        }

        return await this.responseService.success(
          'success',
          'Recent board fetched success',
          {
            userId: userId,
            count: count,
            param: userName,
            followData: followData,
            profileIcon: user?.profileIcon,
            initialProfileIcon: user?.initialProfileIcon,
            data: formattedBoards,
          },
          res,
        );
      }

      count = await this.prismaService.board.count({
        where: customWhereClauseByBoardId,
      });

      //prepare data is remain

      //---------IF NOT BOARD ID AND USER ID MEANS ITS IS UNLOGGED USER SO SHOW THE ALL THE DATA-------------
      //if not board id means all record we have to send
      if (!boardId && !userName && !loginUserId) {
        count = await this.prismaService.board.count({
          where: customWhereClauseByBoardId,
        });
        let allBoard = await this.prismaService.board.findMany({
          // where:customWhereClauseByBoardId,
          where: {
            isDeleted: false,
            BoardImages: {
              every: {
                boardStatus: await this.constantsService.boardStatus.published,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: +pageSize,
          skip,
          select: {
            id: true,
            boardImageScr: true,
            user: {
              select: {
                id: true,
                profileIcon: true,
                userName: true,
                initialProfileIcon: true,
              },
            },
            BoardImages: {
              select: {
                id: true,
                imageUrl: true,
                description: true,
                title: true,
                createdAt: true,
                _count: {
                  select: {
                    BoardImagesCommentLikes: true,
                    boardImagesComments: true,
                  },
                },
                tappable: true,
                Reaction: true,
              },
            },
          },
        });

        const formattedBoards = allBoard.map((board) => {
          return {
            id: board.id,
            boardImageScr: board.boardImageScr,
            user: {
              id: board.user.id,
              profileIcon: board.user?.profileIcon
                ? board.user?.profileIcon
                : board?.user?.initialProfileIcon,
              userName: board.user.userName,
            },
            BoardImages: board.BoardImages.map((image) => ({
              id: image.id,
              imageUrl: image.imageUrl,
              description: image.description,
              title: image.title,
              createdAt: image.createdAt,
              commentLikesCount:
                image._count.BoardImagesCommentLikes?.toString(),
              commentsCount: image._count.boardImagesComments?.toString(),
              tappable: image?.tappable?.map((tap) => ({
                ContentImagesLinks: tap.ContentImagesLinks,
                actionName: tap.actionName,
                boardId: tap.boardId,
                boardImageId: tap.boardImageId,
                createdAt: tap.createdAt,
                description: tap.description,
                height: tap.height?.toString(),
                width: tap.width?.toString(),
                inventoryCount: tap.inventoryCount?.toString(),
                price: tap.price?.toString(),
                top: tap.top?.toString(),
                id: tap.id,
                isReplace: tap.isReplace,
                isTappable: tap.isTappable,
                isSaleItem: tap.isSaleItem,
                switchId: tap.switchId,
                userId: tap.userId,
              })),
              reaction: image.Reaction?.map((res) => ({
                res: res.id,
                backgroundCapture: res.backgroundCapture,
                boardImageId: res.boardImageId,
                contentText: res.contentText,
                contentType: res.contentType,
                createdAt: res.createdAt,
                emoji: res.emoji,
                height: res.height?.toString(),
                left: res.left?.toString(),
                top: res.top?.toString(),
                width: res.width?.toString(),
                ...res,
              })),
            })),
          };
        });

        return await this.responseService.success(
          'success',
          'Recent board fetched success',
          {
            count: count?.toString(),
            param: 'feed',
            followData: followData,
            profileIcon: null, //bcz no logged user so there show the any dummy icon
            initialProfileIcon: null,
            data: formattedBoards,
          },
          res,
        );
      } else {
        //share feature also include here---------------------------------------------
        //if page size is one that time we have to find out
        if (+page == 1) {
          if (boardId) {
            //  cases: board id is passed so it means the user page first find the only -1 page record and that
            // array push the first potion one record and other show the unique records

            let correctPage = +pageSize;

            if (+page == 1) {
              if (+pageSize > 1) correctPage = correctPage - 1;
              if (+pageSize == 1) {
                correctPage = 0;
              }
            }

            let singleBoard = await this.prismaService.board.findFirst({
              // where:customWhereClauseByBoardId,
              where: {
                id: boardId,
                // isDeleted: false,
              },
              select: {
                isDeleted: true,
                id: true,
                boardImageScr: true,
                user: {
                  select: {
                    id: true,
                    profileIcon: true,
                    userName: true,
                    initialProfileIcon: true,
                  },
                },
                BoardImages: {
                  select: {
                    id: true,
                    imageUrl: true,
                    description: true,
                    title: true,
                    createdAt: true,
                    _count: {
                      select: {
                        BoardImagesCommentLikes: true,
                        boardImagesComments: true,
                      },
                    },
                    tappable: true,
                    Reaction: true,
                  },
                },
              },
            });

            if (!singleBoard) {
              return await this.responseService.NOT_FOUND(
                'Invalid boardId! pass the correct id',
                {},
                res,
              );
            }
            if (singleBoard.isDeleted) {
              return await this.responseService.NOT_FOUND(
                'Board is no logger available!, that board is deleted',
                {},
                res,
              );
            }

            // BoardImages: {
            //   every: {
            //     boardStatus: await this.constantsService.boardStatus.published,
            //   },
            // },

            let allBoard = [];
            let customWhereClauseByBoardId: Prisma.BoardWhereInput = {
              isDeleted: false,
              BoardImages: {
                every: {
                  boardStatus:
                    await this.constantsService.boardStatus.published,
                },
              },
            };
            if (boardId) {
              customWhereClauseByBoardId = {
                NOT: {
                  id: boardId,
                },
              };
            }
            let allBoards = await this.prismaService.board.findMany({
              where: customWhereClauseByBoardId,
              orderBy: {
                createdAt: 'desc',
              },
              take: correctPage,
              skip,
              select: {
                id: true,
                boardImageScr: true,
                user: {
                  select: {
                    id: true,
                    profileIcon: true,
                    userName: true,
                    initialProfileIcon: true,
                  },
                },
                BoardImages: {
                  select: {
                    id: true,
                    imageUrl: true,
                    description: true,
                    title: true,
                    createdAt: true,
                    _count: {
                      select: {
                        BoardImagesCommentLikes: true,
                        boardImagesComments: true,
                      },
                    },
                    tappable: true,
                    Reaction: true,
                  },
                },
              },
            });

            allBoard.push(singleBoard, ...allBoards);
            count = await this.prismaService.board.count({
              where: customWhereClauseByBoardId,
            });
            const formattedBoards = allBoard.map((board) => {
              return {
                id: board.id,
                boardImageScr: board.boardImageScr,
                user: {
                  id: board.user.id,
                  profileIcon: board.user?.profileIcon
                    ? board.user?.profileIcon
                    : board?.user?.initialProfileIcon,
                  userName: board.user.userName,
                },
                BoardImages: board.BoardImages.map((image) => ({
                  id: image.id,
                  imageUrl: image.imageUrl,
                  description: image.description,
                  title: image.title,
                  createdAt: image.createdAt,
                  commentLikesCount:
                    image._count.BoardImagesCommentLikes?.toString(),
                  commentsCount: image._count.boardImagesComments?.toString(),
                  tappable: image?.tappable?.map((tap) => ({
                    ContentImagesLinks: tap.ContentImagesLinks,
                    actionName: tap.actionName,
                    boardId: tap.boardId,
                    boardImageId: tap.boardImageId,
                    createdAt: tap.createdAt,
                    description: tap.description,
                    height: tap.height?.toString(),
                    width: tap.width?.toString(),
                    inventoryCount: tap.inventoryCount?.toString(),
                    price: tap.price?.toString(),
                    top: tap.top?.toString(),
                    id: tap.id,
                    isReplace: tap.isReplace,
                    isTappable: tap.isTappable,
                    isSaleItem: tap.isSaleItem,
                    switchId: tap.switchId,
                    userId: tap.userId,
                  })),
                  reaction: image.Reaction?.map((res) => ({
                    res: res.id,
                    backgroundCapture: res.backgroundCapture,
                    boardImageId: res.boardImageId,
                    contentText: res.contentText,
                    contentType: res.contentType,
                    createdAt: res.createdAt,
                    emoji: res.emoji,
                    height: res.height?.toString(),
                    left: res.left?.toString(),
                    top: res.top?.toString(),
                    width: res.width?.toString(),
                    ...res,
                  })),
                })),
              };
            });
            let logUser;
            if (loginUserId) {
              logUser = await this.prismaService.user.findFirst({
                where: {
                  id: loginUserId,
                },
                select: {
                  initialProfileIcon: true,
                  profileIcon: true,
                },
              });
            }

            return await this.responseService.success(
              'success',
              'Recent board fetched success',
              {
                count: count?.toString(),
                param: userName,
                followData: followData,
                profileIcon: logUser?.profileIcon, //bcz no logged user so there show the any dummy icon
                initialProfileIcon: logUser?.initialProfileIcon,
                data: formattedBoards,
              },
              res,
            );
          }
        } else {
          //if not the boardId or if board id then need to do any thing just find the all record pgn wise and send
          customWhereClauseByBoardId = {
            isDeleted: false,
            BoardImages: {
              every: {
                boardStatus: await this.constantsService.boardStatus.published,
              },
            },
          };
          if (boardId) {
            customWhereClauseByBoardId = {
              NOT: {
                id: boardId,
              },
            };
          }
          count = await this.prismaService.board.count({
            where: customWhereClauseByBoardId,
          });

          let allBoard = await this.prismaService.board.findMany({
            where: customWhereClauseByBoardId,
            // where: {
            //   isDeleted: false,
            // },
            orderBy: {
              createdAt: 'desc',
            },
            take: +pageSize,
            skip,
            select: {
              id: true,
              boardImageScr: true,
              user: {
                select: {
                  id: true,
                  profileIcon: true,
                  userName: true,
                  initialProfileIcon: true,
                },
              },
              BoardImages: {
                select: {
                  id: true,
                  imageUrl: true,
                  description: true,
                  title: true,
                  createdAt: true,
                  _count: {
                    select: {
                      BoardImagesCommentLikes: true,
                      boardImagesComments: true,
                    },
                  },
                  tappable: true,
                  Reaction: true,
                },
              },
            },
          });
          const formattedBoards = allBoard.map((board) => {
            return {
              id: board.id,
              boardImageScr: board.boardImageScr,
              user: {
                id: board.user.id,
                profileIcon: board.user?.profileIcon
                  ? board.user?.profileIcon
                  : board?.user?.initialProfileIcon,
                userName: board.user.userName,
              },
              BoardImages: board.BoardImages.map((image) => ({
                id: image.id,
                imageUrl: image.imageUrl,
                description: image.description,
                title: image.title,
                createdAt: image.createdAt,
                commentLikesCount:
                  image._count.BoardImagesCommentLikes?.toString(),
                commentsCount: image._count.boardImagesComments?.toString(),
                tappable: image?.tappable?.map((tap) => ({
                  ContentImagesLinks: tap.ContentImagesLinks,
                  actionName: tap.actionName,
                  boardId: tap.boardId,
                  boardImageId: tap.boardImageId,
                  createdAt: tap.createdAt,
                  description: tap.description,
                  height: tap.height?.toString(),
                  width: tap.width?.toString(),
                  inventoryCount: tap.inventoryCount?.toString(),
                  price: tap.price?.toString(),
                  top: tap.top?.toString(),
                  id: tap.id,
                  isReplace: tap.isReplace,
                  isTappable: tap.isTappable,
                  isSaleItem: tap.isSaleItem,
                  switchId: tap.switchId,
                  userId: tap.userId,
                })),
                reaction: image.Reaction?.map((res) => ({
                  res: res.id,
                  backgroundCapture: res.backgroundCapture,
                  boardImageId: res.boardImageId,
                  contentText: res.contentText,
                  contentType: res.contentType,
                  createdAt: res.createdAt,
                  emoji: res.emoji,
                  height: res.height?.toString(),
                  left: res.left?.toString(),
                  top: res.top?.toString(),
                  width: res.width?.toString(),
                  ...res,
                })),
              })),
            };
          });
          let logUser;
          if (loginUserId) {
            logUser = await this.prismaService.user.findFirst({
              where: {
                id: loginUserId,
              },
              select: {
                initialProfileIcon: true,
                profileIcon: true,
              },
            });
          }
          return await this.responseService.success(
            'success',
            'Recent board fetched success',
            {
              count: count,
              param: userName,
              followData: followData,
              profileIcon: logUser?.profileIcon, //bcz no logged user so there show the any dummy icon
              initialProfileIcon: logUser?.initialProfileIcon,
              data: formattedBoards,
            },
            res,
          );
        }
      }
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }
}
