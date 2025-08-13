import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const plain = 'admin123';
  const password = await bcrypt.hash(plain, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,     // <-- utilise la variable, pas un re-hash
      role: 'ADMIN'
    },
  });

  console.log('✅ Admin prêt :', email, '(mdp:', plain, ')');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
