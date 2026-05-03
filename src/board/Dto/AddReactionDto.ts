import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  isString,
  IsString,
  IsUrl,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class AddReactionDto {
  @IsUUID()
  boardImageId: string;

  @IsIn(['text', 'photo', 'video', 'emoji'])
  reactionType: string;

  @IsString()
  @IsUrl()
  backgroundCapture: string;

  // // contentText is required only if reactionType is 'text' or 'emoji'
  // @ValidateIf(o => o.reactionType === 'text' || o.reactionType === 'emoji')
  // @IsNotEmpty({ message: 'Content text is required for text or emoji reactions' })
  @IsString()
  @IsOptional()
  contentText: string; //that string user can add the replay

  // contentUrl is required only if reactionType is 'photo' or 'video'
  // @ValidateIf(o => o.reactionType === 'photo' || o.reactionType === 'video')
  // @IsNotEmpty({ message: 'Content URL is required for photo or video reactions' })
  // @IsOptional()
  // @IsUrl({}, { message: 'Content URL must be a valid URL' })
  contentUrl: string; //here  we can add the image url, video, gif, emoji
  //here  we need to to store the type like image, video, gif, emoji
  // if have content url the must be reaction type should be mandatory

  @IsString()
  top: string;

  @IsString()
  left: string;

  @IsString()
  @IsOptional()
  emoji: string;

  @IsOptional()
  @IsString()
  paymentIntentId: string;
}

/**
 
board reaction  add time user can add the one video photos and text and that text user can comment 
 */
