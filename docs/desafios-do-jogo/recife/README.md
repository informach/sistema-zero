# Quadros e Mira de bolhas do Recife Coral

Revisão C01b1 de 30/10/2026: [inventário por atividade](../repertorio-local.md) e
[fontes por bloco](../repertorio-local.json). Intenção editorial não comprova concessão de
blocos. As lacunas de fontes obrigatórias continuam explícitas; não usar opcionais como
repertório universal nem contar estruturas prontas como aprendizagem.

Pacote da fase3-05 e complemento L03, formato `arquipelago-desafios` v1, escopo `ilha`.
Arquivos separados: [Kids](recife.manifesto.json) e [adulto](recife-adulto.manifesto.json).
A importação e a publicação no Admin ficam para outra etapa.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| Uma bolha por vez | Quadro das Cores | 1 | 20 | 10 |
| Alvo preso conta ponto | Quadro das Cores | 2 | 20 | 10 |
| O alvo muda de lugar | Quadro das Cores | 3 | 20 | 10 |
| Tempo de partida | Quadro das Cores | 4 | 20 | 10 |
| Nova partida | Quadro das Cores | 5 | 20 | 10 |
| Mira de bolhas | Quadro das Cores | 6 | 20 | 10 |
| Bolha rápida | Desafio do dia | Nenhum | 10 | 5 |
| Dois pontos | Desafio do dia | Nenhum | 10 | 5 |
| Outro alvo | Desafio do dia | Nenhum | 10 | 5 |

Os valores vêm de `MOEDAS_PADRAO_POR_TIPO`. Quadro 6 e ordens 60 a 63 seguem a convenção
do Bosque e da Vila. O quadro deve estar livre quando o pacote for importado. O principal
dá cor, as variações não. `recompensa.atracao` identifica `mira-de-bolhas`, como nos outros
minijogos. Os complementares usam a própria atração por slug e `publicar: false`.
Revisão C01b de 30/10: sem opacidade nem clique em grupo (só apareciam em cursos extras), os
seis quadros, Kids e adulto, têm todas as fontes na trilha e voltam a pedir publicação
(`publicar: true`); as três variações continuam com `publicar: false`. A importação e a
barreira C01a ficam com a equipe. Nenhum deles foi importado nesta entrega.

## Os quadros 1 a 5: a Mira do Recife (lacunas, 01/11/2026)

A proposta põe no Recife o jogo de mira e alvos do Explorador, com sorteio de lugar, tempo de
partida e pontos. Os cinco quadros montam esse jogo um passo de cada vez
(`quadros-iniciais.ts`); cada quadro traz pronto o que os anteriores fizeram e deixa vazio só o
passo dele. Antes eram cinco retomadas soltas (corrente, cesta, corais, bolha e chave), sem o
gênero do posto. Só blocos da trilha (Faísca, Construtor e Inventor).

| Quadro | O passo | Conhecimento aplicado | Recusa causal (executor real) |
| --- | --- | --- | --- |
| 1 | Espaço solta uma bolha por vez | Estado de voo e condição | Soltar com outra subindo |
| 2 | A bolha presa no alvo conta um ponto | Encontro, estado e soma | Não liberar a próxima bolha |
| 3 | O alvo volta num lugar sorteado | Sorteio e reposição | O alvo fica no mesmo lugar |
| 4 | O relógio acaba a partida | Relógio, contagem regressiva e fim | Soltar bolha depois do fim |
| 5 | Enter começa outra partida | Restaurar o estado do começo | Esquecer de encher o tempo |

A partida dura 8 s (`TEMPO_DA_PARTIDA`), para caber nas esperas do executor (até 10 s por
passo). O extra dos quadros 1 a 4 é o Enter recomeçar o jogo; o do quinto, o recorde guardar a
melhor partida antes de zerar. Prova: `packages/studio-runtime/tests/quadros-recife-browser.test.ts`
(com `SZ_CHECK_CHROMIUM` apontando para o Chrome), os cinco quadros com gabarito, inicial e erros.

## O que se completa no principal

Cenário, imagens, textos e placar estão prontos. No principal, a pessoa completa quatro
regras: mover a mira horizontalmente, soltar uma bolha para cima com Espaço (A no toque),
prender o alvo no contato e contar uma vez. A bolha que erra não pontua; ao sair pelo alto,
libera outra tentativa. Enquanto uma bolha sobe, Espaço não lança outra.

O alvo preso troca de imagem (o alvo dentro da bolha) e a bolha é encaixada ao redor dele.
Acertar o mesmo alvo de novo não aumenta os pontos. A bolha só é desenhada em jogo
(`bolhaVisivel`).

As variações começam com o jogo funcionando e mudam somente uma regra principal:

- Bolha rápida: velocidade vertical de -5 para -8.
- Dois pontos: cada captura passa a somar 2, preservando a contagem única.
- Outro alvo: completar o contato com `alvoNovo`, já desenhado, usando `novoPreso`.

O extra, separado da regra principal, é Enter (+ no toque) recomeçar a rodada. É uma
aplicação do evento de teclado conhecido. Os objetivos observam o comportamento das regras
que faltam completar. Não premiam a montagem do cenário nem exigem trocar a arte.

## Blocos e arte

`ilhas.ts` abre o Recife em `explorer`, Explorador. Os testes conferem todos os blocos dos
dezoito projetos de cada público contra as listas de cursos disponíveis até esse posto: Cadê Todo Mundo,
A Chave do Farol, A Ilha do Farol, O Jardim Secreto, Nave Contra Asteroides, O Jogo do Meu
Jeito e Corre, Dino. O principal mantém `iniciante-2d`; os complementares também usam
a aritmética de `intermediario-2d` já ensinada no Inventor, antes de entrar no Explorador.
Não há novos `blocosManuais`, objetos JavaScript, HTML, CSS ou Canvas nos blocos.

O teste de cobertura usa as listas versionadas, não concede conquistas. Na importação futura,
a análise do Members continua conferindo o currículo publicado e os blocos de cada pessoa.
Os arquivos de execução são gerados pelo Estúdio a partir do IR e são iguais aos regenerados
pelo Blockly. SVGs em `projetos.ts` desenham água, corais, lançador, bolha, estrela, concha e
os dois alvos presos na bolha. Não há imagem externa, modelo novo ou dependência do Blender.

## Medidas e verificações

Palco de 640 × 480, mira inicial em (72, 360), velocidade horizontal 3. A bolha começa
em y 340, alinhada à mira, e sobe com velocidade -5 ou -8. O alvo principal está em
(430, 120); o novo, em (190, 120). Ambos medem 56 × 56, dentro da bolha de 64 × 64.
As instruções ficam embaixo, fora da área dos controles de toque.

O teste de lançamento usa uma faixa sem alvo. O teste de captura usa outra tentativa,
evitando exigir que a bolha continue em voo depois de já acertar. A variação rápida observa
movimento, velocidade menor que -5 e captura real, sem depender de um instante exato de contato.
O extra do segundo alvo captura os dois antes de conferir o reinício. Cada objetivo respeita
os limites do executor, incluindo oito checkpoints, e o conjunto cabe no orçamento de 40 s.

## Gerar e conferir

Edite as fontes e regenere o JSON:

```powershell
bun docs/desafios-do-jogo/recife/gerar-manifesto.ts
bun test docs/desafios-do-jogo/recife/recife.test.ts packages/arquipelago-contracts/tests/manifesto-do-recife.test.ts packages/studio/src/blockly/__tests__/recifeManifest.test.ts
bun test packages/arquipelago-api/tests/integration/manifestos.test.ts
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/recife-browser.test.ts packages/studio-runtime/tests/quadros-recife-browser.test.ts
bun docs/desafios-do-jogo/recife/conferir-browser.ts
bun docs/desafios-do-jogo/recife/conferir-quadros-browser.ts
node --max-old-space-size=8192 packages/studio/node_modules/typescript/bin/tsc --noEmit -p docs/desafios-do-jogo/recife/tsconfig.json
```

Em Linux, aponte `SZ_CHECK_CHROMIUM` para o Chromium instalado. O teste nativo fica explicitamente
ignorado quando essa variável não existe. Ele usa `check-objectives.mjs`, runtime oficial e
julgador do core: cada objetivo deve passar no gabarito e falhar no inicial. Objetivo inválido,
lista vazia, erro no jogo ou indisponibilidade do executor são falhas do ensaio, não reprovações
pedagógicas válidas.

Os casos incorretos cobrem mira parada, bolha descendo, contatos ausentes, pontuação repetida,
ponto sem acerto, relançamento em voo, velocidade antiga, valor antigo e Enter sem ação.
O HTTP usa repositório em memória e uma porta Members falsa, separadamente da prova real.
A conferência visual prepara a página com Bun e controla o navegador com Node, sem servidor
da plataforma, credenciais ou banco. Testa teclado e toque emulado, captura e reinício.

Relatório e prints: [conferência do Recife](../../qa/2026-10-29-recife-manifesto.md).
A apresentação em celular físico continua pendente. Nenhum desafio foi cadastrado e nenhum
progresso foi alterado.

Complemento L03: [conferência dos cinco quadros](../../qa/2026-10-30-quadros-recife/README.md).

## C02: Mira de bolhas em Python (30/10/2026)

Aplicação na linguagem do Explorador: Python com Pygame Zero. Desde a revisão de 31/10/2026 (A45)
o tema é da ilha, e não da missão do posto: a Maré solta bolhas com mudas de coral na lagoa, cada
clique na bolha planta a muda (`plantadas`) e a bolha seguinte sobe de um dos três corais
(`sortear_coral`). Arquivos: [Kids](recife-python.manifesto.json) e
[adulto](recife-python-adulto.manifesto.json), um desafio do dia cada (`publicar: false`, ordem
70, 10 e 5 moedas, sem cor). Fontes: `python-projetos.ts` (o `main.py`), `python-objetivos.ts` e
`gerar-manifesto-python.ts`; o ambiente fica em `../ambiente-python.ts`. Plano:
[C02](../../superpowers/plans/2026-10-30-arquipelago-c02-python-e-texto.md).

Repertório do posto, sem listas e sem classes: a bolha é um `Rect` do Pygame Zero, os três corais
saem de um `if/elif` com `random.randint(1, 3)` e tudo é desenhado com `screen.draw`, sem
imagens. O mar, os corais, a bolha, o placar e o estado inicial estão prontos. A pessoa completa
`on_mouse_down`, `sortear_coral` e `update`; `on_key_down` (R) é o extra.

| Objetivo | Como confere | Erro causal recusado |
| --- | --- | --- |
| Clique na bolha soma, clique na água não | clique na água, clique na bolha, `plantadas` igual a 1 | conta qualquer clique |
| A bolha vai para um coral | clique na bolha, `bolha.y` no máximo 120 | a bolha não muda de lugar |
| O relógio conta | 1,5 s e `tempo` diminui | relógio parado |
| O tempo acaba e os cliques param | acerto, 9,5 s (a rodada tem 7) e cliques nos três corais, `plantadas` igual a 1 | rodada sem fim |
| Extra: R recomeça | acerto, R e clique na areia, `plantadas` igual a 1 | R sem voltar a bolha |

Executor real (`packages/studio-runtime/tests/desafios-python-smoke.ts`): a imagem de produção do
studio-runtime roda `python-mission.mjs` sem rede, com a distribuição construída do vendor
verificado; o retrato sai do `preparePythonExecutionSnapshot` e o julgamento é o
`judgePythonProjectExecution`, os mesmos do `PythonProjectCheckerService`. Em 30/10: 9 execuções e
25 objetivos, todas com o programa saudável (`status: passed`, sem erros). O gabarito passa nos 5
(Kids e adulto), o inicial reprova os 5 (Kids e adulto) e cada um dos cinco erros reprova o
objetivo que quebra.

```powershell
bun docs/desafios-do-jogo/recife/gerar-manifesto-python.ts
bun test docs/desafios-do-jogo/recife/recife-python.test.ts
$env:STUDIO_PYTHON_TEST_IMAGE='<imagem publicada do studio-runtime>'
bun packages/studio-runtime/tests/desafios-python-smoke.ts --ilha=recife
```

A prova roda na release Python ativa em staging e produção (`2026-10-25-integrated-games-2`),
com a distribuição baixada do runtime de staging (`STUDIO_PYTHON_RUNTIME_HOST` troca o host) e a
imagem publicada do executor em `STUDIO_PYTHON_TEST_IMAGE` (a tag local do deploy de staging, por
exemplo). Ver `../conteudo-por-posto.md`, seção C02.
