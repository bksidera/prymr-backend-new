import { IsEnum, IsOptional, IsSemVer, IsString } from "class-validator";




export enum RequestCreatorStatus {
    // Requested = "Requested",
    Rejected = "Rejected",
    Approved = "Approved",
    Blocked = "Blocked",
    Requested="Requested"
}

export class ViewAllBecomeCreatorRequest{
    page?: number;

  pageSize?: number;


  @IsOptional()
  @IsEnum(RequestCreatorStatus, { message: 'requestStatus must be one of:  Rejected, Approved,Requested or Blocked' })
  filterBy:string

  @IsOptional()
  @IsString()
  userName:string;
}