# Lote 235 — a causa dos avisos act, aberta desde o lote 203

Estado: diagnosticado, corrigido e provado, 10/09/2026.
Pendência mais antiga do plano: os lotes 203, 214, 216, 219, 221, 225, 229 e 231
registraram avisos `act` intermitentes, sempre sem atribuir causa e sem suprimir logs.

## O que se sabia

- Apareciam **só na suíte integral**, nunca no focal, em cerca de um terço das execuções.
- Sempre nos mesmos componentes: `LoadedEditor`, `EditorTopBar` duas vezes,
  `FacePaintDialog` e `ModelEditor`.
- Sempre a partir de `ModelEditor.test.tsx`.

## O que foi descartado, medindo

- Rodar o arquivo sozinho, três vezes: zero avisos.
- Rodar a pasta inteira do editor: zero.
- Rodar o arquivo com os dois vizinhos que o antecedem na suíte: zero.
- Rodar o arquivo com um `typecheck` disputando CPU: zero.

Ou seja: não era ordem de arquivos nem contenção de CPU, as duas hipóteses naturais.

## A causa

O palco falso (`installFakeViewport`) devolve uma foto por padrão. Com ela, **cada
montagem do editor de modelos agenda um `setThumb` 700 ms depois** que o desenho assenta.
Um teste que passe desses 700 ms recebe essa atualização de estado FORA do `act` — e é
exatamente por isso que os avisos só apareciam na suíte inteira, onde os testes ficam
mais lentos. O tempo do teste, não a ordem dele, era a variável.

## A prova

Uma sonda com dois casos, cada um montando o editor e esperando 1,2 s:

- Com foto no palco: reproduz **os mesmos cinco avisos, nos mesmos componentes e na mesma
  ordem** que a suíte vinha registrando desde o lote 203.
- Sem foto no palco: nenhum aviso.

A sonda foi removida e virou uma regressão permanente em `ModelEditor.test.tsx`, que
assere a propriedade e não o log: passado o tempo da miniatura, nada foi gravado no asset,
embora o palco tenha sido consultado.

## A correção

`ModelEditor.test.tsx`, `ModelEditor.mesh.test.tsx` e `ModelEditor.paint.test.tsx` passam
a instalar o palco **sem foto**. Os dois casos que provam a miniatura reinstalam o palco
com ela, então a cobertura da foto não diminuiu: continua provada onde é o assunto.

Nada de supressão de log, nada de `act` a mais espalhado pelos testes e nenhuma mudança
de comportamento do produto: a foto continua saindo 700 ms depois na oficina de verdade.

## Provas finais

- Sonda: mesma assinatura de cinco avisos com foto, zero sem foto.
- Três execuções integrais seguidas antes da regressão nova: **2.835/0, zero avisos act**.
- Integral com a regressão: **2.836/0, 381 arquivos, zero avisos act**; tipos e Biome.

## Limite

A intermitência histórica era de cerca de um terço das execuções, então contagem de
execuções limpas nunca seria prova sozinha. O que sustenta a conclusão é a sonda: ela
reproduz a assinatura exata sob demanda e a apaga ao tirar a única variável apontada.
