import { Injectable } from '@nestjs/common';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { ConstantsService } from 'src/constants/constants.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';
import { AddToCartDto } from './Dto/AddToCartDto';
import { IsUUID, isUUID } from 'class-validator';
import { time } from 'console';
import { PaginationDto } from 'src/board/Dto/PaginationDto';

@Injectable()
export class CartService {
  constructor(
    private readonly responseService: ResponseService,
    private readonly prismaService: PrismaService,
    private readonly constantsService: ConstantsService,
  ) {}

  //@Todo here come lock and unlock feature that time edit the board add to cart
  async addToCart(res, aUser: RequestUserDto, data: AddToCartDto) {
    try {
      //validate the first is board or sale ads.

      const isAds = await this.prismaService.sale.findFirst({
        where: {
          id: data.productId, 
        },
      });

      if (!isAds) {
        const isBoard = await this.prismaService.board.findFirst({
          where: {
            id: data.productId,
          },
        });

        if (!isBoard) {
          return await this.responseService.NOT_FOUND(
            'Invalid productId',
            {},
            res,
          );
        }
        //if have board then add the cart model entry

        return await this.responseService.success(
          'success',
          'board add to cart feature in progress',
          {},
          res,
        );
      }

      const isAlreadyAddedCart = await this.prismaService.cart.findFirst({
        where: {
          saleId: data.productId,
          userId: aUser.id,
        },
      });
      if (isAlreadyAddedCart) {
        return await this.responseService.NOT_FOUND(
          'product already added in cart',
          {},
          res,
        );
      }

      await this.prismaService.cart.create({
        data: {
          saleId: data.productId,
          userId: aUser.id,
          isSaleOrBoard: await this.constantsService.isSaleOrBoard.sale,
        },
      });

      return await this.responseService.success("success","product added to cart success",{},res);
    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async deleteCart(res, aUser: RequestUserDto, cartId) {
    try {
      if (!cartId || !isUUID(cartId)) {
        return await this.responseService.NOT_FOUND(
          'Cart id must be UUID',
          {},
          res,
        );
      }

      const validateCartId = await this.prismaService.cart.findFirst({
        where: {
          id: cartId,
          userId: aUser.id,
        },
      });

      if (!validateCartId) {
        return await this.responseService.NOT_FOUND('Invalid cartId', {}, res);
      }

      await this.prismaService.cart.delete({
        where: {
          id: cartId,
        },
      });

      return await this.responseService.success(
        'success',
        'Added cart record deleted success',
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

  async viewBoard(res, aUser: RequestUserDto, cartId) {
    try {
      if (!cartId || !IsUUID(cartId)) {
        return await this.responseService.NOT_FOUND(
          'cartId must be uuid',
          {},
          res,
        );
      }
      //validate is exits or not

      const cart = await this.prismaService.cart.findFirst({
        where: {
          id: cartId,
          userId: aUser.id,
        },
        select: {
          boardId: true,
          saleId: true,
          isSaleOrBoard: true,
        },
      });

      if (!cart) {
        return await this.responseService.NOT_FOUND(
          'Cart record not found, check the cartId',
          {},
          res,
        );
      }

      if (
        cart.isSaleOrBoard == (await this.constantsService.isSaleOrBoard.sale)
      ) {
        const adsDetails = await this.prismaService.sale.findFirst({
          where: {
            id: cart.saleId,
          },
          select: {
            id: true,
            _count: {
              select: {
                Comments: true,
              },
            },
            title: true,
            description: true,
            originalPrice: true,
            discountPrice: true,
            user: {
              select: {
                userName: true,
              },
            },
            createdAt: true,
            // assetType: true,
            saleImages: {
              select: {
                id: true,
                imageUrl: true,
              },
            },
          },
        });

        const data = {
          saleId: adsDetails.id,
          adsHeadersTitle: adsDetails.description,
          originalPrice: adsDetails.originalPrice,
          discountPrice: adsDetails?.discountPrice
            ? adsDetails?.discountPrice
            : null,
          userName: adsDetails.user?.userName
            ? adsDetails.user?.userName
            : null,
          // isPhysicalOrDigital: adsDetails.assetType,
          totalComments: adsDetails._count,
          saleImages: adsDetails.saleImages.map((images) => ({
            id: images.id,
            imageUrl: images.imageUrl,
          })),
          createdAt: adsDetails.createdAt,
        };

        return await this.responseService.success(
          'success',
          'Record fetched success',
          { isSaleOrBoard: 'sale', data },
          res,
        );
      }

      if (
        cart.isSaleOrBoard == (await this.constantsService.isSaleOrBoard.board)
      ) {
        const board = await this.prismaService.board.findFirst({
          where: {
            id: cart.boardId,
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
                imageUrl: true,
                title: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                boardStatus: true,
              },
            },
          },
        });
        const data = {
          boardId: board.id,
          userName: board.user?.userName ? board.user?.userName : null,
          boardImageDetails: board.BoardImages.map((image) => ({
            imageId: image.id,
            imageUrl: image.imageUrl,
            boardTitle: image.title,
            imageDescription: image.description,
            boardStatus: image.boardStatus,
          })),
        };
        return await this.responseService.success(
          'success',
          'Record fetched success',
          { isSaleOrBoard: 'board', data },
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

  async boardOrSaleCartAddToBookmark(
    res,
    cartId,
    aUser: RequestUserDto,
    folderId,
  ) {
    try {
      if (!cartId || !isUUID(cartId)) {
        return await this.responseService.NOT_FOUND(
          'Cart id must be UUID',
          {},
          res,
        );
      }

      if (!folderId || !isUUID(folderId)) {
        return await this.responseService.NOT_FOUND(
          'Cart id must be UUID',
          {},
          res,
        );
      }

      const folder = await this.prismaService.bookMarkFolder.findFirst({
        where: {
          id: folderId,
          userId: aUser.id,
        },
      });

      if (!folder) {
        return await this.responseService.NOT_FOUND(
          'Invalid folderId',
          {},
          res,
        );
      }

      const validateCartId = await this.prismaService.cart.findFirst({
        where: {
          id: cartId,
          userId: aUser.id,
        },
        select: {
          isSaleOrBoard: true,
          saleId: true,
          boardId: true,
        },
      });

      if (!validateCartId) {
        return await this.responseService.NOT_FOUND('Invalid cartId', {}, res);
      }

      if (
        validateCartId.isSaleOrBoard ==
        (await this.constantsService.isSaleOrBoard.sale)
      ) {
        const bookmark = await this.prismaService.bookMarksBoards.findFirst({
          where: {
            bookMarkFolderId: folderId,
            saleAdId: validateCartId.saleId,
            BookMark: {
              userId: aUser.id,
            },
          },
          select: {
            id: true,
          },
        });

        //that feature we are creating toggle wise
        if (bookmark) {
          // await this.prismaService.bookMarksBoards.delete({
          //   where: {
          //     id: bookmark.id,
          //   },
          // });
          return await this.responseService.success(
            'success',
            'Sale bookmark added success',
            {},
            res,
          );
        }
        await this.prismaService.bookMarksBoards.create({
          data: {
            saleAdId: validateCartId.saleId,
            bookMarkFolderId: folderId,
            bookmarkFeatureType: this.constantsService.bookmarkFeatureType.sale,
          },
        });

        return await this.responseService.success(
          'success',
          'Sale bookmark added success',
          {},
          res,
        );
      }

      ///-------------------------- add the board bookmark or remove it

      const bookmark = await this.prismaService.bookMarksBoards.findFirst({
        where: {
          bookMarkFolderId: folderId,
          boardId: validateCartId.boardId,
          BookMark: {
            userId: aUser.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (bookmark) {
        // await this.prismaService.bookMarksBoards.delete({
        //   where: {
        //     id: bookmark.id,
        //   },
        // });
        return await this.responseService.success(
          'success',
          'Board bookmark added success',
          {},
          res,
        );
      }
      await this.prismaService.bookMarksBoards.create({
        data: {
          boardId: validateCartId.boardId,
          bookMarkFolderId: folderId,
          bookmarkFeatureType: this.constantsService.bookmarkFeatureType.board,
        },
      });
      return await this.responseService.success(
        'success',
        'Board bookmarked  added success',
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

  async fetchCarRecords(
    res,
    paginationDto: PaginationDto,
    aUser: RequestUserDto,
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

      //here validate the cart is sale or board that wise manage the response

      const count = await this.prismaService.cart.count({
        where: { userId: aUser.id },
      });

      const cart = await this.prismaService.cart.findMany({
        where: {
          userId: aUser.id,
        },
        take: +pageSize,
        skip,
        select: {
          id: true,
          isSaleOrBoard: true,
          saleId: true,
          boardId: true,
          user: {
            select: {
              userName: true,
            },
          },
          sale: {
            select: {
              id: true,
              title: true,
              description: true,
              originalPrice: true,
              discountPrice: true,
              saleImages: {
                select: {
                  id: true,
                  imageUrl: true,
                },
              },
            },
          },
          Board: {
            select: {
              id: true,
              BoardImages: {
                select: {
                  id: true,
                  imageUrl: true,
                  title: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      const data = cart.map((cart) => ({
        cartId: cart.id,
        isSaleOrBoard: cart.isSaleOrBoard,
        AdsDetails: cart?.saleId
          ? {
              adsId: cart?.sale?.id ? cart?.sale?.id : null,
              title: cart?.sale?.title ? cart?.sale?.title : null,
              description: cart?.sale?.description
                ? cart?.sale?.description
                : null,
              originalPrice: cart?.sale.originalPrice
                ? cart?.sale.originalPrice
                : null,
              discountPrice: cart?.sale?.description
                ? cart?.sale?.description
                : null,
              saleImages: cart?.sale?.saleImages?.map((img) => ({
                imageId: img?.id ? img.id : null,
                imageUrl: img?.imageUrl ? img?.imageUrl : null,
              })),
            }
          : null,
        boardDetails: cart?.boardId
          ? {
              boardId: cart?.boardId,
              board: cart.Board.BoardImages.map((img) => ({
                title: img?.title ? img?.title : null,
                description: img?.description,
                imageId: img?.id,
                imageUrl: img?.imageUrl,
                //Todo price here add to letter
              })),
            }
          : null,
      }));

      return await this.responseService.success(
        'success',
        'Cart records fetched success',
        {totalCarts:count,data},
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
