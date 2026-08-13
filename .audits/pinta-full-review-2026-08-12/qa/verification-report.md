# Verificação pós-correção — Pinta

Data: 2026-08-12

## Veredito

**PASS no escopo do plano aprovado.** BUG-001 a BUG-006, o cleanup de `objectURL` e as cinco fontes vetoriais foram implementados e possuem regressões automatizadas. TypeScript, Biome, a suíte completa, o build do playground e os testes selecionados do host estão verdes.

## Evidência fresca

| Verificação | Resultado |
|---|---|
| `bun test src` em `packages/pinta` | PASS — 674 testes, 0 falhas, 3.013 expects, 65 arquivos |
| `bun run typecheck` em `packages/pinta` | PASS |
| `bun run check` em `packages/pinta` | PASS — 207 arquivos, sem fixes |
| build Vite do playground | PASS — 1.795 módulos |
| testes selecionados de `packages/community-kids` | PASS — 25 testes, 0 falhas, 72 expects |
| `git diff --check` | PASS |

O build mantém um alerta não bloqueante: chunk principal com 512,11 kB minificado (152,76 kB gzip). As cinco fontes aparecem em chunks dinâmicos separados, de 16,94 kB a 52,42 kB, confirmando que não foram agregadas ao carregamento inicial como um único payload.

## Cobertura das causas raiz

- **BUG-001:** persistência recusa a galeria projetada acima de 32 MiB e permite redução de legado acima do teto.
- **BUG-002:** cache de miniatura diferencia namespaces mesmo com id e timestamp idênticos.
- **BUG-003:** inserção ignora shapes ocultos antes dos bounds e trata documento todo oculto como vazio.
- **BUG-004:** filtro do seletor prova que não acessa pixels; lista e previews são memoizados.
- **BUG-005:** listener no documento recupera foco externo, cicla Tab/Shift+Tab e trata Escape.
- **BUG-006:** falha de rasterização mantém o modal de inserção aberto.
- **Lifecycle:** desmontar antes do load revoga a `objectURL` da folha vetorial.
- **Fontes:** modelo/sanitizer, cinco opções na UI, geometria por família, SVG portátil seletivo, folhas/tiles/mapas/ZIP/rasterização e download real do diálogo são cobertos.

## Limitação remanescente de QA

O Pinta ainda não possui harness E2E de browser. Happy DOM não valida canvas 2D real, downloads do navegador, gestos de ponteiro ou foco em Chromium/Firefox/WebKit. Assim, a implementação está verificada pelos gates disponíveis, mas smoke exploratório cross-browser continua recomendado antes de release.
