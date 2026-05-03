import {
  Controller,
  Post,
  Body,
  Query,
  BadRequestException,
  Res,
  Req,
  Param,
  Get,
  UseGuards,
  Inject,
  Headers,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { SaveCardDto } from './Dto/SaveCardDto';
import { JwtAuthGuard } from 'src/guards/guards.service';
import { REQUEST } from '@nestjs/core';
import { CreatePaymentIntentDto } from './Dto/PaymentIntent.dto';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { BusinessTypeDto } from './Dto/BusinessType.dto';
import { TipDto } from './Dto/TipDto';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  @Post('create-customer')
  @UseGuards(JwtAuthGuard)
  async createCustomer(@Res() res) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.paymentService.createCustomer(aUser, res);
  }

  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(@Res() res, @Body() body: CreatePaymentIntentDto) {
    const {
      paymentMethodId,
      tappableId,
      paymentPurpose,
      vanishId,
      replaceTappableId,
      boardId,
      reactionId,
      tipAmount,
      totalBuyQuantity,
    } = body;
    const aUser: RequestUserDto = this.request['user'];

    return await this.paymentService.createPaymentIntent(
      paymentMethodId,
      aUser,
      tappableId,
      paymentPurpose,
      vanishId,
      replaceTappableId,
      boardId,
      reactionId,
      tipAmount,
      totalBuyQuantity,
      res,
    );
  }

  @Post('guestUserCreatePaymentIntent')
  async geustUserCreatePaymentIntent(
    @Res() res,
    @Body() body: CreatePaymentIntentDto,
  ) {
    const {
      paymentMethodId,
      tappableId,
      paymentPurpose,
      vanishId,
      replaceTappableId,
      boardId,
      reactionId,
      tipAmount,
      totalBuyQuantity,
    } = body;

    return await this.paymentService.geustUserCreatePaymentIntent(
      paymentMethodId,
      tappableId,
      paymentPurpose,
      vanishId,
      replaceTappableId,
      boardId,
      reactionId,
      tipAmount,
      totalBuyQuantity,
      res,
    );
    // return await this.paymentService.geustUserCreatePaymentIntent1(
    //   res,
    // );
  }

 @Post('webhook')
async webhook(
  @Req() req: any,
  @Headers('stripe-signature') signature: string,
  @Res() res: any,
) {
  try {
    const result = await this.paymentService.handleWebhook(
      req.body,         // RAW BODY will be here
      signature,
    );
    return res.status(200).send(result);
  } catch (err: any) {
    console.log('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}


  @Post('capture-payment')
  @UseGuards(JwtAuthGuard)
  async capturePayment(
    @Res() res,
    @Body() capturePaymentDto: { paymentIntentId: string },
  ) {
    const { paymentIntentId } = capturePaymentDto;
    return await this.paymentService.capturePayment(paymentIntentId, res);
  }

  @Post('save-card')
  @UseGuards(JwtAuthGuard)
  async saveCard(@Res() res, @Body() saveCardDto: SaveCardDto) {
    const { paymentMethodId } = saveCardDto;
    const aUser: RequestUserDto = this.request['user'];
    return await this.paymentService.saveCard(paymentMethodId, res, aUser);
  }

  @Post('removed-saved-card')
  @UseGuards(JwtAuthGuard)
  async RemoveSaveCard(@Res() res, @Body() saveCardDto: SaveCardDto) {
    const { paymentMethodId } = saveCardDto;
    const aUser: RequestUserDto = this.request['user'];
    return await this.paymentService.RemoveSaveCard(
      paymentMethodId,
      res,
      aUser,
    );
  }

  @Get('list-cards/:customerId')
  @UseGuards(JwtAuthGuard)
  async listCards(@Param('customerId') customerId: string, @Res() res) {
    return await this.paymentService.listCards(customerId, res);
  }

  @Post('createAccountLink')
  @UseGuards(JwtAuthGuard)
  async createAccountLink(
    @Res() res,
    @Req() req,
    @Body() businessTypeDto: BusinessTypeDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    const { businessType } = businessTypeDto;
    return await this.paymentService.createAccountLink(
      req,
      aUser,
      businessType,
      res,
    );
  }

  @Post('connectedAccountReturn')
  @UseGuards(JwtAuthGuard)
  async connectedAccountReturn(@Res() res, @Req() req) {
    const aUser: RequestUserDto = this.request['user'];

    return await this.paymentService.connectedAccountReturn(req, aUser, res);
  }

  //   @Get('transactionHistory')
  //   @UseGuards(JwtAuthGuard)
  //   async transactionHistory(@Res() res,
  //   @Query('page') page: number = 1, // Default page = 1 if not provided
  //   @Query('pageSize') pageSize: number = 10, // Default pageSize = 10 if not provided
  //   @Query('filterBy') filterBy: 'credit' | 'debit' | 'platform_fee',
  //   @Query('startingAfterId') startingAfterId: string | null, // Accept `starting_after` id as a parameter
  //   @Query('endingBeforeId') endingBeforeId: string | null

  // ) {
  //       const aUser:RequestUserDto= this.request['user'];

  //     return await this.paymentService.transactionHistory(aUser, page, pageSize, filterBy,startingAfterId,endingBeforeId, res);
  //   }

  @Get('transactionHistory')
  @UseGuards(JwtAuthGuard)
  async transactionHistory(
    @Res() res,
    @Query('page') page: string = '1', // Default page = 1 if not provided
    @Query('pageSize') pageSize: string = '10', // Default pageSize = 10 if not provided
    @Query('filterBy') filterBy: 'credit' | 'debit' | 'platform_fee',
  ) {
    const aUser: RequestUserDto = this.request['user'];
    // Convert page and pageSize to integers
    const pageNumber = parseInt(page, 10);
    const pageSizeNumber = parseInt(pageSize, 10);

    return await this.paymentService.transactionHistory(
      aUser,
      pageNumber,
      pageSizeNumber,
      filterBy,
      res,
    );
  }

  // following are not in use

  @Post('attach-payment-method')
  async attachPaymentMethod(
    @Body('customerId') customerId: string,
    @Body('paymentMethodId') paymentMethodId: string,
    @Body('sellerAccountId') sellerAccountId?: string,
  ) {
    await this.paymentService.attachPaymentMethod(
      customerId,
      paymentMethodId,
      sellerAccountId,
    );
    return { success: true };
  }

  @Post('list-payment-methods1')
  async listPaymentMethods1(@Body('customerId') customerId: string) {
    try {
      const paymentMethods =
        await this.paymentService.listPaymentMethods1(customerId);
      return {
        success: true,
        data: paymentMethods,
      };
    } catch (error) {
      return {
        success: false,
        message: error,
      };
    }
  }

  @Post('list-payment-methods')
  @UseGuards(JwtAuthGuard)
  async listPaymentMethods(@Res() res) {
    try {
      const aUser: RequestUserDto = this.request['user'];
      return await this.paymentService.listPaymentMethods(aUser, res);
    } catch (error) {
      return {
        success: false,
        message: error,
      };
    }
  }

  @Post('updateCardPaymentsCapability')
  async updateCardPaymentsCapability(@Res() res, @Req() req) {
    return this.paymentService.updateCardPaymentsCapability(req, res);
  }
  @Post('updateAccountRequirements')
  async updateAccountRequirements(@Res() res, @Req() req) {
    return this.paymentService.updateAccountRequirements(req, res);
  }

  @Post('create-payment-method')
  async createPaymentMethod(@Res() res, @Req() req) {
    return this.paymentService.createPaymentMethod(req, res);
  }

  @Get('createLoginLink')
  async createLoginLink(@Res() res, @Req() req) {
    return this.paymentService.createLoginLink();
  }

  @Get('updateAccountLink')
  async updateAccountLink() {
    return this.paymentService.updateAccountLink();
  }

  // reaction create time make the payment,
  // board wise payment, and profile wise payment intent
  @Post('createIntentTip')
  @UseGuards(JwtAuthGuard)
  async createIntentTip(@Res() res, @Body() data: TipDto) {
    const aUser: RequestUserDto = this.request['user'];
    return this.paymentService.createIntentTip(aUser, data, res);
  }

  @Post('capture-payments')
  @UseGuards(JwtAuthGuard)
  async captureTipPayment(
    @Res() res,
    @Body() capturePaymentDto: { paymentIntentId: string },
  ) {
    const { paymentIntentId } = capturePaymentDto;
    const aUser: RequestUserDto = this.request['user'];
    return await this.paymentService.captureTipPayment(
      paymentIntentId,
      aUser,
      res,
    );
  }
  @Post('checkBal')
  async checkBal(@Query('stripeAccountId') stripeAccountId: string) {
    return await this.paymentService.checkBal(stripeAccountId);
  }

  @Post('checkAccountIsSetupOrNot')
  @UseGuards(JwtAuthGuard)
  async checkAccountIsSetupOrNot(@Res() res) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.paymentService.checkAccountIsSetupOrNot(aUser, res);
  }

  @Post('checkAccountIsSetupOrNotIdWise')
  @UseGuards(JwtAuthGuard)
  async checkAccountIsSetupOrNotIdWise(
    @Res() res,
    @Query('userId') userId: string,
  ) {
    return await this.paymentService.checkAccountIsSetupOrNotIdWise(
      userId,
      res,
    );
  }

  @Get('fetchTransactions')
  @UseGuards(JwtAuthGuard)
  async fetchTransactions(
    @Res() res,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('month') month: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.paymentService.fetchTransactions(
      res,
      aUser,
      page,
      limit,
      month,
    );
  }
}
