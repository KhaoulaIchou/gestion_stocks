import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.users.findByEmail(email);
    if (!user) return null;

    // Si tes mots de passe sont hashés en bcrypt :
    //   ok = await bcrypt.compare(pass, user.password)
    // Si certains sont encore en clair, on garde un fallback sans persister :
    const looksHashed = /^\$2[aby]\$/.test(user.password);
    const ok = looksHashed ? await bcrypt.compare(pass, user.password) : pass === user.password;

    return ok ? user : null;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, roles: user.role ? [user.role] : [] };
    return {
      access_token: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, roles: payload.roles },
    };
  }
}
