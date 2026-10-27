# CLAUDE.md — @sistemazero/arquipelago-api

Serviço do jogo **Arquipélago Vagalume**. Porta **3015**, schema Postgres **`arquipelago`**,
journal `arquipelago_migrations`. Bun + Elysia + Drizzle, no molde do `packages/referrals`
(env Zod fail-fast, borda Elysia, Sentry, `x-internal-token` do gateway).

## Fronteira

- Só o jogo fala com este serviço (o navegador, pelo repasse da plataforma e pelo gateway). Nenhum
  pacote da plataforma o importa (teste em `packages/arquipelago/tests/fronteira.test.ts`), e ele
  não lê nem grava tabelas da plataforma. Moedas, avatar, quarto e jornada continuam no Members.
- Formatos de entrada e saída: `@sistemazero/arquipelago-contracts` (os mesmos que o jogo e a
  plataforma de mentira usam).

## Rotas (`/arquipelago/*`, todas exigem o `x-internal-token` em deploy)

| Rota | Quem | O quê |
|------|------|-------|
| `GET /acesso` | jogador | liberado/motivo, limite do dia e quanto já usou |
| `GET /salvamento` | jogador liberado | `{revisao, salvamento, atualizadoEm}` (revisão 0 = nada guardado) |
| `PUT /salvamento` | jogador liberado | `{revisaoBase, salvamento}`; revisão velha → 409 `SALVAMENTO_DESATUALIZADO` com `atual` |
| `POST /tempo` | jogador liberado | `{eventoId, dia, segundos}` (1 a 120); repetição não soma novamente, conflito retorna 409 e data futura é recusada; devolve o total de hoje e `acabou` |
| `GET\|PUT /familia/limite` | responsável do Kids | limite diário da família (padrão 30, de 10 a 240, passo 5) |
| `GET /cliente/manifesto.json` e `/cliente/:arquivo` | página do jogo | o cliente compilado (manifesto sem cache, arquivos com hash em cache imutável; mapas só fora da produção) |

- **Quem é quem** (`interfaces/http/identidade.ts`, mesmas regras de sessão do Members): sessão de
  perfil (`x-auth-account-id`, contexto `student` ou ausente) = criança do Kids, salvamento no
  PERFIL e limite na CONTA da família; sem perfil e sem contexto do Kids = membro adulto, sem
  limite; contexto `parent` = responsável, que não joga e só muda o limite.
- **Suporte** (`x-auth-impersonator-id`, em qualquer modo: o gateway não injeta nem limpa o modo) só lê: gravar salvamento ou limite dá
  403 `SOMENTE_LEITURA` e o tempo não é somado.
- **Quem vê o jogo** (`domain/acesso.ts`): `ARQUIPELAGO_MODO` desligado (todos bloqueados,
  inclusive a equipe), lista (equipe + ids de perfil ou conta em `ARQUIPELAGO_LISTA`) ou aberto;
  `ARQUIPELAGO_PUBLICOS` (`kids`, `adulto`). Sem `ARQUIPELAGO_MODO`: aberto em dev e DESLIGADO em
  deploy (lançar é decisão explícita). Bloqueado → 403 `ACESSO_BLOQUEADO` com `motivo`.
- **Salvamento**: gravação numa instrução só (insert on conflict do nothing na revisão 0, update
  com `where revisao = base` nas demais); quem perde recebe o que está guardado. Teto de 64 KB.
  Guardado que não passa no formato atual → 409 `SALVAMENTO_ILEGIVEL` (nunca devolve "vazio",
  senão o jogo criaria um salvamento novo por cima). Formato novo = `SalvamentoV2` no contrato com
  migração da V1.
- **Tempo livre**: contado pelo jogo e somado aqui (teto de 24 h por dia); quem decide `acabou` é
  o serviço. É controle dos pais, não trava de segurança.

## Comandos

`bun run dev` · `bun test` · `bun run typecheck` · `bun run db:generate` (gera a migration a partir
do `schema.ts`; nunca editar SQL/snapshot gerado) · `bun run db:migrate`.
Testes de banco (`tests/db`) rodam contra um Postgres local descartável (`TEST_DATABASE_URL`, ou
`localhost:5433`); sem banco são pulados. NUNCA apontar para staging/produção.

## Deploy (ainda não ligado)

O `Dockerfile` existe, mas o serviço não está registrado no Railway nem no gateway: isso é um
rollout de infraestrutura à parte (serviço novo, `DATABASE_URL`, `INTERNAL_API_TOKEN`,
pre-deploy `db:migrate`, build do cliente com `bun run --filter @sistemazero/arquipelago build`).
