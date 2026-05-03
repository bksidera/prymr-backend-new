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
import { BookmarkService } from './bookmark.service';
import { REQUEST } from '@nestjs/core';
import { JwtAuthGuard } from 'src/guards/guards.service';
import { addBookmarkDto } from './Dto/addBookmarkDto';
import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
import { PaginationDto } from 'src/board/Dto/PaginationDto';
import { editBookmarkCollectionDto } from './Dto/editBookmarkCollectionDto';


@Controller('bookmark')
export class BookmarkController {
    constructor(
        private readonly bookmarkService: BookmarkService,
        @Inject(REQUEST) private readonly request: Request,
    ) { }

    @Post('addBookMark')
    @UseGuards(JwtAuthGuard)
    async addBookMark(@Res() res, @Body() data: addBookmarkDto) {
        const user = this.request['user'];
        return await this.bookmarkService.addBookMark(res, data, user);
    }

    
    @Get('fetchRecentBookMarks')
    @UseGuards(JwtAuthGuard)
    async fetchRecentBookMarks(@Res() res) {
        const aUser = this.request['user'];
        return await this.bookmarkService.fetchRecentBookMarks(res, aUser);
    }

    //bookMark first page
    //other user can also view the bookmark so manage
    @Get('fetchBookmarkFeed')
    @UseGuards(JwtAuthGuard)
    async fetchBookmarkFeed(@Res() res, @Query() paginationDto: PaginationDto,@Query("userId")userId:string) {
        const aUser = this.request['user'];
        return await this.bookmarkService.fetchBookmarkFeed(
            res,
            aUser,
            paginationDto,
            userId
        );
    }


    //fetch bookmark folder wise bookmark.
    //upgraded
    @Get('fetchFolderWiseBookmark')
    @UseGuards(JwtAuthGuard)
    async fetchFolderWiseBookmark(@Res() res, @Query() paginationDto: PaginationDto,@Query("folderId")folderId:string,@Query("userId")userId:string) {
        const aUser = this.request['user'];
        return await this.bookmarkService.fetchFolderWiseBookmark(
            res,
            aUser,
            paginationDto,
            folderId,
            userId
        );
    }
   
    //when click on bookmark icon
        //@todo add filter Boards,Unlocked, New (Newest,Oldest,A-Z, Z-A)
    @Get('fetchAllBookmark')
    @UseGuards(JwtAuthGuard)
    async fetchAllBookmark(@Res() res, @Query() paginationDto: PaginationDto) {
        const aUser = this.request['user'];
        return await this.bookmarkService.fetchAllBookmark(
            res,
            aUser,
            paginationDto,
        );
    }


    //Create a new Bookmark folder api.
    @Post("createBookMarkTitle")
    @UseGuards(JwtAuthGuard)
    async createBookMarkTitle(@Res() res, @Query("title") title: string) {
        const aUser = this.request['user'];
        return await this.bookmarkService.createBookMarkTitle(
            res,
            aUser,
            title
        );
    }

    //display all the folder name (recent created display first)
    @Get('fetchBookMarksTitles')
    @UseGuards(JwtAuthGuard)
    async fetchBookMarksTitles(@Res() res) {
        const aUser = this.request['user'];
        return await this.bookmarkService.fetchBookMarksTitles(res, aUser);
    }

    //edit the bookmark folder
    @Put('editCollection')
    @UseGuards(JwtAuthGuard)
    async editCollection(@Res() res, @Body() data: editBookmarkCollectionDto) {
        const aUser = this.request['user'];
        return await this.bookmarkService.editCollection(res, aUser, data);
    }

    //delete the bookmark folder
    @Delete('deleteCollection')
    @UseGuards(JwtAuthGuard)
    async deleteCollection(@Res() res, @Query("folderId") folderId: string) {
        const aUser = this.request['user'];
        return await this.bookmarkService.deleteCollection(res, aUser, folderId);
    }


    //when user click an specific ad or board then display the that board or sale details
    //@todo add filter Boards,Unlocked, New (Newest,Oldest,A-Z, Z-A)
    @Get('fetchSingleBoardOrSaleAdRecords')
    @UseGuards(JwtAuthGuard)
    async fetchSingleBoardOrSaleAdRecords(@Res() res,@Query("boardOrSaleId")boardOrSaleId:string) {
        const aUser = this.request['user'];
        return await this.bookmarkService.fetchSingleBoardOrSaleAdRecords(res, aUser,boardOrSaleId);
    }

    @Post('lockBookmarkFolder')
    @UseGuards(JwtAuthGuard)
    async lockBookmarkFolder(@Res() res, @Query("folderId") folderId: string) {
        const aUser = this.request['user'];
        return await this.bookmarkService.lockBookmarkFolder(res, aUser, folderId);
    }


}
