---
status: resolved
file: packages/studio/src/modes/python/PythonClassicWorkspace.tsx
line: 45
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Vincular a seleção ao projeto e à revisão da fonte

## Review Comment

highlight é estado local sem identidade do projeto ou fonte. A troca do projeto no store preserva o highlight publicado anteriormente e o entrega ao PythonSourceEditor do novo projeto. Monaco vincula o nome do arquivo ao novo prefixo de modelo e reaplica a decoração a um trecho que nunca foi selecionado nesse projeto. Alteração textual do mesmo arquivo também deixa a faixa antiga em circulação.

Prova independente com React/store/composição reais e filhos visuais capturados: publicar range0..5 de main.py em A, hidratar B com main.py='print("Outro")\n', observar SourceEditor ainda recebendo highlight linha1,colunas1..6, nonce1. O callback antigo é corretamente recusado pelo guard de ID; o defeito está no estado já publicado que continua vivo.

Vincular a vida da composição ao projeto e cada faixa à fonte que a originou. Não usar somente reset em effect, que permite render intermediário com faixa de A no editor de B.

## Triage

- Decision: `VALID`
- Notes: Composição interna agora tem key=project.id; highlight conserva a fonte de origem e somente é repassado quando ela corresponde ao arquivo atual. Não depende de reset posterior em effect. Nenhuma implementação alterada pelo revisor.

## Verification

- Mesma prova independente React/store: depois de selecionar range0..5, editar o texto faz o highlight enviado ao editor virar null; nova seleção seguida de A→B também vira null. Invocar o callback antigo mantém null. Resultado: newProject='another-python-project', highlightCleared=true, oldCallbackRejected=true, exit0.
- Prova isola a composição usando filhos visuais que capturam props; não representa uma execução de Monaco/Blockly visual nem do navegador.
