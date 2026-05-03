import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator"


export enum RequestCreatorStatus {
    // Requested = "Requested",
    Rejected = "Rejected",
    Approved = "Approved",
    Blocked = "Blocked"
}

export class ApproveBecomeCreatorRequest{

    @IsEnum(RequestCreatorStatus, { message: 'requestStatus must be one of:  Rejected, Approved, or Blocked' })
    requestStatus: RequestCreatorStatus;  // Apply IsEnum to validate

    @IsString()
    @IsOptional()
    reason: string;

    @IsUUID()
    requestId:string;

}


