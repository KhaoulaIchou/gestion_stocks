import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

const machineTypes = [
  { type: 'UNITE_CENTRALE', prefix: 'UC' },
  { type: 'ECRAN', prefix: 'ECR' },
  { type: 'IMPRIMANTE', prefix: 'IMP' },
  { type: 'SCANNER', prefix: 'SCN' },
];

function clean(value: any): string {
  return String(value ?? '').trim();
}

function hasMachineData(row: any, prefix: string): boolean {
  return Boolean(
    clean(row[`${prefix} Marque`]) ||
      clean(row[`${prefix} Référence`]) ||
      clean(row[`${prefix} SN`]) ||
      clean(row[`${prefix} INV`]) ||
      clean(row[`${prefix} Référence Marché`]) ||
      clean(row[`${prefix} Etat`]),
  );
}

async function main() {
  const filePath = path.join(
    process.cwd(),
    'imports',
    'materiel.xlsx',
  );

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
  });

  console.log(`📥 Import materiel.xlsx : ${rows.length} lignes`);

  let inserted = 0;

  for (const row of rows) {
    const etablissementNom =
      clean(row['Etablissement']) || 'Non défini';

    const serviceNom =
      clean(row['Service']) || 'Non défini';

    const affectataireNom =
      clean(row['Fonctionnaire / Bureau']) || 'Non défini';

    const etablissement =
      await prisma.etablissement.upsert({
        where: {
          nom: etablissementNom,
        },
        update: {},
        create: {
          nom: etablissementNom,
        },
      });

    const service =
      await prisma.service.upsert({
        where: {
          nom_etablissementId: {
            nom: serviceNom,
            etablissementId: etablissement.id,
          },
        },
        update: {},
        create: {
          nom: serviceNom,
          etablissementId: etablissement.id,
        },
      });

    const destination =
      await prisma.destination.upsert({
        where: {
          etablissementId_bureau: {
            etablissementId: etablissement.id,
            bureau: serviceNom,
          },
        },
        update: {
          serviceId: service.id,
        },
        create: {
          etablissementId: etablissement.id,
          serviceId: service.id,
          bureau: serviceNom,
        },
      });

    const affectataire =
      await prisma.affectataire.upsert({
        where: {
          nom_etablissementId_serviceId: {
            nom: affectataireNom,
            etablissementId: etablissement.id,
            serviceId: service.id,
          },
        },
        update: {},
        create: {
          nom: affectataireNom,
          type: 'AUTRE',
          etablissementId: etablissement.id,
          serviceId: service.id,
        },
      });

    for (const machine of machineTypes) {
      if (!hasMachineData(row, machine.prefix)) {
        continue;
      }

      await prisma.machine.create({
        data: {
          type: machine.type,

          marque:
            clean(row[`${machine.prefix} Marque`]) || null,

          reference:
            clean(row[`${machine.prefix} Référence`]) || null,

          numSerie:
            clean(row[`${machine.prefix} SN`]) || null,

          numInventaire:
            clean(row[`${machine.prefix} INV`]) || null,

          referenceMarche:
            clean(
              row[`${machine.prefix} Référence Marché`],
            ) || null,

          etat:
            clean(row[`${machine.prefix} Etat`]) || null,

          status: 'affectée',

          destinationId: destination.id,
          affectataireId: affectataire.id,

          sourceFile: 'materiel.xlsx',
        },
      });

      inserted++;
    }
  }

  console.log(`✅ Machines insérées : ${inserted}`);
  console.log('✅ Import terminé avec succès');
}

main()
  .catch((e) => {
    console.error('❌ Erreur import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

