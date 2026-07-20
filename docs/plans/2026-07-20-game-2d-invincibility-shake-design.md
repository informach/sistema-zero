# Jogo 2D — consulta de invencibilidade e tremor sem rolagem

**Data:** 2026-07-20
**Status:** aprovado

## Objetivo

Adicionar uma pergunta que permita à criança descobrir se um sprite está invencível e impedir que o tremor da tela exiba barras de rolagem.

## Consulta de invencibilidade

A categoria **❤️ Vida** receberá o bloco booleano `o sprite [nome] está invencível?`. O bloco gerará `SZGame2D.isInvincible(sprite)` e poderá ser usado diretamente em “se” ou dentro do operador “não”.

`isInvincible` devolverá `true` enquanto `blinkFrames > 0`. Esse estado inclui tanto a proteção criada por “Machucar o sprite...” quanto o bloco manual “Fazer o sprite piscar”. `damageSprite` usará a mesma função para decidir se ignora um dano. Essa fonte única impede divergência entre a pergunta e o comportamento real.

A mudança atravessará todo o contrato da extensão: definição Blockly, toolbox, allowlist, IR, conversão Blockly ↔ IR, geração JavaScript, parser reverso, contrato TypeScript, API pública, contexto da IA e documentação.

## Tremor sem barras de rolagem

O tremor continuará movendo o canvas com `transform`. Esse mecanismo preserva o efeito inteiro e não interfere na câmera, na limpeza do canvas nem na ordem de desenho.

O palco bloqueará o overflow da viewport quando o jogo entrar em modo responsivo ou ocupar a tela. Um helper interno aplicará `overflow: hidden` ao `documentElement` e ao `body`; `fitScreen` e `setupStageFull` chamarão esse helper. Assim, tanto “Preparar o jogo em tela cheia” quanto “Preparar o jogo para ocupar a tela toda” ficam protegidos, inclusive quando `fitScreen` for usado diretamente.

Projetos que usam apenas primitivas da extensão sem ativar um palco responsivo manterão o layout HTML normal.

## Testes

- Runtime: a pergunta começa falsa, fica verdadeira após dano ou piscar manualmente e volta a falsa ao terminar o efeito.
- Coerência: `damageSprite` ignora o dano exatamente quando `isInvincible` devolve `true`.
- Pipeline: bloco → IR → JavaScript → parser → Blockly, incluindo o contrato público exato.
- Toolbox e documentação: o bloco aparece em **❤️ Vida** e os inventários permanecem sincronizados.
- Palco: os dois modos responsivos bloqueiam overflow em `html` e `body`.
- Navegador: durante um tremor real, `scrollWidth` e `scrollHeight` não ultrapassam a viewport.

## Compatibilidade

O novo bloco só amplia a API. Projetos existentes continuam válidos. O bloqueio de overflow ocorre apenas quando o projeto ativa um modo de palco voltado a jogos.
