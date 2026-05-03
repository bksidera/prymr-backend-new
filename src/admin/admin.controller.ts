import { Body, Controller, Delete, Get, Inject, Post, Query, Res, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { JwtAuthGuard } from 'src/guards/guards.service';
import { AdminService } from './admin.service';
import { PaginationDto } from 'src/board/Dto/PaginationDto';
import { ApproveBecomeCreatorRequest } from './Dto/ApproveBecomeCreatorRequest';
import { ViewAllBecomeCreatorRequest } from './Dto/ViewAllBecomeCreatorRequest';

@Controller('admin')
export class AdminController {

    constructor(  @Inject(REQUEST) private readonly request: Request,
    private readonly adminService:AdminService
){

    }

    
  @Get('viewAllBecomeCreatorRequest')
  @UseGuards(JwtAuthGuard)
  async viewAllBecomeCreatorRequest(@Res() res: Response,@Query()data:ViewAllBecomeCreatorRequest) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.adminService.viewAllBecomeCreatorRequest(res,aUser,data);
  }

  @Post('approveBecomeCreatorRequest')
  @UseGuards(JwtAuthGuard)
  async approveBecomeCreatorRequest(@Res() res: Response,@Body() data:ApproveBecomeCreatorRequest) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.adminService.approveBecomeCreatorRequest(res,aUser,data);
  }

  @Delete('deleteBecomeCreatorRequest')
  @UseGuards(JwtAuthGuard)
  async deleteBecomeCreatorRequest(@Res() res: Response,@Query("requestId") requestId:string) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.adminService.deleteBecomeCreatorRequest(res, aUser, requestId);
  }


  @Get('fetchSuggestionsOfRequestedUser')
  @UseGuards(JwtAuthGuard)
  async fetchSuggestionsOfRequestedUser(@Res() res: Response,@Query("userName") userName:string,@Query()paginationDto:PaginationDto,@Query("filterBy")filterBy:string) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.adminService.fetchSuggestionsOfRequestedUser(res,aUser,userName,paginationDto,filterBy);
  }



}
