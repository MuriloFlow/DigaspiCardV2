-- 1. Remove a restriǜo atual da coluna role
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;

-- 2. Adiciona a restriǜo novamente, incluindo o REGIONAL_MANAGER
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('EMPLOYEE', 'MANAGER', 'VM', 'GLOBAL_ADMIN', 'REGIONAL_MANAGER'));
