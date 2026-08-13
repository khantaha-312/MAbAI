import { IsIn, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsIn(['free', 'pro', 'enterprise'])
  plan!: 'free' | 'pro' | 'enterprise';
}