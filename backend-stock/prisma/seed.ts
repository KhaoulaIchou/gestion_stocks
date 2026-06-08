import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const admins = [
  {
    email: 'majdadik@gmail.com',
    name: 'MAJDA DIK',
    password: 'majda123',
    role: 'ADMIN',
  },
  {
    email: 'khaoulaichoukade@gmail.com',
    name: 'KHAOULA ICHOUKADE',
    password: 'khaoula123',
    role: 'ADMIN',
  },
  {
    email: 'mouadmouchtarai@gmail.com',
    name: 'MOUAD MOUCHTARAI',
    password: 'mouad123',
    role: 'ADMIN',
  },
];

async function main() {
  for (const admin of admins) {
    const hashedPassword = await bcrypt.hash(admin.password, 10);

    await prisma.user.upsert({
      where: {
        email: admin.email,
      },
      update: {
        password: hashedPassword,
        role: admin.role,
      },
      create: {
        email: admin.email,
        password: hashedPassword,
        role: admin.role,
      },
    });
  }

  console.log('Admins créés / mis à jour :');

  for (const admin of admins) {
    console.log(`${admin.name} → ${admin.email} / ${admin.password}`);
  }
}

main()
  .catch((error) => {
    console.error('Erreur seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });