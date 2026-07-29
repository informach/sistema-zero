# Auditoria arquitetural: Mundo 3D

Data: 2026-07-23

## Escopo revisado

- Definição da extensão, manifest, blocos, toolbox, exemplos, contexto da IA e runtime.
- Pipeline completo Blockly -> SZIR -> JavaScript -> Ponte -> Blockly.
- Contratos de ciclo de vida, permissões, importmap ESM, carregamento local de GLB/HDR, descarte de recursos GPU e documentação.
- Execução dos 12 exemplos reais no Chromium, incluindo a experiência em viewport estreito.

## Resultado

O único achado da auditoria foi corrigido.

### Resolvido: coleta antecipada de identificadores para 18 comandos

Arquivo: `packages/studio/src/generators/js.ts:6772`

O compilador emite 120 comandos `w3d:*`, mas `collectStatementIdentifiers` cobre apenas 102 deles. Faltam:

`w3d:city`, `w3d:district`, `w3d:roadGrid`, `w3d:houseRow`, `w3d:quality`, `w3d:inventoryGive`, `w3d:inventoryRemove`, `w3d:stringLights`, `w3d:traffic`, `w3d:door`, `w3d:crops`, `w3d:barn`, `w3d:windmill`, `w3d:fence`, `w3d:animals`, `w3d:crater`, `w3d:flag` e `w3d:rocket`.

Esses comandos aceitam soquetes com expressões. Hoje, as variáveis usadas neles também aparecem em declarações ou outros nós e acabam recebendo um identificador válido durante a compilação. Por isso, os exemplos e os round-trips não falham. Ainda assim, a assimetria deixa o contrato do gerador incompleto e cria risco de colisão ou de nomes instáveis quando novos tipos de expressão, variáveis de callback ou novos comandos forem adicionados.

Correção aplicada: cada comando agora coleta as mesmas expressões usadas pelo trecho emissor. Um teste de regressão compara os conjuntos de comandos `w3d:*` emitidos e coletados, impedindo que a assimetria volte.

## Verificações aprovadas

- 137 blocos: contrato de área, Blockly -> IR, validação Zod, IR -> Blockly -> IR, IR -> JS, helper do runtime e JS -> Ponte -> IR.
- 12 exemplos: fonte canônico, IR embutida, schema e ciclo de vida automático.
- Runtime: API pública protegida, importações ESM fixadas, assets somente locais, descarte de renderer, textura, geometria e material, `pagehide` e `beforeunload`.
- Documentação: todos os métodos públicos aparecem no contexto da IA; as subcategorias da toolbox aparecem nos docs do aluno; nenhum método inexistente é citado no contexto da IA.
- Chromium: 13 de 13 testes aprovados em porta exclusiva, cobrindo os 12 exemplos e Fazendinha em 390 x 844.
- `bun test src/official-extensions/world-3d`: 260 aprovados, 0 falhas.
- `bun run typecheck`: aprovado.
- `bun run check`: aprovado. Há uma informação preexistente fora do escopo em `game-3d-advanced/__gen_chefao.ts`.

## Integridade do worktree

Nenhum arquivo de produção foi alterado nesta auditoria. O repositório já continha alterações locais, preservadas durante a revisão. `git diff --check` não reportou problema de espaço em branco no escopo auditado.
