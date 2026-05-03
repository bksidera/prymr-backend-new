import { IsUUID } from "class-validator";

export class AddReactionCommentDto{

    @IsUUID()
    imageId:string;

    @IsUUID()
    reactionId:string;
    
}
                