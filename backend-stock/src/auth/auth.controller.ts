// auth/auth.controller.ts
import { Controller, Post, UseGuards, Req, HttpCode } from '@nestjs/common';
import { Public } from './roles.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  async login(@Req() req: any) {
    // req.user vient de LocalStrategy.validate()
    return this.auth.login(req.user); // -> { access_token, user }
  }
}
