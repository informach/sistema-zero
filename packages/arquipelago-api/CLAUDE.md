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

## Jogar os desafios (27/10/2026)

Regras do jogo, em linguagem da dona e com onde mudar cada número: `docs/arquipelago-regras.md`.

- `application/servico-dos-desafios.ts` (`ServicoDosDesafios`), liga com `ARQUIPELAGO_DESAFIOS`
  (`desligado`, `equipe`, `aberto`; sem valor: aberto em dev e DESLIGADO em deploy; nome novo, fora
  do `.railway/variables.ts` até existir no painel). Desligado → 403 `DESAFIOS_DESLIGADOS`; a
  política do jogo (`decidirAcesso`) vem antes (403 `ACESSO_BLOQUEADO`); sem Members → 424.
- Régua (`domain/desafios.ts`, pura): `situacaoDoDesafio` (concluído > ilha fechada > faltam
  blocos > disponível; feito continua feito), `passouNosObrigatorios` (principal = todos os
  obrigatórios, sem obrigatório nunca passa; extra = todos os opcionais), `chaveDasMoedas`
  (UUIDv5 por jogador, desafio e prêmio) e `semanaDeSaoPaulo` (a segunda-feira da semana do teto).
  A régua (posição e blocos) vem do `GET /jogador` (cache de 30 s); a equipe tem tudo aberto.
- Rotas em `interfaces/http/rotas-dos-desafios.ts`: `GET /arquipelago/desafios[?ilha=]` (as ilhas
  com aberta e a cor, `quadro.feitos` = quadros distintos concluídos na ilha, e os desafios com
  situação, o que falta e "Aprenda isso em"), `GET /desafios/:id` (`DesafioAberto`: só a vista dos
  objetivos e o projeto inicial; bloqueado → 403 `DESAFIO_BLOQUEADO` com `situacao`),
  `POST /desafios/:id/verificar` (`{revisao, projeto}`; corpo até `CORPO_DA_CONFERENCIA`, 4 MB)
  e `POST /desafios/:id/recompensa-vista`.
- Conferir: a revisão que a pessoa abriu continua conferível enquanto existir; arquivado → 409
  `DESAFIO_MUDOU`; revisão que não existe → 404. Não concluído é reconferido (ilha e blocos) antes
  de gastar o executor. O executor fora, cheio ou recusando vira 424 `CONFERENCIA_INDISPONIVEL`,
  429 `CONFERENCIA_OCUPADA`, 409 `CONFERENCIA_SINCRONIZANDO` ou 400 `PROJETO_RECUSADO`, e nada é
  guardado. Passou: guarda a tentativa (`desafio_progresso`), conclui uma vez só e marca o extra
  uma vez só (com o principal passando junto). Suporte confere sem guardar e sem prêmio.
- Moedas: `domain/moedas.port.ts` + `infrastructure/members/moedas-http.ts` (`MoedasHttp`,
  `POST /members/internal/arquipelago/coins` com `ARQUIPELAGO_COINS_TOKEN`, prazo de 5 s). O
  prêmio nasce `pendente`; `creditado` ao confirmar; `WEEKLY_LIMIT` vira `teto` com a semana
  (`moedas_teto_semana`) e é cobrado de novo numa semana seguinte; recusa definitiva vai ao log e
  fica pendente; falha de rede fica pendente. A lista cobra até 3 prêmios por leitura; a
  conferência cobra os do desafio na hora. Teto cheio para os outros prêmios da mesma ida.
- Repositório: `DrizzleRepositorioDoJogadorNosDesafios`. Testes:
  `tests/integration/desafios-do-jogador.test.ts`, `tests/unit/desafios.test.ts` e o bloco do
  jogador em `tests/db/desafios.test.ts` (corrida da conclusão e do extra, semana do teto).

## Rotas (`/arquipelago/*`, todas exigem o `x-internal-token` em deploy)

| Rota | Quem | O quê |
|------|------|-------|
| `GET /acesso` | jogador | liberado/motivo, limite do dia e quanto já usou |
| `GET /salvamento` | jogador liberado | `{revisao, salvamento, atualizadoEm}` (revisão 0 = nada guardado) |
| `PUT /salvamento` | jogador liberado | `{revisaoBase, salvamento}`; revisão velha → 409 `SALVAMENTO_DESATUALIZADO` com `atual` |
| `POST /tempo` | jogador liberado | `{eventoId, dia, segundos}` (1 a 120); repetição não soma novamente, conflito retorna 409 e data futura é recusada; devolve o total de hoje e `acabou` |
| `GET /cartas` | jogador liberado | os cartões da rotina dos Lumis: os do jogo sempre, os de controle pelos blocos conquistados (equipe vê todos), e "Aprenda isso em" nos que faltam; Members fora ou não configurado → 424 `PLATAFORMA_INDISPONIVEL` |
| `GET /desafios`, `GET /desafios/:id`, `POST /desafios/:id/verificar`, `POST /desafios/:id/recompensa-vista` | jogador liberado (com `ARQUIPELAGO_DESAFIOS`) | ver "Jogar os desafios" |
| `GET /familia/limite?perfis=` | responsável do Kids | o limite diário da família e `algumaCriancaVe` (algum dos perfis da conta, mandados pelo BFF dos pais, vê o jogo pela política de acesso); perfis fora do formato → 400 |
| `PUT /familia/limite` | responsável do Kids | muda o limite diário da família (padrão 30, de 10 a 240, passo 5) |
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
- **Cartão dos pais** (28/10/2026): a área dos pais só mostra o cartão do tempo livre quando
  `algumaCriancaVe` (`domain/acesso.ts`): cada perfil da conta passa por `decidirAcesso` como
  criança do Kids, com o papel da conta (a família da equipe conta como equipe). Os ids vêm do BFF
  dos pais (a grade do Auth, só os perfis prontos) em `?perfis=`, até 20
  (`PERFIS_DA_FAMILIA_MAXIMO`); sem perfis, falso. Não há rota nova no Members, e o serviço não
  confere que os ids são da conta (forjar só muda o próprio cartão; o jogo segue pela sessão da
  criança). Serviço e app do Kids sobem juntos: com só um novo, o cartão some. Detalhe em `docs/arquipelago-regras.md`, seção 3.
- **Salvamento**: gravação numa instrução só (insert on conflict do nothing na revisão 0, update
  com `where revisao = base` nas demais); quem perde recebe o que está guardado. Teto de 64 KB.
  Guardado que não passa no formato atual → 409 `SALVAMENTO_ILEGIVEL` (nunca devolve "vazio",
  senão o jogo criaria um salvamento novo por cima). Formato novo = a próxima versão no contrato
  (hoje `SalvamentoV3`) com a migração da anterior.
- **Tempo livre**: contado pelo jogo e somado aqui (teto de 24 h por dia); quem decide `acabou` é
  o serviço. É controle dos pais, não trava de segurança.

## Comandos

`bun run dev` · `bun test` · `bun run typecheck` · `bun run db:generate` (gera a migration a partir
do `schema.ts`; nunca editar SQL/snapshot gerado) · `bun run db:migrate`.
Testes de banco (`tests/db`) rodam contra um Postgres local descartável (`TEST_DATABASE_URL`, ou
`localhost:5433`); sem banco são pulados. NUNCA apontar para staging/produção.

## Deploy

O serviço está registrado em `.railway/services/arquipelago-api.json` (variáveis em
`.railway/variables.ts`) e as rotas estão no gateway (`arquipelago-routes.ts`, que só entram com
`ARQUIPELAGO_URL`). Provisionar no Railway e validar com contas reais é da sessão que cuida do
deploy (`docs/operations/arquipelago-first-deploy.md`); pre-deploy `db:migrate`, build do cliente
com `bun run --filter @sistemazero/arquipelago build`.
