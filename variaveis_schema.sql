-- SQL para criar a tabela de variáveis no Supabase
-- Execute este SQL no Supabase SQL Editor: https://supabase.com/dashboard/project/mlwjjfgfuzdsrmdihlle/sql/new

CREATE TABLE IF NOT EXISTS variaveis (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,  -- 'turno', 'formato', 'cor'
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tipo, nome)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_variaveis_tipo ON variaveis(tipo);
CREATE INDEX IF NOT EXISTS idx_variaveis_nome ON variaveis(nome);

-- Habilitar Row Level Security
ALTER TABLE variaveis ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso público (ajuste conforme necessidade)
CREATE POLICY "Enable all access for variaveis" ON variaveis
    FOR ALL USING (true) WITH CHECK (true);

-- Inserir algumas variáveis padrão (opcional)
-- INSERT INTO variaveis (id, tipo, nome) VALUES 
--     (gen_random_uuid()::text, 'turno', 'Manhã'),
--     (gen_random_uuid()::text, 'turno', 'Tarde'),
--     (gen_random_uuid()::text, 'turno', 'Noite'),
--     (gen_random_uuid()::text, 'turno', 'Administrativo'),
--     (gen_random_uuid()::text, 'formato', '30x40'),
--     (gen_random_uuid()::text, 'formato', '40x50'),
--     (gen_random_uuid()::text, 'cor', 'Branco'),
--     (gen_random_uuid()::text, 'cor', 'Azul'),
--     (gen_random_uuid()::text, 'cor', 'Verde');
