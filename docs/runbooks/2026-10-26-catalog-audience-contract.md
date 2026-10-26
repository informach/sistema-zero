# Catálogo: contrato obrigatório de comunidade

Segunda etapa da separação comercial, posterior à liberação expand/backfill descrita em
`2026-10-26-admin-business-community.md`. Não integrar/deployar antes de confirmar, nos dois
ambientes, que os servidores antigos foram retirados e todos os writers gravam audiência.

## Condições para implantação

1. Registrar o SHA em execução de Catalog, Payments, Funnel e Admin de staging e produção,
   e confirmar a retirada das versões anteriores à separação comercial.
2. Conferir `catalog.products` e `catalog.coupons`: zero linhas com `audience is null`.
   Produto desconhecido ou cupom não classificado precisa de análise; não atribuir público
   por aproximação nem apagar registros para viabilizar a migração.
3. Confirmar que a classificação financeira revisada foi aplicada, sem conflitos. A projeção
   financeira permite histórico sem origem; não ganha NOT NULL nesta etapa.
4. Promover o commit revisado pelo CI para staging, validar, depois promover para produção.
   As migrações continuam pertencendo ao Catalog e ao seu journal Drizzle.

## Mudança

`0010_catalog_audience_required.sql`, gerada por `bun run db:generate --name
catalog_audience_required`, aplica somente SET NOT NULL em `catalog.products.audience` e
`catalog.coupons.audience`. Sem default, nova enumeração, remoção de linhas ou alteração de
IDs, datas, preços e metadados. O journal mantém o backfill 0009 antes da restrição 0010.

As tabelas auditadas possuem 19 produtos e nenhum cupom em cada ambiente. Conferir novamente
antes do deploy; a operação precisa de lock exclusivo curto e recusa NULL remanescente.
Rollback de aplicação deve usar uma versão que escreva audiência explícita; não retirar a
restrição automaticamente e não voltar ao writer antigo.

## Evidência local

- PostgreSQL real em container próprio, banco descartável `catalog_audience_test`: 4 testes,
  31 asserções, zero falhas. Abrange idempotência, rollback de classificação desconhecida,
  isolamento/paginação e recusa SQL direta de produto/cupom sem comunidade.
- As provas do backfill histórico reconstroem a nulabilidade antiga dentro de transação que
  sempre volta atrás; não deixam a restrição relaxada após o teste.
- Pacote Catalog: lint e tipagem passaram; 159 testes/404 asserções passaram. Três casos do
  adaptador de seed sem banco próprio foram pulados, sem alegar sua execução.
- Primeira tentativa de conexão usou a porta anterior do container e foi recusada. A porta
  publicada atual foi relida antes da execução positiva; nenhum banco externo foi acessado.

Este documento prepara a operação; não declara que a migração foi aplicada nos ambientes.
