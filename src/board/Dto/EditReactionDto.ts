import { IsIn, IsNotEmpty, IsNumber, IsUrl, IsUUID, ValidateIf } from "class-validator";

export class EditReactionDto{
    
    @IsUUID()
    boardImageId:string

    @IsIn(['text', 'photo', 'video', 'emoji'])
    reactionType: string;

    // contentText is required only if reactionType is 'text' or 'emoji'
    @ValidateIf(o => o.reactionType === 'text' || o.reactionType === 'emoji')
    @IsNotEmpty({ message: 'Content text is required for text or emoji reactions' })
    contentText: string;

    // contentUrl is required only if reactionType is 'photo' or 'video'
    @ValidateIf(o => o.reactionType === 'photo' || o.reactionType === 'video')
    @IsNotEmpty({ message: 'Content URL is required for photo or video reactions' })
    @IsUrl({}, { message: 'Content URL must be a valid URL' })
    contentUrl: string;

    @IsNumber()
    top:number;

    @IsNumber()
    left:number;
}