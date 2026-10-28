# Revisão do presente da Capi

Implementação local em 28/10/2026, sobre `a991890cc`. Sem push ou implantação neste lote.

## Resultado

- Salvamento V5 com `presenteDosBichosEntregue`; V1 a V4 e suas migrações anteriores preservados.
- Quatro bichos distintos habilitam uma Salada da horta na conversa com a Capi, uma única vez.
- A salada já existe, combina com a horta da Capi e alimenta a pessoa ou o bicho adotado.
- Inventário e marca mudam juntos. A conciliação econômica mantém ambos no mesmo grupo.
- Agradecimento no fim das falas, após eventual página do diário.
- Inventário com 999 saladas ou JSON sem espaço nos 64 KB adia a entrega sem marcar.
- Playground `?bichos=achados`, preservando uma entrega já salva; `?novo=1` inicia outra partida.
- Serviço recebe versões antigas, devolve V5 e guarda o JSON pela revisão CAS existente.
  Não é necessária uma coluna ou migração SQL nova.

## Verificação executada

- 712 testes, 0 falhas, 0 pulados, 33.063 asserções nos três pacotes.
- Postgres 16 local descartável: leitura V4, gravação V5, corrida entre duas gravações,
  revisão atrasada e teto de 64 KB, tanto Kids quanto adulto.
- Chrome real no playground, serial por público: conversa, últimas falas, persistência,
  repetição e reabertura sem duplicação. Nenhum erro de página.
- Tipagem dos três pacotes, Biome dos arquivos alterados e `git diff --check` aprovados.
- Build do cliente aprovado: 43 arquivos, 20,89 MB.
- Os diagnósticos iniciais de tipagem eram inferência do literal 5 e valores nullable nos
  testes novos. Corrigidos com contrato explícito e guardas, sem supressões.

Comandos reproduzíveis, na raiz, com as duas variáveis de banco apontando exclusivamente para
um Postgres local descartável chamado `arquipelago_test`:

```text
bun test packages/arquipelago/tests packages/arquipelago-contracts/tests packages/arquipelago-api/tests
bun run --cwd packages/arquipelago-contracts typecheck
bun run --cwd packages/arquipelago typecheck
bun run --cwd packages/arquipelago-api typecheck
bun run --cwd packages/arquipelago test:capi-browser
bun run --cwd packages/arquipelago build
```

Variáveis dos testes de banco: `TEST_DATABASE_URL` e `ARQUIPELAGO_TEMPO_TEST_DATABASE_URL`.
Logs locais em `.cache/arquipelago-audit-20261028/capi-*`; o teste de navegador está no Git.

## Revisão de escopo

Conferidos migração, repetição, último bicho após conversa do dia, diário simultâneo,
armazenamento local pendente, concorrência, capacidade e ordem das falas.
Nenhum bloqueador remanescente identificado neste lote. Não é uma homologação de todas as
outras funcionalidades do Arquipélago nem do ambiente hospedado.

Sem alteração no gerador/GLB do Bosque, mecanismos, bosque-vivo, contrato ou serviço dos
desafios, documentos dos desafios, arquivos `.env` ou workflows. Bancos hospedados intocados.
O acompanhamento externo será atualizado pela pessoa responsável com o resumo da entrega.
