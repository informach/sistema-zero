# CLAUDE.md — @sistemazero/arquipelago-api

## Medição da equipe (geral-06, 28/10/2026)

`GET /arquipelago/equipe/medicao?de=AAAA-MM-DD&ate=AAAA-MM-DD&publico=kids|adulto`
usa `lerEquipe` e o token do gateway. `ServicoDaMedicao` limita o período inclusivo a 90 dias,
recusa futuro pelo dia de São Paulo e delega ao `DrizzleRepositorioDaMedicao`. São quatro consultas
agregadas numa transação somente leitura com snapshot repetível. Nenhum ID de pessoa sai do banco.

`domain/medicao.ts` protege grupos menores que cinco. Na volta, também protege a linha inteira
quando o número de quem voltou ou de quem não voltou é positivo e menor que cinco. O primeiro
dia é o primeiro registro positivo de tempo livre em todo o histórico. Dia seguinte é D+1;
dia 7 é D+6. Só dias encerrados entram na comparação; os demais ficam `aguardando`.
Não há histórico de tempo equivalente para adultos: não inferir jogo pela data do salvamento.

As aparências são uma fotografia atual dos projetos azuis ganhos no período, agrupadas pela
origem; não são compras nem eventos datados de criação. Aprovações são primeiras conclusões de
desafios do Estúdio, sem presumir que todos sejam minijogos. Não chamar a linha do tempo pessoal
do Admin em um laço por jogador.

**Volta ao curso na Medição (29/10/2026):** a MESMA regra (`diasDeVoltaAoCurso`) e a MESMA rota do
Members (`aulasConcluidas`) do cartão dos pais, somadas na equipe, para os números nunca
discordarem. `finsDeSessao` lê o fim das sessões que contaram tempo; só entram as do período cujas
24 h já passaram. As leituras vão em blocos de 8 dias de sessão (aulas até 24 h depois, dentro
dos 9 dias da rota) e 20 pessoas, 4 por vez, até `PEDIDOS_DA_VOLTA_MAXIMO` (200). Sem Members, com
ele fora ou acima do teto: sem `voltaAoCurso`, e `curso-24h` fica em `semFonte`. Proteção como a
coorte (`protegerVoltaAoCurso`). Só Kids.

Testes: `tests/unit/medicao.test.ts`, `tests/db/medicao.test.ts` (rota real e Postgres).
`ARQUIPELAGO_MEDICAO_TEST_DATABASE_URL` precisa apontar para localhost e um banco descartável
com prefixo `arquipelago_test`. Variável própria para não disputar tabelas com os demais testes.
Não usar banco remoto. Não há migração nem variável nova de produção para este relatório.

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

## Manifesto de desafios (28/10/2026)

Plano: `docs/plans/2026-10-28-arquipelago-desafio-do-dia-e-manifestos.md`. Um formato só
(`ManifestoDeDesafiosSchema` no contrato) para um desafio, o pacote de uma ilha ou o jogo inteiro;
o `slug` é a identidade, e um desafio fora do arquivo nunca é mexido.

- Regras puras em `domain/manifestos.ts`: `decidir` (`criar`, `atualizar`, `igual` ou `conflito`
  para cada desafio do arquivo; arquivado é conflito), `ordemDeGravacao`, `impressaoDigital` (o arquivo e a revisão e situação de cada desafio que ele toca) e
  `canonico` (JSON com as chaves em ordem: o `jsonb` reordena, e o reenvio tem de dar `igual`).
- ⚠️ **Quem segura um quadro** é a posição PUBLICADA (`metadadosPublicados`, o índice
  `desafios_quadro_unico`), ou a do rascunho antes da primeira publicação. Mudar o quadro no
  rascunho só solta o antigo ao publicar de novo. Um desafio do arquivo só libera o quadro se trocar
  de posição ao aplicar (`trocaDeQuadro`: nunca publicado e grava, ou pede `publicar` e há o que
  publicar). Quem vai para um quadro que outro do arquivo ainda segura grava DEPOIS dele
  (`ordemDeGravacao`); se quem segura não sai, é conflito `QUADRO_OCUPADO` já na conferência, e
  troca em roda (o 1 vai para o 2 e o 2 para o 1) é `TROCA_DE_QUADRO`. Conflito do índice na
  publicação deixa o desafio gravado em rascunho, com o motivo na linha (nunca um 500 no meio). O
  repositório em memória dos testes segue a mesma regra.
- Orquestração no `ServicoDaEquipe`: `conferirManifesto` (prévia, roda a análise do Members só nos
  que vão ser gravados ou publicados), `aplicarManifesto` (impressão diferente → 409
  `MANIFESTO_DESATUALIZADO` sem gravar; cada desafio segue sozinho: conflito não grava, problema
  na análise deixa em rascunho), `exportarManifesto` e `exportarDesafio` (fora os arquivados;
  `publicar` = estava publicado).
- Rotas: `POST /arquipelago/admin/manifestos/conferir` (equipe), `POST .../aplicar` (só a
  administração), `GET .../exportar?publico&ilha&tipo` e `GET /arquipelago/admin/desafios/:id/manifesto`.
  Sem tabela nova.
- Testes: `tests/integration/manifestos.test.ts` (inclui a fila de quadros, a roda e o quadro
  publicado que segura o lugar) e `tests/db/manifestos.test.ts` (o reenvio dá `igual` depois da
  volta pelo `jsonb`, sem revisão nova, e a fila de quadros contra o índice de verdade).
- No Admin, o arquivo grande vai em lotes (`packages/admin/src/lib/challenge-manifest.ts`): os do
  Quadro das Cores de uma ilha sempre no mesmo lote, por causa da regra acima.

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
- Desafio do dia (28/10/2026, regras em `docs/arquipelago-regras.md` §7.12): regra pura
  `domain/desafio-do-dia.ts` (`escolherDesafioDoDia`, `diaPar` pelos dias desde 1970); a lista
  devolve `doDia` (`ServicoDosDesafios.doDia`): o guardado hoje ou, na primeira leitura do dia
  de São Paulo, a escolha entre os `desafio-do-dia` disponíveis (feitos entram depois), gravada em
  `desafio_do_dia` (PK jogador+dia, `INSERT ... ON CONFLICT DO NOTHING` e relê; migração gerada
  `0007_desafio_do_dia`). Suporte não grava. Guardado que saiu de publicado vira `null` no dia.
  `?ilha=` inclui o desafio do dia de outra ilha. `verificar` marca `feito_em` quando o principal
  passa no desafio do dia de hoje (refazer marca, não paga de novo). Testes:
  `tests/unit/desafio-do-dia.test.ts`, bloco "desafio do dia" do teste de integração e de
  `tests/db/desafios.test.ts` (corrida da primeira escolha).

## Rotas (`/arquipelago/*`, todas exigem o `x-internal-token` em deploy)

| Rota | Quem | O quê |
|------|------|-------|
| `GET /acesso` | jogador | liberado/motivo, limite do dia e quanto já usou |
| `GET /salvamento` | jogador liberado | `{revisao, salvamento, atualizadoEm}` (revisão 0 = nada guardado) |
| `PUT /salvamento` | jogador liberado | `{revisaoBase, salvamento}`; revisão velha → 409 `SALVAMENTO_DESATUALIZADO` com `atual` |
| `POST /tempo` | cliente antigo | 410 `ATUALIZACAO_NECESSARIA`; não registra novos lotes |
| `POST /tempo/recuperar` | jogador liberado | entrega idempotente dos lotes legados já persistidos; suporte não soma |
| `POST /tempo/sessao` | perfil Kids liberado, sem suporte | `{sessaoId, sequencia, acao}`; início/pulso/pausa com concessão de até 20 s, contagem e virada de dia pelo servidor |
| `GET /cartas` | jogador liberado | os cartões da rotina dos Lumis: os do jogo sempre, os de controle pelos blocos conquistados (equipe vê todos), e "Aprenda isso em" nos que faltam; Members fora ou não configurado → 424 `PLATAFORMA_INDISPONIVEL` |
| `GET /desafios`, `GET /desafios/:id`, `POST /desafios/:id/verificar`, `POST /desafios/:id/recompensa-vista` | jogador liberado (com `ARQUIPELAGO_DESAFIOS`) | ver "Jogar os desafios" |
| `GET /familia/limite?perfis=` | responsável do Kids | o limite diário da família e `algumaCriancaVe` (algum dos perfis da conta, mandados pelo BFF dos pais, vê o jogo pela política de acesso); perfis fora do formato → 400 |
| `PUT /familia/limite` | responsável do Kids | muda o limite diário da família (padrão 30, de 10 a 240, passo 5) |
| `GET /familia/semana?perfis=` | responsável do Kids | a semana de cada criança que vê o jogo e que guardou o jogo nesta conta (desafios aprovados, objetos com aparência do Pinta e do Molda, tempo livre na janela); as outras em `aindaSemJogo` |
| `GET` e `PUT /familia/permissoes` | responsável do Kids | as permissões de visita da família (sem nada gravado, `PERMISSOES_PADRAO`); suporte não grava |
| `GET /galeria` | jogador liberado | as aparências da galeria pagas, o saldo de moedas (`null` sem a leitura) e `ilimitado` (equipe) |
| `POST /galeria/compras` | jogador liberado, sem suporte | `{aparencia, chave}`: debita no Members e só então vale; saldo curto → 409 `SALDO_INSUFICIENTE` com `preco` e `saldo`; porta fora → 424 |
| `GET /irmaos` | jogador liberado | os irmãos (mesma conta em `perfis_da_conta`, que veem o jogo) com o melhor de cada percurso e `temCasa`, sem nomes; `situacao: 'desligado'` com as visitas de irmãos desligadas; adulto, lista vazia (fase3-12) |
| `GET /irmaos/:perfilId/casa` | jogador liberado | a obra, a horta e os objetos com aparência de UM irmão (só olhar); visitas desligadas → 403 `VISITAS_DESLIGADAS`; quem não é irmão → 404 `IRMAO_NAO_ENCONTRADO` |
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
- **Semana e permissões da família** (fase1-18, 28/10/2026): `ServicoDaFamilia`
  (`application/servico-da-familia.ts`, regra pura em `domain/semana-da-familia.ts`, repositório
  `DrizzleRepositorioDaFamilia`, rotas em `interfaces/http/rotas-da-familia.ts`, montadas só com a
  dependência `familia`). ⚠️ A semana NÃO acredita nos ids do BFF: só lê as crianças ligadas à
  conta em `perfis_da_conta` (migração 0008), gravada pela PRIMEIRA gravação aceita do salvamento
  com a conta do login da própria criança (`gravarSalvamento` recebe `contaId`, só do Kids).
  Desafios: `null` com `ARQUIPELAGO_DESAFIOS` desligado (ou `equipe` fora da equipe); "de ilhas
  anteriores" `null` sem a jornada do Members. Objetos: total desde o começo (o salvamento não
  data a aparência). Volta ao curso (29/10/2026): o fim de cada sessão com tempo contado
  (`sessoesNaJanela`, o `cursor` de `sessoes_de_tempo`) cruzado com a hora das aulas concluídas
  (`LeiturasDosMembros.aulasConcluidas`, porta `lerAulasConcluidas`, uma ida por família, sem
  cache); Members desligado ou fora = `voltaAoCurso: null`. Permissões em `permissoes_da_familia`, por conta. Testes:
  `tests/unit/semana-da-familia.test.ts`, `tests/integration/familia.test.ts` e
  `tests/db/familia.test.ts` (Postgres local `arquipelago_test`).
- **Recordes da família e visitas** (fase3-12, 29/10/2026): `ServicoDasVisitas`
  (`application/servico-das-visitas.ts`, rotas em `interfaces/http/rotas-das-visitas.ts`, montadas
  só com a dependência `visitas`). Usa o `DrizzleRepositorioDaFamilia` (`outrosPerfisDaConta`, novo,
  e `perfisDaConta` para conferir a posse), a permissão `visitasDeIrmaos` da conta e
  `decidirAcesso` para cada irmão. Nunca sabe nomes (o BFF põe). Testes:
  `tests/integration/visitas.test.ts`, `tests/unit/visitas.test.ts` e o bloco dos irmãos de
  `tests/db/familia.test.ts`.
- **Galeria** (fase1-13, 29/10/2026): `ServicoDaGaleria` (`application/servico-da-galeria.ts`),
  tabela `compras_da_galeria` (uma linha por jogador e aparência: `pendente` com a chave e o preço,
  `paga` quando o Members confirma), repositório `DrizzleRepositorioDaGaleria`, rotas em
  `interfaces/http/rotas-da-galeria.ts` (montadas só com a dependência `galeria`). O débito é a
  porta de moedas de sempre com `operation: 'debit'` (`PortaDoDebito`, o mesmo `MoedasHttp`): a
  mesma carteira, trava e livro de moedas da loja do quarto. A chave guardada (e o preço guardado)
  vão em toda tentativa: repetir nunca cobra duas vezes; porta fora deixa `pendente`; saldo curto
  apaga a reserva. A equipe compra com 0 moedas, sem chamar o Members. O saldo vem de
  `LeiturasDosMembros.saldo` (`GET /members/internal/arquipelago/saldo`, sem cache). ⚠️ O
  `ServicoDoJogo` recebe `aparenciasPagas` e recusa (422 `APARENCIA_NAO_COMPRADA`) o salvamento com
  uma aparência `galeria` não paga ou de outro objeto. `objetosCriados` (a semana dos pais) conta
  pelas `aparencias` guardadas (salvamento V6). Testes: `tests/integration/galeria.test.ts`,
  `tests/unit/galeria-portas.test.ts` e `tests/db/galeria.test.ts`.
- **Salvamento**: gravação numa instrução só (insert on conflict do nothing na revisão 0, update
  com `where revisao = base` nas demais); quem perde recebe o que está guardado. Teto de 64 KB.
  Guardado que não passa no formato atual → 409 `SALVAMENTO_ILEGIVEL` (nunca devolve "vazio",
  senão o jogo criaria um salvamento novo por cima). Formato novo = a próxima versão no contrato
  (hoje `SalvamentoV5`) com a migração da anterior. V1 a V4 são lidas e recebidas já migradas
  para V5. A marca `presenteDosBichosEntregue` e o inventário ficam no mesmo JSONB e na mesma
  revisão CAS, sem nova coluna ou migração SQL. O teto continua 64 KB. A suíte
  `tests/db/presente-capi.test.ts` usa somente Postgres local descartável para conferir V4,
  V5, concorrência e limite, nos dois públicos; `tests/integration/http.test.ts` cobre a rota.
- **Tempo livre**: contado por sessões no servidor (`repositorio-sessoes-tempo.ts`), com trava
  transacional por perfil, comandos idempotentes e concessão curta limitada pelo saldo diário.
  O cliente usa relógio monotônico apenas para recusar uma concessão vencida. O diário antigo
  só entrega lotes já existentes em `/tempo/recuperar`; não é a fonte do contador atual.

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

## Minijogos aprovados (desafios-16, 29/10/2026)

Cópias aprovadas em minijogos: migration 0009, serviço/repositório/rotas próprios. Principal com recompensa.atracao guarda JSON imutável até nova aprovação; família confere perfis_da_conta no serviço. Só banco local descartável nos testes.

Plano e testes: docs/plans/2026-10-29-arquipelago-minijogos.md.
