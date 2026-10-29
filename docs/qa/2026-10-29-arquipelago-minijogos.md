# Minijogos aprovados, desafios-16

Fluxo implementado: aprovar principal com atração, guardar cópia própria, entregar fliperama,
listar e jogar por cima do Arquipélago. O cartão dos pais lê independentemente do resumo semanal.
O projeto completo só sai pela rota de abertura, autorizada para o jogador ou para a sua família.

## Banco e implantação

Migração gerada por `bun run db:generate`: `0009_vengeful_rhino.sql`, somente a tabela minijogos.
Chave composta jogador e desafio. Projeto como texto JSON serializado, teto de 1.500.000
caracteres no serviço e CHECK no banco. JSONB acrescenta espaços na representação textual,
por isso não é usado para medir a cópia. Capa derivada do asset escolhido, sem buscar URLs.

Primeira aprovação fica em aprovado_em para medição. Nova aprovação troca projeto, título,
capa e atualizado_em. Data anterior à cópia atual não a substitui. Não há backfill de desafios
antigos, pois os projetos nunca foram guardados. Refazer e passar cria a cópia que falta.

Aplicação da migração somente no contêiner local descartável `arquipelago-minijogos-test`,
Postgres 16, porta 127.0.0.1:5546, banco `arquipelago_test_minijogos` em tmpfs. Nenhuma escrita
em staging ou produção, alteração de .env ou CI. Na implantação, aplicar a migração antes do
serviço novo. A versão anterior ignora a tabela; rollback de aplicação pode preservá-la.

## Conferência no navegador

Harness com jogo, cartão e player reais, serviço falso em memória e sem persistência.
Projeto jogado: gabarito real da Corrida dos bichos do manifesto do Bosque. Cópia do manifesto
apenas para o harness, sem alterar o arquivo do curso. Chrome instalado no Windows.

```sh
# No pacote arquipelago
bun playground/minijogos-qa-servidor.ts
bun build playground/verificar-minijogos-browser.ts --target=node --external playwright-core --outfile .cache/verificar-minijogos-browser.mjs
node .cache/verificar-minijogos-browser.mjs
```

O harness usa o CSS real do playground do Estúdio e os componentes de produção.
Em computador e em 390 px: aproximar do fliperama, E, escolher o minijogo, abrir o iframe do
player, jogar, Voltar, abrir pelo cartão dos pais e sair por Esc. Conferir também em celular
físico, inclusive teclado de jogo, orientação da tela e desempenho prolongado.

## Revisão

- Identidade do jogador vem da sessão, sem ID de criança na rota própria. Família verifica a
  grade de perfis no BFF e a ligação perfil e conta no serviço. Pais só têm rotas GET e portão
  `requireParentGateAccountOnly`; aluno não alcança as rotas da família no gateway.
- Suporte não guarda cópia nem entrega projeto azul. A lista e a cópia não incluem gabarito.
- Capa aceita apenas PNG, JPEG ou WebP embutido escolhido no Estúdio. Recursos da tela do
  fliperama são próprios, restaurados e descartados ao trocar ou desmontar.
- Corrigida a preservação de programmingLanguage explícito do JavaScript v2 no leitor do
  Estúdio. Teste com o gabarito real confere arquivos, IR, blocos e ausência de mutação.
- Medição inclui minijogos por primeira aprovação, público e período, com contagem distinta
  de pessoas e a proteção existente de grupos pequenos. Nenhum identificador pessoal sai.

## Resultados finais

Validação isolada sobre staging registrado em `0e4068fea`, com somente as mudanças desta entrega.
O diretório compartilhado tinha uma migração V6 da galeria ainda em edição por outra sessão.
As falhas dessa edição não foram corrigidas nem incluídas neste commit.

- Jogo: `bun test`, 563 passaram e 1 teste Postgres ignorado. Também foi acrescentada a prova
  do GLB real: `bun test tests/minijogos.test.ts`, 2 passaram, incluindo a entrega única e a
  face tela com UV. Typecheck e build passaram; 64 arquivos e 21,69 MB nesta execução.
- Serviço: `bun test tests/unit tests/integration tests/db/minijogos.test.ts`, 188 passaram,
  incluindo 6 testes no Postgres local. Typecheck passou. Concorrência e repetição não duplicam
  o brinquedo; uma gravação antiga não substitui a nova.
- Contratos: `bun test`, 72 passaram.
- Kids: três arquivos de cartão, família e minijogos, 19 testes passaram. Typecheck passou.
- Member-shell: rotas, host e projeto real do Bosque, 28 testes passaram. Typecheck passou.
- Gateway: configuração e separação Kids, 10 testes passaram. Typecheck passou.
- Estúdio: `bun test src/state/projectValidation.test.ts`, 8 passaram, além da regressão do
  projeto do Bosque no member-shell. O teste exploratório antigo manifestStudioSnapshots
  apontou falta de extensão em aula-2.manifesto.json de outro curso, fora desta alteração.
- Admin: typecheck passou, incluindo a linha nova de minijogos na Medição.
- Biome nos 44 arquivos TypeScript da entrega passou. A revisão não alterou arquivos da CI,
  ambiente, arte ou os arquivos da galeria que estavam em edição.

Prints inspecionados: [computador](2026-10-29-minijogo-computador.png),
[celular emulado](2026-10-29-minijogo-celular.png), [fliperama](2026-10-29-fliperama.png),
[pais no computador](2026-10-29-minijogos-pais-computador.png) e
[pais no celular](2026-10-29-minijogos-pais-celular.png).

Nenhuma arte nova é necessária: o fliperama e sua face tela já existem.

Conciliação final com staging 3e5916051: preservada a volta ao curso na Medição, além de
minijogos. Os quatro arquivos conciliados passaram no Biome; serviço (188 testes),
contratos (72 testes) e typecheck do serviço passaram novamente após essa conciliação.

Merge remoto de 22ebdf103: planta de interior e brilho inicial dos Lumis preservados.
Nova conferência: jogo 565 testes aprovados e 1 ignorado, serviço 188, contratos 72,
typecheck do jogo, build (66 arquivos, 21,81 MB) e Biome do pacote passaram. A cena de QA
usa os projetos de exemplo completos e coloca o fliperama em outra célula para não sobrepor
a planta. A visita no navegador foi repetida nos dois tamanhos.
