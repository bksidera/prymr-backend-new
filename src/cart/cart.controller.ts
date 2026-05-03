import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { REQUEST } from '@nestjs/core';
import { JwtAuthGuard } from 'src/guards/guards.service';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { AddToCartDto } from './Dto/AddToCartDto';
import { PaginationDto } from 'src/board/Dto/PaginationDto';
//TODO in add cart api to board side add cart feature is remaining
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  /**
   *
   * @param res
   * @param data
   * @returns
   * @todo board side add cart in pending
   */
  //test
  @Post('addToCart')
  @UseGuards(JwtAuthGuard)
  async addToCart(@Res() res, @Body() data: AddToCartDto) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.cartService.addToCart(res, aUser, data);
  }

  //test
  @Delete('deleteCart')
  @UseGuards(JwtAuthGuard)
  async deleteCart(@Res() res, @Query('cartId') cartId: string) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.cartService.deleteCart(res, aUser, cartId);
  }

  //test
  @Get('viewBoard')
  @UseGuards(JwtAuthGuard)
  async viewBoard(@Res() res, @Query('cartId') cartId: string) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.cartService.viewBoard(res, aUser, cartId);
  }

  //test
  @Post('boardOrSaleCartAddToBookmark')
  @UseGuards(JwtAuthGuard)
  async boardOrSaleCartAddToBookmark(
    @Res() res,
    @Query('cartId') cartId: string,
    @Query('folderId') folderId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.cartService.boardOrSaleCartAddToBookmark(
      res,
      cartId,
      aUser,
      folderId,
    );
  }

  @Get('fetchCartRecords')
  @UseGuards(JwtAuthGuard)
  async fetchCartRecords(@Res() res,@Query()paginationDto:PaginationDto) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.cartService.fetchCarRecords(res,paginationDto,aUser);
  }
}
