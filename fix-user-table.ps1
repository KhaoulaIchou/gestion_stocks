Set-Content -Path .\fix-user-table.sql -Encoding UTF8 -Value @"
DECLARE @n sysname;
SELECT @n = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.default_object_id = dc.object_id
JOIN sys.tables t ON t.object_id = c.object_id
WHERE t.name = 'User' AND c.name = 'role';

IF @n IS NOT NULL
    EXEC('ALTER TABLE [dbo].[User] DROP CONSTRAINT [' + @n + ']');

IF COL_LENGTH('dbo.[User]','password') IS NULL
    ALTER TABLE [dbo].[User] ADD [password] VARCHAR(255) NULL;
"@
