# CLAUDE.md — @sistemazero/arquipelago-api

## Revisão publicada dos minijogos, 01/11/2026

A abertura inclui `revisao` para projetos Python e para `kind: pro`: o primeiro pede o
ambiente e o segundo compila pelo endpoint do desafio. JavaScript clássico mantém a resposta
sem revisão. A origem é a publicação atual do catálogo, como o ambiente dos desafios já exige,
não uma revisão histórica deduzida da primeira conclusão. Sem publicação não há revisão para
autorizar. A conferência em `tests/db/minijogos.test.ts` usa apenas Postgres local descartável.
Sem alteração de esquema ou migração.

## Ambiente Python do minijogo familiar, 31/10/2026

`POST /familia/minijogos/:perfil/:id/ambiente` exige a identidade do responsável pelo gateway,
vínculo com o perfil, cópia aprovada Python e a mesma revisão do pedido. Reutiliza o
autorizador de desafios com a identidade da criança e `somenteLeitura`. Não grava projeto,
progresso nem recompensa. Público e publicação continuam conferidos pelo serviço de desafios.
Implantar API e gateway antes do Kids que pede este ambiente. Testes causais em
`tests/unit/minijogos-familia-ambiente.test.ts`, sem banco ou credenciais reais.

## Obra estendida (E04 e B14, 31/10/2026)

O iglu do Pico, o andar de cima da casa e o terreno moldado não cabem no salvamento: moram num
documento à parte (`ObraEstendidaSchema` do contrato, até 32 KB), um por jogador e público, com
revisão própria. Migração gerada 0023 `obra_estendida`, tabela `obras_estendidas` (chave
jogador + público, FK do save com cascade, revisão >= 1, `documento` JSONB com versão 1 e teto de
64 KB no texto do JSONB, que põe espaço depois de `:` e `,`). A mesma 0023 traz a restrição dos
percursos dos `fantasmas` com o `farol-subida` da V22.

`GET /arquipelago/obra-estendida` devolve `{revisao, obra}` (0 e `null` antes da primeira).
`PUT` recebe `{revisaoBase, obra}` (`GravarObraEstendidaSchema`, corpo real até 33 KB) e grava
numa instrução só, como o salvamento: base velha → 409 `OBRA_ESTENDIDA_DESATUALIZADA` com
`atual: {revisao, obra}`; sem salvamento do mesmo público → 409 `SALVAMENTO_NECESSARIO`; guardado
ilegível → 409 `OBRA_ESTENDIDA_ILEGIVEL`; suporte → 403 `SOMENTE_LEITURA`. Tudo `private,
no-store`. `ServicoDaObraEstendida`, `DrizzleRepositorioDaObraEstendida`, rotas em
`interfaces/http/rotas-da-obra-estendida.ts` (só com a dependência `obraEstendida`). Gateway: rota
`arquipelago-obra-estendida` (GET e PUT, 33 KB, 120 por minuto). Testes
`tests/unit/obra-estendida.test.ts` e `tests/db/obra-estendida.test.ts`, variável local exclusiva
`ARQUIPELAGO_OBRA_ESTENDIDA_TEST_DATABASE_URL` ou `TEST_DATABASE_URL` do CI, Postgres descartável
`arquipelago_test*`.

**Ordem de implantação:** a migração e a API primeiro, depois o gateway (a rota nova), depois o
member-shell e os dois apps (o repasse `/api/arquipelago/obra-estendida`), e só então o jogo que
chama. Antes disso o jogo recebe 404 na leitura e não constrói nada da obra estendida.

## A ilha do minijogo (B10, 31/10/2026)

- `GET /minijogos` (e a lista da família) traz `ilha` em cada minijogo quando o desafio existe no
  banco: a ilha publicada (`metadados_publicados->>'ilha'`), senão a do rascunho. Sem migração (é
  uma junção com `desafios`). A barraca da Vila Doce e o quiosque do Pico mostram os da ilha.
- **Ordem de implantação:** o member-shell (e o Kids) antes do serviço, porque a lista dos
  minijogos da família é conferida com o esquema estrito lá; o campo novo é opcional no contrato.

## Desafios na plataforma: curso, "Aprenda isso em", medição e pedido de morador (lote 8, 31/10/2026)

- **A3:** `situacaoDoDesafio` ganhou `falta-curso` (depois da ilha, antes dos blocos): o desafio
  fora dos blocos (Python, Ponte, Pro, por `linguagemDoProjeto` do projeto inicial) pede o
  curso-base do posto da ilha entre os `cursosBase` que o Members devolve no jogador. A equipe vê
  tudo. Members anterior (sem o campo) = nenhum curso-base.
- **A24:** a lista traz `aprenda` em todo desafio (`aprendaODesafio`): o curso-base do posto na
  linguagem do posto, ou o curso mais adiantado entre os blocos exigidos.
- **A26:** `POST .../verificar` aceita `dicas` (opcional, até o teto de dicas). A migração 0022
  `medicao_da_aprendizagem` conta `tentativas` e guarda a maior quantidade de `dicas` em
  `desafio_progresso`, grava as duas na conclusão (`desafios_concluidos`, nulas antes) e conta
  `envios` nos `minijogos`. A medição ganhou `aprendizagem` (conclusões medidas, acerto na
  primeira, tentativas, sem dica, dicas, rotinas guardadas e as que rodam até o fim sem erro,
  reenvios e, pelo Members `GET /members/internal/arquipelago/compras`, compras e moedas). Cada
  número com a régua do grupo mínimo; compras sem o Members ficam em `semFonte`.
- **Ordem de implantação:** os contratos são estritos. Primeiro a migração e a API (aceitam os
  campos novos como opcionais), depois o Members (manda `cursosBase` e responde `/compras`), o
  Admin e o member-shell (manda `dicas`).

## Teto semanal com uma regra só e salvamento sem Members (A32 e A16, 31/10/2026)

O que passa do teto semanal espera a semana seguinte e nunca se perde, em tudo o que paga moedas.
Desafios e turnos já faziam assim; pedidos e vendas passaram a fazer. A migração gerada 0021,
`teto_espera_a_semana`, acrescenta `teto_semana` a `pedidos_remunerados` e `vendas_na_feira`
(obrigatória só com `teto`, índice parcial `*_teto_espera`) e marca com a semana de São Paulo os
que já tinham batido no teto, para eles também voltarem. `GET /pedidos/pendentes` e
`GET /feira/vendas/pendentes` (o jogo chama na abertura) creditam de novo um teto de semana
anterior por abertura, com a mesma chave; carteira fora só registra aviso. Na mesma semana nem a
retomada nem a abertura chamam a carteira. Testes em `tests/db/pedidos.test.ts`,
`tests/db/vendas.test.ts` e `pedidos-members.test.ts` (carteira real: o Members não grava a chave
recusada pelo teto, então a tentativa seguinte pode pagar).

O salvamento só consulta a posse da galeria no Members para as aparências da galeria que ainda não
estavam no salvamento guardado (A16): as que já estavam foram conferidas quando entraram. O save de
todo dia não depende do Members; uma aparência nova com o Members fora continua recusada (424).
Teste em `tests/integration/galeria.test.ts`. Implantar a migração e a API antes do jogo.

## Visitas entre amigos: revogação, troca e teto (N08a, R01 a R03, 31/10/2026)

O aceite vale para o convite que o originou. `apagarConvite` e `gerarConvite` (troca de código)
apagam, na mesma transação, as `casas_de_amigos` daquela criança: código novo pede aceite novo.
`aceitar` recebe o convite (`{perfilId, hash}`), trava a família visitante com
`pg_advisory_xact_lock` e confere, com a linha do convite travada, que o código ainda vale, antes
de contar o teto (`ResultadoDoAceite`: `ok`, `limite`, `sem-convite`). `casa` confere tudo de
novo depois de ler o salvamento e o quarto, como as visitas adultas. Sem migração nova. Testes no
bloco "revogação, troca de código e teto" de `tests/db/visitas-de-amigos.test.ts`.

## Salvamento V21 e o Nico nos pedidos (31/10/2026)

A V21 traz `moradores.nico` e a companhia `filhote`. Migração gerada 0020 troca a restrição
`pedidos_remunerados_morador` para aceitar `nico`. Implantar a migração e a API antes do jogo novo:
um jogo V21 diante da API anterior teria o salvamento recusado como versão futura.

## Salvamento V20 (30/10/2026)

Leitura e PUT normalizam até V20 pelo contrato (móveis da casa e galeria do Farol, listas vazias na
migração). Mesmo JSONB, revisão CAS e teto de 64 KB; sem coluna nem migração SQL. A visita de irmão
e a adulta devolvem a obra V20 (com `moveis`). Testes HTTP e de banco seguem só em Postgres local.

## Visitas adultas consentidas (L12, 30/10/2026)

`ServicoDasVisitasAdultas` exige adulto e acesso ao jogo em todas as leituras, e recusa
alterações no suporte. `convites_adultos`, migração gerada 0016, tem uma linha por save adulto,
FK com cascade e índice único de hash. O código tem 24 bytes aleatórios em base64url, só fica
em claro na resposta de geração e não é parâmetro de rota. Não alterar V18 nem tabelas antigas.

GET/POST/DELETE `visitas-adultas/convite` consultam, giram e revogam. POST `abrir` e `conferir`
recebem `{ codigo }`. O corpo real é limitado a 1024 bytes mesmo sem Content-Length. Tudo
tem no-store. `conferir` não lê JSONB nem o Members. `abrir` projeta a casa, filtra campos extras
do quarto e revalida depois de esperar o Members, para recusar revogação concorrente.
Não há nome, id ou progresso do dono na resposta. A audiência do quarto é `adult`.

Testes de DB/HTTP: `tests/db/visitas-adultas.test.ts`, somente com
`ARQUIPELAGO_VISITAS_ADULTAS_TEST_DATABASE_URL` ou `TEST_DATABASE_URL` do CI em localhost e banco arquipelago_test*.

## Trajetórias de recordes (L10, 30/10/2026)

Migração gerada 0014, `fantasmas`: uma linha por jogador/percurso, FK do save com cascade,
público e artefato limitado. `DrizzleRepositorioDosFantasmas` trava o save antes de validar
revisão e melhor tempo. Uma leitura só oferece o trajeto correspondente ao recorde atual.
Não modifica save, moedas ou estrelas. A exclusão do save elimina a trajetória.

`PUT /arquipelago/fantasmas` recebe `GuardarFantasmaSchema`, recusa suporte e lê no máximo
129 KB reais do stream, após autenticação. Artefato: 128 KB, V1, até 5 min e 3001 amostras.
GET próprio `/fantasmas/:percurso` e GET familiar `/irmaos/:perfilId/fantasmas/:percurso`
respondem `private, no-store`, sem identidade ou nome. Familiar reutiliza `autorizarIrmao`
das visitas; não consulta o quarto. Falta do trajeto é `ausente`, revisão/recorde divergentes
são 409. Testes `tests/db/fantasmas.test.ts`, variável local exclusiva
`ARQUIPELAGO_FANTASMAS_TEST_DATABASE_URL` ou `TEST_DATABASE_URL` do CI, Postgres descartável `arquipelago_test*`.

## Cor conquistada independente do catálogo (A02, 30/10/2026)

`GET /arquipelago/desafios/cores`, antes de `/:id`, usa `ServicoDosDesafios.cores`.
Exige `decidirAcesso` e a identidade/público autenticados. Lê `repo.conclusoes`, cuja consulta
liga a conclusão à revisão publicada histórica, não ao cadastro atual. Filtra posições inteiras
de 1 a 6, únicas e ordenadas por ilha. Arquivar ou mover a publicação não move a conquista.
Não depende de Members, catálogo ligado, carteira ou escolha do dia. Não grava, inclusive no
suporte. Resposta `CoresConquistadasSchema`, sem dados pessoais, gabarito ou carteira.
Testes HTTP reais com repositório em memória em `desafios-do-jogador.test.ts`; regra em
`tests/unit/desafios.test.ts`. Sem migração, escrita remota ou mudança nas respostas anteriores.

## Roupas conquistadas (§6.28 A21, 31/10/2026)

`POST /roupas/sincronizar`: o serviço lê o salvamento guardado, calcula as roupas conquistadas
(`roupasConquistadas` do contrato: três corações com um morador e a festa do dia em São Paulo) e
pede ao Members pela porta das moedas (`AvatarHttp`, `POST /members/internal/arquipelago/avatar/pecas`).
Idempotente, sem tabela nem migração. Members fora do ar devolve indisponível e o jogo tenta de
novo na próxima abertura. Implantar o Members antes da API.

## Banca da feira (§6.28 A22, 31/10/2026)

`GET /feira/vendas/pendentes` e `POST /feira/vender`, o mesmo desenho dos pedidos: identidade
confiável, recusa suporte, primeira venda exige a Vila Doce na jornada. Migração gerada 0019,
`vendas_na_feira`: uma venda por perfil/público/dia (até cinco pratos, 1 moeda cada, pão de queijo
2; teto 10), chave financeira gerada no servidor, consumo dos pratos atômico sob a trava do save e
crédito fora dela. Recusa compra de insumos pendente. Erros 409 `VENDA_BASE_RECUSADA`,
`VENDA_REPETIDA` e `VENDA_INCOMPATIVEL`. Teste `tests/db/vendas.test.ts`, variável exclusiva
`ARQUIPELAGO_VENDAS_TEST_DATABASE_URL`. O jogo trata 404 nas pendências como "sem venda", para
o cliente novo não travar diante do serviço anterior. Implantar migração e API antes do jogo.

O prêmio-objeto do extra (A25) acrescentou `recompensa.receitaDoExtra` e `extraFeito` na lista.
O Admin valida o desafio com esquema estrito: implantar o Admin novo junto com a API.

## Pedidos dos moradores (L07, 30/10/2026)

`GET /pedidos/pendentes` e `POST /pedidos/entregar` usam identidade confiável e recusam suporte.
A migração gerada 0013 registra UUID, perfil/público/morador/dia único, chave financeira gerada
no servidor e pagamento. A primeira entrega exige a ilha na jornada. Replay autorizado preserva
o direito adquirido sem exigir novamente a ilha, a data atual ou a revisão antiga.

Consumo, amizade, cesta e crédito pendente são atômicos sob a trava do save. A entrega recusa
compra de insumos pendente. Depois, só a linha do crédito fica travada durante o S2S de cinco
segundos. Crédito pendente permite PUT normal. O Members confirma idempotência e teto semanal.
Teto espera a semana seguinte (A32, abaixo); resposta perdida conserva a chave. Replay devolve o save atual.
Catálogo e itens persistidos são conferidos pelo serviço, mas save do cliente não prova a origem
histórica de cada item. Nenhuma alteração de V18 ou variável nova.

`tests/db/pedidos.test.ts` cobre HTTP, concorrência, acesso, revisão e recuperação.
`pedidos-members.test.ts` usa as duas bases locais e a carteira real, incluindo teto e perda
de resposta depois do crédito. Nenhum teste se conecta a banco remoto.

## Compras de insumos (L07, 30/10/2026)

`GET /insumos/pendente` e `POST /insumos/comprar` usam identidade do gateway, política de acesso
e recusa de suporte. Catálogo V1 e preço são do contrato, não do corpo enviado pelo cliente.
Migração gerada 0012: reserva durável por UUID, uma pendência por perfil, antes do débito S2S.
Reserva, confirmação e PUT travam primeiro a mesma linha de salvamento. PUT recusa pendência
com 423. A porta do Members tem prazo de cinco segundos; resposta perdida mantém a reserva.
Retomar usa a mesma chave. Entrega, revisão e conclusão são atômicas no banco do jogo.
Nunca expirar uma reserva sem reconciliar a carteira. Não apagar o histórico nem repetir com
outra chave. Resultado de comando antigo devolve o save atual, sem ressuscitar consumíveis.

`tests/db/insumos.test.ts` cobre concorrência e HTTP no Postgres descartável; `insumos-members`
usa também a carteira real do Members e interrompe a resposta depois do commit do débito.
Variáveis e ordem de implantação em `docs/operations/arquipelago-insumos.md`. Nenhum teste usa
banco remoto. V18 e teto de 64 KB permanecem iguais.

## Salvamento V18: mapa descoberto (30/10/2026)

Leitura e gravação usam `SalvamentoSchema` central e migram V1 a V17 para V18, com
`ilhasVisitadas: 0` quando não existia. JSONB e CAS existentes bastam; nenhuma coluna ou
migração SQL nova. O teto de 64 KB continua aplicado ao documento migrado antes da gravação.
Testes HTTP conferem V17 recebida, V18 inválida sem substituição, descoberta reaberta e revisão
atrasada. Esses bits são registro visual do jogo, nunca uma fonte de moedas ou acesso.

## Profissões remuneradas (L07, 29/10/2026)

`POST /arquipelago/profissoes/iniciar` reserva por pessoa/público/balcão/dia de São Paulo.
`concluir` recebe a sessão e seis bandejas. `ServicoDasProfissoes` confere o roteiro V1 dos
contratos, exige Vila Doce pela jornada e bloqueia suporte. O prêmio de 5 moedas nasce no
servidor; `turnos_remunerados` (migração gerada 0011) guarda a versão e o pagamento. Não usar
`turnos.pagoEm` do save como prova financeira. Não reinterpretar uma sessão de versão antiga.

Crédito no Members usa a sessão como chave. Uma resposta atrasada de teto não rebaixa crédito
confirmado. Reabertura tenta a pendência mais antiga, sem insistir no teto da mesma semana.
O teto de 100 é da carteira do Members, compartilhado com os desafios, não um segundo saldo.
Teste de HTTP/concorrência em `tests/db/profissoes.test.ts`: variável
`ARQUIPELAGO_PROFISSOES_TEST_DATABASE_URL`, só Postgres local `arquipelago_test*`.

## Medição da equipe (geral-06, 28/10/2026)

**A06, 30/10/2026:** a fotografia abaixo continua em `criacao`. `mudancasDeAparencia`
conta aplicações/trocas observadas entre revisões aceitas, pela data do servidor, não por
`ganhoEm`. Migração gerada 0015, tabela separada do save V18, FK cascade e chave
jogador/revisão/objeto. O CAS grava save e eventos na mesma transação, sob a mesma trava.
Primeiro save é base; conflito, repetição, retirada e suporte não criam aplicações.
Não guarda IDs de criação: desde a migração gerada 0024 (A33, 31/10/2026) guarda só a marca
(`marcaDaCriacao`, resumo SHA-256 do id com o jogador) em `criacao`, mais o índice
`(jogador_id, registrado_em)` para o cartão dos pais; a medição não a lê. Origem declarada não prova autoria, aprendizado ou aquisição.
Não reconstruir eventos anteriores. Grupos menores que cinco continuam suprimidos.

Teste `tests/db/mudancas-de-aparencia.test.ts`, variável exclusiva
`ARQUIPELAGO_APARENCIAS_TEST_DATABASE_URL`, somente banco local `arquipelago_test*`.
Implantar migração, Admin novo e depois API: o Admin antigo rejeita campos desconhecidos.
Rollback API primeiro, conservar a tabela. Plano e limites em
`docs/superpowers/plans/2026-10-30-arquipelago-medicao-de-aparencias.md`.

`GET /arquipelago/equipe/medicao?de=AAAA-MM-DD&ate=AAAA-MM-DD&publico=kids|adulto`
usa `lerEquipe` e o token do gateway. `ServicoDaMedicao` limita o período inclusivo a 90 dias,
recusa futuro pelo dia de São Paulo e delega ao `DrizzleRepositorioDaMedicao`. São consultas
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
Não usar banco remoto. A versão inicial não exigia migração; A06 adiciona a 0015 descrita acima.

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

O servidor mantém a conexão ociosa por 170 s para acomodar a conferência de objetivos
do Members, limitada a 160 s. Esse prazo de transporte não amplia o orçamento do executor
nem permite publicar um desafio sem análise válida.

**C01a, 30/10/2026:** `domain/repertorio-do-desafio.ts` transforma cobertura impossível em
problema de publicação: bloco desconhecido, sem curso publicado da comunidade ou só ensinado
depois da ilha. Quadro das Cores exige fonte em base2d, base3d ou mission até o posto; Poder,
extra ou Maestria não podem ser a única fonte. Desafios opcionais podem usar Poder do posto,
sempre sujeitos aos blocos conquistados pela pessoa. Não confundir chegar à ilha com concluir
seus cursos. Mesma análise na importação; reativação confere metadados/blocos congelados da
publicação, nunca o rascunho posterior. Sem mudança de formato, conquistas ou salvamento.
Testes `repertorio-do-desafio.test.ts`, `equipe.test.ts` e `manifestos.test.ts`.

**C01e, 30/10/2026:** a análise sempre preserva os blocos derivados pelo Members na cobertura.
Retirada manual de um derivado produz `BLOCO_DERIVADO_RETIRADO`; publicação e importação
mantêm o rascunho. Cancelar acréscimos não derivados continua válido. Desconhecidos da
resposta do Members também impedem publicar, inclusive no formato anterior que só os
listava, sem duplicar um problema já informado. Não altera snapshots publicados nem o
helper histórico `blocosExigidos` do contrato.

**C01e2, 30/10/2026:** reativar lê o conteúdo e os metadados da revisão publicada exata,
mesmo arquivada, por `lerPublicacaoParaAnalise`. Refaz a análise atual e confere também a
cobertura dos requisitos congelados. Requisito atual ausente da lista histórica produz
`PUBLICACAO_REQUER_NOVOS_REQUISITOS`: publicar uma revisão nova, sem reescrever a antiga.
Cópia ausente/ilegível, gabarito recusado e Members indisponível não reativam. A escrita
final mantém o CAS; edição durante a análise retorna 409 e preserva o rascunho. Teste SQL
em Postgres local descartável e testes HTTP, sem alteração de schema ou salvamento.

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
  e `POST /desafios/:id/recompensa-vista`. C02b (30/10/2026): `POST /desafios/:id/ambiente`
  (`PedirAmbienteDoDesafioSchema`, `{revisao, pedido}`) com as conferências do `verificar`; o
  `PortaDosMembros.autorizarAmbiente` manda quem joga, a conta (`contaId ?? id`), o público e o
  projeto INICIAL da revisão ao `POST /members/internal/arquipelago/ambiente`, e devolve a decisão
  conferida por `StudioArquipelagoRuntimeDecisionSchema`. Recusa do Members (400/403) vira
  `AmbienteRecusadoError` → 403 `AMBIENTE_RECUSADO` com a frase dele; Members fora, 424.
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
| `GET /cartas` | jogador liberado | os cartões da rotina dos Lumis pelo posto da Jornada (L7b, 01/11/2026; até então pelos blocos), com o `posto` de cada um (equipe vê todos), e "Aprenda isso em" nos que faltam; Members fora ou não configurado → 424 `PLATAFORMA_INDISPONIVEL` |
| `GET /desafios`, `GET /desafios/:id`, `POST /desafios/:id/verificar`, `POST /desafios/:id/recompensa-vista` | jogador liberado (com `ARQUIPELAGO_DESAFIOS`) | ver "Jogar os desafios" |
| `GET /familia/limite?perfis=` | responsável do Kids | o limite diário da família e `algumaCriancaVe` (algum dos perfis da conta, mandados pelo BFF dos pais, vê o jogo pela política de acesso); perfis fora do formato → 400 |
| `PUT /familia/limite` | responsável do Kids | muda o limite diário da família (padrão 30, de 10 a 240, passo 5) |
| `GET /familia/semana?perfis=` | responsável do Kids | a semana de cada criança que vê o jogo e que guardou o jogo nesta conta (desafios aprovados, objetos com aparência do Pinta e do Molda, tempo livre na janela); as outras em `aindaSemJogo` |
| `GET` e `PUT /familia/permissoes` | responsável do Kids | as permissões de visita da família (sem nada gravado, `PERMISSOES_PADRAO`); suporte não grava |
| `GET /galeria` | jogador liberado | as aparências da galeria pagas, o saldo de moedas (`null` sem a leitura) e `ilimitado` (equipe) |
| `POST /galeria/compras` | jogador liberado, sem suporte | `{aparencia, chave}`: debita no Members e só então vale; saldo curto → 409 `SALDO_INSUFICIENTE` com `preco` e `saldo`; porta fora → 424 |
| `GET /irmaos` | jogador liberado | os irmãos (mesma conta em `perfis_da_conta`, que veem o jogo) com o melhor de cada percurso e `temCasa`, sem nomes; `situacao: 'desligado'` com as visitas de irmãos desligadas; adulto, lista vazia (fase3-12) |
| `GET /irmaos/:perfilId/casa` | jogador liberado | a obra, a horta, os objetos com aparência e o quarto (do Members, `null` se ele não respondeu) de UM irmão (só olhar); visitas desligadas → 403 `VISITAS_DESLIGADAS`; quem não é irmão → 404 `IRMAO_NAO_ENCONTRADO` |
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
  anteriores" `null` sem a jornada do Members. Objetos (A33, 31/10/2026): as criações do Pinta e
  do Molda postas em objetos NA SEMANA, cada uma uma vez (`criacoesDaSemana` sobre
  `aparenciasNaJanela`, a tabela `mudancas_de_aparencia`; linha sem marca, de antes da 0024, conta
  por objeto e revisão). Até 30/10 era o total desde o começo, pelo salvamento. Volta ao curso (29/10/2026): o fim de cada sessão com tempo contado
  (`sessoesNaJanela`, o `cursor` de `sessoes_de_tempo`) cruzado com a hora das aulas concluídas
  (`LeiturasDosMembros.aulasConcluidas`, porta `lerAulasConcluidas`, uma ida por família, sem
  cache); Members desligado ou fora = `voltaAoCurso: null`. Permissões em `permissoes_da_familia`, por conta. Testes:
  `tests/unit/semana-da-familia.test.ts`, `tests/integration/familia.test.ts` e
  `tests/db/familia.test.ts` (Postgres local `arquipelago_test`).
- **Recordes da família e visitas** (fase3-12, 29/10/2026): `ServicoDasVisitas`
  (`application/servico-das-visitas.ts`, rotas em `interfaces/http/rotas-das-visitas.ts`, montadas
  só com a dependência `visitas`). Usa o `DrizzleRepositorioDaFamilia` (`outrosPerfisDaConta`, novo,
  e `perfisDaConta` para conferir a posse), a permissão `visitasDeIrmaos` da conta e
  `decidirAcesso` para cada irmão. Nunca sabe nomes (o BFF põe). O quarto do irmão (29/10/2026) vem
  do Members (`lerQuarto`, `GET /members/internal/arquipelago/quarto`) só depois das conferências da
  casa; `MembrosIndisponiveisError` vira `quarto: null` (log `arquipelago.visitas.quarto_indisponivel`)
  e qualquer outro erro sobe. Testes:
  `tests/integration/visitas.test.ts`, `tests/unit/visitas.test.ts` e o bloco dos irmãos de
  `tests/db/familia.test.ts`.
- **Galeria canônica (L04, 30/10/2026)**: `ServicoDaGaleria` consulta e compra pela
  `PosseHttp`, com token de moedas e limite de resposta de 8 KB/5 s. A autoridade é
  `room_inventory` do Members por perfil/público; não há reserva, débito ou posse
  local novo. `ServicoDoJogo` confere as aparências com a identidade inteira da sessão.
  Serviço fora responde 424, não inventário vazio. Equipe também consulta a posse.
  `compras_da_galeria` é só histórico; o repositório antigo de compra foi removido.
  Exportação somente leitura em `scripts/exportar-posse-da-galeria.ts`, contrato de
  transferência v1, sem JSON do save. Procedimento obrigatório antes do corte em
  `docs/operations/arquipelago-galeria-unica.md`. Testes de exportação em `tests/db/galeria.test.ts`
  usam somente Postgres local `arquipelago_test*`; o dinheiro e a adoção são testados no Members.
- **Salvamento**: gravação numa instrução só (insert on conflict do nothing na revisão 0, update
  com `where revisao = base` nas demais); quem perde recebe o que está guardado. Teto de 64 KB.
  Guardado que não passa no formato atual → 409 `SALVAMENTO_ILEGIVEL` (nunca devolve "vazio",
  senão o jogo criaria um salvamento novo por cima). Formato novo = a próxima versão no contrato
  (hoje `SalvamentoV11`) com a migração da anterior. V1 a V10 são lidas e recebidas já migradas
  para V11. A marca `presenteDosBichosEntregue` e o inventário ficam no mesmo JSONB e na mesma
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

## Salvamento V11: Recife (29/10/2026)

O formato atual é V11, com `recife: { bau, pagina, tesouro }`. A rota e o repositório continuam
usando `SalvamentoSchema`: recebem e leem V1 a V10 migradas para V11. Não há coluna nova nem
migração SQL, pois as marcas ficam no mesmo JSONB e na mesma revisão CAS. Limite de 64 KB mantido.
A prova HTTP local cobre envio V10, retorno V11, guarda das três marcas e recusa de revisão velha.
Os testes de banco continuam restritos a Postgres local cujo nome começa por `arquipelago_test`.


## Continuidade V16 (L01, 29/10/2026)

A leitura e o PUT usam a migração do contrato até V16. A atualização é do JSON, sem coluna
nova. Não executar migração em lote do banco remoto. Referências antigas de até 80 caracteres
são preservadas; o tamanho UTF-8 é conferido depois da normalização e antes de gravar. Acima
de 64 KB, 413 sem modificar a revisão anterior. Revisão concorrente continua 409, com a cópia
atual. Testes HTTP cobrem V14 com Unicode, V16 com Nuvens/Farol/clima e reabertura do serviço.

## Amizade V17 (29/10/2026)

Leitura e PUT agora normalizam até V17 pelo contrato. Maré, Floco, Jade e Iriê usam o mesmo
JSONB, limite UTF-8 e revisão CAS, sem migração SQL. A prova HTTP guarda amizade e conquista,
reabre, e confirma 409 para revisão atrasada. Os esquemas V1 a V16 permanecem históricos.
Não usar banco remoto para testar ou fazer regravação em lote dos documentos existentes.
