import { Injectable } from '@nestjs/common';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { ConstantsService } from 'src/constants/constants.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';
import { CreateAdsDto } from './Dto/createAdsDto';
import { isUUID } from 'class-validator';
import { EditInfoAds } from './Dto/editInfoAds';
import { PaginationDto } from 'src/board/Dto/PaginationDto';

@Injectable()
export class SaleService {
  constructor(
    private readonly responseService: ResponseService,
    private readonly prismaService: PrismaService,
    private readonly constantsService: ConstantsService,
  ) {}

  async createAds(res, aUser: RequestUserDto, data: CreateAdsDto) {
    try {
      if (!data.title || data.title?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Title must be require',
          {},
          res,
        );
      }

      if (!data.description || data.description?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'description must be require',
          {},
          res,
        );
      }

      if (!data.originalPrice || data.originalPrice?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'price must be require',
          {},
          res,
        );
      }

      // if (!data.assetType || data.assetType?.trim()?.length == 0) {
      //   return await this.responseService.NOT_FOUND(
      //     'Please select the assetType [Physical,Digital]',
      //     {},
      //     res,
      //   );
      // }

      // const assetType = data.assetType.toLowerCase();
      // switch (assetType) {
      //   case 'physical':
      //   case 'digital':
      //     break;
      //   default:
      //     return await this.responseService.NOT_FOUND(
      //       'Please select the assetType [physical,digital]',
      //       {},
      //       res,
      //     );
      // }

      const newAds = await this.prismaService.sale.create({
        data: {
          // assetType: assetType,
          description: data.description,
          title: data.title,
          originalPrice: data.originalPrice,
          discountPrice: data?.discountPrice ? data?.discountPrice : null,
          userId: aUser.id,
        },
      });

      const imagesData = data.images.map((image: string) => ({
        saleId: newAds.id,
        imageUrl: image,
      }));

      await this.prismaService.saleImages.createMany({
        data: imagesData,
      });

      return await this.responseService.success(
        'success',
        'Ads created success',
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

  async viewSingleAdsInfo(res, aUser: RequestUserDto, adsId) {
    try {
      if (!adsId || !isUUID(adsId)) {
        return await this.responseService.NOT_FOUND(
          'adsId is must be UUID',
          {},
          res,
        );
      }

      const validateAds = await this.prismaService.sale.findFirst({
        where: {
          id: adsId,
          userId: aUser.id,
        },
        select: {
          id: true,
          title: true,
          description: true,
          originalPrice: true,
          discountPrice: true,
          saleImages: {
            select: {
              imageUrl: true,
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

      if (!validateAds) {
        return await this.responseService.NOT_FOUND(
          'adsId id is invalid',
          {},
          res,
        );
      }

      return await this.responseService.success(
        'success',
        'Ads fetched success',
        validateAds,
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
  async deleteCommentAndReplies(commentId: string) {
    // Fetch all replies of the comment
    const replies = await this.prismaService.saleComments.findMany({
      where: { parentSaleAdId: commentId },
      select: { id: true },
    });

    // Recursively delete each reply
    for (const reply of replies) {
      await this.deleteCommentAndReplies(reply.id);
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

  /**
   *
   * @param res
   * @param aUser
   * @param adsId
   * @returns
   *
   * first validate the adId
   * delete the first like and delete the all comments.
   * 
   * algo:
     -validate the first add 
     -find the all like and delete
     - find the all parent comment and delete
     -find the all images and delete.
     - **
     -delete the ad last

   */
  async deleteAds(res, aUser: RequestUserDto, adsId) {
    try {
      if (!adsId || !isUUID(adsId)) {
        return await this.responseService.NOT_FOUND(
          'adsId must be UUID',
          {},
          res,
        );
      }

      const validateAds = await this.prismaService.sale.findFirst({
        where: {
          id: adsId,
          userId: aUser.id,
        },
      });

      if (!validateAds) {
        return await this.responseService.NOT_FOUND(
          'adsId is invalid',
          {},
          res,
        );
      }

      // Begin transaction
      return await this.prismaService.$transaction(async (prisma) => {
        // Step one: first delete the likes
        await prisma.saleLikes.deleteMany({
          where: {
            postId: adsId,
          },
        });

        // Find all the parent comment ids, then delete all the sub-comments
        const parentComments = await prisma.saleComments.findMany({
          where: {
            saleId: adsId,
            parentSaleAdId: null,
          },
          select: {
            id: true,
          },
        });

        for (let { id } of parentComments) {
          await this.deleteCommentAndReplies(id);
        }

        // @todo when cart feature is done, then delete the cart data and also delete the bookmark.

        // Delete sale images
        await prisma.saleImages.deleteMany({
          where: {
            saleId: adsId,
          },
        });

        // Delete the sale
        await prisma.sale.delete({
          where: {
            id: adsId,
          },
        });

        return await this.responseService.success(
          'success',
          'Ads deleted successfully',
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

  async getEditInfoAds(res, aUser, adsId) {
    try {
      if (!adsId || !isUUID(adsId)) {
        return await this.responseService.NOT_FOUND(
          'adsId is must be UUID',
          {},
          res,
        );
      }

      const validateAds = await this.prismaService.sale.findFirst({
        where: {
          id: adsId,
          userId: aUser.id,
        },
        select: {
          id: true,
          title: true,
          description: true,
          originalPrice: true,
          discountPrice: true,
          saleImages: {
            select: {
              imageUrl: true,
            },
          },
        },
      });

      if (!validateAds) {
        return await this.responseService.NOT_FOUND(
          'adsId id is invalid',
          {},
          res,
        );
      }

      return await this.responseService.success(
        'success',
        'Edit info fetched success',
        validateAds,
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

  async editInfoAds(res, aUser: RequestUserDto, data: EditInfoAds) {
    try {
      if (!data.adsId || !isUUID(data.adsId)) {
        return await this.responseService.NOT_FOUND(
          'adsId is must be UUID',
          {},
          res,
        );
      }

      const validateAds = await this.prismaService.sale.findFirst({
        where: {
          id: data.adsId,
          userId: aUser.id,
        },
      });

      if (!validateAds) {
        return await this.responseService.NOT_FOUND(
          'adsId id is invalid',
          {},
          res,
        );
      }

      const updatedData: any = {};

      if (data.title && data.title.trim().length > 0) {
        updatedData.title = data.title;
      }

      if (data.description && data.description.trim().length > 0) {
        updatedData.description = data.description;
      }

      if (data.originalPrice && data.originalPrice.trim().length > 0) {
        updatedData.originalPrice = data.originalPrice;
      }

      if (data.discountPrice && data.discountPrice.trim().length > 0) {
        updatedData.discountPrice = data.discountPrice;
      }

      // if (data.assetType && data.assetType.trim().length > 0) {
      //   const assetType = data.assetType.toLowerCase();
      //   if (assetType === 'physical' || assetType === 'digital') {
      //     updatedData.assetType = assetType;
      //   } else {
      //     return await this.responseService.NOT_FOUND(
      //       'Please select the assetType [physical,digital]',
      //       {},
      //       res,
      //     );
      //   }
      // }

      const updatedAd = await this.prismaService.sale.update({
        where: { id: data.adsId },
        data: updatedData,
      });

      if (data.images && data.images.length > 0) {
        await this.prismaService.saleImages.deleteMany({
          where: { saleId: data.adsId },
        });

        const imagesData = data.images.map((image: string) => ({
          saleId: data.adsId,
          imageUrl: image,
        }));

        await this.prismaService.saleImages.createMany({
          data: imagesData,
        });
      }

      return await this.responseService.success(
        'success',
        'Ad updated successfully',
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

  async fetchAllSaleAds(
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

      const saleAds = await this.prismaService.sale.findMany({
        where: {
          userId: aUser.id,
        },
        take: +pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          description: true,
          // assetType: true,
          discountPrice: true,
          originalPrice: true,
          saleImages: {
            select: {
              id: true,
              imageUrl: true,
            },
          },
          createdAt: true,
        },
      });

      // Map the results to the desired format
      const sanitizedSaleAds = saleAds.map((saleAd) => ({
        id: saleAd.id,
        adTitle: saleAd.title,
        adDescription: saleAd.description,
        // assetAvailable: saleAd.assetType,
        discountPrice: saleAd.discountPrice,
        originalPrice: saleAd.originalPrice,
        assetImages: saleAd.saleImages.map((image) => ({
          id: image.id,
          imageUrl: image.imageUrl,
        })),
        createdAt: saleAd.createdAt,
      }));

    
        return await this.responseService.success(
          'success',
          'fetched successfully sale ads',
          sanitizedSaleAds,
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
