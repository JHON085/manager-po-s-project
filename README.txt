PO CONTROL + SUPABASE + VERCEL

1. Crie um projeto no Supabase.
2. Abra SQL Editor > New query, cole todo o arquivo supabase.sql e execute.
3. Em Project Settings > API, copie Project URL e Publishable Key (a legacy anon key também funciona). NUNCA use service_role no navegador.
4. Abra config.js e substitua os dois valores.
5. Abra index.html e crie/entre em uma conta. Se confirmação por e-mail estiver ativa, confirme o e-mail.
6. Publique a pasta na Vercel como site estático.

O que esta versão faz:
- login Supabase Auth
- banco PostgreSQL central
- sincronização entre dispositivos
- dashboard e alertas de atraso
- histórico de alteração de prontidão
- CRUD de POs
- backup JSON / importação / CSV
- RLS: usuário deslogado não acessa os POs

No MVP, todos os usuários autenticados no mesmo projeto podem ver e editar todos os POs.
