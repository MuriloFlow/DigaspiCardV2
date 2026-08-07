-- 1. Remove a restrição atual da coluna role
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;

-- 2. Adiciona a restrição novamente, incluindo o REGIONAL_MANAGER e TI_ADMIN
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('EMPLOYEE', 'MANAGER', 'VM', 'GLOBAL_ADMIN', 'REGIONAL_MANAGER', 'TI_ADMIN'));
