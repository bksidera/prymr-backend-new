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
import { BoardService } from './board.service';
import { CreateBoardDto } from './Dto/CreateBoardDto';
import { REQUEST } from '@nestjs/core';
import { JwtAuthGuard } from 'src/guards/guards.service';
import { ConstantsService } from 'src/constants/constants.service';
import { PaginationDto } from './Dto/PaginationDto';
import { EditBoardDtoInfo } from './Dto/EditBoardDtoInfo';
import { AddBoardInfoDto } from './Dto/AddBoardInfoDto';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { CreateNewCollectionDto } from './Dto/CreateNewCollectionDto';
import { CreateTappableDto } from './Dto/CreateTappablesDto';
import { PublishBoard } from './Dto/PublishBoardDto';
import { EditBoardBackgroundImageDto } from './Dto/EditBoardBackgroundImageDto';
import { AddReactionDto } from './Dto/AddReactionDto';
import { EditTappableDto } from './Dto/EditTappableDto';
import { ReplyReactionCommentDto } from './Dto/ReplyReactionCommentDto';
import { UploadImageOnBoardDto } from './Dto/UploadImageOnBoardDto';
import { DeleteUploadedOnBoardImageDto } from './Dto/DeleteUploadedOnBoardImageDto';
import { AddSwitchBoardActionDto } from './Dto/AddSwitchBoardActionDto';
import { AddSwitchReplaceActionDto } from './Dto/AddSwitchReplaceActionDto';
import { UpdateSwitchReplaceActionDto } from './Dto/UpdateSwitchReplaceActionDto';
import { UpdateTappableOrLayerPositions } from './Dto/UpdateTappableOrLayerPositions';

@Controller('board')
export class BoardController {
  constructor(
    private readonly boardService: BoardService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  /**
   *
   * @param res
   * @param data
   * @returns
   * board create time only sending the  image url and
   * don mlt
   */
  @Post('createBoard')
  @UseGuards(JwtAuthGuard)
  async createBoard(@Res() res: Response, @Query('imageUrl') imageUrl: string) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.createBoard(res, imageUrl, aUser);
  }

  @Delete('deleteBoard')
  @UseGuards(JwtAuthGuard)
  async deleteBoard(@Res() res: Response, @Query('boardId') boardId: string) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.deleteBoard(res, boardId, aUser);
  }

  // display the user wise board //no use
  @Get('fetchUserBoards')
  @UseGuards(JwtAuthGuard)
  async fetchUserBoards(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
  ) {
    const user = this.request['user'];
    return await this.boardService.fetchUserBoards(res, user, paginationDto);
  }

  @Get('getEditBoardDetails')
  @UseGuards(JwtAuthGuard)
  async getEditBoardDetails(
    @Res() res: Response,
    @Query('boardId') boardId: string,
  ) {
    const user = this.request['user'];
    return await this.boardService.getEditBoardDetails(res, boardId, user);
  }

  // @Put('editBoardDetails')
  // @UseGuards(JwtAuthGuard)
  // async editBoardDetails(@Res() res: Response, @Body() data: editBoardDto) {
  //   const user = this.request['user'];
  //   return await this.boardService.editBoardDetails(res, data, user);
  // }

  // this 2 api no use

  @Get('fetchUserFeed1')
  @UseGuards(JwtAuthGuard)
  async fetchUserFeed1(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
  ) {
    const user = this.request['user'];
    return await this.boardService.fetchUserFeed1(res, user, paginationDto);
  }

  @Get('fetchUserFeed2')
  @UseGuards(JwtAuthGuard)
  async fetchUserFeed2(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
  ) {
    const user = this.request['user'];
    return await this.boardService.fetchUserFeed2(res, user, paginationDto);
  }

  @Post('addBoardInfo')
  @UseGuards(JwtAuthGuard)
  async addBoardInfo(@Res() res, @Body() data: AddBoardInfoDto) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.addBoardInfo(res, data, aUser);
  }

  //mlt done
  @Get('fetchRecentPublicUserBoard')
  async fetchRecentBoardPublicUserBoard(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
    @Query('tappablePageSize') tappablePageSize: number,
    @Query('userName') userName: string,
  ) {
    return await this.boardService.fetchRecentPublicUserBoard(
      res,
      tappablePageSize,
      paginationDto,
      userName,
    );
  }

  //mlt no need to update this api
  @Get('fetchRecentPrivateUserBoard')
  @UseGuards(JwtAuthGuard) // token
  async fetchRecentBoardPrivateUserBoard(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
    @Query('tappablePageSize') tappablePageSize: number,
  ) {
    const user = this.request['user'];
    return await this.boardService.fetchRecentBoardPrivateUserBoard(
      res,
      tappablePageSize,
      user,
      paginationDto,
    );
  }

  /*
-in fetchRecentPrivateUserBoard and fetchRecentPublicUserBoards we are sending the first 2 tappable and after that api through send the tappable
Note:We can not send the one time all tappable because it going complex to handle the server 
  and we are providing the pagination support also.
*/

  //mlt no need to update
  @Get('fetchPrivateUserBoardTappable')
  @UseGuards(JwtAuthGuard) // token
  async fetchPrivateUserBoardTappable(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
    @Query('boardImageId') boardImageId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPrivateUserBoardTappable(
      res,
      boardImageId,
      aUser,
      paginationDto,
    );
  }

  //mlt done
  @Get('fetchPublicUserBoardTappable')
  async fetchPublicUserBoardTappable(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
    @Query('boardImageId') boardImageId: string,
  ) {
    const user = this.request['user'];
    return await this.boardService.fetchPublicUserBoardTappable(
      res,
      boardImageId,
      paginationDto,
    );
  }

  @Post('createNewCollection')
  @UseGuards(JwtAuthGuard)
  async createNewCollection(@Res() res, @Body() data: CreateNewCollectionDto) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.createNewCollection(res, data, aUser);
  }

  /**
   *
   * @param res
   * @param userRole
   * @returns
   * @description
   *  this api only access the user and public profile handler
   */
  @Get('fetchPublicUserCollections')
  @UseGuards(JwtAuthGuard)
  async fetchPublicUserCollections(
    @Res() res,
    @Query() paginationDto: PaginationDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPublicUserCollections(
      res,
      paginationDto,
      aUser,
    );
  }

  /**
   *
   * @param res
   * @param userRole
   * @returns
   * @description
   *  this api only access the user and public profile handler
   */
  @Get('fetchPrivateUserCollections')
  @UseGuards(JwtAuthGuard)
  async fetchPrivateUserCollections(
    @Res() res,
    @Query() paginationDto: PaginationDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPrivateUserCollections(
      res,
      paginationDto,
      aUser,
    );
  }

  @Get('viewSingleCollectionBoards')
  @UseGuards(JwtAuthGuard)
  async viewSingleCollectionBoards(
    @Res() res,
    @Query('collectionId') collectionId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.viewSingleCollectionBoards(
      res,
      aUser,
      collectionId,
      paginationDto,
    );
  }

  @Post('createTappable')
  @UseGuards(JwtAuthGuard)
  async createTappable(@Res() res, @Body() data: CreateTappableDto) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.createTappable(res, data, aUser);
  }
  //-----------------------------><-this is new Changed flow-Sep 9 ><-----------------------------------------------
  @Post('uploadOnBoardImage')
  @UseGuards(JwtAuthGuard)
  async uploadOnBoardImage(@Res() res, @Body() data: UploadImageOnBoardDto) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.uploadImageOnBoard(res, data, aUser);
  }
  @Delete('deleteUploadedOnBoardImage')
  @UseGuards(JwtAuthGuard)
  async deleteUploadedOnBoardImage(
    @Res() res,
    @Body() data: DeleteUploadedOnBoardImageDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.deleteUploadedOnBoardImage(res, data, aUser);
  }
  //-----------------------------><-this is new Changed flow-Sep 9 ><--------------------------------------------><-

  // when some click created tappable and click on again that layer then that time he can agin edit tappable
  @Put('updateTappable')
  @UseGuards(JwtAuthGuard)
  async updateTappable(@Res() res, @Body() data: EditTappableDto) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.updateTappable(res, data, aUser);
  }
  /*
------------------------------------------------------------------------------------------------
-when user click on tappable  then if add contain tappable data the pass send the response data properly
-this is only for add contain tappable flow regarding
---------------------------------------------------------------------------------------------------
*/
  @Get('fetchTappableContain')
  @UseGuards(JwtAuthGuard)
  async fetchTappableContain(
    @Res() res,
    @Query('imageId') imageId: string,
    @Query('tappableId') tappableId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchTappableContain(
      res,
      imageId,
      tappableId,
      aUser,
    );
  }

  //when click on collection art folder then there display board
  @Get('fetchPublicUserCollectionBoards')
  async fetchPublicUserCollectionBoards(
    @Res() res,
    @Query('collectionId') collectionId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return await this.boardService.fetchPublicUserCollectionBoards(
      res,
      collectionId,
      paginationDto,
    );
  }

  @Get('fetchPrivateUserCollectionBoards')
  @UseGuards(JwtAuthGuard)
  async fetchPrivateUserCollectionBoards(
    @Res() res,
    @Query('collectionId') collectionId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPrivateUserCollectionBoards(
      res,
      collectionId,
      aUser,
      paginationDto,
    );
  }
  /**
   * saved board api.
   * -user wise
   * -access only creator
   * -support pagination
   * -add security
   * -use new project create time "Continue Work on save Board"
   * -when we click on tappable then here not open tappable screen here will open that tappable layer
   */

  @Get('fetchSavedBoard')
  @UseGuards(JwtAuthGuard)
  async fetchSavedBoard(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
    @Query('filterBy') filterBy: string,
    @Query('tappablePageSize') tappablePageSize: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchSavedBoard(
      res,
      aUser,
      paginationDto,
      tappablePageSize,
      filterBy,
    );
  }

  @Get('fetchBoardEditInfo')
  @UseGuards(JwtAuthGuard)
  async fetchBoardEditInfo(
    @Res() res,
    @Query('boardImageId') boardImageId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchBoardEditInfo(res, boardImageId, aUser);
  }

  //before publish board edit the board info
  // Save the board JSON schema to BoardImages.jsonElement.
  // Used by the board builder whenever schema state changes.
  @Put('saveBoardSchema')
  @UseGuards(JwtAuthGuard)
  async saveBoardSchema(
    @Res() res,
    @Body() data: { boardImageId: string; jsonElement: string },
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.saveBoardSchema(res, data, aUser);
  }

  // Returns the creator's collections. Creates a default "My Boards" collection
  // if none exist. Works for any creator role (publicCreator or privateCreator).
  @Get('fetchMyCollections')
  @UseGuards(JwtAuthGuard)
  async fetchMyCollections(@Res() res) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchMyCollections(res, aUser);
  }

  @Put('editBoardInfo')
  @UseGuards(JwtAuthGuard)
  async editBoardInfo(@Res() res, @Body() data: EditBoardDtoInfo) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.editBoardInfo(res, data, aUser);
  }

  //if tappable created bust want to edit that time we can use this api
  @Get('fetchEditTappableInfo')
  @UseGuards(JwtAuthGuard)
  async fetchEditTappableInfo(
    @Res() res,
    @Query('boardImageId') boardImageId: string,
    @Query('tappableId') tappableId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchEditTappableInfo(
      res,
      boardImageId,
      tappableId,
      aUser,
    );
  }
  //editTappableInfo api
  //@todo this api is pending @kiran
  @Post('editTappableInfo')
  @UseGuards(JwtAuthGuard)
  async editTappableInfo(@Res() res, @Body() data: PublishBoard) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.publishBoard(res, data, aUser);
  }

  @Post('publishBoard')
  @UseGuards(JwtAuthGuard)
  async publishBoard(@Res() res, @Body() data: PublishBoard) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.publishBoard(res, data, aUser);
  }
  /**
   *
   * @param res
   * @param paginationDto
   * @param filterBy
   * @param tappablePageSize
   * @returns
   * @description as new requirement wise new creating the api's
   *
   */
  @Get('fetchPrivateUserDraftsBoards')
  @UseGuards(JwtAuthGuard)
  async fetchPrivateUserDraftsBoards(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
    @Query('searchText') searchText: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPrivateUserDraftsBoards(
      res,
      aUser,
      paginationDto,
      searchText,
    );
  }

  @Get('fetchPublicUserDraftsBoards')
  async fetchPublicUserDraftsBoards(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
    @Query('searchText') searchText: string,
  ) {
    return await this.boardService.fetchPublicUserDraftsBoards(
      res,
      paginationDto,
      searchText,
    );
  }

  @Put('editBoardBackgroundImage')
  @UseGuards(JwtAuthGuard)
  async editBoardBackgroundImage(
    @Res() res: Response,
    @Body() data: EditBoardBackgroundImageDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.editBoardBackgroundImage(res, aUser, data);
  }

  //when user click on the board then call this api and also increase the post interaction counter
  //accessible for public user and normal user
  //when normal user then only that time increase the counter
  //it fetching the single board details
  @Get('fetchPublicUserBoardDetails')
  async fetchPublicUserBoardDetails(
    @Res() res: Response,
    @Query('boardId') boardId: string,
  ) {
    return await this.boardService.fetchPublicUserBoardDetails(res, boardId);
  }

  //any login user can use this api.
  //if user role is public then it can be access that user only board, public user private user board  cannot access
  // this api will increase post interaction, when normal user will login.
  @Get('fetchPrivateUserBoardDetails')
  @UseGuards(JwtAuthGuard)
  async fetchPrivateUserBoardDetails(
    @Res() res: Response,
    @Query('boardId') boardId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPrivateUserBoardDetails(
      res,
      boardId,
      aUser,
    );
  }

  //when user click on home screen board then open single board then display on that image display the all tappable
  @Get('fetchPrivateUserTappableNonPagination')
  @UseGuards(JwtAuthGuard)
  async fetchPrivateUserTappableNonPagination(
    @Res() res: Response,
    @Query('boardId') boardId: string,
    @Query('imageId') imageId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPrivateUserTappableNonPagination(
      res,
      boardId,
      imageId,
      aUser,
    );
  }

  @Get('fetchPublicUserTappableNonPagination')
  async fetchPublicUserTappableNonPagination(
    @Res() res: Response,
    @Query('boardId') boardId: string,
    @Query('imageId') imageId: string,
  ) {
    return await this.boardService.fetchPublicUserTappableNonPagination(
      res,
      boardId,
      imageId,
    );
  }

  @Post('addReaction')
  @UseGuards(JwtAuthGuard)
  async addReaction(@Res() res, @Body() data: AddReactionDto) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.addReaction(res, data, aUser);
  }
  @Post('addGuestUserReaction')
  // @UseGuards(JwtAuthGuard)
  async addGestUserReaction(@Res() res, @Body() data: AddReactionDto) {
    // const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.addGestUserReaction(res, data);
  }

  //normal user can only delete self created reactions and author user can delete the all reactions.
  //fist deleting the parent reactions and the later deleting the main reaction
  //first need to test first
  @Put('deleteReaction')
  @UseGuards(JwtAuthGuard)
  async deleteReaction(@Res() res, @Query('reactionId') reactionId: string) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.deleteReaction(res, reactionId, aUser);
  }

  @Post('addReactionLikes')
  @UseGuards(JwtAuthGuard)
  async addReactionLikes(
    @Res() res,
    @Query('imageId') imageId: string,
    @Query('reactionId') reactionId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.addReactionLikes(
      res,
      imageId,
      reactionId,
      aUser,
    );
  }

  @Post('addReactionComment')
  @UseGuards(JwtAuthGuard)
  async addReactionComment(
    @Res() res,
    @Query('imageId') imageId: string,
    @Query('reactionId') reactionId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.addReactionLikes(
      res,
      imageId,
      reactionId,
      aUser,
    );
  }

  //it display the all parent reaction comments and if passed parent id then load the all sub comments on that board (recursively displaying)
  //private user he cannot see the reactions
  //
  //@todo testing is remaining
  @Get('viewAllBoardReactionComments')
  async viewAllReactionComments(
    @Res() res,
    @Query('imageId') imageId: string,
    @Query() paginationDto: PaginationDto,
    @Query('parentReactionId') parentReactionId: string,
  ) {
    return await this.boardService.viewAllReactionComments(
      res,
      imageId,
      paginationDto,
      parentReactionId,
    );
  }
  @Post('replyReactionComment')
  @UseGuards(JwtAuthGuard)
  async replyReactionComment(
    @Res() res,
    @Body() data: ReplyReactionCommentDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.replyReactionComment(res, data, aUser);
  }

  //publish time display the list of tappables images
  @Get('viewSingleBoardImageTappables')
  @UseGuards(JwtAuthGuard)
  async viewSingleBoardImageTappables(
    @Res() res,
    @Query('imageId') imageId: string,
    @Query('boardId') boardId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.viewSingleBoardImageTapables(
      res,
      imageId,
      boardId,
      aUser,
    );
  }

  // Returns all reaction pins for a board image — used to render pins in the player.
  // Public endpoint (no auth): all viewer reactions regardless of role.
  @Get('fetchBoardReactionPins')
  async fetchBoardReactionPins(
    @Res() res,
    @Query('boardImageId') boardImageId: string,
  ) {
    return await this.boardService.fetchBoardReactionPins(res, boardImageId);
  }

  @Get('fetchReactionInfo')
  async fetchReactionInfo(@Res() res, @Query('reactionId') reactionId: string) {
    return await this.boardService.fetchReactionInfo(res, reactionId);
  }

  @Get('fetchLoggedUserReactionInfo')
  @UseGuards(JwtAuthGuard) 
  async fetchLoggedUserReactionInfo(
    @Res() res,
    @Query('reactionId') reactionId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    console.info(aUser);
    return await this.boardService.fetchLoggedUserReactionInfo(
      res,
      reactionId,
      aUser,
    );
  }
  @Get('fetchGuestUserReactionInfo')
  // @UseGuards(JwtAuthGuard)
  async fetchGestUserReactionInfo(
    @Res() res,
    @Query('reactionId') reactionId: string,
  ) {
    // const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchGestUserReactionInfo(
      res,
      reactionId,
    );
  }
  //--------------------------------Welcome to MVP--------------------------------------------------
  /*When User click on home screen to my boards then there is drafts and collection options
 and one search options so there draft opt use there api. */
  @Get('fetchPrivateUserDraftBoards')
  @UseGuards(JwtAuthGuard)
  async fetchPrivateUserDraftBoards(
    @Res() res,
    @Query() paginationDto: PaginationDto,
    @Query('searchText') searchText: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPrivateUserDraftBoards(
      res,
      paginationDto,
      searchText,
      aUser,
    );
  }

  @Get('fetchPublicUserDraftBoards')
  async fetchPublicUserDraftBoards(
    @Res() res,
    @Query() paginationDto: PaginationDto,
    @Query('searchText') searchText: string,
  ) {
    return await this.boardService.fetchPublicUserDraftBoards(
      res,
      paginationDto,
      searchText,
    );
  }

  /**
   * when private user click on search box when action then thi api will call
   */

  @Get('fetchPrivateUserDraftsBoardSuggestion')
  @UseGuards(JwtAuthGuard)
  async fetchPrivateUserDraftsBoardTitleSuggestion(
    @Res() res: Response,
    @Query('searchText') searchText: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPrivateUserDraftsBoardSuggestion(
      res,
      aUser,
      searchText,
    );
  }

  @Get('fetchPublicUserDraftsBoardSuggestion')
  async fetchPublicUserDraftsBoardTitleSuggestion(
    @Res() res: Response,
    @Query('searchText') searchText: string,
  ) {
    return await this.boardService.fetchPublicUserDraftsBoardSuggestion(
      res,
      searchText,
    );
  }
  //------------Home Page collection suggestions api's----------------------------------------
  @Get('fetchPublicUserCollectionNameSuggestions')
  async fetchPublicUserCollectionNameSuggestions(
    @Res() res: Response,
    @Query('searchText') searchText: string,
  ) {
    return await this.boardService.fetchPublicUserCollectionNameSuggestions(
      res,
      searchText,
    );
  }
  @Get('fetchPrivateUserCollectionNameSuggestions')
  @UseGuards(JwtAuthGuard)
  async fetchPrivateUserCollectionNameSuggestions(
    @Res() res: Response,
    @Query('searchText') searchText: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPrivateUserCollectionNameSuggestions(
      res,
      searchText,
      aUser,
    );
  }

  @Get('fetchPrivateUserCollectionsWithSearch')
  @UseGuards(JwtAuthGuard)
  async fetchPrivateUserCollectionsWithSearch(
    @Res() res: Response,
    @Query('searchText') searchText: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPrivateUserCollectionsWithSearch(
      res,
      searchText,
      aUser,
      paginationDto,
    );
  }

  @Get('fetchAllBoardLayersImages')
  @UseGuards(JwtAuthGuard)
  async fetchAllBoardLayersImages(
    @Res() res: Response,
    @Query('boardId') boardId: string,
    @Query('boardImageId') boardImageId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchAllBoardLayersImages(
      res,
      boardId,
      boardImageId,
      aUser,
    );
  }

  //------------------------Home collection api------------------------------------------------

  /**
   *
   * @param res
   * @param userRole
   * @returns
   * @description
   *  this api only access the user and public profile handler
   */
  @Get('fetchPublicUserCollectionsOnHomeFeed')
  async fetchPublicUserCollectionsOnHomeFeed(
    @Res() res,
    @Query() paginationDto: PaginationDto,
    @Query('userName') userName: string,
  ) {
    return await this.boardService.fetchPublicUserCollectionsOnHomeFeed(
      res,
      paginationDto,
      userName,
    );
  }

  /**
   *
   * @param res
   * @param userRole
   * @returns
   * @description
   *  this api only access the user and public profile handler
   */
  @Get('fetchPrivateUserCollectionsOnHomeFeed')
  @UseGuards(JwtAuthGuard)
  async fetchPrivateUserCollectionsOnHomeFeed(
    @Res() res,
    @Query() paginationDto: PaginationDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPrivateCollectionsOnHomeFeed(
      res,
      paginationDto,
      aUser,
    );
  }
  //-------------------------- Welcome to Switch flow------------------------------------------

  // in below two api only perform the vanish flow  it will add the vanish and and fetch the id wise details and perform the action
  // we have come here lot of load so try to making simple  proper structure wise

  @Post('addVanishSwitchBoardAction')
  @UseGuards(JwtAuthGuard)
  async addVanishSwitchBoardAction(
    @Res() res,
    @Body() data: AddSwitchBoardActionDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.addSwitchBoardAction(res, data, aUser);
  }

  //need to vanish
  // do not use
  @Get('fetchVanishSwitchBoardInfo')
  @UseGuards(JwtAuthGuard)
  async fetchVanishSwitchBoardInfo(
    @Res() res: Response,
    @Query('switchId') switchId: string, //replace tappable table id
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchSwitchBoardInfo(res, switchId, aUser);
  }

  @Post('addReplaceSwitchBoardAction')
  @UseGuards(JwtAuthGuard)
  async addReplaceSwitchBoardAction(
    @Res() res,
    @Body() data: AddSwitchReplaceActionDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.addReplaceSwitchBoardAction(
      res,
      data,
      aUser,
    );
  }

  @Get('getEditLayerMetaData')
  @UseGuards(JwtAuthGuard)
  async getEditLayerMetaData(@Res() res, @Query('layerId') layerId: string) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.getEditLayerMetaData(res, layerId, aUser);
  }

  @Put('updateLayerMetaData')
  @UseGuards(JwtAuthGuard)
  async updateLayerMetaData(
    @Res() res,
    @Body() data: UpdateSwitchReplaceActionDto,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.updateLayerMetaData(res, data, aUser);
  }
  /**
   *
   * @param res
   * @param data
   * @returns
   * @description-> this api will update the only layer and tappable positions
   */
  @Put('updateTappableOrLayerPositions')
  @UseGuards(JwtAuthGuard)
  async updateTappableOrLayerPositions(
    @Res() res,
    @Body() data: UpdateTappableOrLayerPositions,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.updateTappableOrLayerPositions(
      res,
      data,
      aUser,
    );
  }

  @Delete('deleteSwitchLayer')
  @UseGuards(JwtAuthGuard)
  async deleteSwitchLayer(
    @Res() res,
    @Query('layerId') layerId: string, // replaceSwitch table id
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.deleteSwitchLayer(res, layerId, aUser);
  }

  @Get('fetchAllReplaceSwitchInfo')
  @UseGuards(JwtAuthGuard)
  async fetchAllReplaceSwitchInfo(
    @Res() res,
    @Query('tappableId') tappableId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchAllReplaceSwitchInfo(
      res,
      tappableId,
      aUser,
    );
  }
  @Get('fetchAllReplaceSwitchInfoGuestUser')
  async fetchAllReplaceSwitchInfoGestUser(
    @Res() res,
    @Query('tappableId') tappableId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchAllReplaceSwitchInfoGestUser(
      res,
      tappableId,
      // aUser,
    );
  }

  // @Get('fetchRecentBoardOnHomePage')
  // async fetchRecentBoardOnHomePage1(
  //   @Res() res: Response,
  //   @Query() paginationDto: PaginationDto,
  //   @Query("loginUserId") loginUserId:string,
  //   @Query("boardId") boardId:string,
  //   // @Query('tappablePageSize') tappablePageSize: number,
  //   @Query('userName') userName: string,
  // ) {
  //   return await this.boardService.fetchRecentBoardOnHomePage(
  //     res,
  //     paginationDto,
  //     userName,
  //     loginUserId,
  //     boardId
  //   );
  // }

  //-----------------------Before login  api's--------------------------------------------------------------------

  //api 1
  @Get('fetchPublicTappableContain')
  async fetchPublicTappableContain(
    @Res() res,
    @Query('imageId') imageId: string,
    @Query('tappableId') tappableId: string,
  ) {
    return await this.boardService.fetchPublicTappableContain(
      res,
      imageId,
      tappableId,
    );
  }

  //api2
  @Get('fetchPublicVanishSwitchBoardInfo')
  async fetchPublicVanishSwitchBoardInfo(
    @Res() res: Response,
    @Query('switchId') switchId: string,
  ) {
    return await this.boardService.fetchPublicVanishSwitchBoardInfo(
      res,
      switchId,
    );
  }

  //api3 do not use this api
  @Get('fetchAllPublicReplaceSwitchInfo')
  async fetchAllPublicReplaceSwitchInfo(
    @Res() res,
    @Query('tappableId') tappableId: string,
  ) {
    return await this.boardService.fetchAllPublicReplaceSwitchInfo(
      res,
      tappableId,
    );
  }

  //this api will work is vanish true or is replace true.
  @Get('fetchAllReplaceOrVanishInfo')
  @UseGuards(JwtAuthGuard)
  async fetchAllReplaceOrVanishInfo(
    @Res() res,
    @Query('layerId') layerId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchAllReplaceOrVanishInfo(
      res,
      layerId,
      aUser,
    );
  }
  @Get('fetchAllReplaceOrVanishInfoPublic')
  async fetchAllReplaceOrVanishInfoPublic(
    @Res() res,
    @Query('layerId') layerId: string,
  ) {
    return await this.boardService.fetchAllReplaceOrVanishInfoPublic(
      res,
      layerId,
    );
  }
  @Get('fetchPreviewData')
  @UseGuards(JwtAuthGuard)
  async fetchPreviewData(
    @Res() res,
    @Query('boardId') boardId: string,
    @Query('boardImageId') boardImageId: string,
  ) {
    const aUser: RequestUserDto = this.request['user'];
    return await this.boardService.fetchPreviewData(
      res,
      boardId,
      boardImageId,
      aUser
    );
  }


  //--------------------------------- new Feature- 07-04-25------------------------------------------

  /**
   * 
   * @param res 
   * @param paginationDto 
   * @param loginUserId 
   * @param boardId 
   * @param userName 
   * @returns 
   * @plan got the user name and the board id then assume the it is the share feature so wrap the first index that record.
   * if we got only user name then only show the that user boards
   * if we got the only board id then show the that board first
   */
  @Get('fetchRecentBoardOnFeedPage')
  async fetchRecentBoardOnHomePage(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
    @Query("loginUserId") loginUserId:string,
    @Query('boardId') boardId: string,
    @Query('userName') userName: string,
  ) {
    return await this.boardService.fetchRecentBoardOnHomePage(
      res,
      paginationDto,
      userName,
      loginUserId,
      boardId,
    );
  }


  //wrap contain

  // @Post('addImage')
  // async addImage(@Res() res,@Body() data: any) {
  //   return await this.boardService.addImage(res,data);
  // }

  // @Get('fetchImages')
  // async fetchImages(@Res() res) {
  //   return await this.boardService.fetchImages(res);
  // }
}
