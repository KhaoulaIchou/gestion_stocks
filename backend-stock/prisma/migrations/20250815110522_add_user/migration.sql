/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropIndex
ALTER TABLE [dbo].[User] DROP CONSTRAINT [User_email_key];

-- AlterTable
ALTER TABLE [dbo].[User] ALTER COLUMN [email] NVARCHAR(1000) NOT NULL;
ALTER TABLE [dbo].[User] ALTER COLUMN [role] NVARCHAR(1000) NOT NULL;
ALTER TABLE [dbo].[User] DROP COLUMN [passwordHash];
ALTER TABLE [dbo].[User] ADD [password] NVARCHAR(255) NOT NULL;

-- CreateIndex
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
