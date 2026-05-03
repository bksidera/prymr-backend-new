import { IsOptional, IsUUID } from "class-validator";

export class AddToCartDto{

    @IsUUID()
    // @IsOptional()
    productId:string
    
}
/**
 boardId 
 saleId

 feature flag wise we can filter it is sale or board

 */