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
| O jogo combina os três postos de blocos (Lenda) | Causal: decisão do Faísca, grupo criado por relógio com encontro do Construtor, gravidade com pulo do Inventor |
| Extra: versão 2 | Serviço do jogo: um envio que passa depois da aprovação, com o jogo mudado em relação ao aprovado |

"Causal" é a regra `gameCausality` do core (`packages/core/src/learning/game-causality.ts`, revisão
de 30/10/2026). Antes eram regras de presença de bloco, e um projeto com cada evento dentro de um
`Se falso` passava em todas. Agora o código atrás de condição constante (`Se falso`, `Se x e
falso`), num laço que repete zero vezes ou desativado não conta; o teste traz esses negativos:
tudo em `Se falso`, encontro morto, condição que nunca produz a consequência, Se ao contrário da
lembrança e tecla que não reinicia.

Nenhum critério pede nome de variável, desenho ou regra pronta. O gabarito é só um exemplo: o
guia corre e pula como o Dino, pedras criadas por relógio rolam pelo chão, e levar a estrela até
o farol acende a luz. O teste confere que outra ideia, com outros nomes e desenhos, também cumpre.
Os blocos vêm dos três postos de blocos (Faísca, Construtor e Inventor).

## A Lenda (lacunas, 01/11/2026)

A Jornada pede, no projeto autoral, "definir público, objetivo e três funcionalidades", "combinar
mecânicas já aprendidas", "testar com outra pessoa", "entregar versão 2" e "uma revisão humana por
projeto final, com retorno acionável e nova tentativa". No jogo:

- **Combinação:** nos blocos e na Ponte, o critério `combina` (regra `gameCausality`, passo
  `combination`, no core) confere as mecânicas dos três postos de blocos em código que roda.
- **Ficha:** no Python e no Pro, o jogo começa só com a janela e o guia andando, sem estrela nem
  pontos; a ficha no começo do código guarda o objetivo e as três funcionalidades. Os critérios
  automáticos valem para qualquer ideia: a ficha preenchida, o jogo que aguenta setas, espaço e
  clique sem erro, e o R que leva o guia de volta ao começo. Julgar o jogo inventado é da equipe.
- **Versão 2:** `recompensa.extraNaVersao2`. O extra vale num envio que passa depois da aprovação,
  com o jogo mudado em relação ao aprovado guardado no fliperama (mover um bloco ou salvar de novo
  não conta). O serviço compara antes de guardar o envio novo (`eVersao2`, `domain/desafios.ts`).
- **Revisão humana:** `recompensa.revisaoHumana`. Cada envio aprovado entra na fila "Projetos da
  Lenda" da Sala do Professor (`/admin/professor/lenda`, tabela `revisoes_humanas`, migration
  0025). A equipe joga a cópia aprovada e responde `conferido` ou `nova-tentativa` com um retorno;
  o número do envio trava a resposta (um envio novo antes dela dá 409). A pessoa vê o estado e o
  retorno no cartão do Farol, e o botão vira "Fazer a versão 2" enquanto o extra não sai.

## Em cada linguagem conquistada (A29, revisão de 31/10/2026)

Na Lenda, o projeto autoral vem em quatro variantes, uma por linguagem, e a pessoa escolhe entre
as que já abriram. Todas são quadros do Farol, nenhuma pinta e todas vão para o fliperama:

| Quadro | Linguagem | Arquivo | Abre com o curso-base de |
| --- | --- | --- | --- |
| 1 | Blocos | `farol.manifesto.json` | (nenhum, só os blocos) |
| 2 | Python (Pygame Zero) | `farol-python.manifesto.json` | Explorador |
| 3 | JavaScript na Ponte | `farol-ponte.manifesto.json` | Arquiteto |
| 4 | Pro (TypeScript e Vite) | `farol-pro.manifesto.json` | Gênio |

O curso-base vem de `postoDoCursoBase` (contrato): nas outras ilhas é o posto da ilha; no Farol, o
posto onde a linguagem começa. O painel do Farol mostra as quatro e marca a da linguagem mais nova
já aberta (`quadroSugeridoNoFarol`), enquanto nenhuma foi feita. O enunciado é o pedido da Íris.

A Ponte é o mesmo projeto dos blocos, lido do JavaScript, com os mesmos critérios causais. No
Python e no Pro, o cenário é aberto (seção "A Lenda"): os critérios rodam o jogo de verdade e
leem a ficha, o jogo jogado com setas, espaço e clique, e o guia depois do R. O andar vem pronto
porque é ele que separa recomeçar de nunca ter saído do lugar. O executor real recusa a ficha
vazia, um jogo que quebra no espaço e um R que não recomeça.

```powershell
bun docs/desafios-do-jogo/farol/gerar-manifesto-linguagens.ts
bun test docs/desafios-do-jogo/farol
bun packages/studio-runtime/tests/desafios-python-smoke.ts --ilha=farol
bun packages/studio-runtime/tests/desafios-pro-smoke.ts --ilha=farol
```

Importar o `farol.manifesto.json` (quadro 1) e depois os três das linguagens.

## Conferência antes da publicação (01/11/2026)

No Python e no Pro, setas, espaço e clique são exercitados dentro do objetivo de recomeçar.
Rodar sem erro é uma condição de segurança da execução, não uma conquista separada: a janela
inicial já roda sem erro. A posição depois do R precisa mostrar o reinício que a pessoa
implementou. O inicial continua válido e jogável, sem defeito artificial para reprovar.
