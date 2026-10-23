---
provider: manual
pr:
round: 9
created_at: 2026-10-17T00:53:08Z
---

## Summary

- Total: 2
- Resolved: 2
- Unresolved: 0

## Scope

Catálogo/labels/testes Turtle visual; alterações de binding, projeção, seleção, registro Blockly e injeção de codecs na transação; derivação do manifesto de 178 entradas, fixtures e prova nativa. Rodadas 001–008 conhecidas e resolvidas. Não qualifica APIs gráficas, callbacks, jogos, renderer, catálogo publicado ou integração final.

## Evidence

- Reproduções confirmadas: mutação explícita por setattr conserva rótulo Turtle oficial; quatro curadorias isoladas omitem comandos parceiros necessários.
- Prova independente de oito programas: parsing CPython, AST→visual→Blockly→AST, AST original não modificado e oito fontes geradas compiladas. Aliases de import/from, instâncias capturadas em closure e Screen foram especializados; parâmetros, reatribuição, import estrela e retorno de fábrica permaneceram genéricos. O programa fixo de mutação do módulo produziu custom:10 tanto na fonte original quanto na gerada, ainda com rótulo oficial incorreto.
- Derivação executada apenas até antes da primeira escrita: 178 entradas idênticas ao manifesto atual; engine SHA-256 6c72e4f441b715ab7c4df12934dee81d6da141eec018ac69bed2736cf6063d36 idêntico ao arquivo existente; nenhuma escrita em fontes.
- `bun test src/python/extensions/turtle/catalog.test.ts src/python/blocks/selection.test.ts src/python/blocks/coreCatalog.test.ts src/python/blocks/blockly.test.ts`: 20 pass, 0 fail, 1378 expect() calls, exit 0.
- Biome dos nove arquivos TypeScript principais revisados: exit 0. Nenhum Playwright/browser executado e nenhum arquivo de implementação alterado pelo revisor.
- Aspectos preservados: aliases mantêm nomes na fonte; identidade distingue Screen, Turtle e módulo; AST e serialização permanecem exatos nos casos testados; Python sem extensão não recebe os blocos Turtle nos gates exercitados.
- Revalidação após correções: quatro mutações reflexivas agora genéricas, alias from inequívoco ainda especializado e AST exato em cinco programas. Sete curadorias com parceiros presentes e dez recusas ao retirar aprovação. Starter da extensão contém dez comandos canônicos; instalação/aprovação ausentes excluem todos. Testes frescos dos mesmos quatro arquivos: 21 pass / 1399 verificações; Biome dos cinco arquivos alterados, exit 0.

## Recommendation

Os dois achados foram corrigidos e revalidados independentemente. Não há pendências desta rodada; a conclusão se restringe ao recorte revisado e não qualifica integralmente o produto ou todas as APIs Turtle.
