-- CreateTable
CREATE TABLE "Machine" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "numSerie" TEXT NOT NULL,
    "numInventaire" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);
