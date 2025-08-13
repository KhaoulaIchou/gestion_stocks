import { Controller, Post, UseGuards, Request, Body, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
//import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req, @Body() _body: LoginDto) {
    // req.user vient de LocalStrategy.validate
    const token = this.auth.signToken(req.user);
    return { access_token: token, user: req.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req) {
    return req.user; // {sub, email, role}
  }

  // Exemple d’endpoint protégé + rôle
  @UseGuards(JwtAuthGuard)
  //@Roles('ADMIN')
  @Get('admin-only')
  adminOnly() {
    return { ok: true };
  }
}
