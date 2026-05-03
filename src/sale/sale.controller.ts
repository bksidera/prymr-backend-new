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
import { SaleService } from './sale.service';
import { CreateAdsDto } from './Dto/createAdsDto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/guards/guards.service';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { EditInfoAds } from './Dto/editInfoAds';
import { PaginationDto } from 'src/board/Dto/PaginationDto';

@Controller('sale')
export class SaleController {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly saleService: SaleService,
  ) {}

  @Post('createAds')
  @UseGuards(JwtAuthGuard)
  async createAds(@Res() res, @Body() data: CreateAdsDto) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.saleService.createAds(res, aUser, data);
  }

  // when user click on preview  then return the
  @Get('viewSingleAddInfo')
  @UseGuards(JwtAuthGuard)
  async viewSingleAdsInfo(@Res() res, @Query('adsId') adsId: string) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.saleService.viewSingleAdsInfo(res, aUser, adsId);
  }

  @Delete('deleteAds')
  @UseGuards(JwtAuthGuard)
  async deleteAds(@Res() res, @Query('adsId') adsId: string) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.saleService.deleteAds(res, aUser, adsId);
  }

  @Get('getEditInfoAds')
  @UseGuards(JwtAuthGuard)
  async getEditInfoAds(@Res() res, @Query('adsId') adsId: string) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.saleService.getEditInfoAds(res, aUser, adsId);
  }

  @Put('editInfoAds')
  @UseGuards(JwtAuthGuard)
  async editInfoAds(@Res() res, @Body()data:EditInfoAds) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.saleService.editInfoAds(res, aUser, data);
  }



@Get('fetchAllSaleAds')
@UseGuards(JwtAuthGuard)
async fetchAllSaleAds (@Res() res, @Query() paginationDto:PaginationDto) {
  const aUser: RequestUserDto = this.request['user'];
  return await this.saleService.fetchAllSaleAds(res, aUser, paginationDto);
}


}
