import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from 'src/guards/guards.service';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { AddSaleCommentDto } from './Dto/addSaleCommentDto';
import { PaginationDto } from 'src/board/Dto/PaginationDto';
import { AddBoardCommentDto } from './Dto/AddBoardCommentDto';

@Controller('comment')
export class CommentController {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly commentService: CommentService,
  ) {}

  @Post('addSaleComment')
  @UseGuards(JwtAuthGuard)
  async addSaleComment(@Res() res, @Body() data: AddSaleCommentDto) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.commentService.addSaleComment(res, data,aUser);
  }
  @Get('viewSaleComments')
  @UseGuards(JwtAuthGuard)
  async viewSaleComments(@Res() res,@Query() paginationDto: PaginationDto,@Query("parentCommentId")parentCommentId:string,@Query("saleAdsId")saleAdsId:string) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.commentService.viewSaleComments(res,aUser,paginationDto,parentCommentId,saleAdsId);
  }

  
  @Delete('deleteSaleAdComment')
  @UseGuards(JwtAuthGuard)
  async deleteSaleAdComment(@Res() res, @Query("commentId")commentId:string) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.commentService.deleteSaleAdComment(res, commentId,aUser);
  }

  @Put('editSaleAdComment')
  @UseGuards(JwtAuthGuard)
  async editSaleAdComment(@Res() res, @Query("commentId")commentId:string,@Query("comment")comment:string) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.commentService.editSaleAdComment(res, commentId,aUser,comment);
  }

  @Post('addBoardComment')
  @UseGuards(JwtAuthGuard)
  async addBoardComment(@Res() res, @Body() data: AddBoardCommentDto) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.commentService.addBoardComment(res, data,aUser);
  }

  //do not pass the board id, pass the board inside image id
  //we are doing because of next feature will come pages flow so that why we are doing.
  @Get('viewBoardComments')
  @UseGuards(JwtAuthGuard)
  async viewBoardComments(@Res() res,@Query() paginationDto: PaginationDto,@Query("parentCommentId")parentCommentId:string,@Query("boardImageId")boardImageId:string) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.commentService.viewBoardComments(res,aUser,paginationDto,parentCommentId,boardImageId);
  }

  @Put('editBoardComment')
  @UseGuards(JwtAuthGuard)
  async editBoardComment(@Res() res, @Query("commentId")commentId:string,@Query("comment")comment:string) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.commentService.editBoardComment(res, commentId,aUser,comment);
  }

    
  @Delete('deleteBoardComments')
  @UseGuards(JwtAuthGuard)
  async deleteBoardComments(@Res() res, @Query("commentId")commentId:string) {
    const aUser:RequestUserDto = this.request['user'];
    return await this.commentService.deleteBoardComments(res, commentId,aUser);
  }

}
