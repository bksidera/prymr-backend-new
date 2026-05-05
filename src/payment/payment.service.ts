import { BadRequestException, Injectable } from '@nestjs/common';
import { isEmail, IsEmail, IsUUID } from 'class-validator';
import { emit, resourceUsage } from 'process';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { ConstantsService } from 'src/constants/constants.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';
import Stripe from 'stripe';
import { log } from 'winston';
import { BusinessTypeDto } from './Dto/BusinessType.dto';
import { ConfigService } from '@nestjs/config';
import { TipDto } from './Dto/TipDto';
import { MetadataDto } from './Dto/MetadataDto.dto';
import { audit, last } from 'rxjs';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { centsToDollars } from './utils/money';

enum PaymentPurpose {
  TIP = 'tip',
  UNLOCKED = 'unlocked',
  NORMAL = 'normal',
}

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  // private readonly private prismaService:PrismaServicem
  constructor(
    private readonly prismaService: PrismaService,
    private readonly responseService: ResponseService,
    private readonly constantService: ConstantsService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      process.env.STRIPE_SECRET_KEY,
      { timeout: 120000 },
    );

    // console.info(this.configService.get<string>('FRONTEND_BASE_URL'));
  }

  async createCustomer1(aUser: RequestUserDto, res) {
    try {
      // Step 1: Check if the customer exists on Stripe based on email
      const stripeCustomers = await this.stripe.customers.list({
        email: aUser.email,
        limit: 1,
      });

      let customer;

      if (stripeCustomers.data.length > 0) {
        // If customer exists on Stripe, use the existing one
        customer = stripeCustomers.data[0];
        // Step 2: Check if the customer exists in your local stripeCustomer table and is linked to the current user

        let custom_id = await this.prismaService.user.findFirst({
          where: {
            id: aUser.id,
            stripeCustomer: {
              customerId: customer.id,
            },
          },
        });
        const existingCustomer =
          await this.prismaService.stripeCustomer.findFirst({
            where: {
              customerId: customer.id, // Check based on Stripe customer ID
              users: {
                // Correct relationship field for linking to the user
                some: { id: aUser.id }, // Check if the customer is linked to the current user
              },
            },
          });
        if (existingCustomer) {
          // If the customer is already linked to the current user
          return await this.responseService.success(
            'success',
            'Customer already exists for the current user',
            { customerId: existingCustomer.customerId },
            res,
          );
        } else {
          // If the customer exists on Stripe but not in your local DB, create an entry in your DB
          const newStripeCustomer =
            await this.prismaService.stripeCustomer.create({
              data: {
                customerId: customer.id,
              },
            });


          // Link the newly created Stripe customer to the current user
          await this.prismaService.user.update({
            where: { id: aUser.id },
            data: { stripeCustomerId: newStripeCustomer.id },
          });

          // Return the customer ID
          return await this.responseService.success(
            'success',
            'Customer found on Stripe and linked successfully',
            { customerId: customer.id },
            res,
          );
        }
      } else {
        // Step 3: If the customer doesn't exist on Stripe, create a new customer
        customer = await this.stripe.customers.create({
          email: aUser.email,
        });

        if (!customer) {
          return await this.responseService.NOT_FOUND(
            'Failed to create a customer on Stripe, something went wrong.',
            {},
            res,
          );
        }

        // Save the customer ID in the stripeCustomer table
        const newStripeCustomer =
          await this.prismaService.stripeCustomer.create({
            data: {
              customerId: customer.id,
            },
          });

        // Link the newly created Stripe customer to the current user
        await this.prismaService.user.update({
          where: { id: aUser.id },
          data: { stripeCustomerId: newStripeCustomer.id },
        });

        // Return the customer ID
        return await this.responseService.success(
          'success',
          'Customer created successfully',
          { customerId: customer.id },
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

  // kiran
  async createCustomer(aUser: RequestUserDto, res) {
    try {
      // Step 1: Check if the customer exists on Stripe based on email
      const stripeCustomers = await this.stripe.customers.list({
        email: aUser.email?.trim().toLowerCase(),
        limit: 1,
      });

      let customer;

      if (stripeCustomers.data.length > 0) {
        customer = stripeCustomers.data[0];

        // Step 2: Check if the customer exists in your local DB
        const existingCustomer =
          await this.prismaService.stripeCustomer.findFirst({
            where: {
              customerId: customer.id,
              users: {
                some: { id: aUser.id },
              },
            },
          });

        if (existingCustomer) {
          // If customer already exists for the current user, return it
          return await this.responseService.success(
            'success',
            'Customer already exists for the current user',
            { customerId: existingCustomer.customerId },
            res,
          );
        } else {
          // Additional check for unique constraint on customerId
          const existingStripeCustomer =
            await this.prismaService.stripeCustomer.findFirst({
              where: { customerId: customer.id },
              select: {
                customerId: true,
              },
            });

          if (!existingStripeCustomer) {
            const newStripeCustomer =
              await this.prismaService.stripeCustomer.create({
                data: { customerId: customer.id },
              });

            // Link newly created Stripe customer to the current user
            await this.prismaService.user.update({
              where: { id: aUser.id },
              data: { stripeCustomerId: newStripeCustomer.id },
            });

            return await this.responseService.success(
              'success',
              'Customer found on Stripe and linked successfully',
              { customerId: customer.id },
              res,
            );
          } else {
            // Handle case where customerId already exists but is not linked to user
            return await this.responseService.INTERNAL_SERVER_ERROR(
              `Customer ID already exists in the system. customer Id ${existingStripeCustomer?.customerId}`,
              {},
              res,
            );
          }
        }
      } else {
        // Step 3: If the customer doesn't exist on Stripe, create a new customer
        customer = await this.stripe.customers.create({
          email: aUser.email?.trim().toLowerCase(),
        });

        if (!customer) {
          return await this.responseService.NOT_FOUND(
            'Failed to create a customer on Stripe, something went wrong.',
            {},
            res,
          );
        }

        // Save the customer ID in the stripeCustomer table if it doesn’t exist already
        const existingStripeCustomer =
          await this.prismaService.stripeCustomer.findFirst({
            where: { customerId: customer.id },
          });

        if (!existingStripeCustomer) {
          const newStripeCustomer =
            await this.prismaService.stripeCustomer.create({
              data: { customerId: customer.id },
            });

          // Link the newly created Stripe customer to the current user
          await this.prismaService.user.update({
            where: { id: aUser.id },
            data: { stripeCustomerId: newStripeCustomer.id },
          });

          return await this.responseService.success(
            'success',
            'Customer created successfully',
            { customerId: customer.id },
            res,
          );
        } else {
          return await this.responseService.INTERNAL_SERVER_ERROR(
            'Customer ID already exists in the system.',
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
  // async createCustomerHelper(aUser: RequestUserDto) {
  //   try {
  //     // Step 1: Check if the customer exists on Stripe based on email
  //     const stripeCustomers = await this.stripe.customers.list({
  //       email: aUser.email?.trim().toLowerCase(),
  //       limit: 1,
  //     });

  //     let customer;

  //     if (stripeCustomers.data.length > 0) {
  //       customer = stripeCustomers.data[0];

  //       // Step 2: Check if the customer exists in your local DB
  //       const existingCustomer =
  //         await this.prismaService.stripeCustomer.findFirst({
  //           where: {
  //             customerId: customer.id,
  //             users: {
  //               some: { id: aUser.id },
  //             },
  //           },
  //         });

  //       if (existingCustomer) {
  //         // If customer already exists for the current user, return it
  //         return { customerId: existingCustomer.customerId };
  //       } else {
  //         // Additional check for unique constraint on customerId
  //         const existingStripeCustomer =
  //           await this.prismaService.stripeCustomer.findFirst({
  //             where: { customerId: customer.id },
  //             select: {
  //               customerId: true,
  //             },
  //           });

  //         if (!existingStripeCustomer) {
  //           const newStripeCustomer =
  //             await this.prismaService.stripeCustomer.create({
  //               data: { customerId: customer.id },
  //             });

  //           // Link newly created Stripe customer to the current user
  //           await this.prismaService.user.update({
  //             where: { id: aUser.id },
  //             data: { stripeCustomerId: newStripeCustomer.id },
  //           });

  //           return { customerId: customer.id };
  //         } else {
  //           // Handle case where customerId already exists but is not linked to user
  //           return { customerId: existingStripeCustomer?.customerId };
  //         }
  //       }
  //     } else {
  //       // Step 3: If the customer doesn't exist on Stripe, create a new customer
  //       customer = await this.stripe.customers.create({
  //         email: aUser.email?.trim().toLowerCase(),
  //       });

  //       if (!customer) {
  //         return { customerId: null };
  //       }

  //       // Save the customer ID in the stripeCustomer table if it doesn’t exist already
  //       const existingStripeCustomer =
  //         await this.prismaService.stripeCustomer.findFirst({
  //           where: { customerId: customer.id },
  //         });

  //       if (!existingStripeCustomer) {
  //         const newStripeCustomer =
  //           await this.prismaService.stripeCustomer.create({
  //             data: { customerId: customer.id },
  //           });

  //         // Link the newly created Stripe customer to the current user
  //         await this.prismaService.user.update({
  //           where: { id: aUser.id },
  //           data: { stripeCustomerId: newStripeCustomer.id },
  //         });

  //         return {
  //           customerId: customer.id,
  //         };
  //       }
  //     }
  //   } catch (error) {
  //     return { customerId: null };
  //   }
  // }
  //kiran
  async createCustomerHelper(aUser: RequestUserDto) {
    try {
      const email = aUser.email?.trim().toLowerCase();

      // STEP 1: Try finding existing customer in Stripe
      const stripeList = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      let stripeCustomer = stripeList.data[0];

      // STEP 2: If no customer on Stripe → create
      if (!stripeCustomer) {
        stripeCustomer = await this.stripe.customers.create({ email });
      }

      // STEP 3: Check if this Stripe customer exists in DB (including users)
      let dbStripeCustomer = await this.prismaService.stripeCustomer.findUnique(
        {
          where: { customerId: stripeCustomer.id },
          include: { users: true }, // ← REQUIRED
        },
      );

      // STEP 4: If not in DB → create it
      if (!dbStripeCustomer) {
        const created = await this.prismaService.stripeCustomer.create({
          data: { customerId: stripeCustomer.id },
        });

        // Now fetch again with users included (TypeScript fix)
        dbStripeCustomer = await this.prismaService.stripeCustomer.findUnique({
          where: { id: created.id },
          include: { users: true },
        });
      }

      // STEP 5: Ensure user is linked to this stripeCustomer
      const isUserLinked = dbStripeCustomer.users.some(
        (u) => u.id === aUser.id,
      );

      if (!isUserLinked) {
        await this.prismaService.user.update({
          where: { id: aUser.id },
          data: { stripeCustomerId: dbStripeCustomer.id },
        });
      }

      return { customerId: stripeCustomer.id };
    } catch (error) {
      return { customerId: null };
    }
  }

  async createPaymentIntent(
    paymentMethodId,
    aUser: RequestUserDto,
    tappableId,
    paymentPurpose,
    vanishId, //replace table inside layer id
    replaceTappableId, //replace table inside layer id
    boardId,
    reactionId,
    tipAmount,
    totalBuyQuantity,
    res,
  ) {
    try {
      // Ensure only one of tappableId, boardId, or reactionId is provided
      const ids = [tappableId, boardId, reactionId].filter((id) => id); // Filter out undefined or null values
      if (ids.length !== 1) {
        return await this.responseService.NOT_FOUND(
          'You must provide exactly one of Board ID, Reaction ID, or Tappable ID.',
          {},
          res,
        );
      }
      //  Retrieve user details to get email and customer ID
      const user = await this.prismaService.user.findUnique({
        where: { id: aUser.id },
        select: { email: true, stripeCustomerId: true },
      });

      // Check if stripeCustomerId is available or else create new
      let stripeCustomerId = null;

      if (user?.stripeCustomerId) {
        const stripeCustomers = await this.stripe.customers.list({
          email: aUser.email,
          limit: 1,
        });

        if (stripeCustomers.data.length > 0) {
          //  Check if the customer exists in your local stripeCustomer table and is linked to the current user
          const existingCustomer =
            await this.prismaService.stripeCustomer.findFirst({
              where: {
                customerId: stripeCustomers.data[0].id, // Check based on Stripe customer ID
                users: {
                  // Correct relationship field for linking to the user
                  some: { id: aUser.id }, // Check if the customer is linked to the current user
                },
              },
            });

          if (existingCustomer) {
            stripeCustomerId = stripeCustomers.data[0].id;
          } else {
            // If the customer exists on Stripe but not in your local DB, create an entry in your DB
            const newStripeCustomer =
              await this.prismaService.stripeCustomer.create({
                data: {
                  customerId: stripeCustomers.data[0].id,
                },
              });

            // Link the newly created Stripe customer to the current user
            await this.prismaService.user.update({
              where: { id: aUser.id },
              data: { stripeCustomerId: newStripeCustomer.id },
            });
          }
        } else {
          //  If the customer doesn't exist on Stripe, create a new customer
          const customer = await this.stripe.customers.create({
            email: aUser.email,
          });

          if (!customer) {
            return await this.responseService.NOT_FOUND(
              'Failed to create a customer on Stripe, something went wrong.',
              {},
              res,
            );
          }
          stripeCustomerId = customer.id;

          // Save the customer ID in the stripeCustomer table
          const newStripeCustomer =
            await this.prismaService.stripeCustomer.create({
              data: {
                customerId: customer.id,
              },
            });

          // Link the newly created Stripe customer to the current user
          await this.prismaService.user.update({
            where: { id: aUser.id },
            data: { stripeCustomerId: newStripeCustomer.id },
          });
        }
      }

      if (!stripeCustomerId) {
        const stripeCustomers = await this.stripe.customers.list({
          email: user.email,
          limit: 1,
        });

        if (stripeCustomers.data.length > 0) {
          stripeCustomerId = stripeCustomers.data[0].id;
        } else {
          const newCustomer = await this.stripe.customers.create({
            email: user.email,
          });

          if (!newCustomer) {
            return await this.responseService.NOT_FOUND(
              'Failed to create a customer on Stripe, something went wrong.',
              {},
              res,
            );
          }

          // Save the newly created customer in the stripeCustomer table
          const newStripeCustomer =
            await this.prismaService.stripeCustomer.create({
              data: {
                customerId: newCustomer.id,
              },
            });

          // Link the newly created Stripe customer to the current user
          await this.prismaService.user.update({
            where: { id: aUser.id },
            data: { stripeCustomerId: newStripeCustomer.id },
          });

          stripeCustomerId = newCustomer.id;
        }
      }

      let amount: number;
      let title: string;
      let sellerAccount;
      let totalBuyQuantity = 1; //default we are setting
      let isInventory = false;
      let paymentReason = null;
      if (boardId) {
        // Verify the board exists
        const board = await this.prismaService.board.findUnique({
          where: { id: boardId },
          include: { user: true }, // Include the user to get sellerAccountId
        });

        if (!board) {
          return await this.responseService.NOT_FOUND(
            'Board not found for the provided board ID',
            {},
            res,
          );
        }

        amount = tipAmount;

        // Fetch the SellerAccount associated with the userId from Tappable
        sellerAccount = await this.prismaService.sellerAccount.findFirst({
          where: { users: { some: { id: board.userId } } },
        });

        if (!sellerAccount) {
          return await this.responseService.NOT_FOUND(
            'Seller account not found for this Board',
            {},
            res,
          );
        }
        title = 'Board Tip';
      } else if (reactionId) {
        // Verify the reaction exists
        const reaction = await this.prismaService.reaction.findUnique({
          where: { id: reactionId },
          include: { user: true }, // Include the user to get sellerAccountId
        });

        if (!reaction) {
          return await this.responseService.NOT_FOUND(
            'Reaction not found for the provided reaction ID',
            {},
            res,
          );
        }

        amount = tipAmount;

        // Fetch the SellerAccount associated with the userId from Reaction
        sellerAccount = await this.prismaService.sellerAccount.findFirst({
          where: { users: { some: { id: reaction.userId } } },
        });

        if (!sellerAccount) {
          return await this.responseService.NOT_FOUND(
            'Seller account not found for this Reaction',
            {},
            res,
          );
        }

        title = 'Reaction Tip';
      } else {
        //switch flow
        const tappable = await this.prismaService.tappable.findUnique({
          where: { id: tappableId },
          include: { user: true }, // Include the user to get sellerAccountId
        });

        if (!tappable) {
          return await this.responseService.NOT_FOUND(
            'Tappable item or price not found.',
            {},
            res,
          );
        }

        // Fetch the SellerAccount associated with the userId from Tappable
        sellerAccount = await this.prismaService.sellerAccount.findFirst({
          where: { users: { some: { id: tappable.userId } } },
        });

        if (!sellerAccount) {
          return await this.responseService.NOT_FOUND(
            'Seller account not found for this Tappable item.',
            {},
            res,
          );
        }

        title = tappable.title;
        // Check for optional vanishId or replaceTappableId and get the price if provided
        if (vanishId) {
          const vanish = await this.prismaService.replaceTappable.findUnique({
            where: { id: vanishId },
            select: {
              price: true,
              isInventoryEnabled: true,
              inventoryCount: true,
              inventoryAvailableCount: true,
            },
          });

          if (vanish && vanish.price) {
            amount = Number(vanish.price) * 100; // Use vanish price if provided
          } else {
            return await this.responseService.NOT_FOUND(
              'Vanish item or price not found',
              {},
              res,
            );
          }
          // step 1.check here first is inventory
          //step 2. check the available counter
          if (vanish.isInventoryEnabled) {
            if (Number(totalBuyQuantity) < 0) {
              return await this.responseService.NOT_FOUND(
                'Please add the total quantity to buy',
                {},
                res,
              );
            }
            // step 3. check the out of stock ?
            if (vanish.inventoryAvailableCount <= 0) {
              return await this.responseService.NOT_FOUND(
                'Out of stock',
                {},
                res,
              );
            }

            //Step 4. check the quantity
            //note we have to again check the capture payment before one time is out of stock or not
            if (
              Number(vanish.inventoryAvailableCount) >= Number(totalBuyQuantity)
            ) {
              totalBuyQuantity = Number(totalBuyQuantity);
              amount = Number(vanish.price) * 100 * totalBuyQuantity;
              (isInventory = true),
                (paymentReason =
                  await this.constantService.paymentReason.vanish);
            } else {
              return await this.responseService.NOT_FOUND(
                `You cannot buy,only available ${vanish.inventoryAvailableCount.toString()}`,
                {},
                res,
              );
            }
          }
        } else if (replaceTappableId) {
          const replaceTappable =
            await this.prismaService.replaceTappable.findUnique({
              where: { id: replaceTappableId },
            });

          if (replaceTappable && replaceTappable.price) {
            amount = Number(replaceTappable.price) * 100; // Use replace tappable price if provided
          } else {
            return await this.responseService.NOT_FOUND(
              'Replace tappable item or price not found',
              {},
              res,
            );
          }

          // step 1.check here first is inventory
          //step 2. check the available counter
          if (replaceTappable.isInventoryEnabled) {
            if (Number(totalBuyQuantity) < 0) {
              return await this.responseService.NOT_FOUND(
                'Please add the total quantity to buy',
                {},
                res,
              );
            }
            // step 3. check the out of stock ?
            if (replaceTappable.inventoryAvailableCount <= 0) {
              return await this.responseService.NOT_FOUND(
                'Out of stock',
                {},
                res,
              );
            }

            //Step 4. check the quantity
            //note we have to again check the capture payment before one time is out of stock or not
            if (
              Number(replaceTappable.inventoryAvailableCount) >=
              Number(totalBuyQuantity)
            ) {
              totalBuyQuantity = Number(totalBuyQuantity);
              amount = Number(replaceTappable.price) * 100 * totalBuyQuantity;
              isInventory = true;
              paymentReason = await this.constantService.paymentReason.replace;
            } else {
              return await this.responseService.NOT_FOUND(
                `You cannot buy,only available ${replaceTappable.inventoryAvailableCount.toString()}`,
                {},
                res,
              );
            }
          }
        } else {
          if (!tappable.isSaleItem) {
            return await this.responseService.NOT_FOUND(
              'The item is not available for sale.',
              {},
              res,
            );
          }
          if (!tappable.price) {
            return await this.responseService.NOT_FOUND(
              'price not found',
              {},
              res,
            );
          }
          amount = Number(tappable.price) * 100; // Convert the price to cents as required by Stripe
          // step 1.check here first is inventory
          //step 2. check the available counter
          if (tappable.isInventoryEnabled) {
            if (Number(totalBuyQuantity) < 0) {
              return await this.responseService.NOT_FOUND(
                'Please add the total quantity to buy',
                {},
                res,
              );
            }
            // step 3. check the out of stock ?
            if (tappable.inventoryAvailableCount <= 0) {
              return await this.responseService.NOT_FOUND(
                'Out of stock',
                {},
                res,
              );
            }

            //Step 4. check the quantity
            //note we have to again check the capture payment before one time is out of stock or not
            if (
              Number(tappable.inventoryAvailableCount) >=
              Number(totalBuyQuantity)
            ) {
              totalBuyQuantity = Number(totalBuyQuantity);
              amount = Number(tappable.price) * 100 * totalBuyQuantity;
              isInventory = true;
              paymentReason = await this.constantService.paymentReason.tappable;
            } else {
              return await this.responseService.NOT_FOUND(
                `You cannot buy,only available ${tappable.inventoryAvailableCount.toString()}`,
                {},
                res,
              );
            }
          }
        }
      }

      // @Kiran
      //Retrieve connected account details
      const accountDetails = await this.stripe.accounts.retrieve(
        sellerAccount.sellerAccountId,
      );
      const amountInCents = Math.round(amount); // Convert amount to cents //we already doing this cent
      const stripeFee = Math.round(amountInCents * 0.029) + 30; // Calculate Stripe fee in cents
      const applicationFee = Math.round(
        amountInCents * Number(process.env.APPLICATION_FEE),
      ); // Calculate application fee in cents
      const totalFees = stripeFee + applicationFee; // Total fees
      //  console.info("stripeFee:",stripeFee," :",(amountInCents * 0.029) + 30);
      //  console.info("app fees:",applicationFee,":",amountInCents * Number(process.env.APPLICATION_FEE));

      // Create PaymentIntent with connected account transfer
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: 'USD',
          customer: stripeCustomerId,
          payment_method: paymentMethodId,
          setup_future_usage: 'off_session',
          capture_method: 'manual',
          confirm: false,
          receipt_email: user.email,
          on_behalf_of: sellerAccount.sellerAccountId,
          application_fee_amount: totalFees,
          transfer_data: {
            destination: sellerAccount.sellerAccountId,
          },
          metadata: {
            tappableId: tappableId || undefined,
            paymentPurpose: paymentPurpose,
            vanishId: vanishId || undefined,
            replaceTappableId: replaceTappableId || undefined,
            boardId: boardId || undefined,
            reactionId: reactionId || undefined,
            sellerAccountId: sellerAccount.id,
            title: title,
            paymentReason: paymentReason,
            isInventory: isInventory ? '1' : '0',
            totalBuyQuantity: String(totalBuyQuantity),
            // Dollar values for webhook handler
            stripeFeeDollar: centsToDollars(stripeFee),
            applicationFeeDollar: centsToDollars(applicationFee),
            amountDollar: centsToDollars(amountInCents),
            sellerReceiveDollar: centsToDollars(amountInCents - totalFees),
          },
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
        },
        { idempotencyKey: uuidv4() },
      );

      // const confirmedPaymentIntent = await this.stripe.paymentIntents.confirm(paymentIntent.id);
      // console.log("Confirmed PaymentIntent:", paymentIntent);
      // Return the client secret for the PaymentIntent
      return await this.responseService.success(
        'success',
        'Created successfully payment intent',
        {
          clientSecret: paymentIntent?.client_secret,
          paymentIntentId: paymentIntent.id,
        },
        res,
      );
    } catch (error: any) {
      // Handle Stripe errors
      if (error.type === 'StripeCardError') {
        // This error is thrown when the card is declined
        if (error.code === 'insufficient_funds') {
          return await this.responseService.BAD_REQUEST(
            'Your card has insufficient funds. Please try another payment method.',
            { errorCode: error.code, message: error.message },
            res,
          );
        }
        // Handle other card errors like expired card, invalid CVC, etc.
        return await this.responseService.BAD_REQUEST(
          'Card declined. Please try another payment method.',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeInvalidRequestError') {
        // Invalid parameters were supplied to Stripe's API
        return await this.responseService.BAD_REQUEST(
          'Invalid payment request. Please review the details and try again.',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeAPIError') {
        // An error occurred internally with Stripe's API
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'An error occurred with the payment processor. Please try again later.',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeConnectionError') {
        // Some kind of error occurred during the HTTPS communication
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'Network error. Please check your internet connection and try again.',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeAuthenticationError') {
        // You probably used an incorrect API key
        return await this.responseService.UNAUTHORIZED(
          'Payment authentication failed. Please contact support.',
          res,
        );
      } else if (error.type === 'rate_limit_error') {
        // Too many requests made to the API too quickly
        return await this.responseService.TOO_MANY_REQUESTS(
          'Too many requests. Please try again later.',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else {
        // Handle any other unexpected errors
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'An unexpected error occurred during payment processing.',
          { message: error.message },
          res,
        );
      }
    }
  }
  // @Auther KiranDarode

  // async geustUserCreatePaymentIntent(
  //   paymentMethodId,
  //   tappableId,
  //   paymentPurpose,
  //   vanishId,
  //   replaceTappableId,
  //   boardId,
  //   reactionId,
  //   tipAmount,
  //   totalBuyQty,
  //   res,
  // ) {
  //   try {
  //     // STEP 1 — validate IDs
  //     const ids = [tappableId, boardId, reactionId].filter(Boolean);
  //     if (ids.length !== 1) {
  //       return this.responseService.NOT_FOUND(
  //         'Provide exactly one of boardId, reactionId or tappableId.',
  //         {},
  //         res,
  //       );
  //     }

  //     let amount = 0; // always in cents
  //     let title = '';
  //     let sellerAccount;
  //     let isInventory = false;
  //     let paymentReason = null;
  //     totalBuyQty = Number(totalBuyQty) || 1;

  //     // ===================================================================
  //     // STEP 2 — handle the BOARD → TIP FLOW
  //     // ===================================================================
  //     if (boardId) {
  //       const board = await this.prismaService.board.findUnique({
  //         where: { id: boardId },
  //         include: { user: true },
  //       });

  //       if (!board) {
  //         return this.responseService.NOT_FOUND('Board not found.', {}, res);
  //       }

  //       sellerAccount = await this.prismaService.sellerAccount.findFirst({
  //         where: { users: { some: { id: board.userId } } },
  //         select: {
  //           sellerAccountId: true,
  //           users: {
  //             select: {
  //               id: true,
  //             },
  //             take: 1,
  //           },
  //         },
  //       });

  //       if (!sellerAccount) {
  //         return this.responseService.NOT_FOUND(
  //           'Seller account not found.',
  //           {},
  //           res,
  //         );
  //       }

  //       amount = Math.round(Number(tipAmount) * 100);
  //       title = 'Board Tip';
  //     }

  //     // ===================================================================
  //     // STEP 3 — handle REACTION → TIP FLOW
  //     // ===================================================================
  //     else if (reactionId) {
  //       const reaction = await this.prismaService.reaction.findUnique({
  //         where: { id: reactionId },
  //         include: { boardImage:{
  //           select:{
  //             board:{
  //               select:{
  //                 userId:true
  //               }
  //             }
  //           }
  //         }},
  //       });

  //       if (!reaction) {
  //         return this.responseService.NOT_FOUND('Reaction not found.', {}, res);
  //       }

  //       sellerAccount = await this.prismaService.sellerAccount.findFirst({
  //         where: { users: { some: { id: reaction.boardImage.board.userId } } },
  //         select: {
  //           sellerAccountId: true,
  //           users: {
  //             select: {
  //               id: true,
  //             },
  //             take: 1,
  //           },
  //         },
  //       });

  //       if (!sellerAccount) {
  //         return this.responseService.NOT_FOUND(
  //           'Seller account not found.',
  //           {},
  //           res,
  //         );
  //       }

  //       amount = Math.round(Number(tipAmount) * 100);
  //       console.info('----------------------------------');
  //       console.info(amount);
  //       title = 'Reaction Tip';
  //     }

  //     // ===================================================================
  //     // STEP 4 — TAPPABLE item flow
  //     // ===================================================================
  //     else {
  //       const tappable = await this.prismaService.tappable.findUnique({
  //         where: { id: tappableId },
  //         include: { user: true },
  //       });

  //       if (!tappable) {
  //         return this.responseService.NOT_FOUND('Tappable not found.', {}, res);
  //       }

  //       sellerAccount = await this.prismaService.sellerAccount.findFirst({
  //         where: { users: { some: { id: tappable.userId } } },
  //         select: {
  //           sellerAccountId: true,
  //           users: {
  //             select: {
  //               id: true,
  //             },
  //             take: 1,
  //           },
  //         },
  //       });

  //       if (!sellerAccount) {
  //         return this.responseService.NOT_FOUND(
  //           'Seller account not found.',
  //           {},
  //           res,
  //         );
  //       }

  //       title = tappable.title;

  //       // -----------------------------------------------------------
  //       // VANISH or REPLACE or NORMAL PRODUCT PRICE
  //       // -----------------------------------------------------------
  //       let priceItem;

  //       if (vanishId) {
  //         priceItem = await this.prismaService.replaceTappable.findUnique({
  //           where: { id: vanishId },
  //         });
  //         paymentReason = 'vanish';
  //       } else if (replaceTappableId) {
  //         priceItem = await this.prismaService.replaceTappable.findUnique({
  //           where: { id: replaceTappableId },
  //         });
  //         paymentReason = 'replace';
  //       } else {
  //         priceItem = tappable;
  //         paymentReason = 'tappable';
  //       }

  //       if (!priceItem || !priceItem.price) {
  //         return this.responseService.NOT_FOUND('Price not found.', {}, res);
  //       }

  //       // inventory logic
  //       if (priceItem.isInventoryEnabled) {
  //         if (priceItem.inventoryAvailableCount < totalBuyQty) {
  //           return this.responseService.NOT_FOUND(
  //             `Only ${priceItem.inventoryAvailableCount} available.`,
  //             {},
  //             res,
  //           );
  //         }

  //         isInventory = true;
  //         amount = Math.round(Number(priceItem.price) * 100 * totalBuyQty);
  //       } else {
  //         amount = Math.round(Number(priceItem.price) * 100);
  //       }
  //     }

  //     // ===================================================================
  //     // STEP 5 — Calculate Fees
  //     // ===================================================================
  //     const stripeFee = Math.round(amount * 0.029) + 30; // 2.9% + 30¢
  //     const applicationFee = Math.round(
  //       amount * Number(process.env.APPLICATION_FEE),
  //     );
  //     const totalFees = stripeFee + applicationFee;

  //     // ===================================================================
  //     // STEP 6 — create PAYMENT INTENT
  //     // ===================================================================

  //     const paymentIntent = await this.stripe.paymentIntents.create({
  //       amount: amount,
  //       currency: 'usd',
  //       automatic_payment_methods: { enabled: true },

  //       on_behalf_of: sellerAccount.sellerAccountId,

  //       application_fee_amount: totalFees,

  //       transfer_data: {
  //         destination: sellerAccount.sellerAccountId,
  //       },

  //       metadata: {
  //         sellerAccountId: sellerAccount.id,
  //         tappableId,
  //         boardId,
  //         reactionId,
  //         vanishId,
  //         replaceTappableId,
  //         paymentPurpose,
  //         paymentReason,
  //         title,
  //         stripeFee,
  //         applicationFee,
  //         isInventory: isInventory ? '1' : '0',
  //         totalBuyQty,
  //         isGuestUserPayment: '1',
  //         totalAmount: amount,
  //         amount: tipAmount,
  //         sellerReceiveAmount: amount - totalFees,
  //         price: amount - totalFees,
  //         receiverUserId: sellerAccount.users[0]?.id || null,
  //       },
  //     });

  //     return this.responseService.success(
  //       'success',
  //       'PaymentIntent created successfully',
  //       {
  //         clientSecret: paymentIntent.client_secret,
  //         paymentIntentId: paymentIntent.id,
  //       },
  //       res,
  //     );
  //   } catch (error: any) {
  //     console.log('💥 Stripe Error:', error);

  //     return this.responseService.INTERNAL_SERVER_ERROR(
  //       'Unexpected error',
  //       { message: error.message },
  //       res,
  //     );
  //   }
  // }

  // helper to get seller account
  private async getSellerAccount(userId: string) {
    return this.prismaService.sellerAccount.findFirst({
      where: { users: { some: { id: userId } } },
      select: {
        id: true,
        sellerAccountId: true,
        users: { select: { id: true }, take: 1 },
      },
    });
  }
  // ===============================
  // CREATE PAYMENT INTENT
  // ===============================
  async geustUserCreatePaymentIntent(
    paymentMethodId,
    tappableId,
    paymentPurpose,
    vanishId,
    replaceTappableId,
    boardId,
    reactionId,
    tipAmount,
    totalBuyQty,
    res,
  ) {
    try {
      // ----------------------------------------
      // STEP 1 — Validate exactly one of the three IDs
      // ----------------------------------------
      const ids = [tappableId, boardId, reactionId].filter(Boolean);
      if (ids.length !== 1) {
        return this.responseService.NOT_FOUND(
          'Provide exactly one of boardId, reactionId or tappableId.',
          {},
          res,
        );
      }

      let amount = 0; // Stripe amount (IN CENTS)
      let title = '';
      let sellerAccount;
      let isInventory = false;
      let paymentReason = null;

      totalBuyQty = Number(totalBuyQty) || 1;

      // ===================================================================
      // BOARD → TIP
      // ===================================================================
      if (boardId) {
        const board = await this.prismaService.board.findUnique({
          where: { id: boardId },
          include: { user: true },
        });

        if (!board) {
          return this.responseService.NOT_FOUND('Board not found.', {}, res);
        }

        sellerAccount = await this.getSellerAccount(board.userId);
        if (!sellerAccount) {
          return this.responseService.NOT_FOUND(
            'Seller account not found.',
            {},
            res,
          );
        }

        amount = Math.round(Number(tipAmount) * 100);
        title = 'Board Tip';
      }

      // ===================================================================
      // REACTION → TIP
      // ===================================================================
      else if (reactionId) {
        const reaction = await this.prismaService.reaction.findUnique({
          where: { id: reactionId },
          include: {
            boardImage: {
              select: {
                board: { select: { userId: true } },
              },
            },
          },
        });

        if (!reaction) {
          return this.responseService.NOT_FOUND('Reaction not found.', {}, res);
        }

        sellerAccount = await this.getSellerAccount(
          reaction.boardImage.board.userId,
        );

        amount = Math.round(Number(tipAmount) * 100);
        title = 'Reaction Tip';
      }

      // ===================================================================
      // TAPPABLE ITEM FLOW
      // ===================================================================
      else {
        const tappable = await this.prismaService.tappable.findUnique({
          where: { id: tappableId },
          include: { user: true },
        });

        if (!tappable)
          return this.responseService.NOT_FOUND('Tappable not found.', {}, res);

        sellerAccount = await this.getSellerAccount(tappable.userId);

        let priceItem;

        if (vanishId) {
          priceItem = await this.prismaService.replaceTappable.findUnique({
            where: { id: vanishId },
          });
          paymentReason = 'vanish';
        } else if (replaceTappableId) {
          priceItem = await this.prismaService.replaceTappable.findUnique({
            where: { id: replaceTappableId },
          });
          paymentReason = 'replace';
        } else {
          priceItem = tappable;
          paymentReason = 'tappable';
        }

        if (!priceItem || !priceItem.price) {
          return this.responseService.NOT_FOUND('Price not found.', {}, res);
        }

        title = tappable.title;

        if (priceItem.isInventoryEnabled) {
          if (priceItem.inventoryAvailableCount < totalBuyQty) {
            return this.responseService.NOT_FOUND(
              `Only ${priceItem.inventoryAvailableCount} available.`,
              {},
              res,
            );
          }

          isInventory = true;
          amount = Math.round(Number(priceItem.price) * 100 * totalBuyQty);
        } else {
          amount = Math.round(Number(priceItem.price) * 100);
        }
      }

      // ===================================================================
      // STEP 5 — FEES
      // ===================================================================
      const stripeFee = Math.round(amount * 0.029) + 30; // Stripe fee in CENTS
      const applicationFee = Math.round(
        amount * Number(process.env.APPLICATION_FEE),
      ); // also CENTS
      const totalFees = stripeFee + applicationFee;

      // --- Convert fees to DOLLARS for metadata ---
      const stripeFeeDollar = (stripeFee / 100).toFixed(2);
      const applicationFeeDollar = (applicationFee / 100).toFixed(2);
      const sellerReceiveDollar = ((amount - totalFees) / 100).toFixed(2);
      const amountDollar = (amount / 100).toFixed(2);

      // ===================================================================
      // STEP 6 — CREATE PAYMENT INTENT
      // ===================================================================
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount,
          currency: 'usd',

          automatic_payment_methods: { enabled: true },

          on_behalf_of: sellerAccount.sellerAccountId,

          application_fee_amount: totalFees,

          transfer_data: {
            destination: sellerAccount.sellerAccountId,
          },

          metadata: {
            sellerAccountId: sellerAccount.id,
            tappableId,
            boardId,
            reactionId,
            vanishId,
            replaceTappableId,
            paymentPurpose,
            paymentReason,
            title,

            // Dollar-based values for webhook handler
            amountDollar,
            stripeFeeDollar,
            applicationFeeDollar,
            sellerReceiveDollar,

            isInventory: isInventory ? '1' : '0',
            totalBuyQty,
            isGuestUserPayment: '1',
            receiverUserId: sellerAccount.users[0]?.id || null,
          },
        },
        { idempotencyKey: uuidv4() },
      );

      return this.responseService.success(
        'success',
        'PaymentIntent created successfully',
        {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        },
        res,
      );
    } catch (error: any) {
      console.log('💥 Stripe Error:', error);
      return this.responseService.INTERNAL_SERVER_ERROR(
        'Unexpected error',
        { message: error.message },
        res,
      );
    }
  }

  // helper to get se

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err: any) {
      throw new Error(`Invalid signature: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'charge.succeeded':
        console.log('Charge Success:', event.data.object.id);
        break;

      case 'payment_intent.payment_failed': {
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ payment_intent.payment_failed:', failedIntent.id);
        await this.prismaService.newTransaction
          .updateMany({
            where: { stripeTransactionId: failedIntent.id },
            data: { status: 'failed' },
          })
          .catch(() => null); // may not exist yet — that's fine
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        console.log('⚠️ charge.dispute.created:', dispute.id, 'charge:', dispute.charge);
        await this.prismaService.newTransaction
          .updateMany({
            where: { stripeTransactionId: String(dispute.payment_intent) },
            data: { status: 'disputed' },
          })
          .catch(() => null);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log('account.updated:', account.id, 'charges_enabled:', account.charges_enabled);
        await this.prismaService.sellerAccount
          .updateMany({
            where: { sellerAccountId: account.id },
            data: { verified: account.charges_enabled },
          })
          .catch(() => null);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  // async handleStripeWebhook(req, signature: string, res: any) {
  //   let event: Stripe.Event;

  //   try {
  //     event = this.stripe.webhooks.constructEvent(
  //       req.rawBody,
  //       signature,
  //       process.env.STRIPE_WEBHOOK_SECRET,
  //     );
  //   } catch (err: any) {
  //     console.error('❌ Webhook signature verification failed:', err.message);
  //     return res.status(400).send(`Webhook Error: ${err.message}`);
  //   }
  // }

  // -----------------------------------------
  // EVENT: payment_intent.succeeded
  // -----------------------------------------

  // private async handlePaymentIntentSucceeded(paymentIntent: any) {
  //   console.log('💰 payment_intent.succeeded:', paymentIntent.id);

  //   const metadata = paymentIntent.metadata;

  //   // ---- Extract useful metadata ----
  //   const tappableId = metadata?.tappableId || null;
  //   const boardId = metadata?.boardId || null;
  //   const reactionId = metadata?.reactionId || null;
  //   const vanishId = metadata?.vanishId || null;
  //   const replaceTappableId = metadata?.replaceTappableId || null;

  //   const title = metadata?.title;
  //   const sellerAccountId = metadata?.sellerAccountId;
  //   const paymentPurpose = metadata?.paymentPurpose;
  //   const paymentReason = metadata?.paymentReason;
  //   const isInventory = metadata?.isInventory === '1';
  //   const totalBuyQty = Number(metadata?.totalBuyQty || 1);

  //   // -------------------------
  //   // SAVE TO TRANSACTION TABLE
  //   // -------------------------
  //   // console.info(sellerAccountId);
  //   // await this.prismaService.transaction.create({
  //   //   data: {
  //   //     customerId: null,
  //   //     customerGuest: true, // Guest user flag
  //   //     sellerAccountId: sellerAccountId,
  //   //     tappableId,
  //   //     boardId,
  //   //     reactionId,
  //   //     switchId: vanishId,
  //   //     replaceId: replaceTappableId,
  //   //     price: BigInt(paymentIntent.amount),
  //   //     stripeTransactionId: paymentIntent.id,
  //   //     title,
  //   //     paymentPurpose,
  //   //     inventoryBuyCount: totalBuyQty,
  //   //     isInventoryEnabled: isInventory,
  //   //   },
  //   // });  console.info('-------------------------------');

  //   // metadata: {
  //   //     sellerAccountId: sellerAccount.id,
  //   //     tappableId,
  //   //     boardId,
  //   //     reactionId,
  //   //     vanishId,
  //   //     replaceTappableId,
  //   //     paymentPurpose,
  //   //     paymentReason,
  //   //     title,
  //   //     stripeFee,
  //   //     applicationFee,
  //   //     isInventory: isInventory ? '1' : '0',
  //   //     totalBuyQty,
  //   //     isGuestUserPayment: '1',
  //   //   },
  //   // });
  //   let transaction = await this.prismaService.newTransaction.create({
  //     data: {
  //       customerGuest: true,
  //       applicationFee: metadata.applicationFee,
  //       stripeFee: metadata?.stripeFee,
  //       receiverUserId: metadata?.receiverUserId,
  //       senderUserId: null,
  //       paymentPurpose: paymentPurpose,
  //       // customerId: metadata?.customerId,
  //       sellerAccountId: metadata?.sellerAccountId,
  //       totalAmount: metadata?.amount,
  //       price: metadata?.sellerReceiveAmount,
  //       reactionId: reactionId ? reactionId : null,
  //       boardId: boardId ? boardId : null,
  //       // stripeTransactionId: paymentIntentRetrieve?.id,
  //       // boardId:paymentIntentRetrieve?.metadata?.boardId,
  //     },
  //   });

  //   console.info(transaction);
  //   // -------------------------
  //   // UPDATE INVENTORY
  //   //--------------------------
  //   if (isInventory) {
  //     if (paymentReason === 'tappable') {
  //       await this.prismaService.tappable.update({
  //         where: { id: tappableId },
  //         data: {
  //           inventoryAvailableCount: { decrement: totalBuyQty },
  //         },
  //       });
  //     }

  //     if (paymentReason === 'replace') {
  //       await this.prismaService.replaceTappable.update({
  //         where: { id: replaceTappableId },
  //         data: {
  //           inventoryAvailableCount: { decrement: totalBuyQty },
  //         },
  //       });
  //     }

  //     if (paymentReason === 'vanish') {
  //       await this.prismaService.replaceTappable.update({
  //         where: { id: vanishId },
  //         data: {
  //           inventoryAvailableCount: { decrement: totalBuyQty },
  //         },
  //       });
  //     }
  //   }

  //   console.log('🎉 Saved guest payment in DB');
  // }
  // ===============================
// HANDLE PAYMENT INTENT SUCCEEDED
// ===============================
private async handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('💰 payment_intent.succeeded:', paymentIntent.id);

  const metadata = paymentIntent.metadata;

  // Guard: skip if captureReactionTipPayment already wrote this transaction
  const existing = await this.prismaService.newTransaction.findFirst({
    where: { stripeTransactionId: paymentIntent.id },
  });
  if (existing) {
    console.log('ℹ️ Transaction already recorded, skipping webhook write:', paymentIntent.id);
    return;
  }

  const tappableId = metadata?.tappableId || null;
  const boardId = metadata?.boardId || null;
  const reactionId = metadata?.reactionId || null;
  const vanishId = metadata?.vanishId || null;
  const replaceTappableId = metadata?.replaceTappableId || null;

  const paymentPurpose = metadata?.paymentPurpose;
  const paymentReason = metadata?.paymentReason;

  const isInventory = metadata?.isInventory === '1';
  const totalBuyQty = Number(metadata?.totalBuyQty || 1);

  // ==========================
  // SAVE TRANSACTION (DOLLARS)
  // ==========================
  const transaction = await this.prismaService.newTransaction.create({
    data: {
      customerGuest: true,
      stripeTransactionId: paymentIntent.id,

      applicationFee: metadata.applicationFeeDollar,
      stripeFee: metadata.stripeFeeDollar,
      totalAmount: metadata.amountDollar,
      price: metadata.sellerReceiveDollar,

      receiverUserId: metadata.receiverUserId,
      senderUserId: null,

      paymentPurpose,

      sellerAccountId: metadata.sellerAccountId,

      reactionId: reactionId || null,
      boardId: boardId || null,
    },
  });

  console.log('🟢 Saved Transaction:', transaction);

  // ==========================
  // UPDATE INVENTORY
  // ==========================
  if (isInventory) {
    if (paymentReason === 'tappable') {
      await this.prismaService.tappable.update({
        where: { id: tappableId },
        data: { inventoryAvailableCount: { decrement: totalBuyQty } },
      });
    }

    if (paymentReason === 'replace') {
      await this.prismaService.replaceTappable.update({
        where: { id: replaceTappableId },
        data: { inventoryAvailableCount: { decrement: totalBuyQty } },
      });
    }

    if (paymentReason === 'vanish') {
      await this.prismaService.replaceTappable.update({
        where: { id: vanishId },
        data: { inventoryAvailableCount: { decrement: totalBuyQty } },
      });
    }
  }

  console.log('🎉 Payment processed successfully!');
}


  // async geustUserCreatePaymentIntent(
  //   paymentMethodId,
  //   tappableId,
  //   paymentPurpose,
  //   vanishId, //replace table inside layer id
  //   replaceTappableId, //replace table inside layer id
  //   boardId,
  //   reactionId,
  //   tipAmount,
  //   totalBuyQuantity,
  //   res,
  // ) {
  //   try {
  //     // Ensure only one of tappableId, boardId, or reactionId is provided
  //     const ids = [tappableId, boardId, reactionId].filter((id) => id); // Filter out undefined or null values
  //     if (ids.length !== 1) {
  //       return await this.responseService.NOT_FOUND(
  //         'You must provide exactly one of Board ID, Reaction ID, or Tappable ID.',
  //         {},
  //         res,
  //       );
  //     }

  //     let amount: number;
  //     let title: string;
  //     let sellerAccount;
  //     let totalBuyQuantity = 1; //default we are setting
  //     let isInventory = false;
  //     let paymentReason = null;
  //     if (boardId) {
  //       // Verify the board exists
  //       const board = await this.prismaService.board.findUnique({
  //         where: { id: boardId },
  //         include: { user: true }, // Include the user to get sellerAccountId
  //       });

  //       if (!board) {
  //         return await this.responseService.NOT_FOUND(
  //           'Board not found for the provided board ID',
  //           {},
  //           res,
  //         );
  //       }

  //       amount = tipAmount;

  //       // Fetch the SellerAccount associated with the userId from Tappable
  //       sellerAccount = await this.prismaService.sellerAccount.findFirst({
  //         where: { users: { some: { id: board.userId } } },
  //       });

  //       if (!sellerAccount) {
  //         return await this.responseService.NOT_FOUND(
  //           'Seller account not found for this Board',
  //           {},
  //           res,
  //         );
  //       }
  //       title = 'Board Tip';
  //     } else if (reactionId) {
  //       // Verify the reaction exists
  //       const reaction = await this.prismaService.reaction.findUnique({
  //         where: { id: reactionId },
  //         include: { user: true }, // Include the user to get sellerAccountId
  //       });

  //       if (!reaction) {
  //         return await this.responseService.NOT_FOUND(
  //           'Reaction not found for the provided reaction ID',
  //           {},
  //           res,
  //         );
  //       }

  //       amount = tipAmount;

  //       // Fetch the SellerAccount associated with the userId from Reaction
  //       sellerAccount = await this.prismaService.sellerAccount.findFirst({
  //         where: { users: { some: { id: reaction.userId } } },
  //       });

  //       if (!sellerAccount) {
  //         return await this.responseService.NOT_FOUND(
  //           'Seller account not found for this Reaction',
  //           {},
  //           res,
  //         );
  //       }

  //       title = 'Reaction Tip';
  //     } else {
  //       //switch flow
  //       const tappable = await this.prismaService.tappable.findUnique({
  //         where: { id: tappableId },
  //         include: { user: true }, // Include the user to get sellerAccountId
  //       });

  //       if (!tappable) {
  //         return await this.responseService.NOT_FOUND(
  //           'Tappable item or price not found.',
  //           {},
  //           res,
  //         );
  //       }

  //       // Fetch the SellerAccount associated with the userId from Tappable
  //       sellerAccount = await this.prismaService.sellerAccount.findFirst({
  //         where: { users: { some: { id: tappable.userId } } },
  //       });

  //       if (!sellerAccount) {
  //         return await this.responseService.NOT_FOUND(
  //           'Seller account not found for this Tappable item.',
  //           {},
  //           res,
  //         );
  //       }

  //       title = tappable.title;
  //       // Check for optional vanishId or replaceTappableId and get the price if provided
  //       if (vanishId) {
  //         const vanish = await this.prismaService.replaceTappable.findUnique({
  //           where: { id: vanishId },
  //           select: {
  //             price: true,
  //             isInventoryEnabled: true,
  //             inventoryCount: true,
  //             inventoryAvailableCount: true,
  //           },
  //         });

  //         if (vanish && vanish.price) {
  //           amount = Number(vanish.price) * 100; // Use vanish price if provided
  //         } else {
  //           return await this.responseService.NOT_FOUND(
  //             'Vanish item or price not found',
  //             {},
  //             res,
  //           );
  //         }
  //         // step 1.check here first is inventory
  //         //step 2. check the available counter
  //         if (vanish.isInventoryEnabled) {
  //           if (Number(totalBuyQuantity) < 0) {
  //             return await this.responseService.NOT_FOUND(
  //               'Please add the total quantity to buy',
  //               {},
  //               res,
  //             );
  //           }
  //           // step 3. check the out of stock ?
  //           if (vanish.inventoryAvailableCount <= 0) {
  //             return await this.responseService.NOT_FOUND(
  //               'Out of stock',
  //               {},
  //               res,
  //             );
  //           }

  //           //Step 4. check the quantity
  //           //note we have to again check the capture payment before one time is out of stock or not
  //           if (
  //             Number(vanish.inventoryAvailableCount) >= Number(totalBuyQuantity)
  //           ) {
  //             totalBuyQuantity = Number(totalBuyQuantity);
  //             amount = Number(vanish.price) * 100 * totalBuyQuantity;
  //             (isInventory = true),
  //               (paymentReason =
  //                 await this.constantService.paymentReason.vanish);
  //           } else {
  //             return await this.responseService.NOT_FOUND(
  //               `You cannot buy,only available ${vanish.inventoryAvailableCount.toString()}`,
  //               {},
  //               res,
  //             );
  //           }
  //         }
  //       } else if (replaceTappableId) {
  //         const replaceTappable =
  //           await this.prismaService.replaceTappable.findUnique({
  //             where: { id: replaceTappableId },
  //           });

  //         if (replaceTappable && replaceTappable.price) {
  //           amount = Number(replaceTappable.price) * 100; // Use replace tappable price if provided
  //         } else {
  //           return await this.responseService.NOT_FOUND(
  //             'Replace tappable item or price not found',
  //             {},
  //             res,
  //           );
  //         }

  //         // step 1.check here first is inventory
  //         //step 2. check the available counter
  //         if (replaceTappable.isInventoryEnabled) {
  //           if (Number(totalBuyQuantity) < 0) {
  //             return await this.responseService.NOT_FOUND(
  //               'Please add the total quantity to buy',
  //               {},
  //               res,
  //             );
  //           }
  //           // step 3. check the out of stock ?
  //           if (replaceTappable.inventoryAvailableCount <= 0) {
  //             return await this.responseService.NOT_FOUND(
  //               'Out of stock',
  //               {},
  //               res,
  //             );
  //           }

  //           //Step 4. check the quantity
  //           //note we have to again check the capture payment before one time is out of stock or not
  //           if (
  //             Number(replaceTappable.inventoryAvailableCount) >=
  //             Number(totalBuyQuantity)
  //           ) {
  //             totalBuyQuantity = Number(totalBuyQuantity);
  //             amount = Number(replaceTappable.price) * 100 * totalBuyQuantity;
  //             isInventory = true;
  //             paymentReason = await this.constantService.paymentReason.replace;
  //           } else {
  //             return await this.responseService.NOT_FOUND(
  //               `You cannot buy,only available ${replaceTappable.inventoryAvailableCount.toString()}`,
  //               {},
  //               res,
  //             );
  //           }
  //         }
  //       } else {
  //         if (!tappable.isSaleItem) {
  //           return await this.responseService.NOT_FOUND(
  //             'The item is not available for sale.',
  //             {},
  //             res,
  //           );
  //         }
  //         if (!tappable.price) {
  //           return await this.responseService.NOT_FOUND(
  //             'price not found',
  //             {},
  //             res,
  //           );
  //         }
  //         amount = Number(tappable.price) * 100; // Convert the price to cents as required by Stripe
  //         // step 1.check here first is inventory
  //         //step 2. check the available counter
  //         if (tappable.isInventoryEnabled) {
  //           if (Number(totalBuyQuantity) < 0) {
  //             return await this.responseService.NOT_FOUND(
  //               'Please add the total quantity to buy',
  //               {},
  //               res,
  //             );
  //           }
  //           // step 3. check the out of stock ?
  //           if (tappable.inventoryAvailableCount <= 0) {
  //             return await this.responseService.NOT_FOUND(
  //               'Out of stock',
  //               {},
  //               res,
  //             );
  //           }

  //           //Step 4. check the quantity
  //           //note we have to again check the capture payment before one time is out of stock or not
  //           if (
  //             Number(tappable.inventoryAvailableCount) >=
  //             Number(totalBuyQuantity)
  //           ) {
  //             totalBuyQuantity = Number(totalBuyQuantity);
  //             amount = Number(tappable.price) * 100 * totalBuyQuantity;
  //             isInventory = true;
  //             paymentReason = await this.constantService.paymentReason.tappable;
  //           } else {
  //             return await this.responseService.NOT_FOUND(
  //               `You cannot buy,only available ${tappable.inventoryAvailableCount.toString()}`,
  //               {},
  //               res,
  //             );
  //           }
  //         }
  //       }
  //     }

  //     // @Kiran
  //     //Retrieve connected account details
  //     // const accountDetails = await this.stripe.accounts.retrieve(
  //     //   sellerAccount.sellerAccountId,
  //     // );
  //     const amountInCents = Math.round(amount); // Convert amount to cents //we already doing this cent
  //     const stripeFee = Math.round(amountInCents * 0.029) + 30; // Calculate Stripe fee in cents
  //     const applicationFee = Math.round(
  //       amountInCents * Number(process.env.APPLICATION_FEE),
  //     ); // Calculate application fee in cents
  //     const totalFees = stripeFee + applicationFee; // Total fees
  //     //  console.info("stripeFee:",stripeFee," :",(amountInCents * 0.029) + 30);
  //     //  console.info("app fees:",applicationFee,":",amountInCents * Number(process.env.APPLICATION_FEE));

  //     // Create PaymentIntent with connected account transfer
  //     // const paymentIntent = await this.stripe.paymentIntents.create({
  //     //   amount: amountInCents,
  //     //   currency: 'USD',
  //     //   customer: stripeCustomerId, // This is only valid when a customer is attached.
  //     //   payment_method: paymentMethodId,
  //     //   // confirmation_method: 'automatic',
  //     //   // setup_future_usage: 'off_session', //Because that property is only valid when a customer is attached.
  //     //   capture_method: 'manual',
  //     //   confirm: false,
  //     //   // receipt_email: null,
  //     //   // on_behalf_of: sellerAccount.sellerAccountId,
  //     //   on_behalf_of: "acct_1SSzBN31IExjjj29",
  //     //   application_fee_amount: totalFees,
  //     //   transfer_data: {
  //     //     // destination: sellerAccount.sellerAccountId,
  //     //     destination: "acct_1SSzBN31IExjjj29",
  //     //   },
  //     //   metadata: {
  //     //     tappableId: tappableId || undefined,
  //     //     paymentPurpose: paymentPurpose,
  //     //     vanishId: vanishId || undefined,
  //     //     replaceTappableId: replaceTappableId || undefined,
  //     //     boardId: boardId || undefined,
  //     //     reactionId: reactionId || undefined,
  //     //     // sellerAccountId: sellerAccount.id,
  //     //     sellerAccountId:"acct_1SSzBN31IExjjj29",
  //     //     title: title,
  //     //     stripeFee: stripeFee,
  //     //     applicationFee: applicationFee,
  //     //     paymentReason: paymentReason,
  //     //     isInventory: isInventory ? 1 : 0,
  //     //     totalBuyQuantity: totalBuyQuantity,
  //     //     isGuestUserPaymnet: 1,
  //     //   },
  //     //   automatic_payment_methods: {
  //     //     enabled: true,
  //     //     allow_redirects: 'never', // Prevents redirect-based payment methods
  //     //   },
  //     // });

  //        const paymentIntent = await this.stripe.paymentIntents.create({
  //     amount: 2000, // in smallest currency unit (e.g., cents)
  //     currency: 'usd',
  //     description: 'Guest checkout for product A',
  //     automatic_payment_methods: { enabled: true },
  //       application_fee_amount: totalFees,
  //         transfer_data: {
  //         // destination: sellerAccount.sellerAccountId,
  //         destination: "acct_1SSzBN31IExjjj29",
  //       },
  //       metadata: {
  //         tappableId: tappableId || undefined,
  //         paymentPurpose: paymentPurpose,
  //         vanishId: vanishId || undefined,
  //         replaceTappableId: replaceTappableId || undefined,
  //         boardId: boardId || undefined,
  //         reactionId: reactionId || undefined,
  //         // sellerAccountId: sellerAccount.id,
  //         // sellerAccountId:"acct_1SSzBN31IExjjj29",
  //         title: title,
  //         stripeFee: stripeFee,
  //         applicationFee: applicationFee,
  //         paymentReason: paymentReason,
  //         isInventory: isInventory ? 1 : 0,
  //         totalBuyQuantity: totalBuyQuantity,
  //         isGuestUserPaymnet: 1,
  //       },
  //   });

  //     // const confirmedPaymentIntent = await this.stripe.paymentIntents.confirm(paymentIntent.id);
  //     // console.log("Confirmed PaymentIntent:", paymentIntent);
  //     // Return the client secret for the PaymentIntent
  //     return await this.responseService.success(
  //       'success',
  //       'Created successfully payment intent',
  //       {
  //         clientSecret: paymentIntent?.client_secret,
  //         paymentIntentId: paymentIntent.id,
  //       },
  //       res,
  //     );
  //   } catch (error: any) {
  //     // Handle Stripe errors
  //     if (error.type === 'StripeCardError') {
  //       // This error is thrown when the card is declined
  //       if (error.code === 'insufficient_funds') {
  //         return await this.responseService.BAD_REQUEST(
  //           'Your card has insufficient funds. Please try another payment method.',
  //           { errorCode: error.code, message: error.message },
  //           res,
  //         );
  //       }
  //       // Handle other card errors like expired card, invalid CVC, etc.
  //       return await this.responseService.BAD_REQUEST(
  //         'Card declined. Please try another payment method.',
  //         { errorCode: error.code, message: error.message },
  //         res,
  //       );
  //     } else if (error.type === 'StripeInvalidRequestError') {
  //       // Invalid parameters were supplied to Stripe's API
  //       return await this.responseService.BAD_REQUEST(
  //         'Invalid payment request. Please review the details and try again.',
  //         { errorCode: error.code, message: error.message },
  //         res,
  //       );
  //     } else if (error.type === 'StripeAPIError') {
  //       // An error occurred internally with Stripe's API
  //       return await this.responseService.INTERNAL_SERVER_ERROR(
  //         'An error occurred with the payment processor. Please try again later.',
  //         { errorCode: error.code, message: error.message },
  //         res,
  //       );
  //     } else if (error.type === 'StripeConnectionError') {
  //       // Some kind of error occurred during the HTTPS communication
  //       return await this.responseService.INTERNAL_SERVER_ERROR(
  //         'Network error. Please check your internet connection and try again.',
  //         { errorCode: error.code, message: error.message },
  //         res,
  //       );
  //     } else if (error.type === 'StripeAuthenticationError') {
  //       // You probably used an incorrect API key
  //       return await this.responseService.UNAUTHORIZED(
  //         'Payment authentication failed. Please contact support.',
  //         res,
  //       );
  //     } else if (error.type === 'rate_limit_error') {
  //       // Too many requests made to the API too quickly
  //       return await this.responseService.TOO_MANY_REQUESTS(
  //         'Too many requests. Please try again later.',
  //         { errorCode: error.code, message: error.message },
  //         res,
  //       );
  //     } else {
  //       // Handle any other unexpected errors
  //       return await this.responseService.INTERNAL_SERVER_ERROR(
  //         'An unexpected error occurred during payment processing.',
  //         { message: error.message },
  //         res,
  //       );
  //     }
  //   }
  // }
  async geustUserCreatePaymentIntent1(res) {
    // Node.js example
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: 2000, // in smallest currency unit (e.g., cents)
      currency: 'usd',
      description: 'Guest checkout for product A',
      automatic_payment_methods: { enabled: true },
    });
    return await this.responseService.success(
      'success',
      '',
      { paymentIntent },
      res,
    );
  }

  async capturePayment(paymentIntentId: string, res) {
    try {
      // Check if paymentIntentId is provided
      if (!paymentIntentId) {
        return await this.responseService.NOT_FOUND(
          'PaymentIntent ID is missing, please provide a valid PaymentIntent ID.',
          {},
          res,
        );
      }

      // Retrieve the PaymentIntent to check its status
      const paymentIntentRetrieve =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      // Check if the PaymentIntent is already captured
      if (paymentIntentRetrieve.status === 'succeeded') {
        return await this.responseService.BAD_REQUEST(
          'Payment has already been captured.',
          { paymentIntent: { status: paymentIntentRetrieve.status } },
          res,
        );
      }

      const tappableIdMetaData = paymentIntentRetrieve.metadata?.tappableId;
      const boardIdMetaData = paymentIntentRetrieve.metadata?.boardId;
      const reactionIdMetaData = paymentIntentRetrieve.metadata?.reactionId;
      const vanishIdMetaData = paymentIntentRetrieve.metadata?.vanishId;
      const replaceTappableIdMetaData =
        paymentIntentRetrieve.metadata?.replaceTappableId;
      const paymentPurposeMetaData =
        paymentIntentRetrieve.metadata?.paymentPurpose;
      const totalBuyQuantity = paymentIntentRetrieve.metadata?.totalBuyQuantity;

      if (paymentIntentRetrieve?.metadata?.isInventory == '1') {
        switch (paymentIntentRetrieve?.metadata?.paymentReason) {
          case await this.constantService.paymentReason.tappable:
            const tappable = await this.prismaService.tappable.findUnique({
              where: { id: tappableIdMetaData },
              include: { user: true }, // Include the user to get sellerAccountId
            });
            // step 1.check here first is inventory
            //step 2. check the available counter
            if (tappable.isInventoryEnabled) {
              // step 3. check the out of stock ?
              if (tappable.inventoryAvailableCount <= 0) {
                return await this.responseService.NOT_FOUND(
                  'Out of stock, please make the another payment intent',
                  {},
                  res,
                );
              }
              //Step 4. check the quantity
              //note we have to again check the capture payment before one time is out of stock or not
              if (
                Number(tappable.inventoryAvailableCount) >=
                Number(totalBuyQuantity)
              ) {
              } else {
                return await this.responseService.NOT_FOUND(
                  `You cannot buy,only available ${tappable.inventoryAvailableCount.toString()}. please make another payment intent`,
                  {},
                  res,
                );
              }
            }
            break;

          case await this.constantService.paymentReason.replace:
            const replaceTappable =
              await this.prismaService.replaceTappable.findUnique({
                where: { id: replaceTappableIdMetaData },
              });

            // step 1.check here first is inventory
            //step 2. check the available counter
            if (replaceTappable.isInventoryEnabled) {
              // step 3. check the out of stock ?
              if (replaceTappable.inventoryAvailableCount <= 0) {
                return await this.responseService.NOT_FOUND(
                  'You cannot buy!,Out of stock!',
                  {},
                  res,
                );
              }

              //Step 4. check the quantity
              //note we have to again check the capture payment before one time is out of stock or not
              if (
                Number(replaceTappable.inventoryAvailableCount) >=
                Number(totalBuyQuantity)
              ) {
              } else {
                return await this.responseService.NOT_FOUND(
                  `You cannot buy,only available ${replaceTappable.inventoryAvailableCount.toString()}, Please make the another payment intent`,
                  {},
                  res,
                );
              }
            }
            break;

          case await this.constantService.paymentReason.vanish:
            const vanish = await this.prismaService.replaceTappable.findUnique({
              where: { id: vanishIdMetaData },
              select: {
                price: true,
                isInventoryEnabled: true,
                inventoryCount: true,
                inventoryAvailableCount: true,
              },
            });

            // step 1.check here first is inventory
            //step 2. check the available counter
            if (vanish.isInventoryEnabled) {
              // step 3. check the out of stock ?
              if (vanish.inventoryAvailableCount <= 0) {
                return await this.responseService.NOT_FOUND(
                  'Out of stock, item not available',
                  {},
                  res,
                );
              }

              //Step 4. check the quantity
              //note we have to again check the capture payment before one time is out of stock or not
              if (
                Number(vanish.inventoryAvailableCount) >=
                Number(totalBuyQuantity)
              ) {
              } else {
                return await this.responseService.NOT_FOUND(
                  `You cannot buy,only available ${vanish.inventoryAvailableCount.toString()}`,
                  {},
                  res,
                );
              }
            }

            break;
          default:
            return await this.responseService.NOT_FOUND(
              'Invalid payment intent. Due to buy quantity issue',
              {},
              res,
            );
        }
      }

      const paymentIntent =
        await this.stripe.paymentIntents.capture(paymentIntentId);

      // after update only cou

      // Check if the payment was captured successfully
      if (paymentIntent.status !== 'succeeded') {
        // If the status is not 'succeeded', throw an error message
        return await this.responseService.NOT_FOUND(
          'Payment could not be captured, please try again or contact support.',
          {},
          res,
        );
      }
      // Retrieve the charge associated with the PaymentIntent
      const charges = await this.stripe.charges.list({
        payment_intent: paymentIntentId,
        limit: 1,
      });
      //@kiran4

      if (!charges.data.length) {
        return await this.responseService.NOT_FOUND(
          'No charge found for the provided PaymentIntent ID.',
          {},
          res,
        );
      }

      // Extract the charge details
      const charge = charges.data[0];
      const balanceTransactionId = charge.balance_transaction;

      // Retrieve the balance transaction to get more details
      // Ensure balanceTransactionId is a string before attempting to retrieve it
      if (typeof balanceTransactionId !== 'string') {
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'Invalid balance transaction ID type.',
          {},
          res,
        );
      }

      // Retrieve the balance transaction details
      // const balanceTransaction = await this.stripe.balanceTransactions.retrieve(balanceTransactionId);            // Extract metadata (ensure that tappableId is set during PaymentIntent creation)

      // Extract metadata to handle tappableId, boardId, vanishId, replaceTappableId
      const tappableId = paymentIntent.metadata?.tappableId;
      const boardId = paymentIntent.metadata?.boardId;
      const reactionId = paymentIntent.metadata?.reactionId;
      const vanishId = paymentIntent.metadata?.vanishId;
      const replaceTappableId = paymentIntent.metadata?.replaceTappableId;
      const paymentPurpose = paymentIntent.metadata?.paymentPurpose;
      const sellerAccountId = paymentIntent.metadata?.sellerAccountId;
      const title = paymentIntent.metadata?.title;
      const inventoryBuyCount = paymentIntent.metadata?.totalBuyQuantity;
      const isInventory = paymentIntent.metadata?.isInventory;

      // Handle tappableId, boardId, vanishId, or replaceTappableId
      const targetId =
        tappableId || boardId || vanishId || replaceTappableId || reactionId;

      if (!targetId) {
        return await this.responseService.NOT_FOUND(
          'No tappableId, boardId or reactionId found in PaymentIntent metadata.',
          {},
          res,
        );
      }

      if (!paymentPurpose) {
        return await this.responseService.NOT_FOUND(
          'No paymentPurpose in PaymentIntent metadata.',
          {},
          res,
        );
      }

      if (!sellerAccountId) {
        return await this.responseService.NOT_FOUND(
          'Seller account not found for the provided item.',
          {},
          res,
        );
      }
      // Check if customerId exists in the StripeCustomer table
      const existingCustomer =
        await this.prismaService.stripeCustomer.findFirst({
          where: {
            customerId: paymentIntent.customer as string,
          },
        });

      if (!existingCustomer) {
        return await this.responseService.NOT_FOUND(
          'Customer not found in the StripeCustomer table.',
          {},
          res,
        );
      }

      // Create the transaction record
      await this.prismaService.newTransaction.create({
        data: {
          stripeTransactionId: paymentIntent.id,
          customerId: existingCustomer.customerId,
          sellerAccountId: sellerAccountId,
          boardId: boardId || null,
          reactionId: reactionId || null,
          totalAmount: centsToDollars(Number(paymentIntent.amount)),
          price: centsToDollars(
            Number(paymentIntent.amount) -
              Number(paymentIntent.application_fee_amount || 0),
          ),
          paymentPurpose: paymentPurpose,
        },
      });

      if (paymentIntentRetrieve?.metadata?.isInventory == '1') {
        switch (paymentIntentRetrieve?.metadata?.paymentReason) {
          case await this.constantService.paymentReason.tappable:
            const tappable = await this.prismaService.tappable.findUnique({
              where: { id: tappableIdMetaData },
              include: { user: true }, // Include the user to get sellerAccountId
            });

            if (tappable) {
              await this.prismaService.tappable.update({
                where: {
                  id: tappable.id,
                },
                data: {
                  inventoryAvailableCount: {
                    decrement: Number(totalBuyQuantity),
                  },
                },
              });
            }
            break;
          case await this.constantService.paymentReason.replace:
            const replaceTappable =
              await this.prismaService.replaceTappable.findUnique({
                where: { id: replaceTappableIdMetaData },
              });
            if (replaceTappable) {
              await this.prismaService.replaceTappable.update({
                where: {
                  id: replaceTappableIdMetaData,
                },
                data: {
                  inventoryAvailableCount: {
                    decrement: Number(totalBuyQuantity),
                  },
                },
              });
            }
            break;

          case await this.constantService.paymentReason.vanish:
            const vanish = await this.prismaService.replaceTappable.findUnique({
              where: { id: vanishIdMetaData },
              select: {
                id: true,
                price: true,
                isInventoryEnabled: true,
                inventoryCount: true,
                inventoryAvailableCount: true,
              },
            });

            if (vanish) {
              await this.prismaService.replaceTappable.update({
                where: {
                  id: vanish.id,
                },
                data: {
                  inventoryAvailableCount: {
                    decrement: Number(totalBuyQuantity),
                  },
                },
              });
            }
            break;
          default:
            return await this.responseService.NOT_FOUND(
              'Invalid payment intent. Due to buy quantity issue',
              {},
              res,
            );
        }
      }

      return await this.responseService.success(
        'success',
        'Payment captured successfully',
        { paymentIntent: { status: paymentIntent.status } },

        res,
      );
    } catch (error: any) {
      // return await this.responseService.INTERNAL_SERVER_ERROR(
      //     'Internal server error',
      //     error.toString(),
      //     res,
      // );
      // Handle Stripe errors
      if (error.type === 'StripeCardError') {
        if (error.code === 'insufficient_funds') {
          return await this.responseService.BAD_REQUEST(
            'Your card has insufficient funds. Please try another payment method or contact your bank.',
            { errorCode: error.code, message: error.message },
            res,
          );
        }
        // Handle other card errors (e.g., expired card, invalid CVC)
        return await this.responseService.BAD_REQUEST(
          'Card declined. Please try another payment method or contact your bank.',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeInvalidRequestError') {
        // If the error is due to the payment already being captured
        if (error.code === 'payment_intent_unexpected_state') {
          return await this.responseService.BAD_REQUEST(
            'Payment has already been captured.',
            { message: error.message },
            res,
          );
        }
        return await this.responseService.BAD_REQUEST(
          'Invalid payment request.',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeAPIError') {
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'An error occurred with the payment processor.',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeConnectionError') {
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'Network error. Please check your connection and try again.',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeAuthenticationError') {
        return await this.responseService.UNAUTHORIZED(
          'Authentication failed. Please contact support.',
          res,
        );
      } else {
        // Handle any other errors
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'An unexpected error occurred during payment processing.',
          { message: error.message },
          res,
        );
      }
    }
  }

  async saveCard(paymentMethodId: string, res, aUser: RequestUserDto) {
    try {
      this.createCustomerHelper(aUser);
      let user = await this.prismaService.stripeCustomer.findFirst({
        where: {
          users: {
            some: {
              id: aUser.id,
            },
          },
        },
        select: {
          customerId: true,
        },
      });

      if (!user) {
        return await this.responseService.NOT_FOUND(
          'Invalid to save customer payment id, Customer not found!',
          {},
          res,
        );
      }
      // Attach the payment method to the customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.customerId,
      });
      // Optionally, you can set this payment method as the default payment method
      await this.stripe.customers.update(user.customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return await this.responseService.success(
        'success',
        'Payment method added successfully',
        paymentMethodId,
        res,
      );
    } catch (error) {
      console.error('Error creating payment method:', error);
      return await this.responseService.INTERNAL_SERVER_ERROR(
        error.toString(),
        'Internal server error',
        res,
      );
    }
  }

  async RemoveSaveCard(paymentMethodId: string, res, aUser: RequestUserDto) {
    try {
      // 1. Get the Stripe customer ID linked to this user
      const user = await this.prismaService.stripeCustomer.findFirst({
        where: {
          users: {
            some: {
              id: aUser.id,
            },
          },
        },
        select: {
          customerId: true,
        },
      });

      if (!user) {
        return await this.responseService.NOT_FOUND(
          "User not found! or That user don't have stripe account!",
          {},
          res,
        );
      }

      // 2. Retrieve the payment method to check ownership
      const paymentMethod =
        await this.stripe.paymentMethods.retrieve(paymentMethodId);

      if (!paymentMethod || paymentMethod.customer !== user.customerId) {
        return await this.responseService.BAD_REQUEST(
          'Payment method does not belong to the user',
          {},
          res,
        );
      }

      // 3. Detach the payment method
      const detachedPaymentMethod =
        await this.stripe.paymentMethods.detach(paymentMethodId);

      return await this.responseService.success(
        'success',
        'Payment method removed successfully',
        detachedPaymentMethod,
        res,
      );
    } catch (error) {
      console.error('Error detaching payment method:', error);
      return await this.responseService.INTERNAL_SERVER_ERROR(
        error.toString(),
        'Internal server error',
        res,
      );
    }
  }

  async listCards(customerId: string, res) {
    try {
      // Check if customerId is provided
      if (!customerId) {
        return await this.responseService.NOT_FOUND(
          'Customer ID is missing, please provide a valid Customer ID.',
          {},
          res,
        );
      }
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return await this.responseService.success(
        'success',
        'Payment cards retrieved successfully',
        paymentMethods.data,
        res,
      );
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async createAccountLink(req, aUser: RequestUserDto, businessType, res) {
    try {
      let FRONTEND_BASE_URL =
        this.configService.get<string>('FRONTEND_BASE_URL');
      if (
        aUser.role == (await this.constantService.newUserRole.privateCreator) ||
        aUser.role == (await this.constantService.newUserRole.standardUser)
      ) {
        return await this.responseService.UNAUTHORIZED('Invalid user', res);
      }

      const existingSellerAccount =
        await this.prismaService.sellerAccount.findFirst({
          where: {
            users: {
              some: { id: aUser.id }, // Check if the user is linked to an existing seller account
            },
          },
        });

      if (existingSellerAccount) {
        // If the existing seller account is not verified, regenerate the onboarding link
        if (!existingSellerAccount.verified) {
          const accountLink = await this.stripe.accountLinks.create({
            account: existingSellerAccount.sellerAccountId,
            refresh_url: FRONTEND_BASE_URL, // URL to redirect if the seller needs to retry
            return_url: `${FRONTEND_BASE_URL}/user-profile?sellerAccountId=${existingSellerAccount.sellerAccountId}`,
            // refresh_url: 'https://prymr-development-akshada.vercel.app', // URL to redirect if the seller needs to retry
            // return_url: `https://prymr-development-akshada.vercel.app/add-content?sellerAccountId=${existingSellerAccount.sellerAccountId}`, // URL to redirect after successful onboarding
            type: 'account_onboarding',
          });

          // Return the onboarding link again
          return await this.responseService.success(
            'success',
            'Account already exists but is not verified. Onboarding link sent again.',
            {
              url: accountLink,
            },
            res,
          );
        }

        // If the account is already verified
        return await this.responseService.success(
          'success',
          'Seller Account already verified',
          {},
          res,
        );
      }
      // Create a new account for the seller with all required details
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'US', // Change to the relevant country code
        email: aUser?.email?.trim()?.toLowerCase(), // Seller's email
        business_type: businessType, // Choose 'company', 'individual', or others based on the business type

        capabilities: {
          card_payments: { requested: true }, // Request card payments capability
          transfers: { requested: true }, // Request transfers capability
        },
      });


      //  Save the newly created seller account into your database
      await this.prismaService.sellerAccount.create({
        data: {
          sellerAccountId: account.id, // Store the Stripe account ID
          users: {
            connect: { id: aUser.id }, // Link the seller account to the current user
          },
        },
      });


      // Generate an account link to onboard the seller
      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: FRONTEND_BASE_URL, // URL to redirect if the seller needs to retry
        return_url: `${FRONTEND_BASE_URL}/user-profile?sellerAccountId=${account.id}`,
        // refresh_url: 'https://your-domain.com/reauth', // URL to redirect if the seller needs to retry
        // return_url: `http://localhost:3000/add-content?sellerAccountId=${account.id}`, // URL to redirect after successful onboarding
        type: 'account_onboarding',
      });
      // Return the URL to redirect the seller to complete onboarding
      return await this.responseService.success(
        'success',
        'Account link sent successfully',
        {
          url: accountLink,
        },
        res,
      );
    } catch (error) {
      console.error('Error creating account link:', error);
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async connectedAccountReturn(req, aUser: RequestUserDto, res) {
    // const { sellerAccountId } = req.query;
    // Fetch the seller account from the database for the current user
    const sellerAccount = await this.prismaService.sellerAccount.findFirst({
      where: {
        users: {
          some: { id: aUser.id }, // Ensure to fetch the seller account linked to the user
        },
      },
    });

    let FRONTEND_BASE_URL = this.configService.get<string>('FRONTEND_BASE_URL');
    // if (!sellerAccountId) {
    //     return await this.responseService.NOT_FOUND(
    //         'SellerAccountId is missing, please provide a valid Seller AccountId ID.',
    //         {},
    //         res,
    //     );
    // }
    // If no seller account is found for the user, return an error
    if (!sellerAccount) {
      return await this.responseService.NOT_FOUND(
        'No seller account found for the current user.',
        {},
        res,
      );
    }
    try {
      // Retrieve and verify the connected account details from Stripe
      const account = await this.stripe.accounts.retrieve(
        sellerAccount.sellerAccountId,
      );

      // Check if the account is fully verified
      if (account.charges_enabled) {
        // Save or update the seller account details in the database
        await this.prismaService.sellerAccount.upsert({
          where: { sellerAccountId: account.id },
          update: {
            sellerAccountId: account.id,
            verified: true,
          }, // Mark the account as verified,
          create: {
            sellerAccountId: account.id,
            verified: true, // Set verified to true
            users: { connect: { id: aUser.id } },
          },
        });
        // Account is verified and ready
        return await this.responseService.success(
          'success',
          'Seller account successfully connected!',
          {
            accountId: account.id,
            verified: true,
          },
          res,
        );
      } else {
        // Account requires further verification

        // Check for the fields that are missing or incomplete
        const missingFields = account.requirements?.currently_due || [];
        const pastDueFields = account.requirements?.past_due || [];

        // // Account requires further verification
        // return await this.responseService.success(
        //     'success',
        //     'Account connected but not fully verified.',
        //     {
        //         accountStatus: account
        //     },
        //     res
        // );
        // Generate a new account link for continuing onboarding
        const accountLink = await this.stripe.accountLinks.create({
          account: account.id,
          refresh_url: FRONTEND_BASE_URL, // URL to redirect if the seller needs to retry
          return_url: `${FRONTEND_BASE_URL}/user-profile?sellerAccountId=${account.id}`,
          // refresh_url: 'https://prymr-development-akshada.vercel.app', // URL to redirect if the seller needs to retry
          // return_url: `https://prymr-development-akshada.vercel.app/add-content?sellerAccountId=${account.id}`, // URL to redirect after successful onboarding
          // refresh_url: 'https://your-domain.com/reauth',
          // return_url: `https://your-domain.com/return?sellerAccountId=${account.id}`,
          type: 'account_onboarding',
        });
        // Return the missing fields and the account onboarding link
        return await this.responseService.success(
          'success',
          'Account connected but not fully verified. Further steps required.',
          {
            verified: false,
            missingFields: missingFields.concat(pastDueFields), // Combine missing and past due fields
            onboardingLink: accountLink.url, // Provide the onboarding link for the user to complete the process
          },
          res,
        );
      }
    } catch (error) {
      console.error('Error retrieving account:', error);
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async transactionHistory(
    aUser: RequestUserDto,
    page: number,
    pageSize: number,
    filterBy: 'credit' | 'debit' | 'platform_fee',
    res,
  ) {
    try {
      // Fetch the user data from the database including stripeCustomerId and sellerAccountId
      const userData = await this.prismaService.user.findFirst({
        where: { id: aUser.id },
        select: {
          isDefaultCreatorUser: true,
          stripeCustomerId: true, // Fetch stripeCustomerId
          sellerAccountId: true, // Fetch sellerAccountId
        },
      });

      // If no user is found, return an error
      if (!userData) {
        return await this.responseService.NOT_FOUND('User not found.', {}, res);
      }

      let stripeCustomerRecord = null;

      if (userData.stripeCustomerId) {
        // Fetch the stripe customer record only if stripeCustomerId is not null
        stripeCustomerRecord =
          await this.prismaService.stripeCustomer.findFirst({
            where: { id: userData.stripeCustomerId }, // Fetch the stripe customer record using the foreign key
          });

        // Handle case where the stripe customer record is not found
        if (!stripeCustomerRecord) {
          return await this.responseService.NOT_FOUND(
            'Stripe customer not found.',
            {},
            res,
          );
        }
      }

      // Fetch the seller account for the current user if sellerAccountId exists
      let sellerAccount = null;
      if (userData.sellerAccountId) {
        sellerAccount = await this.prismaService.sellerAccount.findFirst({
          where: {
            users: {
              some: { id: aUser.id }, // Fetch the seller account linked to the user
            },
          },
        });
      }

      // Initialize variables for total amounts
      let totalCredit = 0;
      let totalPlatformFee = 0;

      // Fetch total credit (seller received) amount
      if (filterBy === 'credit' && sellerAccount?.sellerAccountId) {
        totalCredit = Number(
          await this.getTotalEarningsForSeller(sellerAccount.sellerAccountId),
        );
      }

      // Fetch total platform fee (admin fee)
      if (filterBy === 'platform_fee' && userData.isDefaultCreatorUser) {
        // const balance = await this.stripe.balance.retrieve();
        // totalPlatformFee = (balance.available?.[0]?.amount || 0) / 100;
        totalPlatformFee = await this.getTotalAdminEarnings();
        let getTotalStripeFees = await this.getTotalStripeFees();
        // console.info("getTotalStripeFees :",getTotalStripeFees);
        totalPlatformFee = totalPlatformFee - getTotalStripeFees;
      }

      // Initialize variables for holding transactions
      let transactionIds: string[] = [];
      let totalTransactions = 0;

      // Fetch transaction IDs from newTransaction table
      if (filterBy === 'credit') {
        const rows = await this.prismaService.newTransaction.findMany({
          where: { receiverUserId: aUser.id },
          select: { stripeTransactionId: true },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        });
        totalTransactions = await this.prismaService.newTransaction.count({
          where: { receiverUserId: aUser.id },
        });
        transactionIds = rows
          .map((r) => r.stripeTransactionId)
          .filter(Boolean) as string[];
      } else if (filterBy === 'debit') {
        const rows = await this.prismaService.newTransaction.findMany({
          where: { senderUserId: aUser.id },
          select: { stripeTransactionId: true },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        });
        totalTransactions = await this.prismaService.newTransaction.count({
          where: { senderUserId: aUser.id },
        });
        transactionIds = rows
          .map((r) => r.stripeTransactionId)
          .filter(Boolean) as string[];
      } else if (filterBy === 'platform_fee' && userData.isDefaultCreatorUser) {
        const rows = await this.prismaService.newTransaction.findMany({
          select: { stripeTransactionId: true },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        });
        totalTransactions = await this.prismaService.newTransaction.count();
        transactionIds = rows
          .map((r) => r.stripeTransactionId)
          .filter(Boolean) as string[];
      }

      // Fetch transactions from Stripe API based on the retrieved transaction IDs
      //   const transactionDetails = await Promise.all(
      //     transactionIds.map(async (transactionId) => {
      //       const stripeTransaction =
      //         await this.stripe.paymentIntents.retrieve(transactionId);

      //       // Check if the transaction is for credit or debit
      //       const priceData =
      //         filterBy === 'credit'
      //           ? (Number(stripeTransaction.amount) -
      //               Number(stripeTransaction.application_fee_amount || 0)) /
      //             100 // For credit, subtract platform fee
      //           : Number(stripeTransaction.amount) / 100; // For debit, pass the direct amount

      //       const platformFee = (
      //         Number(stripeTransaction.application_fee_amount || 0) / 100
      //       ).toFixed(2);
      //       // Fetch the user based on the stripe customerId or stripe sellerAccountId
      //       // Fetch the user based on the stripe customerId or sellerAccountId
      //       let user = null;
      //       if (stripeTransaction.customer) {
      //         user = await this.prismaService.user.findFirst({
      //           where: {
      //             stripeCustomer: {
      //               // Match using the relationship to the StripeCustomer table
      //               customerId: stripeTransaction.customer as string,
      //             },
      //           },
      //           select: { firstName: true, lastName: true },
      //         });
      //       }

      //       const userName = user
      //         ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      //         : 'Unknown';

      //       return {
      //         transactionId: stripeTransaction.id,
      //         price: priceData,
      //         platformFee: platformFee,
      //         customerId: stripeTransaction.customer || 'Unknown',
      //         userName: userName,
      //         PaymentPurpose: stripeTransaction.metadata?.paymentPurpose || 'N/A',
      //         createdAt: new Date(stripeTransaction.created * 1000),
      //       };
      //     }),
      //   );
      const transactionDetails = await Promise.all(
        transactionIds.map(async (transactionId) => {
          const stripeTransaction =
            await this.stripe.paymentIntents.retrieve(transactionId);

          // Calculate Stripe fee: 2.9% + $0.30 per transaction
          const stripeFee =
            (Number(stripeTransaction.amount) * 0.029 + 30) / 100; // converting cents to dollars

          // Calculate platform fee (application fee), if exists
          const applicationFee =
            Number(stripeTransaction.application_fee_amount || 0) / 100; // Platform fee in dollars

          // Calculate final price for credit (subtract platform fee) or debit (direct amount)
          const priceData =
            filterBy === 'credit'
              ? (Number(stripeTransaction.amount) -
                  Number(stripeTransaction.application_fee_amount || 0)) /
                100
              : Number(stripeTransaction.amount) / 100;

          // Calculate and format platform fee (application fee)
          const platformFee = applicationFee.toFixed(2);

          // Fetch the user based on the Stripe customerId or sellerAccountId
          let user = null;
          if (stripeTransaction.customer) {
            user = await this.prismaService.user.findFirst({
              where: {
                stripeCustomer: {
                  customerId: stripeTransaction.customer as string, // Match using the StripeCustomer table
                },
              },
              select: { firstName: true, lastName: true },
            });
          }

          const userName = user
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
            : 'Unknown';

          return {
            transactionId: stripeTransaction.id,
            price: priceData, // Final price for the user (based on credit or debit)
            stripeFee: stripeFee.toFixed(2), // Stripe fee in dollars
            platformFee: platformFee, // Platform (application) fee in dollars
            customerId: stripeTransaction.customer || 'Unknown',
            userName: userName,
            PaymentPurpose: stripeTransaction.metadata?.paymentPurpose || 'N/A',
            createdAt: new Date(stripeTransaction.created * 1000), // Convert timestamp to readable date
          };
        }),
      );

      //Return the paginated transaction data along with relevant totals based on filterBy
      const responseData: any = {
        transactions: transactionDetails,
        totalTransactions: totalTransactions,
        totalCredit: totalCredit.toFixed(2),
        totalPlatformFee: totalPlatformFee.toFixed(2),
      };

      // // Conditionally add total amounts to the response based on the filterBy value
      // if (filterBy === 'credit') {
      //     responseData.totalCredit = totalCredit.toFixed(2);
      // }
      // else if (filterBy === 'platform_fee') {
      //     responseData.totalPlatformFee = totalPlatformFee.toFixed(2);
      // }
      // Return the paginated transaction data
      return await this.responseService.success(
        'success',
        `${filterBy === 'credit' ? 'Seller (credit)' : filterBy === 'debit' ? 'Customer (debit)' : 'Platform fee'} transactions retrieved successfully`,
        responseData,
        res,
      );
    } catch (error) {
      console.error('Error retrieving transaction list for user:', error);
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async getTotalEarningsForSeller(sellerAccountId: string) {
    try {
      let totalEarnings = 0;
      let hasMore = true;
      let lastChargeId = null;

      // Loop to paginate through all charges until there are no more left
      while (hasMore) {
        // Prepare the request parameters
        const chargeListParams: any = {
          limit: 100, // Limit to 100 per request (Stripe's default max)
        };

        // Only include `starting_after` if `lastChargeId` is not null
        if (lastChargeId) {
          chargeListParams.starting_after = lastChargeId;
        }

        // Fetch charges with pagination
        const charges = await this.stripe.charges.list(chargeListParams, {
          stripeAccount: sellerAccountId, // This needs to go in the options object
        });

        // totalEarnings += charges.data.reduce((sum, charge) => sum + charge.amount, 0);
        // Sum up the net earnings (subtract application fee if it exists)
        totalEarnings += charges.data.reduce((sum, charge) => {
          // Subtract the application fee if it exists
          const netAmount =
            charge.amount - (charge.application_fee_amount || 0);
          return sum + netAmount;
        }, 0);
        // Check if there are more charges to fetch
        hasMore = charges.has_more;

        // Update the last charge ID for pagination if there are more charges
        if (charges.data.length > 0) {
          lastChargeId = charges.data[charges.data.length - 1].id;
        }
      }

      // Convert the total earnings from cents to dollars
      const totalEarningsInDollars = (totalEarnings / 100).toFixed(2);

      console.log(
        `Total earnings for seller account ${sellerAccountId}: $${totalEarningsInDollars}`,
      );
      return totalEarningsInDollars;
    } catch (error) {
      console.error('Error fetching seller earnings:', error);
      return '0.00'; // Return a default value in case of error
    }
  }

  async getTotalAdminEarnings() {
    let totalEarnings = 0;
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params: any = {
        type: 'application_fee',
        limit: 100, // Fetch 100 records at a time
      };

      // Only add starting_after if it's not null
      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const transactions = await this.stripe.balanceTransactions.list(params);

      // Sum up the application fees
      transactions.data.forEach((transaction) => {
        totalEarnings += transaction.amount;
      });

      hasMore = transactions.has_more;

      // Update startingAfter if there are more transactions to fetch
      if (hasMore) {
        startingAfter = transactions.data[transactions.data.length - 1].id;
      }
    }
    return totalEarnings / 100; // Return the total earnings in USD format
  }
  async getTotalStripeFees() {
    let totalStripeFees = 0;
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params: any = {
        type: 'charge', // Stripe fees are included with charges
        limit: 100, // Fetch 100 records at a time
      };

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const transactions = await this.stripe.balanceTransactions.list(params);

      // Sum up the Stripe fees (they are negative values, so we use Math.abs)
      transactions.data.forEach((transaction) => {
        totalStripeFees += Math.abs(transaction.fee); // Stripe fees are often negative
      });

      hasMore = transactions.has_more;

      if (hasMore) {
        startingAfter = transactions.data[transactions.data.length - 1].id;
      }
    }

    return totalStripeFees / 100; // Return in USD
  }

  async listPaymentMethods1(
    customerId: string,
  ): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  }
  async listPaymentMethods(aUser: RequestUserDto, res) {
    // Find the Stripe customer ID for the user
    const findCustomerId = await this.prismaService.stripeCustomer.findFirst({
      where: {
        users: {
          some: {
            id: aUser.id,
          },
        },
      },
      select: {
        customerId: true,
      },
    });

    // Return error if customer not found
    if (!findCustomerId) {
      return await this.responseService.NOT_FOUND(
        'Email not found, please create the customer first',
        {},
        res,
      );
    }

    // Fetch payment methods from Stripe
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: findCustomerId.customerId,
      type: 'card',
    });

    // Initialize sanitized data array
    let sanitizedData = [];
    const seenLast4 = new Set();

    if (paymentMethods?.data) {
      // Sort payment methods by creation date (most recent first) to prioritize newer cards
      const sortedData = paymentMethods.data.sort(
        (a, b) => (b.created || 0) - (a.created || 0),
      );

      for (const { id, card, billing_details } of sortedData) {
        // Only include the first occurrence of each last4
        if (!seenLast4.has(card.last4)) {
          seenLast4.add(card.last4);
          sanitizedData.push({
            cardId: id,
            cardBrand: card.brand,
            exp_month: card?.exp_month,
            exp_year: card?.exp_year,
            last4: card.last4,
            name: billing_details.name ?? null,
            icon: null,
            email: billing_details.email,
          });
        }
      }
    }

    // Return success response with sanitized, unique data
    return await this.responseService.success(
      'success',
      'Payment list fetched successfully',
      sanitizedData,
      res,
    );
  }
  private async findOrCreateCustomer(email: string): Promise<Stripe.Customer> {
    // Try to find an existing customer by email
    const customers = await this.stripe.customers.list({ email });
    let customer = customers.data[0];

    if (!customer) {
      // Create a new customer if one doesn't exist
      customer = await this.stripe.customers.create({ email });
    }

    console.info(customer);

    return customer;
  }

  async updateCardPaymentsCapability(req, res) {
    try {
      // Update capabilities
      const updatedAccount = await this.stripe.accounts.update(
        'acct_1Q2BiVP1INhpMiMk',
        {
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        },
      );

      // Retrieve the account details to check for any pending requirements
      const account = await this.stripe.accounts.retrieve(
        'acct_1Q2PSh06zPVn558H',
      );
      const pendingRequirements = account.requirements.currently_due || [];

      // Return the response with updated capabilities and pending requirements
      return await this.responseService.success(
        'success',
        'Capabilities updated successfully',
        {
          capabilities: updatedAccount.capabilities,
          pendingRequirements: pendingRequirements,
        },
        res,
      );
    } catch (error) {
      console.error('Error updating capabilities:', error);
      res.status(400).json({
        success: false,
        message: 'Error updating capabilities',
        error: error,
      });
    }
  }

  async updateAccountRequirements(req, res) {
    const { accountId, individualData, externalAccount } = req.body;

    // Check if required data is present
    if (!accountId || !individualData) {
      return res
        .status(400)
        .json({ message: 'Missing account ID or individual data' });
    }

    try {
      // Update the individual section of the Stripe account
      const updatedAccount = await this.stripe.accounts.update(accountId, {
        individual: {
          first_name: individualData.firstName,
          last_name: individualData.lastName,
          email: individualData.email,
          phone: individualData.phone,
          dob: {
            day: individualData.dob.day,
            month: individualData.dob.month,
            year: individualData.dob.year,
          },
          address: {
            line1: individualData.address.line1,
            line2: individualData.address.line2,
            city: individualData.address.city,
            state: individualData.address.state,
            postal_code: individualData.address.postalCode,
            country: individualData.address.country,
          },
          id_number: individualData.idNumber, // Add ID number if needed
          ssn_last_4: individualData.ssnLast4, // Add SSN if applicable
        },
      });
      // Optionally update external bank account
      if (externalAccount) {
        await this.stripe.accounts.createExternalAccount(accountId, {
          external_account: externalAccount, // Pass the external account details like bank account or card details
        });
      }
      return await this.responseService.success(
        'success',
        'Account connected but not fully verified.',
        {
          account: updatedAccount,
        },
        res,
      );
    } catch (error) {
      console.error('Error updating Stripe account:', error);
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Internal server error',
        error.toString(),
        res,
      );
    }
  }

  async createPaymentMethod(req, res) {
    const { paymentMethodType, cardDetails, billingDetails, stripeAccount } =
      req.body;

    try {
      // Create the Payment Method
      const paymentMethod = await this.stripe.paymentMethods.create(
        {
          type: paymentMethodType,
          card: cardDetails,
          billing_details: billingDetails,
        },
        {
          stripeAccount, // Optional: Set the connected account ID if working in a connected account environment
        },
      );

      // Send the Payment Method ID back to the frontend
      res.json({ success: true, paymentMethodId: paymentMethod.id });
    } catch (error) {
      console.error('Error creating Payment Method:', error);
      res.status(400).json({ success: false, message: error });
    }
  }

  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string,
    sellerAccountId?: string, // Optional parameter for the connected account ID
  ) {
    try {
      // Determine the Stripe account context
      const stripeOptions = sellerAccountId
        ? { stripeAccount: sellerAccountId } // Use the connected account context if sellerAccountId is provided
        : {}; // Use the platform's context if not

      // Attach the PaymentMethod to the customer under the correct account context
      await this.stripe.paymentMethods.attach(
        paymentMethodId,
        {
          customer: customerId,
        },
        stripeOptions,
      );

      // Update the customer to set the default payment method
      await this.stripe.customers.update(
        customerId,
        {
          invoice_settings: { default_payment_method: paymentMethodId },
        },
        stripeOptions,
      );

      return {
        message: 'Payment method attached successfully',
        success: true,
        customerId: customerId,
      };
    } catch (error) {
      console.error('Error attaching payment method:', error);
      throw new BadRequestException('Failed to attach payment method.');
    }
  }

  async createPaymentIntent1(
    amount: number,
    currency: string,
    paymentMethodId: string,
    email: string,
    customerId: string,
    res,
  ) {
    try {
      // { clientSecret: paymentIntent?.client_secret };
      // Ensure all parameters are correctly passed
      if (!amount || !currency || !paymentMethodId || !email) {
        throw new BadRequestException('Missing required parameters.');
      }
      ///------------new flow--------------------------------
      let findCustomerId = await this.prismaService.payment.findFirst({
        where: {
          email: email?.trim().toLowerCase(),
        },
        select: {
          customerId: true,
        },
      });

      // / Create a connected account for the recipient (if required)
      // const createConnectedAccount1 = async (email: string) => {
      //   const account = await this.stripe.accounts.create({
      //     type: 'custom', // or 'express'
      //     country: 'US', // Or the recipient's country
      //     email: email,
      //     business_type: 'individual', // or 'company'
      //     individual: {
      //       email: email,
      //     },

      //     capabilities: {

      //       card_payments: { requested: true }, // Request card payment capability
      //       transfers: { requested: true }, // Request transfer capability

      //     },
      //   });

      //   return account.id;
      // };

      // // Use the connected account for payment
      // console.info("158");
      // const recipientAccountId1 = await createConnectedAccount1('kiran.mobilefirst1@gmail.com');

      let customer_id;
      //not found then create the customer and add to database and also attach to the list
      if (!findCustomerId) {
        //creating the customer of not found
        const newCustomer = await this.stripe.customers.create({
          email: email?.trim()?.toLowerCase(),
        });
        if (!newCustomer) {
          return await this.responseService.NOT_FOUND(
            'On stripe side customer not created, something is wrong',
            {},
            res,
          );
        }
        customer_id = newCustomer.id;
        await this.prismaService.payment.create({
          data: {
            customerId: newCustomer?.id,
            email: email?.trim()?.toLowerCase(),
          },
        });
      } else {
        customer_id = findCustomerId.customerId;
      }

      //--create customer
      const createConnectedAccount = async (email: string) => {
        const account = await this.stripe.accounts.create({
          type: 'custom', // or 'express'
          country: 'US', // or the recipient's country
          email: email,
          business_type: 'individual', // or 'company'
          individual: {
            email: email,
            // Additional details can be added here
          },
          capabilities: {
            card_payments: { requested: true }, // Request card payment capability
            transfers: { requested: true }, // Request transfer capability
          },
        });

        console.info('Connected Account:', account);
        return account.id;
      };

      // Example usage
      const recipientAccountId = await createConnectedAccount(
        'kiran.mobilefirst@gmail.com',
      );
      // const recipientAccountId = await createConnectedAccount('kirandarode04@gmail.com');

      console.info(recipientAccountId);
      // console.info(recipientAccountId);
      ///------------new flow--------------------------------

      // Create PaymentIntent

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        customer: customer_id, //"cus_QplN6tsdC52Ala" ,//customer_id,
        payment_method: paymentMethodId, //"pm_1Py5caHJvnanatbhSkAJZo3y",//paymentMethodId,
        confirmation_method: 'automatic',
        setup_future_usage: 'off_session',
        capture_method: 'manual', // // Manual capture to allow capturing at a later time
        confirm: false,
        receipt_email: 'kiran.mobilefirst@gmail.com', // Optional: Set email for receipts
        // transfer_data:{
        //   destination:recipientAccountId.
        // }
        // application_fee_amount:100,
        // automatic_payment_methods: {
        //   enabled: true,
        //   allow_redirects: 'never', // Disallow redirects if not needed
        // },
      });

      // Fetch payment methods attached to the customer
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customer_id,
        type: 'card',
      });

      // Check if the payment method is already attached
      const isPaymentMethodAttached = paymentMethods.data.some(
        (pm) => pm.id === paymentMethodId,
      );

      // Attach the payment method if it's not already attached
      if (!isPaymentMethodAttached) {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer_id,
        });
      }

      // Update customer's default payment method
      await this.stripe.customers.update(customer_id, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      return await this.responseService.success(
        'success',
        'Created successfully payment intent',
        { clientSecret: paymentIntent?.client_secret },
        res,
      );
    } catch (error) {
      console.error('Error creating PaymentIntent:', error);
      throw new BadRequestException('Failed to create PaymentIntent.');
    }
  }

  async createLoginLink() {
    try {
      const loginLink = await this.stripe.accounts.createLoginLink(
        'acct_1Q3HxoQeOlrdBlb3',
      );
      console.log('Login link:', loginLink.url);
      // Send this link to the account holder via SMS or any other secure means
    } catch (error) {
      console.error('Error creating login link:', error);
    }
  }

  async updateAccountLink() {
    try {
      await this.stripe.accounts.update('acct_1Q3Z4BPNisgeRS9l', {
        business_profile: {
          mcc: '1234', // Merchant Category Code - needs to be correct for your business type
          name: 'Your Business Name',
          product_description: 'Description of your business',
        },
        company: {
          address: {
            city: 'City Name',
            line1: 'Street Address',
            postal_code: 'Postal Code',
            state: 'State Name',
          },
          name: 'Company Name',
          tax_id: '123456789',
        },
        settings: {
          payments: {
            statement_descriptor: 'YOUR DESCRIPTOR',
          },
        },
      });
      const account = await this.stripe.accounts.retrieve(
        'acct_1Q3Z4BPNisgeRS9l',
      );

      console.log('Account Requirements:', account.requirements);

      // // Update individual person details
      // await stripe.accounts.updatePerson('<CONNECTED_ACCOUNT_ID>', '<PERSON_ID>', {
      //     address: {
      //         city: 'City Name',
      //         line1: 'Street Address',
      //         postal_code: 'Postal Code',
      //         state: 'State Name',
      //     },
      //     dob: {
      //         day: 1,
      //         month: 1,
      //         year: 1990,
      //     },
      //     email: 'email@example.com',
      //     phone: '+1234567890',
      //     ssn_last_4: '1234',
      // });

      // Send the URL to the connected account holder
      // Send this link to the account holder via SMS or any other secure means
    } catch (error) {
      console.error('Error creating login link:', error);
    }
  }

  // async createIntentTip(aUser, data: TipDto, res) {
  //   try {
  //     const { boardId, featureName, userId, amount, paymentMethodId } = data;

  //     //----- basic validations--------------------------

  //     if (!paymentMethodId) {
  //       return await this.responseService.NOT_FOUND(
  //         'Pass the payment method id',
  //         {},
  //         res,
  //       );
  //     }
  //     //if board id got means it is the board tip
  //     //userid got means user tip
  //     if (featureName === 'BoardTipPayment') {
  //       if (!boardId) {
  //         return await this.responseService.NOT_FOUND(
  //           'Board id must require',
  //           {},
  //           res,
  //         );
  //       }
  //     }
  //     if (featureName === 'UserTipPayment') {
  //       if (!userId) {
  //         return await this.responseService.NOT_FOUND(
  //           'User id must require',
  //           {},
  //           res,
  //         );
  //       }
  //     }
  //     //-------------------- Stripe calculations-----------------------------------------------------

  //     const amountInCents = Math.round(amount * 100); // Now 10 becomes 1000
  //     const stripeFee = Math.round(amountInCents * 0.029) + 30;
  //     const applicationFee = Math.round(
  //       amountInCents * Number(process.env.APPLICATION_FEE),
  //     );
  //     const sellerReceive = amountInCents - stripeFee - applicationFee;

  //     //  ---------- customer id validate or not exits then create it-----------------------------------
  //     let customerId: any = (await this.createCustomerHelper(aUser)).customerId;
  //     let sellerAccountId: any;
  //     if (!customerId) {
  //       return await this.responseService.NOT_FOUND(
  //         'something is wrong customer creation',
  //         {},
  //         res,
  //       );
  //     }
  //     //-----------------------------------------------------------------------------------------

  //     // if not found then create the customer immediately

  //     if (boardId) {
  //       let board = await this.prismaService.board.findFirst({
  //         where: {
  //           id: boardId,
  //         },
  //         select: {
  //           userId: true,
  //           user: {
  //             select: {
  //               sellerAccount: {
  //                 select: {
  //                   sellerAccountId: true,
  //                 },
  //               },
  //               // stripeCustomer: {
  //               //   select: {
  //               //     customerId: true,
  //               //   },
  //               // },
  //             },
  //           },
  //         },
  //       });

  //       if (!board) {
  //         return await this.responseService.NOT_FOUND(
  //           'Invalid board id! Pass the valid board id',
  //           {},
  //           res,
  //         );
  //       }

  //       if (!board?.user?.sellerAccount) {
  //         return await this.responseService.NOT_FOUND(
  //           'Creator user not found stipe account',
  //           {},
  //           res,
  //         );
  //       }
  //       sellerAccountId = board?.user?.sellerAccount;
  //       //@kiran2
  //       const paymentIntent = await this.stripe.paymentIntents.create({
  //         amount: amountInCents,
  //         currency: 'USD',
  //         customer: customerId,
  //         payment_method: paymentMethodId,
  //         confirmation_method: 'automatic',
  //         setup_future_usage: 'off_session',
  //         capture_method: 'manual',
  //         confirm: true,
  //         // requires_confirmation:false,
  //         receipt_email: aUser.email,
  //         on_behalf_of: sellerAccountId,
  //         application_fee_amount: applicationFee,
  //         transfer_data: {
  //           destination: sellerAccountId,
  //         },
  //         metadata: {
  //           stripeFee: stripeFee,
  //           applicationFee: applicationFee,
  //           purpose: 'BoardTipPayment',
  //           sellerReceiveAmount: sellerReceive / 100,
  //         },
  //         automatic_payment_methods: {
  //           enabled: true,
  //           allow_redirects: 'never', // Prevents redirect-based payment methods
  //         },
  //       });
  //       console.info(
  //         'unexpert=====================================================',
  //       );

  //       return await this.responseService.success(
  //         'success',
  //         'Created successfully payment intent',
  //         {
  //           clientSecret: paymentIntent?.client_secret,
  //           paymentIntentId: paymentIntent.id,
  //         },
  //         res,
  //       );
  //     } else {
  //       //user profile wise tip flow
  //       //seller account id attach;
  //       let sellerAccount = await this.prismaService.sellerAccount.findFirst({
  //         where: {
  //           users: {
  //             some: {
  //               id: userId,
  //             },
  //           },
  //         },
  //         select: {
  //           sellerAccountId: true,
  //         },
  //       });
  //       if (!sellerAccount.sellerAccountId) {
  //         return await this.responseService.NOT_FOUND(
  //           'Creator user not found stipe account',
  //           {},
  //           res,
  //         );
  //       }

  //       // 1. Create PaymentIntent (unchanged)
  //       const paymentIntent = await this.stripe.paymentIntents.create({
  //         amount: amountInCents,
  //         currency: 'USD',
  //         customer: customerId,
  //         payment_method: paymentMethodId,
  //         capture_method: 'manual',
  //         confirm: false,
  //         setup_future_usage: 'off_session',
  //         receipt_email: aUser.email,
  //         on_behalf_of: sellerAccountId,
  //         application_fee_amount: applicationFee,
  //         transfer_data: {
  //           destination: sellerAccountId,
  //         },
  //         metadata: {
  //           stripeFee: stripeFee,
  //           applicationFee: applicationFee,
  //           purpose: 'UserTipPayment',
  //           sellerReceiveAmount: sellerReceive / 100,
  //         },
  //         automatic_payment_methods: {
  //           enabled: true,
  //           allow_redirects: 'never',
  //         },
  //       });
  //       return await this.responseService.success(
  //         'success',
  //         'Created successfully payment intent',
  //         {
  //           clientSecret: paymentIntent?.client_secret,
  //           paymentIntentId: paymentIntent.id,
  //         },
  //         res,
  //       );
  //     }
  //     // reaction login  add here....
  //   } catch (error) {
  //     console.info(error);
  //     return await this.responseService.INTERNAL_SERVER_ERROR(
  //       'Internal server error',
  //       error.toString(),
  //       res,
  //     );
  //   }

  //   // here short function to create the customer
  // }

  // // @kiran4
  // async captureTipPayment(paymentIntentId: string, aUser: RequestUserDto, res) {
  //   try {
  //     if (!paymentIntentId) {
  //       return await this.responseService.NOT_FOUND(
  //         'paymentIntentId not found',
  //         {},
  //         res,
  //       );
  //     }
  //     // Retrieve the PaymentIntent to check its status
  //     const paymentIntentRetrieve =
  //       await this.stripe.paymentIntents.retrieve(paymentIntentId);
  //     // console.info(paymentIntentRetrieve);
  //     if (!paymentIntentRetrieve) {
  //       return await this.responseService.NOT_FOUND(
  //         'paymentIntentId invalid! pass the valid id',
  //         {},
  //         res,
  //       );
  //     }
  //     // Check if the PaymentIntent is already captured
  //     if (paymentIntentRetrieve.status === 'succeeded') {
  //       return await this.responseService.BAD_REQUEST(
  //         'Payment has already been captured.',
  //         { paymentIntent: { status: paymentIntentRetrieve.status } },
  //         res,
  //       );
  //     }

  //     const purpose = paymentIntentRetrieve.metadata?.purpose;
  //     const applicationFee = paymentIntentRetrieve.metadata?.applicationFee;
  //     const sellerReceiveAmount =
  //       paymentIntentRetrieve.metadata?.sellerReceiveAmount;
  //     const stripeFee = paymentIntentRetrieve.metadata?.stripeFee;

  //     const paymentIntent =
  //       await this.stripe.paymentIntents.capture(paymentIntentId);
  //     console.info(paymentIntent);
  //     // after update only cou

  //     // Check if the payment was captured successfully
  //     if (paymentIntent.status !== 'succeeded') {
  //       // If the status is not 'succeeded', throw an error message
  //       return await this.responseService.NOT_FOUND(
  //         'Payment could not be captured, please try again or contact support.',
  //         {},
  //         res,
  //       );
  //     }
  //     // Retrieve the charge associated with the PaymentIntent
  //     const charges = await this.stripe.charges.list({
  //       payment_intent: paymentIntentId,
  //       limit: 1,
  //     });

  //     if (!charges.data.length) {
  //       return await this.responseService.NOT_FOUND(
  //         'No charge found for the provided PaymentIntent ID.',
  //         {},
  //         res,
  //       );
  //     }

  //     // Extract the charge details
  //     const charge = charges.data[0];
  //     const balanceTransactionId = charge.balance_transaction;
  //     return await this.responseService.success(
  //       'success',
  //       'Payment success',
  //       { paymentIntent },
  //       res,
  //     );
  //   } catch (error: any) {
  //     console.info(error);
  //     if (error.type === 'StripeCardError') {
  //       if (error.code === 'insufficient_funds') {
  //         return await this.responseService.BAD_REQUEST(
  //           'Your card has insufficient funds. Please try another payment method or contact your bank.',
  //           { errorCode: error.code, message: error.message },
  //           res,
  //         );
  //       }
  //       // Handle other card errors (e.g., expired card, invalid CVC)
  //       return await this.responseService.BAD_REQUEST(
  //         'Card declined. Please try another payment method or contact your bank.',
  //         { errorCode: error.code, message: error.message },
  //         res,
  //       );
  //     } else if (error.type === 'StripeInvalidRequestError') {
  //       // If the error is due to the payment already being captured
  //       if (error.code === 'payment_intent_unexpected_state') {
  //         return await this.responseService.BAD_REQUEST(
  //           'Payment has already been captured.',
  //           { message: error.message },
  //           res,
  //         );
  //       }
  //       return await this.responseService.BAD_REQUEST(
  //         'Invalid payment request.',
  //         { errorCode: error.code, message: error.message },
  //         res,
  //       );
  //     } else if (error.type === 'StripeAPIError') {
  //       return await this.responseService.INTERNAL_SERVER_ERROR(
  //         'An error occurred with the payment processor.',
  //         { errorCode: error.code, message: error.message },
  //         res,
  //       );
  //     } else if (error.type === 'StripeConnectionError') {
  //       return await this.responseService.INTERNAL_SERVER_ERROR(
  //         'Network error. Please check your connection and try again.',
  //         { errorCode: error.code, message: error.message },
  //         res,
  //       );
  //     } else if (error.type === 'StripeAuthenticationError') {
  //       return await this.responseService.UNAUTHORIZED(
  //         'Authentication failed. Please contact support.',
  //         res,
  //       );
  //     } else {
  //       // Handle any other errors
  //       return await this.responseService.INTERNAL_SERVER_ERROR(
  //         'An unexpected error occurred during payment processing.',
  //         { message: error.toString() },
  //         res,
  //       );
  //     }
  //   }
  // }

  async createIntentTip(aUser: RequestUserDto, data: TipDto, res) {
    try {
      let { boardId, featureName, userId, amount, paymentMethodId } = data;

      // Basic validations
      if (!paymentMethodId) {
        return await this.responseService.NOT_FOUND(
          'Pass the payment method id',
          {},
          res,
        );
      }

      if (featureName === 'BoardTipPayment' && !boardId) {
        return await this.responseService.NOT_FOUND(
          'Board id must be provided',
          {},
          res,
        );
      }

      if (featureName === 'ReactionTipPayment' && !boardId) {
        return await this.responseService.NOT_FOUND(
          'Board id must be provided',
          {},
          res,
        );
      }

      if (featureName === 'UserTipPayment' && !userId) {
        return await this.responseService.NOT_FOUND(
          'User id must be provided',
          {},
          res,
        );
      }

      // Stripe calculations
      const amountInCents = Math.round(amount * 100);
      const stripeFee = Math.round(amountInCents * 0.029) + 30;
      const applicationFee =
        Math.round(amountInCents * Number(process.env.APPLICATION_FEE)) +
        stripeFee;
      const sellerReceive = amountInCents - applicationFee;

      // Get or create customer
      const customer = await this.createCustomerHelper(aUser);
      if (!customer?.customerId) {
        return await this.responseService.NOT_FOUND(
          'Failed to create or retrieve customer',
          {},
          res,
        );
      }
      const customerId = customer.customerId;

      let sellerAccountId: string;
      if (featureName === 'BoardTipPayment') {
        // Fetch board and seller account
        const board = await this.prismaService.board.findFirst({
          where: { id: boardId },
          select: {
            user: {
              select: {
                id: true,
                sellerAccount: {
                  select: {
                    sellerAccountId: true,
                  },
                },
              },
            },
          },
        });

        if (!board) {
          return await this.responseService.NOT_FOUND(
            'Invalid board id',
            {},
            res,
          );
        }

        if (!board?.user?.sellerAccount?.sellerAccountId) {
          return await this.responseService.NOT_FOUND(
            'Creator does not have a Stripe account',
            {},
            res,
          );
        }
        sellerAccountId = board.user.sellerAccount.sellerAccountId;
        userId = board?.user?.id;
      } else if (featureName === 'ReactionTipPayment') {
        // Fetch board and seller account
        const board = await this.prismaService.board.findFirst({
          where: { id: boardId },
          select: {
            user: {
              select: {
                id: true,
                sellerAccount: {
                  select: {
                    sellerAccountId: true,
                  },
                },
              },
            },
          },
        });

        if (!board) {
          return await this.responseService.NOT_FOUND(
            'Invalid board id',
            {},
            res,
          );
        }

        if (!board?.user?.sellerAccount?.sellerAccountId) {
          return await this.responseService.NOT_FOUND(
            'Creator does not have a Stripe account',
            {},
            res,
          );
        }
        sellerAccountId = board.user.sellerAccount.sellerAccountId;
        userId = board?.user?.id;
      } else {
        // Fetch seller account for user tip
        const sellerAccount = await this.prismaService.sellerAccount.findFirst({
          where: {
            users: {
              some: { id: userId },
            },
          },
          select: {
            sellerAccountId: true,
          },
        });

        if (!sellerAccount?.sellerAccountId) {
          return await this.responseService.NOT_FOUND(
            'Creator does not have a Stripe account',
            {},
            res,
          );
        }
        sellerAccountId = sellerAccount.sellerAccountId;
      }

      // Create PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: 'USD',
          customer: customerId,
          payment_method: paymentMethodId,
          capture_method: 'manual',
          confirm: false,
          setup_future_usage: 'off_session',
          receipt_email: aUser.email,
          on_behalf_of: sellerAccountId,
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: sellerAccountId,
          },
          metadata: {
            // All monetary values stored in DOLLARS for consistent DB writes
            stripeFee: centsToDollars(stripeFee),
            applicationFee: centsToDollars(applicationFee),
            sellerReceiveAmount: centsToDollars(sellerReceive),
            amount: String(amount),
            purpose: featureName,
            senderUserId: aUser?.id,
            receiverUserId: userId,
            customerId: customerId,
            sellerAccountId: sellerAccountId,
            boardId: boardId,
          },
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
        },
        { idempotencyKey: uuidv4() },
      );

      return await this.responseService.success(
        'success',
        'Payment intent created successfully',
        {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        },
        res,
      );
    } catch (error: any) {
      console.error('Create intent error:', error);
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Failed to create payment intent',
        { message: error.message || error.toString() },
        res,
      );
    }
  }

  async captureTipPayment(paymentIntentId: string, aUser: RequestUserDto, res) {
    try {
      if (!paymentIntentId) {
        return await this.responseService.NOT_FOUND(
          'paymentIntentId not found',
          {},
          res,
        );
      }

      // Retrieve PaymentIntent
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (!paymentIntent) {
        return await this.responseService.NOT_FOUND(
          'Invalid paymentIntentId',
          {},
          res,
        );
      }

      // Check PaymentIntent status
      if (paymentIntent.status === 'succeeded') {
        return await this.responseService.BAD_REQUEST(
          'Payment has already been captured',
          { status: paymentIntent.status },
          res,
        );
      }

      if (paymentIntent.status !== 'requires_capture') {
        return await this.responseService.BAD_REQUEST(
          `Cannot capture PaymentIntent. Current status: ${paymentIntent.status}. Expected: requires_capture`,
          { status: paymentIntent.status },
          res,
        );
      }

      // Capture PaymentIntent
      const capturedIntent =
        await this.stripe.paymentIntents.capture(paymentIntentId);

      if (capturedIntent.status !== 'succeeded') {
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'Payment capture failed',
          { status: capturedIntent.status },
          res,
        );
      }

      // Optionally retrieve charge details
      const charges = await this.stripe.charges.list({
        payment_intent: paymentIntentId,
        limit: 1,
      });

      if (!charges.data.length) {
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'No charge found for PaymentIntent',
          {},
          res,
        );
      }
      let paymentIntentRetrieve = capturedIntent;
      await this.prismaService.newTransaction.create({
        data: {
          applicationFee: paymentIntentRetrieve?.metadata.applicationFee,
          stripeFee: paymentIntentRetrieve?.metadata?.stripeFee,
          receiverUserId: paymentIntentRetrieve?.metadata?.receiverUserId,
          senderUserId: paymentIntentRetrieve?.metadata?.senderUserId,
          paymentPurpose: paymentIntentRetrieve?.metadata.purpose,
          customerId: paymentIntentRetrieve.metadata?.customerId,
          sellerAccountId: paymentIntentRetrieve?.metadata?.sellerAccountId,
          totalAmount: paymentIntentRetrieve?.metadata?.amount,
          price: paymentIntentRetrieve?.metadata?.sellerReceiveAmount,
          stripeTransactionId: paymentIntentRetrieve?.id,
          boardId: paymentIntentRetrieve?.metadata?.boardId,
        },
      });

      return await this.responseService.success(
        'success',
        'Payment captured successfully',
        { paymentIntent: capturedIntent },
        res,
      );
    } catch (error: any) {
      console.error('Capture error:', error);
      if (error.type === 'StripeCardError') {
        return await this.responseService.BAD_REQUEST(
          'Card declined. Please try another payment method',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeInvalidRequestError') {
        if (error.code === 'payment_intent_unexpected_state') {
          return await this.responseService.BAD_REQUEST(
            'PaymentIntent cannot be captured due to its current state',
            { errorCode: error.code, message: error.message },
            res,
          );
        }
        return await this.responseService.BAD_REQUEST(
          'Invalid payment request',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeAPIError') {
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'Payment processor error',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeConnectionError') {
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'Network error. Please try again',
          { errorCode: error.code, message: error.message },
          res,
        );
      } else if (error.type === 'StripeAuthenticationError') {
        return await this.responseService.UNAUTHORIZED(
          'Authentication failed. Please contact support',
          res,
        );
      } else {
        return await this.responseService.INTERNAL_SERVER_ERROR(
          'Unexpected error during payment processing',
          { message: error.message || error.toString() },
          res,
        );
      }
    }
  }
  async captureReactionTipPayment(
    paymentIntentId: string,
    aUser: RequestUserDto,
  ) {
    try {
      // Retrieve PaymentIntent
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (!paymentIntent) {
        return { msg: 'Invalid paymentIntentId', status: false, id: null };
      }

      // Check PaymentIntent status
      if (paymentIntent.status === 'succeeded') {
        return {
          msg: 'Payment has already been captured',
          status: false,
          id: null,
        };
      }

      if (paymentIntent.status !== 'requires_capture') {
        return {
          msg: `Cannot capture PaymentIntent. Current status: ${paymentIntent.status}. Expected: requires_capture`,
          status: false,
          id: null,
        };
      }

      // Capture PaymentIntent
      const capturedIntent =
        await this.stripe.paymentIntents.capture(paymentIntentId);

      if (capturedIntent.status !== 'succeeded') {
        return { msg: `Payment capture feiled`, status: false, id: null };
      }

      // Optionally retrieve charge details
      const charges = await this.stripe.charges.list({
        payment_intent: paymentIntentId,
        limit: 1,
      });

      if (!charges.data.length) {
        return {
          msg: 'No charge found for PaymentIntent',
          status: false,
          id: null,
        };
      }
      let paymentIntentRetrieve = capturedIntent;
      let { id } = await this.prismaService.newTransaction.create({
        data: {
          applicationFee: paymentIntentRetrieve?.metadata.applicationFee,
          stripeFee: paymentIntentRetrieve?.metadata?.stripeFee,
          receiverUserId: paymentIntentRetrieve?.metadata?.receiverUserId,
          senderUserId: paymentIntentRetrieve?.metadata?.senderUserId,
          paymentPurpose: 'Reaction Tip',
          customerId: paymentIntentRetrieve.metadata?.customerId,
          sellerAccountId: paymentIntentRetrieve?.metadata?.sellerAccountId,
          totalAmount: paymentIntentRetrieve?.metadata?.amount,
          price: paymentIntentRetrieve?.metadata?.sellerReceiveAmount,
          stripeTransactionId: paymentIntentRetrieve?.id,
          // boardId:paymentIntentRetrieve?.metadata?.boardId,
        },
      });

      return { msg: 'Payment captured successfully', status: true, id: id };
    } catch (error: any) {
      console.error('Capture error:', error);
      return { msg: error.code, status: false, id: null };

      // if (error.type === 'StripeCardError') {
      //   return await this.responseService.BAD_REQUEST(
      //     'Card declined. Please try another payment method',
      //     { errorCode: error.code, message: error.message },
      //     res,
      //   );
      // } else if (error.type === 'StripeInvalidRequestError') {
      //   if (error.code === 'payment_intent_unexpected_state') {
      //     return await this.responseService.BAD_REQUEST(
      //       'PaymentIntent cannot be captured due to its current state',
      //       { errorCode: error.code, message: error.message },
      //       res,
      //     );
      //   }
      //   return await this.responseService.BAD_REQUEST(
      //     'Invalid payment request',
      //     { errorCode: error.code, message: error.message },
      //     res,
      //   );
      // } else if (error.type === 'StripeAPIError') {
      //   return await this.responseService.INTERNAL_SERVER_ERROR(
      //     'Payment processor error',
      //     { errorCode: error.code, message: error.message },
      //     res,
      //   );
      // } else if (error.type === 'StripeConnectionError') {
      //   return await this.responseService.INTERNAL_SERVER_ERROR(
      //     'Network error. Please try again',
      //     { errorCode: error.code, message: error.message },
      //     res,
      //   );
      // } else if (error.type === 'StripeAuthenticationError') {
      //   return await this.responseService.UNAUTHORIZED(
      //     'Authentication failed. Please contact support',
      //     res,
      //   );
      // } else {
      //   return await this.responseService.INTERNAL_SERVER_ERROR(
      //     'Unexpected error during payment processing',
      //     { message: error.message || error.toString() },
      //     res,
      //   );
      // }
    }
  }

  // total balance only seller can check''
  async checkBal(stripeAccountId) {
    const balance = await this.stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });
    return balance;
  }
  async checkAccountIsSetupOrNot(aUser: RequestUserDto, res) {
    try {
      if (
        aUser.role === (await this.constantService.newUserRole.standardUser)
      ) {
        return await this.responseService.NOT_FOUND('Invalid user', {}, res);
      }
      let sellerStripeId;
      let url;

      if (
        aUser.role == (await this.constantService.newUserRole.publicCreator)
      ) {
        sellerStripeId = await this.prismaService.sellerAccount.findFirst({
          where: {
            users: {
              some: {
                id: aUser.id,
              },
            },
          },
        });

        if (sellerStripeId) {
          const account = await this.stripe.accounts.retrieve(
            sellerStripeId.sellerAccountId,
          );
          const transfersCapability = account.capabilities?.transfers;
          if (!transfersCapability || transfersCapability !== 'active') {
            // The user hasn't finished onboarding
            const accountLink = await this.stripe.accountLinks.create({
              account: sellerStripeId.sellerAccountId,
              refresh_url: this.configService.get('FRONTEND_BASE_URL'),
              return_url: `${this.configService.get('FRONTEND_BASE_URL')}/user-profile?sellerAccountId=${sellerStripeId.sellerAccountId}`,
              type: 'account_onboarding',
            });
            url = accountLink.url;
          } else {
            await this.prismaService.user.update({
              where: {
                id: aUser.id,
              },
              data: {
                isStripeOnBoardingDone: true,
              },
            });
          }
        }
      }

      let isStipeAttached = false;
      isStipeAttached = url ? false : true;
      isStipeAttached = sellerStripeId ? true : false;
      return await this.responseService.success(
        'success',
        'fetched stripe attached status',
        {
          sellerStripeId: sellerStripeId?.sellerAccountId,
          url: url ? url : null,
          isStipeAttached: isStipeAttached,
        },
        res,
      );
    } catch (error: any) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'error',
        { message: error.message || error.toString() },
        res,
      );
    }
  }
  async checkAccountIsSetupOrNotIdWise(userId, res) {
    try {
      if (!userId && !IsUUID(userId)) {
        return await this.responseService.NOT_FOUND(
          'user id not found! Please pass the user id',
          {},
          res,
        );
      }
      let sellerStripeId;
      let url;

      let aUser = await this.prismaService.user.findUnique({
        where: { id: userId },
      });
      if (!aUser) {
        return await this.responseService.NOT_FOUND(
          'Invalid user id!User not found',
          {},
          res,
        );
      }
      if (aUser.role == (await this.constantService.newUserRole.standardUser)) {
        return await this.responseService.NOT_FOUND('Invalid user!', {}, res);
      }

      if (
        aUser.role == (await this.constantService.newUserRole.publicCreator) ||
        (await this.constantService.newUserRole.admin)
      ) {
        sellerStripeId = await this.prismaService.sellerAccount.findFirst({
          where: {
            users: {
              some: {
                id: aUser.id,
              },
            },
          },
        });

        if (sellerStripeId) {
          const account = await this.stripe.accounts.retrieve(
            sellerStripeId.sellerAccountId,
          );
          const transfersCapability = account.capabilities?.transfers;
          if (!transfersCapability || transfersCapability !== 'active') {
            // The user hasn't finished onboarding
            const accountLink = await this.stripe.accountLinks.create({
              account: sellerStripeId.sellerAccountId,
              refresh_url: this.configService.get('FRONTEND_BASE_URL'),
              return_url: `${this.configService.get('FRONTEND_BASE_URL')}/user-profile?sellerAccountId=${sellerStripeId.sellerAccountId}`,
              type: 'account_onboarding',
            });
            url = accountLink.url;
          } else {
            await this.prismaService.user.update({
              where: {
                id: aUser.id,
              },
              data: {
                isStripeOnBoardingDone: true,
              },
            });
          }
        }
      }

      let isStipeAttached = false;
      isStipeAttached = url ? false : true;
      isStipeAttached = sellerStripeId ? true : false;
      return await this.responseService.success(
        'success',
        'fetched stripe attached status',
        {
          sellerStripeId: sellerStripeId?.sellerAccountId,
          // url: url ? url : null,
          isStipeAttached: isStipeAttached,
        },
        res,
      );
    } catch (error: any) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'error',
        { message: error.message || error.toString() },
        res,
      );
    }
  }

  // async fetchTransactions(res, aUser: RequestUserDto) {
  //   try {
  //     let user = await this.prismaService.user.findFirst({
  //       where: {
  //         id: aUser.id,
  //       },
  //     });

  //     if (user.role != (await this.constantService.userRole.publicUser)) {
  //       return await this.responseService.NOT_FOUND(
  //         'Invalid user! user should be creator',
  //         {},
  //         res,
  //       );
  //     }
  //     let stripeAccountId = await this.prismaService.sellerAccount.findFirst({
  //       where: {
  //         users: {
  //           some: {
  //             id: aUser.id,
  //           },
  //         },
  //       },
  //       select: {
  //         sellerAccountId: true,
  //       },
  //     });
  //     let fetchTotalBal = await this.checkBal(stripeAccountId.sellerAccountId);
  //     let transactionHistory = await this.prismaService.newTransaction.findMany(
  //       {
  //         where: {
  //           OR: [
  //             {
  //               receiverUserId: aUser.id,
  //             },
  //             {
  //               senderUserId: aUser.id,
  //             },
  //           ],
  //         },
  //         select: {
  //           id: true,
  //           applicationFee: true,
  //           paymentPurpose: true,
  //           price: true,
  //           totalAmount: true,
  //           stripeFee: true,
  //           createdAt: true,
  //           senderUser: {
  //             select: {
  //               id: true,
  //               profileIcon: true,
  //               firstName: true,
  //               lastName: true,
  //               email: true,
  //               userName: true,
  //             },
  //           },
  //           receiverUser: {
  //             select: {
  //               id: true,
  //               profileIcon: true,
  //               firstName: true,
  //               lastName: true,
  //               email: true,
  //               userName: true,
  //             },
  //           },
  //         },
  //       },
  //     );
  //   } catch (error: any) {
  //     return await this.responseService.INTERNAL_SERVER_ERROR(
  //       'Unexpected error during payment processing',
  //       error.toString(),
  //       res,
  //     );
  //   }
  // }

  async fetchTransactions(
    res,
    aUser: RequestUserDto,
    page: number = 1,
    limit: number = 10,
    month?: string,
  ) {
    try {
      // Validate user role
      const user = await this.prismaService.user.findFirst({
        where: {
          id: aUser.id,
        },
      });

      if (
        user.role !== (await this.constantService.newUserRole.publicCreator)
      ) {
        return await this.responseService.NOT_FOUND(
          'Invalid user! User should be creator',
          {},
          res,
        );
      }

      // Fetch Stripe account ID
      const stripeAccountId = await this.prismaService.sellerAccount.findFirst({
        where: {
          users: {
            some: {
              id: aUser.id,
            },
          },
        },
        select: {
          sellerAccountId: true,
        },
      });

      // Fetch total balance
      const fetchTotalBal = await this.checkBal(
        stripeAccountId.sellerAccountId,
      );

      // Build where clause for user-based filtering
      const whereClause = {
        OR: [{ receiverUserId: aUser.id }, { senderUserId: aUser.id }],
      };
      if (month) {
        const startDate = new Date(month);
        startDate.setDate(1); // Start of the month
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1); // End of the month
        whereClause['createdAt'] = {
          gte: startDate,
          lt: endDate,
        };
      }

      // Fetch transactions with pagination and descending order by createdAt
      const transactionHistory =
        await this.prismaService.newTransaction.findMany({
          where: whereClause,
          select: {
            id: true,
            applicationFee: true,
            paymentPurpose: true,
            price: true,
            totalAmount: true,
            stripeFee: true,
            createdAt: true,
            receiverUser: {
              select: {
                id: true,
                profileIcon: true,
                firstName: true,
                lastName: true,
                email: true,
                userName: true,
              },
            },
            senderUser: {
              select: {
                id: true,
                profileIcon: true,
                firstName: true,
                lastName: true,
                email: true,
                userName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (+page - 1) * +limit,
          take: +limit,
        });

      // Transform data with single user object and transaction type
      const sanitizedTransactions = transactionHistory.map((transaction) => {
        const user =
          transaction.senderUser.id === aUser.id
            ? transaction.receiverUser
            : transaction.senderUser;
        return {
          id: transaction.id,
          applicationFee: transaction.applicationFee,
          paymentPurpose: transaction.paymentPurpose,
          price: transaction.price,
          totalAmount: transaction.totalAmount,
          stripeFee: transaction.stripeFee,
          createdAt: transaction.createdAt,
          user: user,
          transactionType:
            transaction.senderUser.id === aUser.id ? 'debit' : 'credit',
        };
      });

      // Count total transactions for pagination
      const totalTransactions = await this.prismaService.newTransaction.count({
        where: whereClause,
      });

      // Prepare response
      return await this.responseService.success(
        'success',
        'Transaction history fetched successfully',
        {
          totalBalance: fetchTotalBal,
          transactions: sanitizedTransactions,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalTransactions / limit),
            totalItems: totalTransactions,
            itemsPerPage: limit,
          },
        },
        res,
      );
    } catch (error: any) {
      return await this.responseService.INTERNAL_SERVER_ERROR(
        'Unexpected error during payment processing',
        error.toString(),
        res,
      );
    }
  }
}
