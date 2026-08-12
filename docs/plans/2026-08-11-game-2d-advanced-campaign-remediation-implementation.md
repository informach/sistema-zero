# Implementação da remediação de Jogo 2D Avançado

Referência: `2026-08-11-game-2d-advanced-campaign-remediation-design.md`

## Lote 1 — Contratos e eventos

1. Escrever regressões mínimas para IDs ausentes/duplicados, migração
   idempotente, gemas após reload/save/load/replay e conclusão configurável.
2. Implementar a fronteira de normalização, identidade fase–entidade,
   persistência de colecionáveis e requisito explícito de gemas.
3. Escrever e implementar o evento de campanha em bloco, IR, gerador, parser,
   workspace e runtime; verificar round-trip e reset de listeners.

Verificação do lote: testes de schema, campanha, codecs, parser e contratos de
blocos; Biome nos arquivos alterados.

## Lote 2 — Input e editor

4. Escrever regressões de layout touch, ações, multitouch e cancelamento;
   implementar controles ancorados ao palco visível e ligados ao input
   semântico.
5. Criar o catálogo tipado de entidades; escrever regressões do editor e
   implementar propriedades por tipo, validação localizada, labels, nomes,
   navegação por teclado e layout responsivo.
6. Separar desenho completo de desenho incremental; medir que um movimento
   altera somente uma célula.

Verificação do lote: testes do runtime e editor, typecheck parcial, Biome e E2E
móvel dirigido.

## Lote 3 — Arquitetura, tipos e documentação

7. Extrair eventos, persistência e input de campanha para módulos coesos;
   fortalecer testes de fronteira, reduzir `runtime.ts` e remover tipos mortos.
8. Tipar campanha, save, replay e ações sem fallback genérico; manter a lista de
   API como fonte única.
9. Atualizar manual humano, contexto da IA, tooltips e exemplo Reino Zero Pro.

Verificação do lote: testes arquiteturais, documentação, exemplos, template
guards, typecheck e Biome.

## Lote 4 — E2E e validação final

10. Fazer o E2E Reino Zero usar `SZGameKit`; cobrir região, coleta persistente,
    controles móveis e conclusão.
11. Medir build/servidor Playwright e typecheck; corrigir a causa pertencente ao
    escopo ou registrar evidência de que o custo é externo ao domínio.
12. Executar testes dirigidos, suíte completa do Studio, Biome global,
    typecheck, build e E2E afetados; revisar o diff contra cada achado.
