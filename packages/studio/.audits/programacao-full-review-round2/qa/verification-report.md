VERIFICATION REPORT
-------------------
Claim: Todos os achados funcionais e os gates do review da categoria Programação foram corrigidos no snapshot entregue.
Executed: 2026-07-20 BRT, com alterações locais concorrentes preservadas.
Verdict: PASS.

FIXES VERIFIED
--------------
- BUG-001 / P1: toolbox compacta não empurra mais o flyout para fora de 375 × 812; o teste arrasta um bloco real até o workspace.
- BUG-002 / P2: os 43 consumidores `CTX` usam `canvas-context`; variáveis comuns não são sugeridas como pincel e os cinco contextos lexicais continuam disponíveis.
- Acessibilidade: o input livre do seletor tem `name` estável e `autocomplete="off"`.
- API interna: `programmingBodyTiming` não é mais exportado.
- Arquitetura: Programação possui registry por cinco famílias, com 149 blocos públicos e 7 legados, quatro capacidades obrigatórias e validação de duplicidade/catálogo.
- Parser: AST Babel estrita, sem `type Node = any`; builders Node-only não entram no bundle do navegador.
- Gates globais: TypeScript e Biome voltaram a zero erros.

AUTOMATED EVIDENCE
------------------
- `bun test src` | Exit 0 | 4.642 pass, 0 fail, 45.140 asserts, 302 arquivos.
- `bun run typecheck` | Exit 0.
- `bun run check` | Exit 0 | 730 arquivos verificados.
- `bun run --bun vite build --config playground/vite.config.ts` | Exit 0 | 1.478 módulos transformados.
- `bunx playwright test e2e/programming-accessibility.spec.ts` | Exit 0 | 4 pass, 0 fail.
- Playwright de lifecycle, preview-security, reopen-blocks, HTML/Canvas, smoke e workspace-drag | Exit 0 | 31 pass, 0 fail.
- Auditoria Jogo 2D após centralizar o inventário do runtime | Exit 0 | 285 pass, 0 fail.

REGRESSION COVERAGE
-------------------
- Mobile: retângulo do flyout dentro da viewport e drag real do primeiro bloco.
- Desktop: foco visível, contraste AA e pesquisa acessível.
- Canvas: declaração anterior, exclusão de variável comum, escopo léxico e providers locais.
- Contrato: todos os tipos públicos/legados registrados e pesquisáveis, sem duplicidade.
- Pipeline: Blockly → IR → Blockly → JavaScript → parser para a matriz integral da categoria.
- Integração: criação, preview, segurança, troca Ponte/Blocos, persistência e reabertura.

WARNINGS
--------
- O build mantém o aviso global já existente de chunks acima de 500 kB. Não há erro de build; o chunk do parser ficou em 533,31 kB (gzip 125,72 kB).
- A tentativa de executar os 138 E2E de toda a galeria em um único processo excedeu dez minutos. O escopo obrigatório do review foi reexecutado em servidores limpos: 35/35 cenários passaram.
