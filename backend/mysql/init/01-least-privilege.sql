-- Roda só na primeira criação do volume.
-- Privilégio mínimo para o usuário da aplicação.

REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'tegrapharma'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON tegrapharma.* TO 'tegrapharma'@'%';

DELETE FROM mysql.user WHERE User = '';
DROP DATABASE IF EXISTS test;
FLUSH PRIVILEGES;
