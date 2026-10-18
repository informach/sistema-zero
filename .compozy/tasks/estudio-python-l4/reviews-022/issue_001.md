---
status: resolved
file: packages/studio/src/python/blocks/readWorkspaceState.ts
line: 96
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Recusar campos ignorados e propriedades Blockly inválidas

## Review Comment

O leitor validava valores textuais de fields e contava blocos após o preflight, mas não verificava se os campos declarados tinham sido efetivamente restaurados. Também repassava propriedades padronizadas do State sem validar seus tipos. O Blockly pode aceitar esses dados mediante coerção ou simplesmente ignorá-los, sem lançar erro.

Reprodução independente com Blockly e reader reais: substituir fields de sz_py_integer por {WRONG_FIELD: 'pending value'} era aceito. O Blockly emitia apenas Ignoring non-existant field, descartava esse texto e restaurava NUMBER='1' do extraState. Um bloco com x='bad' e y={} também era aceito, resultando em coordenadas x='0bad', y='0[object Object]'. data={}, editable='false' e disabledReasons='oops' igualmente passavam. Portanto sucesso do load e quantidade de blocos iguais não provam recuperação fiel do conteúdo.

Validar tipos das propriedades conhecidas antes de carregar e conferir campos declarados contra os campos/valores efetivos após o preflight. A validação deve conservar texto ainda incompleto, como NUMBER='12a', em vez de exigir que todo campo já gere Python válido. Este achado não afirma execução de código ou escape de sandbox.

## Triage

- Decision: `VALID`
- Notes: O implementador adicionou tipos explícitos de coordenadas, flags, data, disabledReasons e comentários, além da checagem de nomes/valores efetivos de fields. readState agora deriva o formato de defaults/controles confiáveis e preserva o texto editável, recusando opções dropdown desconhecidas. Revalidação independente confirmou as correções. Nenhuma implementação alterada pelo revisor.

## Verification

- Os quatro payloads de State da reprodução são recusados. O caso WRONG_FIELD é recusado, embora o Blockly ainda emita seu aviso durante o preflight temporário.
- Prova independente com os 253 codecs de programação/Turtle: todos os campos de texto trocados por '12a ! 🐢' sobrevivem exatamente ao save/read/load; quatro dropdowns adulterados foram recusados. Zero workspaces temporários restantes.
- Coordenadas 48/72, comentário de bloco e nota de workspace com Unicode/múltiplas linhas foram preservados. Tipos inválidos em text, pinned, width e editable de comentários foram recusados.
- Profundidade independente: 513 blocos em cadeia (depth=512) passam no reader e no rebase; 514 são recusados antes do load. Nenhum workspace remanescente. Esta é evidência Bun/headless, não qualificação de stack do navegador.
- Origem duplicada é recusada; origem com intervalo forjado é ignorada. A recuperação usou quatro identidades do AST correspondente, sem executar fonte.
- Suite focada final e Biome registrados em _meta.md. Recuperação de cache confirmado na UI ainda exige comparação com o AST da fonte exata; esta revisão não declara essa integração pronta.
