# BUG-002: Picker de dimensão do canvas sugere variável inválida

**Severity:** Medium
**Priority:** P2
**Type:** Functional
**Status:** Fixed

## Environment

- **Build:** `e75993d` com alterações locais do usuário preservadas
- **OS:** Windows 11
- **Browser:** não aplicável; reproduzido com Blockly real e o schema da aplicação
- **URL:** categoria Programação → Valores → largura/altura do canvas

## Summary

Os blocos “largura do canvas” e “altura do canvas” oferecem qualquer variável legível como pincel. Ao selecionar uma opção sugerida que não veio de “Preparar tela de desenho”, a própria validação da IR rejeita o projeto.

## Reproduction

```powershell
bun --preload ./.audits/programacao-full-review-round2/happy-dom-preload.ts ./.audits/programacao-full-review-round2/repro/canvas-context-picker.ts
```

Observed before the fix:

- variáveis oferecidas: `pontos`, `pincel`;
- opção selecionada: `pontos`;
- `SZIRV2Schema.safeParse`: `false`;
- mensagem: `O pincel “pontos” ainda não foi preparado. Use “Preparar a tela” antes de desenhar.`

## Expected

Campos `CTX` devem oferecer apenas contextos declarados por “Preparar tela de desenho” que estejam em escopo no ponto de uso.

## Root cause

`blocks/values.ts:206-216` declara os dois campos como `kind: 'variable'`. Esse kind retorna todas as variáveis legíveis em `fields/FieldNamePicker.ts:1431-1434`, enquanto a validação exige um símbolo de `canvasSetup` em `ir/programmingReferences.ts:312-314`. O mesmo metadado genérico aparece em 43 consumidores `CTX`; dois deles pertencem à categoria Programação.

## Fix

Foi criado o kind declarado-only `canvas-context`, alimentado por `sz_canvas_setup` e pelos cinco providers lexicais de pincel. Os 43 consumidores `CTX` do núcleo usam esse namespace; variáveis JavaScript comuns continuam legíveis onde são válidas, mas não aparecem como pincel.

## Verification

- Matriz de `FieldNamePicker`: 81 pass, 0 fail, incluindo ordem, escopo, variável comum, cinco providers locais e os 43 consumidores `CTX`.
- E2E do picker real: passou com `name`, `autocomplete="off"`, foco e semântica acessível.
- Pipeline integral: `bun test src` — 4.642 pass, 0 fail.

## Impact

- **Users Affected:** projetos que combinam variáveis comuns e canvas
- **Frequency:** sempre que uma variável comum é escolhida para `CTX`
- **Workaround:** escolher manualmente o nome criado por “Preparar tela de desenho”

## Automation Follow-up

- **Required:** Yes
- **Status:** Done
- **Spec / Command:** `src/blockly/fields/__tests__/FieldNamePicker.test.ts`
- **Notes:** cobrir contexto válido, variável comum, ordem, escopo e os dois consumidores de dimensão.

## Related

- Test Case: contrato entre sugestão do picker e validação de referências
- Figma Design: N/A
