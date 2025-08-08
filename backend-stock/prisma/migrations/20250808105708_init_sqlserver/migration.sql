BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Destination] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [parentId] INT,
    CONSTRAINT [Destination_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Machine] (
    [id] INT NOT NULL IDENTITY(1,1),
    [type] NVARCHAR(1000) NOT NULL,
    [reference] NVARCHAR(1000) NOT NULL,
    [numSerie] NVARCHAR(1000) NOT NULL,
    [numInventaire] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Machine_status_df] DEFAULT 'en_stock',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Machine_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [destinationId] INT,
    CONSTRAINT [Machine_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[History] (
    [id] INT NOT NULL IDENTITY(1,1),
    [machineId] INT NOT NULL,
    [from] NVARCHAR(1000),
    [to] NVARCHAR(1000) NOT NULL,
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [History_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [History_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Destination] ADD CONSTRAINT [Destination_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[Destination]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Machine] ADD CONSTRAINT [Machine_destinationId_fkey] FOREIGN KEY ([destinationId]) REFERENCES [dbo].[Destination]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[History] ADD CONSTRAINT [History_machineId_fkey] FOREIGN KEY ([machineId]) REFERENCES [dbo].[Machine]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
