-- SQL para criar a tabela de variáveis no Supabase
-- Execute este SQL no Supabase SQL Editor: https://supabase.com/dashboard/project/mlwjjfgfuzdsrmdihlle/sql/new

CREATE TABLE IF NOT EXISTS variaveis (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,  -- 'turno', 'formato', 'cor'
    nome TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tipo, nome)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_variaveis_tipo ON variaveis(tipo);
CREATE INDEX IF NOT EXISTS idx_variaveis_nome ON variaveis(nome);
CREATE INDEX IF NOT EXISTS idx_variaveis_ordem ON variaveis(ordem);

-- Habilitar Row Level Security
ALTER TABLE variaveis ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso público (ajuste conforme necessidade)
CREATE POLICY "Enable all access for variaveis" ON variaveis
    FOR ALL USING (true) WITH CHECK (true);

-- Se a tabela já existe, adicionar coluna ordem:
-- ALTER TABLE variaveis ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;
