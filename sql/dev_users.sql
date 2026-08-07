-- Tabela de Usuários Exclusivos do Console de TI (Dev)
CREATE TABLE public.dev_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'TI_ADMIN' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar Row Level Security (opcional, já que o acesso a essa tabela é feito pelo service_role admin bypassando RLS,
-- mas é boa prática ativá-la para não permitir leitura acidental via cliente)
ALTER TABLE public.dev_users ENABLE ROW LEVEL SECURITY;

-- Trigger para atualizar a coluna updated_at automaticamente (se o trigger on_update_dev_users já não existir)
CREATE OR REPLACE FUNCTION update_dev_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dev_users_timestamp
    BEFORE UPDATE ON public.dev_users
    FOR EACH ROW
    EXECUTE FUNCTION update_dev_users_updated_at();

-- Inserindo o primeiro usuário Master de TI
-- O hash abaixo corresponde à senha: @Murilofe0911
INSERT INTO public.dev_users (username, password_hash, role, is_active)
VALUES (
    'murilogiroldo0@gmail.com', 
    '$2b$10$wp3grwf7K240Nv4If1sRhOnAWWmJgAeHHfW.VePIJxGLboewWSsLm', 
    'TI_ADMIN', 
    true
);
