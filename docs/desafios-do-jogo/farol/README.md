# Projeto autoral do Farol

C03b de 30/10/2026. Depois do final do Farol, a régua da Jornada para o posto Lenda pede
"projeto com critérios explícitos e escopo pequeno, aproveitando aprendizagens anteriores", sem
linguagem nova ([conteúdo por posto](../conteudo-por-posto.md)). Um desafio só, opcional, em
blocos do Jogo 2D: "Meu jogo do Arquipélago".

Arquivos para importar: `farol.manifesto.json` (Kids) e `farol-adulto.manifesto.json` (adulto).
Quadro 1 da ilha `farol`, 20 moedas e 10 no extra, `cor: false` (o Farol não pinta nada) e a
atração `meu-jogo-do-arquipelago`: aprovado, o jogo da pessoa vai para o fliperama da casa.

O projeto inicial traz o palco, o guia e cinco desenhos (guia, estrela, farol, concha e Lumi). Os
critérios são a lista de objetivos:

| Critério | Como é conferido |
| --- | --- |
| A seta para a direita leva o guia pelo palco | Executor real: o guia passa de x 100 |
| Algo acontece quando o guia encontra outro desenho | Causal: um encontro do guia com efeito que roda |
| No encontro, o jogo guarda uma informação | Causal: uma variável do início recebe outro valor no encontro |
| Um Se usa essa informação para decidir o que acontece | Causal: depois da lembrança, o Se escolhe um ramo que age e antes não agia |
| Uma tecla recomeça o jogo | Causal: recomeçar que roda dentro de uma tecla |
| Extra: algo sai da tela quando é pego | Causal: tirar um desenho, em código que roda, dentro do encontro |

"Causal" é a regra `gameCausality` do core (`packages/core/src/learning/game-causality.ts`, revisão
de 30/10/2026). Antes eram regras de presença de bloco, e um projeto com cada evento dentro de um
`Se falso` passava em todas. Agora o código atrás de condição constante (`Se falso`, `Se x e
falso`), num laço que repete zero vezes ou desativado não conta; o teste traz esses negativos:
tudo em `Se falso`, encontro morto, condição que nunca produz a consequência, Se ao contrário da
lembrança e tecla que não reinicia.

Nenhum critério pede nome de variável, desenho ou regra pronta. O gabarito (levar a estrela até
o farol para acender) é só um exemplo; o teste confere que outra ideia, com outros nomes e
desenhos, também cumpre. Todos os blocos vêm da trilha do Faísca, para valer a qualquer pessoa
que chegou ao fim.

No jogo, o cavalete fica do lado oeste do Farol, fora dos lotes da casa e longe da porta e da
Íris (`QUADRO_DO_FAROL`), e só aparece depois do final (`farol.concluido`). O painel mostra só
esse quadro.

```powershell
bun docs/desafios-do-jogo/farol/gerar-manifesto.ts
bun test docs/desafios-do-jogo/farol
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
cd packages/studio-runtime; bun test tests/farol-autoral-browser.test.ts --timeout 900000
```
