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
| Algo acontece quando o guia encontra outro desenho | Estrutura: um encontro nos eventos |
| No encontro, o jogo guarda uma informação | Estrutura: guardar um valor dentro do encontro |
| Um Se decide o que acontece | Estrutura: um Se nos eventos |
| Uma tecla recomeça o jogo | Estrutura: recomeçar dentro de uma tecla |
| Extra: algo sai da tela quando é pego | Estrutura: tirar um desenho dentro do encontro |

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
