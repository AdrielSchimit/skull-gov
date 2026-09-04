# Deploy on Vercel

O deploy não faz parte desta entrega.

1. Importe o repositório `AdrielSchimit/skull-gov` na Vercel.
2. Framework preset: Next.js; Root Directory: raiz; Build Command: `npm run build`.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para Production e Preview.
4. Não configure `service_role`.
5. Aplique e valide `SUPABASE_REQUIREMENTS.md` no projeto oficial.
6. Atualize Site URL e Redirect URLs do Supabase com o domínio final.
7. Execute uma sincronização manual como `skull_admin` e valide `/radar`, `/oportunidades/[id]` e o link PNCP.
8. Confirme manifest, instalação do PWA e service worker em HTTPS.

Nenhum Vercel Cron está habilitado. Se a sincronização automática for desejada depois, defina frequência e autenticação server-to-server antes de adicionar `vercel.json`; não habilite um plano pago por padrão.
