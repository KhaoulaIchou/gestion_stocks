// auth/strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private auth: AuthService) {
    super({ usernameField: 'email' }); // IMPORTANT: on utilise 'email', pas 'username'
  }
  async validate(email: string, password: string) {
    const user = await this.auth.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user; // attaché à req.user
  }
}
