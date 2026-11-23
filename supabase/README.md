# Configuração do Banco de Dados (Supabase)

## 1. Aplicar o esquema SQL
1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor** no painel do Supabase.
3. Copie e execute o conteúdo completo de `supabase/migrations/0001_initial_schema.sql`.

## 2. Configurar Variáveis de Ambiente no Expo
1. Copie `.env.example` para `.env` na raiz do projeto.
2. Preencha:
   - `EXPO_PUBLIC_SUPABASE_URL` (Project URL em *Project Settings → API*)
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon public key em *Project Settings → API*)

## 3. Configurar Login com Google (OAuth)
1. No painel do Supabase, acesse **Authentication → Providers → Google** e habilite com seu Client ID / Client Secret do Google Cloud.
2. Em **Authentication → URL Configuration → Redirect URLs**, adicione:
   - `appcasal://auth/callback` (builds nativos / development build)
   - `exp://**` (para desenvolvimento no Expo Go)
   - `http://localhost:8081` (para preview Web)
