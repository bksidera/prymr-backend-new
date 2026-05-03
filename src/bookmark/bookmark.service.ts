import { Injectable } from '@nestjs/common';
import { ConstantsService } from 'src/constants/constants.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';
import { addBookmarkDto } from './Dto/addBookmarkDto';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { PaginationDto } from 'src/board/Dto/PaginationDto';
import { editBookmarkCollectionDto } from './Dto/editBookmarkCollectionDto';
import { isUUID } from 'class-validator';


@Injectable()
export class BookmarkService {
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
   * @description rule
   *  1. when title is exits then it treated as a we are creating new folder so user can create infinite duplicate folder
   *  2. title==folder
   * 3. user are going to specific folder id wise then we can add there duplicate record (no duplicate add the board)
   */
  async addBookMark(res, data: addBookmarkDto, aUser: RequestUserDto) {
    try {
      if (data.boardId && data.saleAdId) {
        return await this.responseService.NOT_FOUND(
          'only one require id, either boardId or saleId',
          {},
          res,
        );
      }

      if (
        !data.bookmarkFeatureType ||
        data.bookmarkFeatureType?.trim().length == 0
      ) {
        return await this.responseService.NOT_FOUND(
          'bookmark feature type must be [sale Or bookmark]',
          {},
          res,
        );
      }

      const bookmarkFeatureName = data.bookmarkFeatureType
        ?.trim()
        .toLowerCase();
      switch (bookmarkFeatureName) {
        case await this.constantsService.bookmarkFeatureType.board:
        case await this.constantsService.bookmarkFeatureType.sale:
          break;
        default:
          return await this.responseService.NOT_FOUND(
            'bookmark feature type must be [sale Or board]',
            {},
            res,
          );
      }

      if (data.bookFolderIds?.length == 0) {
        return await this.responseService.NOT_FOUND(
          'Pass the bookmark folder Ids',
          {},
          res,
        );
      }

      //validate the bookmark folder
      for (const id of data.bookFolderIds) {
        const isBookmarkFolder =
          await this.prismaService.bookMarkFolder.findFirst({
            where: { id: id, userId: aUser.id },
          });

        if (!isBookmarkFolder) {
          return await this.responseService.NOT_FOUND(
            `Bookmark folder id : ${id} is not valid`,
            {},
            res,
          );
        }
      }
      //********************************************* adding sale Bookmark***************/
      if (data.saleAdId) {
        //if saleAdIs exits the feature must be "sale"
        if (
          bookmarkFeatureName !=
          (await this.constantsService.bookmarkFeatureType.sale)
        ) {
          return await this.responseService.NOT_FOUND(
            'Your bookmark feature is sale so bookmark feature type must be sale.',
            {},
            res,
          );
        }

        const findAd = await this.prismaService.sale.findFirst({
          where: {
            id: data.saleAdId,
          },
        });

        if (!findAd) {
          return await this.responseService.NOT_FOUND(
            'saleAd id invalid',
            {},
            res,
          );
        }

        for (const id of data.bookFolderIds) {
          const isBookmarkExits =
            await this.prismaService.bookMarksBoards.findFirst({
              where: {
                bookMarkFolderId: id,
                saleAdId: data.saleAdId, // here we are adding sale ads id
                BookMark: {
                  userId: aUser.id,
                },
              },
            });

          if (!isBookmarkExits) {
            await this.prismaService.bookMarksBoards.create({
              data: {
                boardId: null,
                saleAdId: data.saleAdId,
                bookMarkFolderId: id,
                bookmarkFeatureType:
                  await this.constantsService.bookmarkFeatureType.sale, //Todo need to update
              },
            });
          }
        }

        return await this.responseService.success(
          'success',
          'Added bookmark successfully',
          {},
          res,
        );
      }
      //********************************************* adding board Bookmark***************/
      //not saleAdId then this is board id so bookmarking the
      if (!data.boardId) {
        return await this.responseService.NOT_FOUND(
          'Board Id must require',
          {},
          res,
        );
      }

      if (
        bookmarkFeatureName !== this.constantsService.bookmarkFeatureType.board
      ) {
        return await this.responseService.NOT_FOUND(
          'bookMarkFeatureType must require board',
          {},
          res,
        );
      }

      const board = await this.prismaService.board.findFirst({
        where: {
          id: data.boardId,
        },
      });

      if (!board) {
        return await this.responseService.NOT_FOUND('Board not found', {}, res);
      }
      //new work

      //validate the bookmark
      for (const id of data.bookFolderIds) {
        const isBookmarkFolder =
          await this.prismaService.bookMarkFolder.findFirst({
            where: { id: id, userId: aUser.id },
          });

        if (!isBookmarkFolder) {
          return await this.responseService.NOT_FOUND(
            `Bookmark folder id : ${id} is not valid`,
            {},
            res,
          );
        }

        //validate the the bookmark is exits or not
        // if bookmark is exits then no create new bookmark
        for (const id of data.bookFolderIds) {
          const isBookmarkExits =
            await this.prismaService.bookMarksBoards.findFirst({
              where: {
                bookMarkFolderId: id,
                boardId: data.boardId,
                BookMark: {
                  userId: aUser.id,
                },
              },
            });

          if (!isBookmarkExits) {
            await this.prismaService.bookMarksBoards.create({
              data: {
                boardId: data.boardId,
                saleAdId: null,
                bookMarkFolderId: id,
                bookmarkFeatureType:
                  await this.constantsService.bookmarkFeatureType.board,
              },
            });
          }
        }
      }
      //validate the the bookmark is exits or not
      // if bookmark is exits then no create new bookmark
      return await this.responseService.success(
        'success',
        'Added bookmark successfully',
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

  async fetchRecentBookMarks(res, aUser: RequestUserDto) {
    try {
      const recentBookmark = await this.prismaService.bookMarksBoards.findMany({
        where: {
          BookMark: {
            userId: aUser.id,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
        select: {
          BookMark: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      const sanitizedRecentBookmark = [];
      const uniqueIds = new Set();

      for (const item of recentBookmark) {
        const { id, title } = item.BookMark;
        if (!uniqueIds.has(title)) {
          uniqueIds.add(title);
          sanitizedRecentBookmark.push({ id, title });
        }
      }
      return await this.responseService.success(
        'success',
        'Recent bookmarks',
        sanitizedRecentBookmark,
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

  async fetchBookmarkFeed(
    res,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
    userId,
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
      let aUserId=aUser.id;
      if (userId) {
          if(!isUUID(userId)){
            return await this.responseService.NOT_FOUND("userId must be uuid",{},res);
          }

          let validateUser=await this.prismaService.user.findFirst({
            where:{
              id:userId
            }
          })
          if(!validateUser){
            return await this.responseService.NOT_FOUND("invalid userId",{},res);
          }
          aUserId=userId;
      }
      const skip = (Number(page) - 1) * Number(pageSize);
      const count = await this.prismaService.bookMarkFolder.count({
        where: { userId: aUserId },
      });

      const bookMark = await this.prismaService.bookMarkFolder.findMany({
        where: {
          userId: aUserId,
        },
        take: Number(pageSize),
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          BookMarksBoards: {
            select: {
              id: true,
              boardId: true,
              saleAdId: true,
              saleAds: {
                select: {
                  saleImages: {
                    select: {
                      id: true,
                      imageUrl: true,
                    },
                  },
                },
              },
              bookmarkFeatureType: true,
              board: {
                select: {
                  BoardImages: {
                    select: {
                      id: true,
                      imageUrl: true,
                    },
                    // take: 1,
                  },
                },
              },
            },
            take: 8,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
      //to added sale and board bookmark in single model
      const sanitizedBookmarkFeed = bookMark.map((bookMarkItem) => ({
        id: bookMarkItem.id,
        title: bookMarkItem.title,
        boards: bookMarkItem.BookMarksBoards.map((board) => ({
          id: board.id,
          saleId: board.saleAdId,
          bookmarkFeatureType: board.bookmarkFeatureType, //to validate the bookmark is which feature is sale feature or board feature.
          boardId: board.boardId,
          boardImages: board.board?.BoardImages, // Take the first image URL or null if none exist
          saleAdsImages: board.saleAds,
        })),
        boardCount: bookMarkItem.BookMarksBoards.length, // Count the number of boards
      }));

      return await this.responseService.success(
        'success',
        'Bookmarks',
        { totalBookmarks: count, sanitizedBookmarkFeed },
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

  async fetchAllBookmark(res, aUser: RequestUserDto, paginationDto) {
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

      const allBookMark = await this.prismaService.bookMarkFolder.findMany({
        where: {
          userId: aUser.id,
        },
        take: Number(pageSize),
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,

          BookMarksBoards: {
            select: {
              board: {
                select: {
                  BoardImages: {
                    where: {
                      boardStatus: {
                        not: 'draft',
                      },
                    },
                    select: {
                      boardId: true,
                      id: true,
                      imageUrl: true,
                    },
                  },
                },
              },
              saleAdId: true,
              saleAds: {
                select: {
                  saleImages: {
                    select: {
                      id: true,
                      imageUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const allBookMarks = allBookMark.map((bookMarkItem) => ({
        folder: bookMarkItem.BookMarksBoards.map((boardItem) => ({
          boardId: boardItem.board?.BoardImages[0]?.boardId || [],
          boardImageUrl: boardItem.board?.BoardImages,
          saleId: boardItem.saleAdId,
          saleAdsImages: boardItem.saleAds?.saleImages
            ? boardItem.saleAds?.saleImages
            : [],
        })),
      }));
      const totalBoardCount = allBookMark.reduce(
        (total, item) => total + item.BookMarksBoards.length,
        0,
      );

      return await this.responseService.success(
        'success',
        'Bookmarks',
        { totalBoardCount, allBookMarks },
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

  async createBookMarkTitle(res, aUser: RequestUserDto, title: string) {
    try {
      if (!title || title?.trim().length == 0) {
        return await this.responseService.NOT_FOUND(
          'Bookmark title is not found',
          {},
          res,
        );
      }

      //We can create a duplicate folder
      const newBookmark = await this.prismaService.bookMarkFolder.create({
        data: {
          title: title?.trim(),
          userId: aUser.id,
        },
      });

      return await this.responseService.success(
        'success',
        'Bookmark title added successfully',
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

  async fetchBookMarksTitles(res, aUser: RequestUserDto) {
    try {
      const folder = await this.prismaService.bookMarkFolder.findMany({
        where: {
          userId: aUser.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      });

      if (!folder) {
        return await this.responseService.NOT_FOUND(
          'No bookmark folder found',
          {},
          res,
        );
      }

      const sanitizedBookmarkFolder = [];

      for (const { id, title, createdAt } of folder) {
        const obj = {
          id: id,
          bookmarkFolderName: title,
          createdAt,
        };
        sanitizedBookmarkFolder.push(obj);
      }
      return await this.responseService.success(
        'success',
        'Bookmark folder list fetched success',
        sanitizedBookmarkFolder,
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

  async deleteCollection(res, aUser: RequestUserDto, folderId: string) {
    try {
      const validateFolder = await this.prismaService.bookMarkFolder.findFirst({
        where: {
          userId: aUser.id,
          id: folderId,
        },
      });

      if (!validateFolder) {
        return await this.responseService.NOT_FOUND(
          'Folder id is not valid',
          {},
          res,
        );
      }
      //first delete the bookmarkBoards

      await this.prismaService.bookMarksBoards.deleteMany({
        where: {
          bookMarkFolderId: folderId,
        },
      });

      await this.prismaService.bookMarkFolder.delete({
        where: {
          id: folderId,
          userId: aUser.id,
        },
      });

      return await this.responseService.success(
        'success',
        'collection deleted success',
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
   * @param data
   * @returns
   * @description update the title and edit (delete the selected bookmark board)
   */
  async editCollection(
    res,
    aUser: RequestUserDto,
    data: editBookmarkCollectionDto,
  ) {
    try {
      if (!data.bookMarkFolderId) {
        return await this.responseService.NOT_FOUND(
          'Bookmark folder id is not found',
          {},
          res,
        );
      }
      const validateFolder = await this.prismaService.bookMarkFolder.findFirst({
        where: {
          id: data.bookMarkFolderId,
          userId: aUser.id,
        },
      });

      if (!validateFolder) {
        return await this.responseService.NOT_FOUND(
          'No bookmark folder found',
          {},
          res,
        );
      }

      if (data.deleteBoardId) {
        for (const id of data.deleteBoardId) {
          const validateBookmarkBoardId =
            await this.prismaService.bookMarksBoards.findFirst({
              where: {
                id: id,
                BookMark: {
                  //bookmarkFolder
                  userId: aUser.id,
                },
              },
            });

          if (!validateBookmarkBoardId) {
            return await this.responseService.NOT_FOUND(
              'Bookmark board not found',
              {},
              res,
            );
          }
        }
      }
      if (data.title?.trim().length != 0) {
        await this.prismaService.bookMarkFolder.update({
          where: { id: data.bookMarkFolderId },
          data: {
            title: data.title?.trim(),
          },
        });
      }

      if (data.deleteBoardId) {
        await this.prismaService.bookMarksBoards.deleteMany({
          where: {
            id: {
              in: data.deleteBoardId,
            },
          },
        });
      }

      return await this.responseService.success(
        'success',
        'Collection edited success',
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

  async fetchFolderWiseBookmark(
    res,
    aUser: RequestUserDto,
    paginationDto: PaginationDto,
    folderId,
    userId,
  ) {
    try {
      if (!folderId || !isUUID(folderId)) {
        return await this.responseService.NOT_FOUND(
          'folderId must be uuid',
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

      let aUserId=aUser.id;
      if (userId) {
          if(!isUUID(userId)){
            return await this.responseService.NOT_FOUND("userId must be uuid",{},res);
          }

          let validateUser=await this.prismaService.user.findFirst({
            where:{
              id:userId
            }
          })
          if(!validateUser){
            return await this.responseService.NOT_FOUND("invalid userId",{},res);
          }
          aUserId=userId;
      }

      const skip = (Number(page) - 1) * Number(pageSize);

      const count= await this.prismaService.bookMarksBoards.count({
        where: {
           bookMarkFolderId: folderId, //if user id is not login user then folder id should be  view user.
          BookMark: {
            userId: aUserId,
          },
        }});

      const bookmarks = await this.prismaService.bookMarksBoards.findMany({
        where: {
          bookMarkFolderId: folderId,
          BookMark: {
            userId: aUserId,
          },
        },
        take: +pageSize,
        skip,
        select: {
          id: true,
          BookMark: {
            select: {
              isLocked: true,
            },
          },
          saleAdId: true,
          boardId: true,
          bookmarkFeatureType: true,
          saleAds: {
            select: {
              saleImages: {
                select: {
                  id: true,
                  imageUrl: true,
                },
                take: 1,
              },
            },
          },
          board: {
            select: {
              BoardImages: {
                select: {
                  id: true,
                  imageUrl: true,
                },
                take: 1,
              },
            },
          },
        },
      });
      return await this.responseService.success(
        'success',
        'bookmark fetched success',
        {totalBookmarks:count,bookmarks},
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

  //@todo when board feature is done then here to add the count flow.
  async fetchSingleBoardOrSaleAdRecords(
    res,
    aUser: RequestUserDto,
    boardOrSaleId,
  ) {
    try {
      if (!boardOrSaleId || !isUUID(boardOrSaleId)) {
        return await this.responseService.NOT_FOUND(
          'boardOrSaleId must be uuid',
          {},
          res,
        );
      }

      const findIsBoardOrSaleAd =
        await this.prismaService.bookMarksBoards.findFirst({
          where: {
            id: boardOrSaleId,
            BookMark: {
              userId: aUser.id,
            },
          },
          select: {
            bookmarkFeatureType: true,
            boardId: true,
            saleAdId: true,
          },
        });

      if (!findIsBoardOrSaleAd) {
        return await this.responseService.NOT_FOUND(
          'boardOrSaleId not valid',
          {},
          res,
        );
      }
      if (
        findIsBoardOrSaleAd.bookmarkFeatureType ==
        (await this.constantsService.bookmarkFeatureType.board)
      ) {
        let board = await this.prismaService.board.findFirst({
          where: {
            id: findIsBoardOrSaleAd.boardId,
          },
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
                id: true,
                boardStatus: true,
                description: true,
                title: true,
              },
            },
          },
        });
        if (!board) {
          return await this.responseService.NOT_FOUND(
            'Record not found, boardOrSaleId is not valid',
            {},
            res,
          );
        }

        const sanitizedBoardDetails = {
          boardId: board.id,
          userId: board.userId,
          userName: board.user?.userName ? board.user?.userName : null,
          board: board.BoardImages,
          createdAt: board.createdAt,
          isBoard: true,
        };

        return await this.responseService.success(
          'success',
          'Board record fetched success',
          sanitizedBoardDetails,
          res,
        );
      } else {
        const sale = await this.prismaService.sale.findFirst({
          where: {
            id: findIsBoardOrSaleAd.saleAdId,
          },
          select: {
            id: true,
            title: true,
            description: true,
            originalPrice: true,
            discountPrice: true,
            // assetType: true,
            createdAt: true,
            _count: {
              select: {
                Comments: true,
              },
            },

            saleImages: {
              select: {
                id: true,
                imageUrl: true,
              },
            },
            user: {
              select: {
                userName: true,
              },
            },
          },
        });

        if (!sale) {
          return await this.responseService.NOT_FOUND(
            'Record not found, boardOrSaleId is not valid',
            {},
            res,
          );
        }

        let sanitizedSaleDetails = {
          saleId: sale.id,
          saleTitle: sale.title,
          saleAddDescription: sale.description,
          originalPrice: sale.originalPrice,
          discountPrice: sale.discountPrice,
          // assetType: sale.assetType,
          saleAdImages: sale.saleImages,
          totalCommentCounts: sale._count.Comments,
          createdAt: sale.createdAt,
        };
        return await this.responseService.success(
          'success',
          'Sale record fetched success',
          sanitizedSaleDetails,
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

  async lockBookmarkFolder(res, aUser: RequestUserDto, folderId) {
    try {
      if (!folderId || !isUUID(folderId)) {
        return await this.responseService.NOT_FOUND(
          'Folder id must required',
          {},
          res,
        );
      }
      const folder = await this.prismaService.bookMarkFolder.findFirst({
        where: {
          id: folderId,
          userId: aUser.id,
        },
        select: {
          isLocked: true,
        },
      });
      if (!folder) {
        return await this.responseService.NOT_FOUND(
          'Invalid folderId',
          {},
          res,
        );
      }
      if (folder.isLocked) {
        return await this.responseService.success(
          'success',
          'folder is locked',
          {},
          res,
        );
      }

      await this.prismaService.bookMarkFolder.update({
        where: {
          id: folderId,
        },
        data: {
          isLocked: true,
        },
      });

      return await this.responseService.success(
        'success',
        'folder is locked',
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
