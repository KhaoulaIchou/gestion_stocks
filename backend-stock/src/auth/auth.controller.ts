import { Public } from './roles.decorator';
import { Controller, Post, UseGuards, Request, Body, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req, @Body() _body: LoginDto) {
    const token = this.auth.signToken(req.user);
    return { access_token: token, user: req.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Get('admin-only')
  adminOnly() { return { ok: true }; }
}
