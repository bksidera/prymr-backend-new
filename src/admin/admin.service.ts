import { Injectable } from '@nestjs/common';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { PaginationDto } from 'src/board/Dto/PaginationDto';
import { ConstantsService } from 'src/constants/constants.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';
import { ApproveBecomeCreatorRequest } from './Dto/ApproveBecomeCreatorRequest';
import { ViewAllBecomeCreatorRequest } from './Dto/ViewAllBecomeCreatorRequest';
import { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';

@Injectable()
export class AdminService {
  constructor(
    private readonly responseService: ResponseService,
    private readonly prismaService: PrismaService,
    private readonly constantsService: ConstantsService,
  ) {}

  async viewAllBecomeCreatorRequest(
    res,
    aUser: RequestUserDto,
    data: ViewAllBecomeCreatorRequest,
  ) {
    try {
      const user=await this.prismaService.user.findFirst({
        where:{
          id:aUser.id
        },
        select:{
          isDefaultCreatorUser:true
        }
      })
      if (!user.isDefaultCreatorUser) {
        return await this.responseService.UNAUTHORIZED('Invalid User', res);
      }

      const { page, pageSize } = data;

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

      let customWhereClause: Prisma.UserCreatorRequestsWhereInput = {};

      if (data.filterBy) {
        customWhereClause.status = data.filterBy;
      }

      if (data.userName) {
        customWhereClause.user = {
          userName: {
            contains: data.userName,
            mode: 'insensitive',
          },
        };
      }
      const count = await this.prismaService.userCreatorRequests.count({
        where: customWhereClause,
      });

      const request = await this.prismaService.userCreatorRequests.findMany({
        where: customWhereClause,
        take: pageSizeNum,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              userName: true,
              initialProfileIcon: true,
              profileIcon: true,
              email:true,
            },
          },
          id: true,
          createdAt: true,
          status: true,
        },
      });

      return await this.responseService.success(
        'success',
        'All Request fetched success',
        { count, data: request },
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

  async approveBecomeCreatorRequest(
    res,
    aUser: RequestUserDto,
    data: ApproveBecomeCreatorRequest,
  ) {
    try {
      const user=await this.prismaService.user.findFirst({
        where:{
          id:aUser.id
        },
        select:{
          isDefaultCreatorUser:true
        }
      })
      if (!user.isDefaultCreatorUser) {
        return await this.responseService.UNAUTHORIZED('Invalid User', res);
      }
      const validateRequest = await this.prismaService.userCreatorRequests.findFirst({
          where: {
            id: data.requestId,
          },
          select: {
            status: true,
            userId:true,
          },
        });

      if (!validateRequest) {
        return await this.responseService.NOT_FOUND(
          'Invalid requestId, Pass the correct requestId',
          {},
          res,
        );
      } else {
        if (validateRequest.status == (await this.constantsService.requestCreator.Approved)) {
          return await this.responseService.NOT_FOUND(
            'Already request approved',
            {},
            res,
          );
        } else {
          await this.prismaService.userCreatorRequests.update({
            where: {
              id: data.requestId,
            },
            data: {
              status: data.requestStatus,
              reason: data?.reason,
            },
          });
          if(data.requestStatus===(await this.constantsService.requestCreator.Approved)){
               await this.prismaService.user.update({
                where:{
                  id:validateRequest.userId,
                },
                data:{
                  role:await this.constantsService.newUserRole.publicCreator
                }
               })
          }

          return await this.responseService.success(
            'success',
            `Request successfully ${data.requestStatus}.`,
            {},
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

  async deleteBecomeCreatorRequest(res, aUser: RequestUserDto, requestId) {
    try {
      const user=await this.prismaService.user.findFirst({
        where:{
          id:aUser.id
        },
        select:{
          isDefaultCreatorUser:true
        }
      })
      if (!user.isDefaultCreatorUser) {
        return await this.responseService.UNAUTHORIZED('Invalid User', res);
      }

      if (!isUUID(requestId)) {
        return await this.responseService.NOT_FOUND(
          'RequestId must be uuid',
          {},
          res,
        );
      }
      const validateRequest =
        await this.prismaService.userCreatorRequests.findFirst({
          where: {
            id: requestId,
          },
          select: {
            id: true,
            status: true,
          },
        });

      if (!validateRequest) {
        return await this.responseService.NOT_FOUND(
          'Invalid requestId, Pass the correct requestId',
          {},
          res,
        );
      }

      await this.prismaService.userCreatorRequests.delete({
        where: {
          id: validateRequest.id,
        },
      });

      return await this.responseService.success(
        'success',
        'Request deleted success',
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

  async fetchSuggestionsOfRequestedUser(
    res,
    aUser: RequestUserDto,
    userName: string,
    paginationDto,
    filterBy,
  ) {
    try {
    

      const user=await this.prismaService.user.findFirst({
        where:{
          id:aUser.id
        },
        select:{
          isDefaultCreatorUser:true
        }
      })
      if (!user.isDefaultCreatorUser) {
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

      // Requested: "Requested",
      // Rejected: "Rejected",
      // Approved: "Approved",
      // //validate filter..

      let customWhereClause: Prisma.UserCreatorRequestsWhereInput = {};
      if(filterBy){
        switch (filterBy){
          case "Requested":
            customWhereClause.status=filterBy;
            break
            case "Rejected":
              customWhereClause.status=filterBy;
              break
              case "Approved":
                customWhereClause.status=filterBy;
                break
                default:
                  return await this.responseService.NOT_FOUND("filterBy must be one of:  Rejected, Approved, Requested",{},res);
        }
      }

      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;


      if (userName || userName?.trim()?.length != 0) {
        customWhereClause.user = {
          userName: {
            contains: userName?.trim().toLowerCase(),
            mode: 'insensitive',
          },
        };
      }
      const count =
      await this.prismaService.userCreatorRequests.count({
        where:customWhereClause
      })

      const userNameList =
        await this.prismaService.userCreatorRequests.findMany({
          where: customWhereClause,
          take: pageSizeNum,
          skip,
          select: {
            user: {
              select: {
                id: true,
                userName: true,
                email:true,
                // createdAt:true,
              },
            },
            id: true,
            status: true,
            createdAt:true,
          },
        });

       

      return await this.responseService.success(
        'success',
        'userName fetched success',
        {count:count, data: userNameList },
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

/**
 admin what can do 
 -admin can view the request
 -admin can take action on the request
 -Request status show the Standard user if request is block or rejected.
 -first need to form
 */
