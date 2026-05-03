import { Injectable } from '@nestjs/common';
import { ConstantsService } from 'src/constants/constants.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';
import { AddSaleCommentDto } from './Dto/addSaleCommentDto';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { PaginationDto } from 'src/board/Dto/PaginationDto';
import { IsUUID } from 'class-validator';
import { AddBoardCommentDto } from './Dto/AddBoardCommentDto';

@Injectable()
export class CommentService {
  constructor(
    private readonly responseService: ResponseService,
    private readonly prismaService: PrismaService,
    private readonly constantsService: ConstantsService,
  ) {}

  /**
   *
   * @param res
   * @param data
   * @param aUser
   * @returns
   * in this api we can add only sale feature comment.
   */
  async addSaleComment(res, data: AddSaleCommentDto, aUser: RequestUserDto) {
    try {
      if (!data.comment || data.comment?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Comment not found',
          {},
          res,
        );
      }

      const validateSale = await this.prismaService.sale.findFirst({
        where: {
          id: data.adsSaleId,
        },
      });

      if (!validateSale) {
        return await this.responseService.NOT_FOUND(
          'invalid adsSaleId',
          {},
          res,
        );
      }

      if (data.parentId) {
        const isValidParentComment =
          await this.prismaService.saleComments.findFirst({
            where: {
              id: data.parentId,
            },
          });

        if (!isValidParentComment) {
          return await this.responseService.NOT_FOUND(
            'Comment id not found',
            {},
            res,
          );
        }

        await this.prismaService.saleComments.create({
          data: {
            content: data.comment,
            userId: aUser.id,
            saleId: data.adsSaleId,
            parentSaleAdId: data.parentId,
          },
        });
        return await this.responseService.success(
          'success',
          'Comment added success',
          {},
          res,
        );
      }

      await this.prismaService.saleComments.create({
        data: {
          content: data.comment,
          userId: aUser.id,
          saleId: data.adsSaleId,
        },
      });
      return await this.responseService.success(
        'success',
        'Comment added success',
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

  /**
   *
   * @param res
   * @param aUser
   * @param paginationDto
   * @param parentCommentId
   * @returns comments
   * it display the pagination wise comments here pass the parentCommentId then it display the all nested pagination wise comments.
   */
  async viewSaleComments(
    res,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
    parentCommentId,
    saleAdsId,
  ) {
    try {
      if (parentCommentId) {
        if (!parentCommentId || !IsUUID(parentCommentId)) {
          return await this.responseService.NOT_FOUND(
            'parentCommentId must be UUID',
            {},
            res,
          );
        }
      }

      if (!saleAdsId || !IsUUID(saleAdsId)) {
        return await this.responseService.NOT_FOUND(
          'saleAdsId must be UUID',
          {},
          res,
        );
      }
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

      const validateParentCommentId =
        await this.prismaService.saleComments.findFirst({
          where: { parentSaleAdId: parentCommentId },
        });
      if (!validateParentCommentId) {
        return await this.responseService.NOT_FOUND(
          'No comments found',
          {},
          res,
        );
      }

      const skip = (Number(page) - 1) * Number(pageSize);

      const countComments=await this.prismaService.saleComments.count({
        where: {
          parentSaleAdId: parentCommentId || null,
          saleId: saleAdsId,
        }
      })
    
      // Fetch comments along with total likes and total replies
      const comments = await this.prismaService.saleComments.findMany({
        where: {
          parentSaleAdId: parentCommentId || null,
          saleId: saleAdsId,
        },
        take: +pageSize,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          content: true,
          userId: true,
          _count: {
            select: {
              likes: true,
              replies: true,
            },
          },
          user: {
            select: {
              userName: true,
              profileIcon: true,
            },
          },
        },
      });

      const sanitizedComments = comments.map((comment) => ({
        id: comment.id,
        comment: comment.content,
        userName: comment.user?.userName ? comment.user?.userName : null,
        userProfileIcon: comment.user?.profileIcon
          ? comment.user?.profileIcon
          : null,
        totalLikes: comment._count.likes,
        totalReplies: comment._count.replies,

        loginUserCanDelete: comment.userId == aUser.id, //it help full for to that user created comment can delete.
      }));

      return await this.responseService.success(
        'success',
        'commentFetched success',
        {TotalComments:countComments,sanitizedComments},
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

  // this service function we are using in deleteSaleAdComment that function.
  async deleteSaleAdsCommentAndReplies(commentId: string) {
    // Fetch all replies of the comment
    const replies = await this.prismaService.saleComments.findMany({
      where: { parentSaleAdId: commentId },
      select: { id: true },
    });

    // Recursively delete each reply
    for (const reply of replies) {
      await this.deleteSaleAdsCommentAndReplies(reply.id);
    }

    // Delete all likes associated with the comment
    await this.prismaService.saleLikes.deleteMany({
      where: { commentId: commentId },
    });

    // Delete the comment itself
    await this.prismaService.saleComments.delete({
      where: { id: commentId },
    });
  }

  async deleteSaleAdComment(res, commentId, aUser: RequestUserDto) {
    try {
      if (commentId) {
        if (!commentId || !IsUUID(commentId)) {
          return await this.responseService.NOT_FOUND(
            'CommentId must be UUID',
            {},
            res,
          );
        }
      }
      // Fetch the comment to ensure it exists and the user has the right to delete it
      const comment = await this.prismaService.saleComments.findUnique({
        where: { id: commentId },
        select: { userId: true },
      });

      if (!comment) {
        return await this.responseService.NOT_FOUND(
          'Comment not found',
          {},
          res,
        );
      }

      if (comment.userId != aUser.id) {
        return await this.responseService.NOT_FOUND(
          'You do not have permission to delete this comment',
          {},
          res,
        );
      }

      await this.prismaService.$transaction(async (prisma) => {
        await this.deleteSaleAdsCommentAndReplies(commentId);
      });

      return await this.responseService.success(
        'success',
        'Comment and its replies deleted successfully',
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

  async editSaleAdComment(res, commentId, aUser, comments: string) {
    try {
      if (!commentId || !IsUUID(commentId)) {
        return await this.responseService.NOT_FOUND(
          'CommentId must be UUID',
          {},
          res,
        );
      }

      if (!comments || comments?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Comment not found',
          {},
          res,
        );
      }
      const comment = await this.prismaService.saleComments.findUnique({
        where: { id: commentId },
        select: { userId: true },
      });

      if (!comment) {
        return await this.responseService.NOT_FOUND(
          'Comment not found',
          {},
          res,
        );
      }

      if (comment.userId != aUser.id) {
        return await this.responseService.NOT_FOUND(
          'You do not have permission to Update this comment',
          {},
          res,
        );
      }

      await this.prismaService.saleComments.update({
        where: {
          id: commentId,
        },
        data: {
          content: comments,
        },
      });

      return await this.responseService.success(
        'success',
        'Comment edited successfully',
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
  /**
 * 
 * @param res 
 * @param data 
 * @param aUser 
 * @returns 
   steps:
   Notes:one user can create multiple comments
   1.validate the boardId and imageId, and if parentComment then validate also.
   2.
 */
  async addBoardComment(res, data: AddBoardCommentDto, aUser: RequestUserDto) {
    try {
      if (!data.comment || data.comment?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Pass the comment massage',
          {},
          res,
        );
      }
      const validateBoard = await this.prismaService.board.findFirst({
        where: {
          id: data.boardId,
          BoardImages: {
            some: {
              id: data.boardImageId,
            },
          },
        },
      });
      if (!validateBoard) {
        return await this.responseService.NOT_FOUND(
          'Pass the correct boardId and ImageId',
          {},
          res,
        );
      }
      if (data.parentCommentId) {
        const isValidParentComment =
          await this.prismaService.boardComments.findFirst({
            where: {
              id: data.parentCommentId,
            },
          });

        if (!isValidParentComment) {
          return await this.responseService.NOT_FOUND(
            'parentCommentId is not valid',
            {},
            res,
          );
        }

        await this.prismaService.boardComments.create({
          data: {
            userId: aUser.id,
            parentBoardCommentId: data.parentCommentId,
            boardImageId: data.boardImageId,
            boardId: validateBoard.id,
            content: data.comment,
          },
        });

        return await this.responseService.success(
          'success',
          'Comment added success',
          {},
          res,
        );
      }

      await this.prismaService.boardComments.create({
        data: {
          userId: aUser.id,
          // parentBoardCommentId:data.parentCommentId,
          boardImageId: data.boardImageId,
          boardId: validateBoard.id,
          content: data.comment,
        },
      });

      return await this.responseService.success(
        'success',
        'Board comment added success',
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

  async viewBoardComments(
    res,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
    parentCommentId,
    boardImageId,
  ) {
    try {
      if (parentCommentId) {
        if (!parentCommentId || !IsUUID(parentCommentId)) {
          return await this.responseService.NOT_FOUND(
            'parentCommentId must be UUID',
            {},
            res,
          );
        }
      }

      if (!boardImageId || !IsUUID(boardImageId)) {
        return await this.responseService.NOT_FOUND(
          'boardImageId must be UUID',
          {},
          res,
        );
      }
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

      const validateParentCommentId =
        await this.prismaService.boardComments.findFirst({
          where: {
            parentBoardCommentId: parentCommentId,
            boardImageId: boardImageId,
          },
        });
      if (!validateParentCommentId) {
        return await this.responseService.NOT_FOUND(
          'Invalid comment id, pass the Correct comment Id',
          {},
          res,
        );
      }

      const skip = (Number(page) - 1) * Number(pageSize);

      // Fetch comments along with total likes and total replies
      const comments = await this.prismaService.boardComments.findMany({
        where: {
          parentBoardCommentId: parentCommentId || null,
          boardImageId: boardImageId,
        },
        take: +pageSize,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          content: true,
          userId: true,
          boardId: true,
          boardImageId: true,
          _count: {
            select: {
              likes: true,
              replies: true,
            },
          },
          user: {
            select: {
              userName: true,
              profileIcon: true,
            },
          },
        },
      });

      const sanitizedComments = comments.map((comment) => ({
        commentId: comment.id,
        comment: comment.content,
        userName: comment.user?.userName ? comment.user?.userName : null,
        userProfileIcon: comment.user?.profileIcon
          ? comment.user?.profileIcon
          : null,
        boardId: comment.boardId,
        boardImageId: comment.boardImageId,
        totalLikes: comment._count.likes,
        totalReplies: comment._count.replies,

        loginUserCanDelete: comment.userId == aUser.id, //it help full for to that user created comment can delete.
      }));

      return await this.responseService.success(
        'success',
        'commentFetched success',
        sanitizedComments,
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

  async editBoardComment(res, commentId, aUser, comments: string) {
    try {
      if (!commentId || !IsUUID(commentId)) {
        return await this.responseService.NOT_FOUND(
          'CommentId must be UUID',
          {},
          res,
        );
      }

      if (!comments || comments?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Comment massage  not found',
          {},
          res,
        );
      }
      const comment = await this.prismaService.boardComments.findUnique({
        where: { id: commentId },
        select: { userId: true },
      });

      if (!comment) {
        return await this.responseService.NOT_FOUND(
          'Comment not found',
          {},
          res,
        );
      }

      if (comment.userId != aUser.id) {
        return await this.responseService.NOT_FOUND(
          'You do not have permission to Update this comment',
          {},
          res,
        );
      }

      await this.prismaService.boardComments.update({
        where: {
          id: commentId,
        },
        data: {
          content: comments,
        },
      });

      return await this.responseService.success(
        'success',
        'Comment edited successfully',
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



    // this service function we are using in deleteSaleAdComment that function.
    async deleteBoardCommentAndReplies(commentId: string) {
      // Fetch all replies of the comment
      const replies = await this.prismaService.boardComments.findMany({
        where: { parentBoardCommentId: commentId },
        select: { id: true },
      });
  
      // Recursively delete each reply
      for (const reply of replies) {
        await this.deleteBoardCommentAndReplies(reply.id);
      }
  
      // Delete all likes associated with the comment
      await this.prismaService.boardImagesCommentLikes.deleteMany({
        where: { commentId: commentId },
      });
  
      // Delete the comment itself
      await this.prismaService.boardComments.delete({
        where: { id: commentId },
      });
    }
  
  async deleteBoardComments(res, commentId, aUser: RequestUserDto) {
    try {
      if (commentId) {
        if (!commentId || !IsUUID(commentId)) {
          return await this.responseService.NOT_FOUND(
            'CommentId must be UUID',
            {},
            res,
          );
        }
      }
      // Fetch the comment to ensure it exists and the user has the right to delete it
      const comment = await this.prismaService.boardComments.findUnique({
        where: { id: commentId },
        select: { userId: true },
      });

      if (!comment) {
        return await this.responseService.NOT_FOUND(
          'Comment not found',
          {},
          res,
        );
      }

      if (comment.userId != aUser.id) {
        return await this.responseService.NOT_FOUND(
          'You do not have permission to delete this comment',
          {},
          res,
        );
      }

      await this.prismaService.$transaction(async (prisma) => {
        await this.deleteBoardCommentAndReplies(commentId);
      });

      return await this.responseService.success(
        'success',
        'Comment and its replies deleted successfully',
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
}
