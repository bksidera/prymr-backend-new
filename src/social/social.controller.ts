import { Controller, Get, Inject, Post, Query, Res, UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { REQUEST } from '@nestjs/core';
import { JwtAuthGuard } from 'src/guards/guards.service';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { PaginationDto } from 'src/board/Dto/PaginationDto';

@Controller('social')
export class SocialController {
  constructor(
    private readonly socialService: SocialService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  /**
   * 
   * @param res 
   * @param followedUserId 
   * @returns  string
   * @description one user can follow the multiple user. 
   * - when one time hit the request the it follow but same request hit second time then it unfollow
   */
  @Post('followUser')
  @UseGuards(JwtAuthGuard)
  async followUser(@Res() res,@Query("followedUserName")followedUserId:string) {
    const user = this.request['user'];
    return await this.socialService.followUser(res,user,followedUserId);
  }


  @Get('fetchFollowerUserOrFollowingUser')
  @UseGuards(JwtAuthGuard)
  async fetchRecentBoardPublicUserBoard(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
    @Query("followUsers")followUsers:boolean, //login user followed user list
    // @Query("searchText")searchText:string
  ) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.socialService.fetchFollowerUserOrFollowingUser(
      res,
      paginationDto,
      followUsers,
      aUser,
      // searchText
    );
  }


/**
 * 
 * @param res 
 * @param boardId 
 * @returns string
 * @description one user can follow the board
 * - if first time hit the it follow and second time then it goes to unfollow 
 */
  @Post('followBoard')
  @UseGuards(JwtAuthGuard)
  async followBoard(@Res() res,@Query("boardId")boardId:string) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.socialService.followBoard(res,aUser,boardId);
  }

}
