// auth/strategies/jwt.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'dev-secret', // même fallback
      ignoreExpiration: false,
    });
  }
  async validate(payload: { sub: string; email: string; roles: string[] }) {
    return { userId: payload.sub, email: payload.email, roles: payload.roles ?? [] };
  }
}
