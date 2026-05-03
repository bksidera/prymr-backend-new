import {
  Body,
  Controller,
  Inject,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { LikeService } from './like.service';
import { REQUEST } from '@nestjs/core';
import { JwtAuthGuard } from 'src/guards/guards.service';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';

@Controller('like')
export class LikeController {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly likeService: LikeService,
  ) {}

  /**
   * form ads like and unlike api.
   */
  @Post('likeSaleAd')
  @UseGuards(JwtAuthGuard)
  async likeSaleAd(@Res() res, @Query('commentId') commentId: string,@Query("adsId")adsId:string) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.likeService.likeSaleAd(res, commentId,adsId, aUser);
  }

  @Post('likeBoardComment')
  @UseGuards(JwtAuthGuard)
  async likeBoardComment(@Res() res, @Query('commentId') commentId: string,@Query("boardImageId")boardImageId:string) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.likeService.likeBoardComment(res, commentId,boardImageId, aUser);
  }
}
