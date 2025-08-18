import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUser(email: string, plain: string, role: 'ADMIN'|'MANAGER'|'VIEWER') {
  const password = await bcrypt.hash(plain, 10);
  await prisma.user.upsert({
    where: { email },
    update: { password, role },
    create: { email, password, role },
  });
}

async function main() {
  await upsertUser('admin@example.com',   'admin123',   'ADMIN');
  await upsertUser('manager@example.com', 'manager123', 'MANAGER');
  await upsertUser('viewer@example.com',  'viewer123',  'VIEWER');
  
  console.log('✅ Comptes créés/mis à jour :');
  console.log('   ADMIN   → admin@example.com / admin123');
  console.log('   MANAGER → manager@example.com / manager123');
  console.log('   VIEWER  → viewer@example.com / viewer123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

