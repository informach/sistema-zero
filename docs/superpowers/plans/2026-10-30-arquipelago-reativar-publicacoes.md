# C01e2: reativar a publicação conferida de verdade

## Problema e decisão

A reativação confere o currículo da lista de blocos congelada, mas essa lista pode ter sido
calculada antes de C01c ou omitida por um ajuste manual. Conferir o conteúdo da publicação
exata novamente com a análise atual. Nunca usar o rascunho, que pode ter mudado de público,
ilha, regras ou objetivos depois de publicar.

Acrescentar uma leitura interna de publicação por desafio/revisão no repositório da equipe.
Só a reativação precisa dessa leitura. Reusar a análise compartilhada de C01c/C01e, incluindo
executor, cobertura e retiradas indevidas. Manter também a cobertura dos requisitos congelados:
eles continuam sendo a porta de entrada de quem joga aquela revisão.

Se a análise atual exigir um bloco ausente da lista congelada, recusar a reativação e pedir
nova publicação. Não atualizar a lista de uma publicação histórica nem alterar conclusões.
Conteúdo ausente/ilegível, falha no gabarito e Members indisponível também não reativam.
Rascunho sem publicação pode ser reativado como antes, sem chamar o Members.

A escrita final mantém o CAS de revisão já existente. Uma edição concorrente durante a
análise deve terminar em conflito e preservar o arquivamento, sem perder o rascunho novo.
Nenhuma migração, campo de salvamento ou contrato HTTP novo.

## Etapas

- [x] Reproduzir a reativação com lista antiga incompleta e gabarito hoje recusado.
- [x] Ler a publicação imutável por revisão, no Drizzle e no repositório de testes.
- [x] Conferir a cópia e os requisitos congelados, recusando reativação insegura.
- [x] Provar rascunho diferente, público original, ausência de snapshot, edição concorrente
  e reativação legítima; SQL real apenas em Postgres local descartável.
- [x] Suíte, tipagem, Biome, revisão completa e documentação.
- [ ] Commit e merge local.

## Provas e revisão

- Os dois casos originais falharam antes: receberam 200 onde deveriam recusar com 422.
- Testes dirigidos HTTP e Drizzle: 39 aprovados, 148 asserções. Leitura por revisão provada
  com duas publicações, público/ilha distintos e rascunho posterior. ID ou revisão ausentes
  retornam nulo, alteração do objeto lido não altera a cópia no banco.
- `bun test` completo da API: 332 aprovados, 45 ignorados, zero falhas, 1.366 asserções.
  `TEST_DATABASE_URL` foi definido somente no processo para Postgres 16 descartável,
  contêiner `arquipelago-c01e2-20261030`, porta exclusiva `127.0.0.1:62763`, banco
  `arquipelago_test`. Os testes com portas próprias não configuradas foram ignorados.
- `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit`, Biome dos seis arquivos
  TypeScript e `git diff --check` aprovados. Nenhuma migração necessária.
- Revisão completa: consulta parametrizada por ID/revisão, sem filtro de ativo; leitura
  feita só na reativação; conteúdo/metadados validados; cobertura histórica e atual;
  desconhecidos e retiradas manuais passam pela mesma barreira da publicação; CAS final
  impede reativar sobre uma edição concorrente. Rascunho nunca substitui a cópia original.
- Sem nova interface nem prova nova de navegador. Este recorte cobre servidor e banco local;
  a integração autenticada e publicações remotas continuam explicitamente em Q01.

## Pedidos de arte e limites

Nenhum pedido de arte. Nenhum push ou banco remoto. Publicações que já estão ativas não
são alteradas automaticamente; a auditoria operacional delas e a implantação ficam em Q01.
