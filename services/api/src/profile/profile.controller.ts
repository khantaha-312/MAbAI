import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard'; // CONFIRM: exact path
import { CurrentUser } from '../auth/current-user.decorator'; // CONFIRM: exact name/path
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

// CONFIRM: shape of whatever @CurrentUser() actually returns —
// this assumes it exposes `.clerkId`. If it returns the raw Clerk JWT
// payload instead, swap `user.clerkId` for whatever field holds it (e.g. `user.sub`).
interface AuthenticatedUser {
  clerkId: string;
}

@UseGuards(ClerkAuthGuard)
@Controller()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post('onboarding/profile')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProfileDto) {
    return this.profileService.create(user.clerkId, dto);
  }

  @Get('profile')
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getByClerkId(user.clerkId);
  }

  @Put('profile')
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.profileService.update(user.clerkId, dto);
  }
}