# Aplicação da revisão didática

**Objetivo:** incorporar as recomendações de `REVISAO-DIDATICA-2026-09-20.md` aos materiais de autoria, preservando a continuidade dos três cursos e a validade dos 27 manifestos.

**Fontes de verdade:** `BRIEFING.md`, `ESPEC-MANIFESTO.md`, `ESPEC-ROTEIRO.md`, os manifestos em `aulas/` e a plataforma em `sistema-zero`.

## 1. Introdução do Desafio

- [x] Mover o jogo de treino para logo depois da abertura em `desafio-introducao.manifesto.json`.
- [x] Atualizar a justificativa, as referências de ordem e a apresentação dos três passos em `desafio-introducao.md`.
- [x] Reordenar os trechos correspondentes de `desafio-introducao.roteiro.md` e retirar referências à numeração antiga.
- [x] Conferir que o projeto de treino continua na primeira seção de criação, com o mesmo critério `estrelas-6`.

## 2. Ponto de parada do Dia 5

- [x] Marcar no briefing do `video-relogio-e-tiro` que, depois de concluir a seção, a criança pode parar e retomar na seção seguinte.
- [x] Colocar a fala correspondente no roteiro de gravação, com indicação honesta de esperar o projeto ficar guardado.
- [x] Abrir o vídeo seguinte com uma retomada de uma frase, sem repetir toda a montagem anterior.
- [x] Registrar a decisão na proposta `nave-contra-asteroides-dia-5.md` (renomeada posteriormente).

## 3. Trabalho externo de O Jogo do Meu Jeito

- [x] Localizar as seções com `externalTool` cuja conclusão mede apenas vídeo.
- [x] Acrescentar a cada último clipe dessas seções uma conferência visual concreta do resultado esperado, tanto no manifesto quanto na proposta da aula.
- [x] Preservar os critérios de conclusão honestos: assistir ao exemplo não deve ser descrito como aprovação automática da arte.
- [x] Validar que os 25 pontos identificados foram cobertos e que as entregas pela galeria continuam iguais.

## 4. Cenas e continuidade

- [x] Auditar as 53 experiências presentes nos manifestos: metas exigidas, pergunta final, repetição desnecessária e relação com o conceito da seção.
- [x] Aplicar apenas simplificações com evidência clara, atualizando catálogo, proposta e manifesto juntos se houver alteração.
- [x] Percorrer os critérios de Corre Dino após a escolha do pulo, da área de colisão, do som e da dificuldade; conferir também a passagem Desafio para Meu Jeito.
- [x] Preparar um roteiro observacional para os três percursos infantis recomendados, sem presumir os resultados desse ensaio.

## 5. Verificação

- [x] Executar `bun docs/aulas-interativas/qa/validar-manifestos.ts` em `sistema-zero` e obter 27 válidos, 0 avisos.
- [x] Conferir as contagens de seções, clipes e experiências e a paridade dos roteiros escritos com seus `plannedVideo`.
- [x] Verificar que falas ativas não indicam posição variável da ferramenta e que cada mudança editorial aparece em todos os arquivos pertinentes.

**Limite verificável aqui:** a compreensão, a motivação e o tempo real das crianças exigem ensaio com participantes. O roteiro de observação é o entregável desta etapa; não substituir suas respostas por suposições.

**Resultado da auditoria de cenas:** as duas sequências de cinco metas foram mantidas porque cada passo sustenta a comparação. A pergunta repetida do Dia 3 foi alterada. O ensaio com participantes ainda precisa acontecer para medir ritmo e motivação.

## 6. Roteiros de gravação

- [x] Validar os seis roteiros do Desafio e corrigir a duração e as âncoras do Dia 4.
- [x] Escrever os treze roteiros de Corre Dino e os oito de O Jogo do Meu Jeito.
- [x] Conferir os 166 clipes com os manifestos, a paridade entre tela e narração e as 25 autoconferências de ferramenta externa.
- [x] Conferir no código o acesso à Ponte e atualizar a Aula 13 de Corre Dino.

**Registro:** `REVISAO-ROTEIROS-2026-09-20.md`.
