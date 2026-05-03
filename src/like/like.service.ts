import { Injectable } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { ConstantsService } from 'src/constants/constants.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';

@Injectable()
export class LikeService {
  constructor(
    private readonly responseService: ResponseService,
    private readonly prismaService: PrismaService,
    private readonly constantsService: ConstantsService,
  ) {}

  async likeSaleAd(res, commentId, adsId, aUser: RequestUserDto) {
    try {
      if (!commentId || !IsUUID(commentId)) {
        return await this.responseService.NOT_FOUND(
          'commentId must be UUID',
          {},
          res,
        );
      }

      if (!adsId || !IsUUID(adsId)) {
        return await this.responseService.NOT_FOUND(
          'adsId must be UUID(sale ads id)',
          {},
          res,
        );
      }

      //post==sale ads
      const validateId = await this.prismaService.saleComments.findFirst({
        where: { id: commentId, saleId: adsId },
      });

      if (!validateId) {
        return await this.responseService.NOT_FOUND(
          'commentId is invalid',
          {},
          res,
        );
      }

      const isAlreadyLike = await this.prismaService.saleLikes.findFirst({
        where: {
          commentId: commentId,
          userId: aUser.id,
        },
      });
      //if find then delete the like either like
      if (isAlreadyLike) {
        await this.prismaService.saleLikes.delete({
          where: {
            id: isAlreadyLike.id,
          },
        });
        return await this.responseService.success(
          'success',
          'Unlike success',
          {},
          res,
        );
      }

      await this.prismaService.saleLikes.create({
        data: {
          commentId: commentId,
          userId: aUser.id,
          postId: adsId,
        },
      });

      return await this.responseService.success(
        'success',
        'Like added success',
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
  async likeBoardComment(res, commentId, boardImageId, aUser: RequestUserDto) {
    try {
      if (!commentId || !IsUUID(commentId)) {
        return await this.responseService.NOT_FOUND(
          'commentId must be UUID',
          {},
          res,
        );
      }

      if (!boardImageId || !IsUUID(boardImageId)) {
        return await this.responseService.NOT_FOUND(
          'boardImageId must be UUID (board imageId)',
          {},
          res,
        );
      }

      const validateId = await this.prismaService.boardComments.findFirst({
        where: { id: commentId, boardImageId: boardImageId },
      });

      if (!validateId) {
        return await this.responseService.NOT_FOUND(
          'commentId is invalid',
          {},
          res,
        );
      }

      const isAlreadyLike =
        await this.prismaService.boardImagesCommentLikes.findFirst({
          where: {
            commentId: commentId,
            userId: aUser.id,
          },
          select: {
            id: true,
            Boards: {
              select: {
                board: {
                  select: {
                    id: true,
                    postInteractions: true,
                  },
                },
              },
            },
          },
        });
      //if find then delete the like either like
      if (isAlreadyLike) {
        await this.prismaService.boardImagesCommentLikes.delete({
          where: {
            id: isAlreadyLike.id,
          },
        });

        if (isAlreadyLike.Boards.board.postInteractions > 0) {
          await this.prismaService.board.update({
            where: {
              id: isAlreadyLike.Boards.board.id,
            },
            data: {
              postInteractions: isAlreadyLike.Boards.board.postInteractions - 1,
            },
          });
        }

        return await this.responseService.success(
          'success',
          'Unlike success',
          {},
          res,
        );
      }

      const likeImage = await this.prismaService.boardImagesCommentLikes.create(
        {
          data: {
            commentId: commentId,
            userId: aUser.id,
            boardImageId: boardImageId,
          },
          select: {
            Boards: {
              select: {
                board: {
                  select: {
                    id: true,
                    postInteractions: true,
                  },
                },
              },
            },
          },
        },
      );

      await this.prismaService.board.update({
        where: {
          id: likeImage.Boards.board.id,
        },
        data: {
          postInteractions: likeImage.Boards.board.postInteractions + 1,
        },
      });

      return await this.responseService.success(
        'success',
        'Like added success',
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
