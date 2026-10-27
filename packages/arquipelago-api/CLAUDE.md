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

## Leituras do Members (desafios e cartões dos Lumis, 27/10/2026)

Plano: `docs/plans/2026-10-27-arquipelago-desafios.md`. O serviço lê o Members pelas rotas
internas `/members/internal/arquipelago/*` (nunca pelo gateway) com `MEMBERS_URL` e o token de
LEITURA `ARQUIPELAGO_MEMBERS_TOKEN` (o mesmo nome dos dois lados, separado do das moedas). Sem os
dois, o serviço sobe igual e as leituras ficam desligadas.

- `domain/membros.port.ts` (`PortaDosMembros`, `MembrosIndisponiveisError` com o motivo) e
  `infrastructure/members/membros-http.ts` (teto de `TEMPO_DA_LEITURA_MS`, resposta validada pelo
  contrato: formato estranho conta como indisponível).
- `application/mapa-das-ilhas.ts` (`ConferenciaDoMapa`): na subida, sem segurar o boot, confere o
  mapa ilha → posto do contrato contra `GET /jornada` (`conferirMapaDasIlhas`). Problema vai ao log
  (`arquipelago.mapa_das_ilhas_invalido`) e ao `/readyz` (`mapaDasIlhas`: `desligada`, `pendente`,
  `ok`, `com-problemas`, `indisponivel`), que continua 200.
- `application/leituras-dos-membros.ts` (`LeiturasDosMembros`): posto e blocos de quem joga
  (`GET /jogador`, cache de 30 s por pessoa, teto de 5 mil no processo) e o currículo de blocos
  (`GET /curriculo-de-blocos`, 5 min por público); pedidos iguais dividem a ida e falha não fica no
  cache. Sem Members, ou com ele fora, `PlataformaIndisponivelError` → 424 (nunca 5xx: o disjuntor
  do gateway contaria contra o jogo inteiro).
- `application/servico-das-cartas.ts` (`ServicoDasCartas`): `GET /arquipelago/cartas`.
- Testes: `tests/unit/mapa-das-ilhas.test.ts` (postos do contrato iguais ao `JOURNEY_LEVEL_SLUGS`
  do core, conferência e adaptador), `tests/unit/leituras-dos-membros.test.ts` e os cartões em
  `tests/integration/http.test.ts`.

## Seção Jogo do Admin: cadastro dos desafios (27/10/2026)

Tabelas da migration gerada `0002_desafios`: `desafios` (cadastro, `revisao` é a trava; índice
único de `slug` e de quadro por público e ilha fora os arquivados, nos dois casos traduzidos em
409 `SLUG_EM_USO`/`QUADRO_OCUPADO`), `desafio_publicacoes` (cópia imutável de cada publicação:
conteúdo, blocos derivados e exigidos, a vista dos objetivos e a análise), `desafio_progresso` e
`desafios_concluidos` (para a etapa de jogar).

- `application/servico-da-equipe.ts` (`ServicoDaEquipe`): criar e gravar por revisão (velha → 409
  `DESAFIO_DESATUALIZADO` com `atual`), analisar (o Members confere com o verificador das aulas e
  o serviço soma blocos manuais e cobertura dos cursos), publicar (recusado com 422
  `DESAFIO_COM_PROBLEMAS` enquanto a análise tiver problema; congela a revisão), arquivar e
  reativar (volta a publicado se já teve publicação; quadro ocupado → 409) e a cobertura (mapa das
  ilhas e de onde se aprende cada cartão dos Lumis).
- Rotas em `interfaces/http/rotas-da-equipe.ts` (`/arquipelago/admin/*`), identidade em
  `lerEquipe`: papel de equipe, conta própria (sem perfil nem contexto do Kids); escrever só
  superadmin e admin fora de sessão de suporte (403 `SEM_PERMISSAO`). O gateway e a política do
  Kids são as outras duas barreiras.
- Corpo: o servidor aceita até `CORPO_DA_EQUIPE` (4 MB, dois projetos do Estúdio) só em
  `/arquipelago/admin/*`; o resto do jogo segue no teto pequeno (413 `CORPO_GRANDE_DEMAIS`).
- Testes: `tests/integration/equipe.test.ts` (barreiras, revisão, publicação, conflitos, corpo) e
  `tests/db/desafios.test.ts` (corrida de revisão, índices únicos, publicação, CHECK do quadro).
  ⚠️ Nos testes de banco, `try/catch` em vez de `expect(...).rejects` (a consulta do postgres.js é
  preguiçosa e o `rejects` pode esperar para sempre).

## Rotas (`/arquipelago/*`, todas exigem o `x-internal-token` em deploy)

| Rota | Quem | O quê |
|------|------|-------|
| `GET /acesso` | jogador | liberado/motivo, limite do dia e quanto já usou |
| `GET /salvamento` | jogador liberado | `{revisao, salvamento, atualizadoEm}` (revisão 0 = nada guardado) |
| `PUT /salvamento` | jogador liberado | `{revisaoBase, salvamento}`; revisão velha → 409 `SALVAMENTO_DESATUALIZADO` com `atual` |
| `POST /tempo` | jogador liberado | `{eventoId, dia, segundos}` (1 a 120); repetição não soma novamente, conflito retorna 409 e data futura é recusada; devolve o total de hoje e `acabou` |
| `GET /cartas` | jogador liberado | os cartões da rotina dos Lumis: os do jogo sempre, os de controle pelos blocos conquistados (equipe vê todos), e "Aprenda isso em" nos que faltam; Members fora ou não configurado → 424 `PLATAFORMA_INDISPONIVEL` |
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
