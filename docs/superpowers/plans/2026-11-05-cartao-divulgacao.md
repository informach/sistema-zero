# Cartão de divulgação — implementação

> Execução inline com a skill executing-plans, continuando a entrega autorizada.

**Objetivo:** oferecer prévia e PNG legível para todos os links públicos de divulgação.
**Arquitetura:** ShareCard genérico no UI, gerador Canvas com qrcode carregado sob demanda;
hosts fornecem copy e URL do serviço. Sem nova API, tabela ou serviço.
**Stack:** React, Canvas, qrcode 1.5.4 já usado no monorepo, Playwright.
**Spec:** `docs/plans/2026-11-05-cartao-divulgacao-design.md`.

## Tarefas

- [x] Criar `packages/ui/src/lib/share-card-image.ts`: validar HTTP(S), desenhar textos
  com quebra por largura, QR com margem quatro e correção M, devolver PNG sem requests.
- [x] Criar `packages/ui/src/components/ui/share-card.tsx`: botão, Dialog, estado de geração,
  invalidação por conteúdo, erro retomável e download; export pelo wildcard existente.
- [x] Conectar Admin (`convites-client.tsx`, `embaixadores-client.tsx`), funil
  (`EmbaixadorPainel.tsx`) e Kids (`ambassador-card.tsx`); somente links públicos.
- [x] Provar geração em Chrome real, decodificar QR do PNG, conferir público trocado,
  título longo, falha/retry, telas estreitas e diálogo aninhado. Executar typechecks/checks
  dos pacotes alterados e testes existentes relacionados; revisar diff e correções.
- [ ] Atualizar PR 244, CI/plano da versão final, deploy staging/produção e verificação.
- [ ] Cadastrar a embaixadora da campanha e campanha Laopa pela aplicação publicada, sem duplicação; guardar
  recibo privado e conferir link, estado agendado, público, prazo e comissões.
