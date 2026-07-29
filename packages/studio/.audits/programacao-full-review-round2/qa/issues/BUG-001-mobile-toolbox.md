# BUG-001: Programação não oferece blocos em viewport de celular

**Severity:** High
**Priority:** P1
**Type:** UI
**Status:** Fixed

## Environment

- **Build:** `e75993d` com alterações locais do usuário preservadas
- **OS:** Windows 11
- **Browser:** Chromium 148.0.7778.96
- **URL:** `http://127.0.0.1:5197/editor/<project-id>`

## Summary

Ao expandir Programação em 375 × 812 e selecionar uma subcategoria, o flyout é posicionado abaixo da árvore inteira e fica fora da viewport. A criança vê os nomes das subcategorias, mas não consegue escolher ou arrastar seus blocos.

## Reproduction

```powershell
bun run --bun vite --config playground/vite.config.ts --host 127.0.0.1 --port 5197 --strictPort
node .audits/programacao-full-review-round2/repro/mobile-toolbox.mjs
```

Observed before the fix:

- viewport: 375 × 812;
- contêiner Blockly: `y=96`, `height=716`, `overflow=hidden`;
- toolbox expandida: `height=861`;
- flyout de Eventos: `y=957`, `height=130.1875`, com 18 blocos;
- o flyout começa 145 px depois do fim da viewport.

Evidência visual: `../../screenshots/programacao-mobile.png`.

## Expected

Selecionar qualquer subcategoria de Programação deve abrir um flyout inteiramente alcançável, com pelo menos um bloco clicável/arrastável dentro da área visível do editor.

## Root cause

`BlocklyPanel.tsx:70-73` ativa `horizontalLayout` no modo compacto, decidido apenas pela largura em `BlocklyPanel.tsx:876-880`. Quando a categoria aninhada criada em `toolbox.ts:294-414` é expandida, seus filhos aumentam a altura da toolbox para além da área do editor. O Blockly posiciona o flyout depois dessa toolbox; o pai `.injectionDiv` recorta o resultado com `overflow: hidden`.

## Fix

`BlocklyPanel` passa a escolher o layout horizontal pela largura real do contêiner e marca o modo compacto no elemento de injeção. O CSS achata visualmente as categorias aninhadas em uma faixa horizontal rolável, preservando a árvore ARIA, e impede que a subcategoria expandida aumente a altura da toolbox.

## Verification

- Regressão em 375 × 812: passou; o flyout ficou dentro da viewport e um bloco real foi arrastado para o workspace.
- Desktop e navegação por teclado: passaram no mesmo spec.
- Comando: `bunx playwright test e2e/programming-accessibility.spec.ts` — 4 pass, 0 fail.

## Impact

- **Users Affected:** crianças usando celular ou janela estreita
- **Frequency:** sempre que Programação é expandida nessa viewport
- **Workaround:** usar tablet/desktop ou uma viewport mais larga

## Automation Follow-up

- **Required:** Yes
- **Status:** Done
- **Spec / Command:** novo cenário responsivo em `e2e/programming-accessibility.spec.ts`
- **Notes:** deve verificar retângulo do flyout dentro da viewport e interação real com o primeiro bloco em 375 × 812.

## Related

- Test Case: exploração responsiva da categoria Programação
- Figma Design: N/A
