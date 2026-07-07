# Marketing digital do Sistema Zero — manual de conceitos e operação

> Manual CONCEITUAL da ferramenta de marketing (o que cada coisa significa e como o time
> trabalha nela). Os guias técnicos por pacote estão em
> [`packages/marketing/CLAUDE.md`](../packages/marketing/CLAUDE.md) (API) e
> [`packages/marketing-app/CLAUDE.md`](../packages/marketing-app/CLAUDE.md) (app).
> O plano completo de fases vive em `~/.claude/plans/eu-tenho-a-plataforma-wise-nebula.md`.

## O que é

Ferramenta INTERNA da equipe para gerenciar todo o marketing de conteúdo do Sistema Zero:
Instagram, YouTube, Facebook e TikTok em um lugar só. Cobre o ciclo completo:

```
ideia → produção (etapas + checklist) → aprovação → publicações por rede → agendamento
      → publicação (automática ou lembrete) → métricas
```

Quem acessa: qualquer conta da equipe (papel `staff`, `admin` ou `superadmin` no auth), pelo
app dedicado (porta 3012 em dev; `marketing.sistemazero.com.br` quando for ao ar). Cliente
comum (`customer`) não entra. Conectar/desconectar contas sociais é restrito a admin e auditado.

## Os 4 conceitos centrais

### 1. Ideia (inbox)

Captura rápida de qualquer ideia de conteúdo (título + notas + potencial 1..3 + complexidade).
Fica no inbox até alguém **promover** a ideia, o que cria um Conteúdo no pipeline já com o
briefing preenchido e arquiva a ideia (status `accepted`, com link para o conteúdo criado).

### 2. Conteúdo (o mestre, no pipeline de produção)

Um Conteúdo é UMA peça em produção: um Reels, um vídeo longo, um carrossel, um post estático ou
uma sequência de Stories (`content_type`). Ele anda por **etapas** (colunas do kanban):

```
Ideia → Roteiro → Gravação → Edição → Capa e legenda → Revisão → Aprovado
                                        (etapas manuais, arrasta no kanban)
→ Agendado → Publicado          (DERIVADAS das publicações — ninguém move na mão)
```

Regras que o sistema garante:
- Mover entre as 7 etapas de produção é livre (qualquer direção, para corrigir rumo).
- Promover a MESMA ideia duas vezes não cria conteúdo duplicado (a segunda tentativa é
  recusada, inclusive em cliques simultâneos de duas pessoas).
- Cancelar um conteúdo cancela junto as publicações pendentes dele (nenhum lembrete ou
  robô de publicação dispara para conteúdo cancelado).
- **Entrar em "Aprovado" exige o checklist 100% concluído.** Cada conteúdo nasce com um
  checklist copiado do modelo do seu tipo (ex.: Reels tem "gancho nos 3 primeiros segundos",
  "revisão final em aparelho de celular"), e o time pode adicionar itens manuais. Cada item
  marcado guarda quem marcou e quando.
- "Agendado" e "Publicado" são calculadas sozinhas a partir das publicações (abaixo).
- Todo movimento de etapa fica registrado (histórico com autor e hora, base do futuro
  relatório de lead-time).
- Conteúdo tem responsável, prazo, briefing e roteiro (markdown), comentários da equipe e
  anexos de mídia.

### 3. Publicação (cross-post: uma por rede/formato)

Quando o conteúdo está **Aprovado**, o time gera as publicações: o MESMO vídeo pode virar
`ig_reels` + `yt_short` + `tt_video`, cada uma com **legenda, capa, horário e status próprios**.
Formatos: `ig_feed`, `ig_carousel`, `ig_reels`, `ig_story`, `fb_post`, `fb_reels`, `yt_video`,
`yt_short`, `tt_video`.

Ciclo de vida de cada publicação:

```
draft → scheduled → published          (fluxo normal)
              ↘ canceled                (desistiu desta rede)
```

O agendamento só aceita horário válido (nada no passado, nada além de 2 anos) e uma
publicação agendada nunca fica "sem horário": para desistir dela, cancela; para mudar,
reagenda. Cada formato só tem UMA publicação ativa por conteúdo (recriar exige cancelar
a anterior).

Dois modos de publicar:
- **Lembrete (`manual`)** — o modo de HOJE, e permanente para Stories (nenhuma ferramenta do
  mundo publica Stories por API). Agendar cria o compromisso; na hora, o sistema avisa (fase 1:
  aviso por WhatsApp/e-mail via messaging) e a pessoa posta na mão e clica em "marcar como
  publicado", colando o link do post real (isso conecta as métricas depois).
- **Automático (`auto`)** — fases 2 a 4: o sistema publica sozinho via API oficial
  (YouTube primeiro, depois Instagram/Facebook, depois TikTok). Hoje escolher `auto` responde
  `AUTO_PUBLISH_UNAVAILABLE` de propósito; vai liberando por rede conforme cada integração
  entra e a conta estiver conectada.

Sincronização com o conteúdo-mestre: alguma publicação agendada/pendente → conteúdo vira
**Agendado**; todas publicadas → **Publicado**; todas canceladas → volta a **Aprovado**.

### 4. Mídia (biblioteca)

Vídeos, imagens e artes vivem no **R2** (bucket privado próprio do marketing). O upload é
DIRETO do navegador para o R2 (URL pré-assinada), então arquivo de 1 GB não passa pelo app nem
esbarra no teto de 100 MB do Cloudflare. Fluxo: o app pede o presign → sobe direto → confirma
(o serviço confere tamanho no R2). O preview e o download usam URLs temporárias.

O **Google Drive (5 TB)** entra em duas pontas (fase 1+): importar um arquivo do Drive para a
biblioteca (cópia servidor a servidor) e **arquivamento automático** depois de publicado (os
arquivos pesados vão para o Drive e o R2 fica enxuto e barato). O Drive continua sendo a área
humana do time para brutos de gravação.

## Como as peças técnicas se encaixam

```
marketing-app (Next, :3012)  ── BFF /api/* ──►  api-gateway (:3000)  ──►  marketing (:3011)
        │                                          (JWT staff+, rate limit,                │
        │  upload direto (presigned PUT)            x-internal-token)                       │
        ▼                                                                                   ▼
   Cloudflare R2  ◄──────────────── presign/HEAD/GET ───────────────────────  Postgres (schema `marketing`)
```

- O app NUNCA fala com o serviço direto; o gateway autentica (JWT), aplica papel staff+ e
  injeta a identidade confiável.
- O serviço marketing é o dono do bucket R2 e do schema `marketing` no Postgres compartilhado
  (12 tabelas: ideias, conteúdos, eventos de etapa, checklist, comentários, mídia, contas
  sociais, publicações, ordem de carrossel, 2 séries de métricas, states de OAuth).
- O schema já nasceu completo para as fases futuras: as publicações têm o checkpoint de
  idempotência (`provider_session`) que impede post duplicado quando o robô de publicação
  entrar, e as tabelas de métricas guardarão os snapshots periódicos de cada rede.

## Roadmap (fases)

| Fase | Entrega | Estado |
|------|---------|--------|
| 0 | Fundação: pipeline + publicações modo lembrete + mídia R2 + app com login/shell | **FEITA (07/2026)** |
| 1 | Operação manual completa: telas ricas (kanban, detalhe, composer, calendário, biblioteca, painel), lembrete por WhatsApp, OAuth Google, importar do Drive | **FEITA (07/2026)** |
| 2 | YouTube automático (upload antecipado + agendamento nativo, quota guard) + tela Conexões + métricas básicas YT | **FEITA (07/2026)** |
| 3 | Instagram/Facebook automático + coletor de métricas completo + dashboards | próxima |
| 4 | TikTok + arquivamento R2→Drive + melhores horários (heatmap) | |
| 5 | IA: legenda/roteiro com validação Light Copy/VTSD + hashtags | |

Notas de dependência externa: publicar automático exige app aprovado na Meta (em modo dev já
publica para as contas administradoras do app, o que cobre uso interno), app OAuth do Google
publicado (senão o refresh token expira em 7 dias) e auditoria do app TikTok (antes dela os
posts via API ficam privados). O modo lembrete existe exatamente para o produto funcionar
inteiro ANTES de qualquer aprovação externa.

## Operação (dev local)

1. Postgres: `bun run dev:up` (raiz) e migration: `bun run db:marketing:migrate` (aplicada em
   07/07/2026 no dev local).
2. Suba auth (:3002), gateway (:3000) e marketing (:3011, `bun run dev:marketing` — precisa de
   `.env`, ver `packages/marketing/.env.example`).
3. App: `bun run dev:marketing-app` → `http://localhost:3012` → login com usuário staff+
   (crie com o `db:seed` do auth).

## Infra (staging/produção) — PROVISIONADA 07/07/2026

- Serviços `marketing` e `marketing-app` criados no Railway em staging E produção, com envs,
  domínios (staging `marketing-app-staging-cb28.up.railway.app`; produção
  `marketing.sistemazero.com.br`) e SVC_IDs preenchidos no CI (cases descomentados).
- Buckets R2 criados com CORS das origens do app: `testes-marketing` (staging/dev) e
  `sistemazero-marketing` (produção). Credenciais S3 = referências ao token da conta (admin).
- `MARKETING_INTERNAL_TOKEN` está no `PROD_REQUIRED_SECRETS` do gateway e setado nos 2 ambientes.
- ⚠️ Pendência única: criar o CNAME `marketing` → `34z3j59k.up.railway.app` na zona
  sistemazero.com.br do Cloudflare (o token de API atual é read-only para DNS). A produção
  só atende pelo domínio depois disso; o deploy de produção em si acontece no próximo merge
  para a `main` (PR), como nos demais serviços.
