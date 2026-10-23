---
status: resolved
file: packages/studio/src/state/pythonProjectValidation.ts
line: 80
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Cache Python passa por validação de blocos JavaScript

## Review Comment

O leitor comum novo conserva os caches visuais como dados opacos e declara a fonte Python como autoridade, mas chama assertProjectContentPreserved sem separar a semântica por linguagem. Esse helper, em core/projectDocument.ts:182, chama projectBlockTypes antes da comparação. O validador contém regras específicas JavaScript, como os inputs permitidos de sz_frame_*, além de exigir coerência de IDs do cache Blockly. Assim um cache derivado desconhecido ou desatualizado bloqueia a abertura e o snapshot de uma fonte Python válida, mesmo sem ser usado para execução.

Reprodução independente com documento Classic válido, assets vazios e main.py igual a `print(42)\n`: blocksState com um nó `sz_frame_future` e input `PYTHON_BODY` é recusado por 'Uma área do projeto contém um encaixe desconhecido'. Um cache com dois IDs `old` repetidos também impede a abertura. Com o mesmo conteúdo e apenas bridgeCodeAhead:true, ambos os documentos abrem e geram exatamente a fonte esperada. O flag está contornando uma validação de cache alheia à autoridade de execução deste leitor.

Para documentos Python, comparar estruturalmente os caches preservados sem invocar projectBlockTypes nem regras Blockly JavaScript. Manter o orçamento JSON e recusar perda de conteúdo; reparsing/validação visual continuam no fluxo que efetivamente usa o cache para edição. Preservar o comportamento JavaScript existente. Cobrir os mesmos caches com e sem bridgeCodeAhead, snapshot derivado só da fonte e não mutação do documento recebido.

## Triage

- Decision: `VALID`
- Notes: Corrigido no comparador compartilhado com comparação estrutural de blocksState no ramo Python, sem projectBlockTypes. Revalidação independente confirmou quatro casos (dois caches opacos × com/sem bridgeCodeAhead): leitura preservada, cópias independentes, entrada intacta e snapshot somente da fonte. Os mesmos dois caches continuam recusados no ramo JavaScript. Perda de conteúdo do cache Python continua recusada, e propriedade executável foi rejeitada pelo guard JSON sem invocar getter. Verificação fresca: 29 pass, 0 fail, 177 verificações em quatro arquivos, incluindo regressão JavaScript, Pro e snapshot; Biome dos dois arquivos alterados, exit 0. Nenhum browser executado pelo revisor.
