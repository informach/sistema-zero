# Quadros e fase de plataforma do Pico Gelado

C01d corrigiu as ocorrências compartilhadas de posição e movimento em Pulo com apoio.
Cada peça tem ID próprio no inicial e no gabarito. Código, comportamento e recompensas
não mudaram. O teste `../projetos-validos.test.ts` confere o leitor canônico do Members
nos dois públicos; a importação Blockly é uma prova complementar.

Revisão C01b1 de 30/10/2026: [inventário por atividade](../repertorio-local.md) e
[fontes por bloco](../repertorio-local.json). Intenção editorial não comprova concessão de
blocos. As lacunas de fontes obrigatórias continuam explícitas; não usar opcionais como
repertório universal nem contar estruturas prontas como aprendizagem.

Pacote da fase3-10 e complemento L03, formato `arquipelago-desafios` v1, escopo `ilha`.
Arquivos: [Kids](pico.manifesto.json) e [adulto](pico-adulto.manifesto.json). Plano e decisões:
[2026-10-29-pico-fase-de-plataforma.md](../../superpowers/plans/2026-10-29-pico-fase-de-plataforma.md).
A importação e a publicação no Admin ficam para outra etapa.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| Pulo com apoio | Quadro das Cores | 1 | 20 | 10 |
| A água volta ao começo | Quadro das Cores | 2 | 20 | 10 |
| A próxima fase | Quadro das Cores | 3 | 20 | 10 |
| Fim do jogo | Quadro das Cores | 4 | 20 | 10 |
| De volta à fase 1 | Quadro das Cores | 5 | 20 | 10 |
| Fase de plataforma | Quadro das Cores | 6 | 20 | 10 |
| Pulo alto | Desafio do dia | Nenhum | 10 | 5 |
| Floco de neve | Desafio do dia | Nenhum | 10 | 5 |
| Quedas | Desafio do dia | Nenhum | 10 | 5 |

Os valores vêm de `MOEDAS_PADRAO_POR_TIPO`. Quadro 6 e ordens 60 a 63 seguem a convenção do
Bosque, da Vila e do Recife. O quadro deve estar livre quando o pacote for importado. O principal
dá cor, as variações não. `recompensa.atracao` é `fase-de-plataforma`. Revisão C01b de 30/10:
sem grupo com sprites avulsos, clique em grupo nem opacidade (só apareciam em cursos extras), os
seis quadros, Kids e adulto, têm todas as fontes na trilha e voltam a pedir publicação
(`publicar: true`); as três variações seguem com `publicar: false`. A importação e a barreira
C01a ficam com a equipe. Cada complementar indica a própria atração pelo slug.

## Os quadros 1 a 5: a Fase do Pico (lacunas, 01/11/2026)

A proposta põe no Pico a plataforma com fases do Mestre. Os cinco quadros montam essa fase um
passo de cada vez (`projetoDaFaseEmPassos` em `projetos.ts`, `quadros-iniciais.ts`); cada quadro
traz pronto o que os anteriores fizeram e deixa vazio só o passo dele. Antes eram cinco retomadas
soltas (freio, floco, mochila, passagem), sem o gênero do posto. Só blocos da trilha (Faísca,
Construtor e Inventor); o Python do Mestre fica no quadro 6.

| Quadro | O passo | Conhecimento aplicado | Recusa causal (executor real) |
| --- | --- | --- | --- |
| 1 | Espaço pula só no gelo | Estado de apoio e condição | Pular no ar |
| 2 | A água devolve ao começo e conta a queda | Encontro, reposição e soma | Não contar a queda |
| 3 | A bandeira leva à fase 2 | Dados de fase (onde começa, onde fica a bandeira) | Não mudar de fase |
| 4 | A bandeira da fase 2 termina o jogo | Senão do Se da fase e cena do fim | Terminar já na fase 1 |
| 5 | Enter volta à fase 1 | Restaurar os dados do começo | Esquecer a fase |

Os caminhos dos objetivos (pousar, cair no buraco, chegar à bandeira) são os já medidos no
minijogo da plataforma (`objetivos.ts`). O extra dos quadros 1 a 4 é o Enter recomeçar o jogo; o
do quinto, a seta para cima também pular. Prova:
`packages/studio-runtime/tests/quadros-pico-browser.test.ts` (com `SZ_CHECK_CHROMIUM` apontando
para o Chrome), os cinco quadros com gabarito, inicial e erros.

## O que se completa no principal

Cenário de neve, o pinguim, os dois blocos de gelo com o buraco, a água, a bandeira, a
gravidade, o pouso no gelo e Enter (+ no toque) para recomeçar estão prontos. O pouso compara a
posição do pinguim com a faixa e o topo de cada gelo, com blocos da trilha; a colisão por eixo
em código é matéria do Mestre, em Python. No principal, a pessoa completa:

- o laço: andar com as setas antes de aplicar a velocidade e manter na tela depois;
- o pulo com Espaço (A no toque): velocidade y -12, só com `noChao` verdadeiro;
- a água: cair nela devolve o pinguim ao começo;
- a bandeira, com duas fases (A46, revisão de 31/10/2026): na fase 1, encostar nela passa para a
  fase 2 (`fase` igual a 2, o pinguim volta ao começo e a bandeira sobe para o gelo do alto, de x 20
  a 200 com o topo em y 300, onde o pulo de -12 chega); na fase 2, encostar nela marca `chegou` e
  mostra o recado de fim, uma vez só. Enter volta à fase 1. O placar mostra a fase.

As variações começam com o jogo funcionando e mudam somente uma regra principal:

- Pulo alto: um gelo flutuante com a bandeira em cima; o pulo passa de -9 para -13.
- Floco de neve: completar o contato com o floco já desenhado (`pegouFloco` e somar um; o
  floco só é desenhado enquanto `pegouFloco` é falso).
- Quedas: somar um em `quedas` no contato com a água, que já devolve ao começo.

O extra, separado da regra principal, é a seta para cima também pular, só no gelo.

## Blocos e arte

`ilhas.ts` abre o Pico em `elite`, Mestre dos Jogos, cuja recompensa de blocos é
`intermediario-2d`. O teste do contrato confere os dezoito projetos por público contra a união das listas de
blocos dos cursos dos postos até o Mestre, lidas das pastas de `docs/aulas-interativas`
(Faísca, Construtor, Inventor, Explorador e Mestre). O teste da pasta confere que nenhum bloco
passa de `intermediario-2d`; o único acima do `iniciante-2d` é a conta usada no pouso.
Não há `blocosManuais`, objetos JavaScript, HTML, CSS ou Canvas nos blocos.

O pulo não usa o kit do dino: ele pousa só no chão do palco e desenharia um dinossauro no lugar do
pinguim. Pousar no gelo é a regra que a criança monta, e vale também para o gelo flutuante.

Os SVGs em `projetos.ts` desenham o céu com as montanhas, a água, o pinguim de gorro, o gelo,
a bandeira e o floco. Não há imagem externa, modelo novo ou dependência do Blender.

## Medidas

Palco de 640 × 480. O pinguim mede 44 × 48, começa em (40, 300), cai e fica de pé em y 368. O
primeiro gelo vai de x 0 a 230, o segundo de 320 a 640, os dois com o topo em y 416; o buraco
tem 90. A água começa em y 462. A bandeira fica em (572, 336); no pulo alto, em (470, 190), em
cima do gelo flutuante (380, 270, 150 × 24). O floco fica em (46, 236). Andar: 2 por quadro nas
setas mais a velocidade aplicada, medido no executor em cerca de 0,29 por ms. Pulo: -12 (alto,
-13; o fraco do inicial, -9), gravidade padrão do mundo, 0,6.

Os objetivos não dependem do instante exato: pousar é conferido por `noChao`, a volta da água pelo
recado e por estar perto do começo, e cada objetivo tem um ponto que só passa com a regra pronta
(por isso o inicial reprova todos). Cada desafio cabe no orçamento de 40 s.

## Gerar e conferir

Edite as fontes e regenere o JSON:

```powershell
bun docs/desafios-do-jogo/pico/gerar-manifesto.ts
bun test docs/desafios-do-jogo/pico/pico.test.ts packages/arquipelago-contracts/tests/manifesto-do-pico.test.ts
cd packages/studio; bun test src/blockly/__tests__/picoManifest.test.ts; cd ../..
bun test packages/arquipelago-api/tests/integration/manifestos.test.ts
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/pico-browser.test.ts packages/studio-runtime/tests/quadros-pico-browser.test.ts
bun docs/desafios-do-jogo/pico/conferir-browser.ts
node --max-old-space-size=8192 packages/studio/node_modules/typescript/bin/tsc --noEmit -p docs/desafios-do-jogo/pico/tsconfig.json
```

O teste do executor real fica ignorado sem `SZ_CHECK_CHROMIUM`. Ele usa `check-objectives.mjs`, o
runtime oficial e o julgador do core: cada objetivo passa no gabarito e falha no inicial, e os
casos incorretos (sem gravidade, sem pouso, setas paradas, pulo no ar, água sem volta, bandeira sem
marca, pulo antigo, floco sem contato, floco contado de novo, quedas sem contar, quedas em dobro e
seta sem ação nas quatro versões) também reprovam. A conferência visual prepara a página com Bun e
controla o Chrome com Node e SwiftShader, sem servidor da plataforma, credenciais ou banco.

Relatório e prints: [conferência do Pico](../../qa/2026-10-29-pico-manifesto.md). Celular físico
continua pendente. Nenhum desafio foi cadastrado e nenhum progresso foi alterado.

Complemento L03: [testes e capturas dos cinco quadros](../../qa/2026-10-30-quadros-pico/README.md).

## C02: Fase de plataforma em Python, com fases como dados (30/10/2026)

Aplicação na linguagem do Mestre: Python com Pygame Zero. Desde a revisão de 31/10/2026 (A45) o
tema é da ilha, e não da missão do posto: "A subida do Floco", em que o Floco (`floco` no código)
sobe a montanha um trecho por fase e precisa do cristal de cada trecho. Arquivos:
[Kids](pico-python.manifesto.json) e [adulto](pico-python-adulto.manifesto.json), um desafio do
dia cada (`publicar: false`, ordem 70, 10 e 5 moedas, sem cor). Fontes: `python-projetos.ts` (o
`main.py` e as três fases), `python-objetivos.ts` e `gerar-manifesto-python.ts`; o ambiente fica em
`../ambiente-python.ts`. Plano: [C02](../../superpowers/plans/2026-10-30-arquipelago-c02-python-e-texto.md).

`FASES` é uma lista de fases; cada fase é uma lista de 12 linhas de 16 letras (células de 40
pontos): `#` plataforma, `C` cristal, `S` saída, `J` começo. O laço do jogo (andar, pular, gravidade,
empurrão lateral, cristal, saída e troca de fase) e o desenho estão prontos e usam as funções que a
pessoa completa: `ler_fase` (listas e laços), `pousar` (colisão no eixo y, só caindo e cruzando o
topo) e `proxima_fase` (saída condicionada ao cristal). O extra é acrescentar a terceira fase, só
dados. Sem classes. As três fases do gabarito foram vencidas por um robô simples numa simulação em
CPython com um Pygame Zero de mentira (andar, pular, pegar o cristal e chegar à saída); a fase 3
foi redesenhada depois que essa simulação mostrou uma plataforma tampando o pulo.

| Objetivo | Como confere | Erro causal recusado |
| --- | --- | --- |
| `ler_fase` devolve [coluna, linha] | três casos pequenos | linha e coluna trocadas |
| `pousar` só ao cair cruzando o topo | quatro casos (pousa, ainda não, já abaixo, subindo) | pousa por baixo; pousa ao subir |
| A saída exige o cristal | três casos | sai sem o cristal |
| A fase 1 é montada dos dados | `total_de_plataformas` igual a 29 | (inicial) |
| Extra: a terceira fase | `total_de_fases` pelo menos 3 | (inicial) |

Executor real (`packages/studio-runtime/tests/desafios-python-smoke.ts`, mesmo caminho do Recife:
imagem de produção, `python-mission.mjs`, retrato e julgamento do Members). Em 30/10: 8 execuções
e 24 objetivos, todas com o programa saudável. O gabarito passa nos 5 (Kids e adulto), o inicial
reprova os 5 (Kids e adulto) e cada um dos quatro erros reprova o objetivo que quebra.

```powershell
bun docs/desafios-do-jogo/pico/gerar-manifesto-python.ts
bun test docs/desafios-do-jogo/pico/pico-python.test.ts
bun packages/studio-runtime/tests/desafios-python-smoke.ts --ilha=pico
```

A prova roda na release Python ativa em staging e produção (`2026-10-25-integrated-games-2`),
com a distribuição baixada do runtime de staging (`STUDIO_PYTHON_RUNTIME_HOST` troca o host) e a
imagem publicada do executor em `STUDIO_PYTHON_TEST_IMAGE` (a tag local do deploy de staging, por
exemplo). Ver `../conteudo-por-posto.md`, seção C02.
