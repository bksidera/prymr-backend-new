// src/dto/pagination.dto.ts
import { IsOptional, IsInt, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
//   @IsInt()
//   @Min(1)
  page?: number;

  @IsOptional()
//   @IsInt()
//   @Min(1)
  pageSize?: number;
}
