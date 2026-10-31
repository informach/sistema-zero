# A06: medição de aparências

Base antes do lote: `9b5fcdd01`. Dados fictícios exclusivamente no Postgres 16 descartável
do contêiner `arquipelago-a06-20261030`, porta local 62762. Nenhuma consulta ou migração em
staging/produção. Não é um aceite de login ou implantação remota.

## Resultado funcional

- Fotografias atuais, mudanças datadas e aprovações têm seções próprias.
- Projeto recebido em setembro e modificado em outubro produz evento de outubro. A fotografia
  continua filtrada pelo recebimento. Uma troca seguinte não reclassifica o evento anterior.
- Data do servidor, fronteira de meia-noite em São Paulo e público conferidos no Postgres.
- Primeiro save importado não fabrica eventos. Duas gravações da mesma revisão produzem apenas
  o evento da vencedora. Replay, remoção e save sem mudança não produzem aplicação.
- Falha proposital na tabela de eventos desfaz o UPDATE do save. Suporte somente leitura não
  grava. Exclusão do save elimina os eventos por FK cascade. O ID da criação não é guardado.
- Contrato e relatório protegem grupos de menos de cinco sem contagem auxiliar. Não há
  inferência de compra, autoria ou aprendizado a partir da origem.

## Comandos e provas

- `bun run db:generate --name mudancas_de_aparencia`: gerou 0015, snapshot e journal.
  SQL revisado: só tabela, PK, checks, FK cascade e índice público/data. Sem backfill.
- API, `bun test`, com variáveis locais dos bancos de aparências e medição: 263 passaram,
  91 ignorados, zero falhas, 1.070 asserções. Os ignorados são outras suítes de banco cujas
  variáveis próprias não foram fornecidas. As duas suítes de banco deste lote rodaram.
- Contratos, `bun test`: 201 passaram, zero falhas, 8.314 asserções.
- Admin, `bun test`: 971 passaram, zero falhas, 3.979 asserções.
- `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit`: API, contratos e Admin aprovados.
- `bunx biome check` nos 14 arquivos TS/TSX/MJS tocados: aprovado. Migrações mantêm o formato
  gerado, excluído pelo `biome.json` existente. `git diff --check` aprovado.
- Servidor `packages/admin/tests/e2e/game-measurement-server.ts`, com serviço, componente,
  repasse BFF e Postgres reais locais. `node packages/admin/tests/e2e/game-measurement-browser.mjs`
  com `MEDICAO_TEST_PORT=4627` e `MEDICAO_PRINTS` nesta pasta: aprovado.
- Navegador: período completo e dia exclusivo do evento, Kids/adulto, erro e recuperação,
  serviço antigo sem campo novo, proteção de grupos e larguras 1366, 390 e 320 sem rolagem
  lateral. Nenhum erro de página. Inspeção visual das capturas desktop e celular aprovada.

Capturas: [computador](desktop.png), [celular emulado](celular.png),
[evento em outro dia](evento-em-outro-dia.png), [serviço anterior](servico-anterior.png).

## Revisão e limites

Revisados: comparação após migrar save antigo, trava/CAS, atomicidade, descarte por exclusão,
datas, filtro por comunidade, fontes ausentes, privacidade, contrato estrito, UI responsiva,
ordem do deploy e compatibilidade de leitura. Dois problemas de fixtures foram corrigidos
antes da aprovação: V17 não pode carregar `ilhasVisitadas` da V18 e a consulta SQL crua devolve
timestamp como texto. A falha de rollback usa DDL literal local, pois PostgreSQL não aceita
parâmetro preparado nessa restrição. Não foram falhas do produto encobertas.

As alterações só observam mudanças entre saves aceitos. Trocas feitas e desfeitas antes de
salvar, autoria real e datas de compras não são comprovadas por isso. Os eventos anteriores
à atualização não podem ser recuperados. A data recebida é a do servidor, inclusive após
sincronização tardia. Nenhum resultado mede eficácia pedagógica ou produção individual.

Implantar migração, Admin novo e depois API nova. O Admin antigo é estrito e rejeita o campo
novo. Em rollback, voltar primeiro a API e conservar os eventos. Nenhum push foi feito.
Sem mudança no salvamento, na arte, no jogo ou na carteira. Sem pedidos de Blender.
