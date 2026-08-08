import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  @MinLength(1, { message: 'Portfolio name cannot be empty' })
  @MaxLength(100, { message: 'Portfolio name cannot exceed 100 characters' })
  name!: string;
}