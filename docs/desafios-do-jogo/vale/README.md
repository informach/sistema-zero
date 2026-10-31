# Proteja os ninhos do Vale dos Dinos

Revisão C01b1 de 30/10/2026: [inventário por atividade](../repertorio-local.md) e
[fontes por bloco](../repertorio-local.json). Intenção editorial não comprova concessão de
blocos. As lacunas de fontes obrigatórias continuam explícitas; não usar opcionais como
repertório universal nem contar estruturas prontas como aprendizagem.

Pacote fase4-05, JavaScript em blocos, formato `arquipelago-desafios` v1, público Kids.
Arquivo: [vale.manifesto.json](vale.manifesto.json). Importação e publicação ficam para outra etapa.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| Proteja os ninhos | Quadro das Cores | 6 | 20 | 10 |
| Mais uma onda | Desafio do dia | Nenhum | 10 | 5 |
| Dois pontos | Desafio do dia | Nenhum | 10 | 5 |
| Mais um ninho | Desafio do dia | Nenhum | 10 | 5 |

Valores derivados de `MOEDAS_PADRAO_POR_TIPO`; ordens 60 a 63; atração `proteja-os-ninhos`.
A busca nos manifestos locais não encontrou outro quadro do Vale. O Admin deve conferir o
cadastro de novo na importação. Revisão C01b de 30/10: os quadros 3 a 5 deixaram a opacidade
(desenho condicionado) e pedem publicação (`publicar: true`). Os quadros 1 e 2 e o Proteja os
ninhos com as variações dependem de lista e laço em grupo, dados do sprite, clique em grupo e
"e" lógico, que nenhum curso em blocos da trilha ensina ainda. Decisão da dona (A43, 31/10/2026):
publicam como estão (`publicar: true`), porque os cursos do Arquiteto chegam antes do lançamento
oficial; o desafio em texto (C02) também. O que cada um espera está em `../publicacao.test.ts`, e a
barreira C01a continua conferindo na importação.

## Cinco quadros complementares (L03)

Nos quadros 1 e 2, o laço Para cada vem montado com o corpo vazio. No primeiro, falta zerar a contagem antes dele e somar dentro. No segundo, falta esconder a mancha da vez. Os demais quadros aplicam escolha, consumo único, estado de onda e conclusão de rodada.

| Quadro | Atividade | Tipo | Moedas | Extra |
| --- | --- | --- | --- | --- |
| 1 | Contagem da lista | Quadro das Cores | 20 | 10 |
| 2 | Cinza retirada | Quadro das Cores | 20 | 10 |
| 3 | Folhas bem usadas | Quadro das Cores | 20 | 10 |
| 4 | Uma onda por vez | Quadro das Cores | 20 | 10 |
| 5 | Rodada conferida | Quadro das Cores | 20 | 10 |

O [manifesto Kids](vale.manifesto.json) e o [manifesto adulto](vale-adulto.manifesto.json)
têm seis quadros e três desafios do dia cada, todos em rascunho. C01b1 preservou projetos,
objetivos e recompensas e retirou o pedido automático de publicação dos quatro itens Kids
anteriores. Nenhum conteúdo foi importado ou publicado nesta entrega.

São atividades em blocos JavaScript, com lacunas de fonte registradas no inventário, sem uma linguagem
nova. O Para cada ainda não aparece nas listas atuais dos cursos: fica preparado como estrutura
do inicial, com grupo/item e corpo vazio conferidos por teste. A pessoa completa apenas as
ações internas já ensinadas. Não há liberação manual desse bloco nem afirmação de conquista.
Na publicação, é necessário conferir a mediação e o vínculo com os cursos efetivamente prontos.

A arte é reaproveitada do principal. O texto e os valores do cenário estão prontos. Os objetivos
observam o comportamento das ações deixadas vazias e aceitam qualquer aparência. Enter é o
extra para uma nova rodada. A prévia usa controles de teclado e toque do Jogo 2D.

Comandos adicionais, na raiz:

```powershell
bun test docs/desafios-do-jogo/vale/quadros-iniciais.test.ts
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/quadros-vale-browser.test.ts
bun docs/desafios-do-jogo/vale/conferir-quadros-browser.ts
```

[Capturas e resultados locais](../../qa/2026-10-30-quadros-vale/README.md).

## O que a criança completa

O cenário, a arte, a lista de ninhos, o desenho, os contadores e Recomeçar estão prontos.
O principal pede três regras: cobrir o ninho tocado, iniciar uma onda sem sobrepor passagens,
e percorrer os ninhos para contar os protegidos e os que receberam cinza. A cobertura dura
uma onda; cada ninho conta uma vez por passagem. A criança escolhe quando começa a onda,
com tempo livre para preparar as folhas. Cinza não destrói ovos nem retira conquistas.

O grupo `ninhos` é a lista de sprites. O dado `protegido` pertence a cada ninho, sem objeto
JavaScript escrito à mão. O desenho já lê essa marca. Os contadores se acumulam na rodada,
e o botão Recomeçar limpa tudo. O extra pede o mesmo reinício ao apertar Enter.

Nas variações, o jogo inicial funciona. Muda uma regra: `totalDeOndas` de 3 para 4; o valor
somado aos pontos de 1 para 2; ou acrescentar `ninho4`, já desenhado, ao grupo. A última
variação não copia regras: o mesmo evento de toque e o mesmo laço atendem ao novo item.

## Posto, blocos e arte

O Vale abre em Arquiteto (`architect`, posição 6), perfil `intermediario-3d`. O pacote usa
somente Jogo 2D e lógica até `intermediario-2d`, sem HTML, CSS, Canvas ou código livre.
A preparação da lista vem no inicial. O Members deriva os tipos acrescentados ao inicial,
excluindo as molduras. Essa régua de acesso é diferente da cobertura pedagógica integral
do inventário C01b1. Não há liberação manual nem prova de que o laço preparado foi aprendido.

SVGs embutidos desenham o vulcão, cinza, ninhos com ovos, folhas e botões. Nenhum arquivo
externo ou Blender. Palco de 640 × 480; ninhos 96 × 96; a cinza começa em y 140 e termina
quando passa de y 330, a 5 unidades por quadro. Três ondas no principal. São parâmetros
propostos para esta brincadeira, não dados sobre vulcões ou animais.

## Conferir

```powershell
bun docs/desafios-do-jogo/vale/gerar-manifesto.ts
bun test docs/desafios-do-jogo/vale/vale.test.ts packages/arquipelago-contracts/tests/manifesto-do-vale.test.ts
# No pacote studio:
bun test src/blockly/__tests__/valeManifest.test.ts
# Na raiz:
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/vale-browser.test.ts
bun docs/desafios-do-jogo/vale/conferir-browser.ts
node --max-old-space-size=8192 packages/studio/node_modules/typescript/bin/tsc --noEmit -p docs/desafios-do-jogo/vale/tsconfig.json
```

O executor usa o runtime oficial e o julgador do core. Cada objetivo passa no gabarito e
falha no inicial; erros do executor não contam como reprovação pedagógica. Mutações verificam
lista ignorada, proteção contada em dobro, cobertura não renovada, onda sobreposta, quantidade
antiga, ponto antigo, quarto ninho fora da lista e Enter sem ação. Nenhum banco é usado.

Plano e resultados: [fase4-05](../../plans/2026-10-29-arquipelago-vale-minijogo.md).

## C02: Guardião dos ninhos em JavaScript textual (30/10/2026)

Aplicação na linguagem do Arquiteto: JavaScript escrito na Ponte (projeto clássico em
`mode: 'bridge'`). Arquivos: [Kids](vale-texto.manifesto.json) e
[adulto](vale-texto-adulto.manifesto.json), um desafio do dia cada (`publicar: false`, ordem 70,
10 e 5 moedas, sem cor). Fontes: `texto-projetos.ts` (o código), `texto-objetivos.ts` e
`gerar-manifesto-texto.ts`. O IR, os blocos e os arquivos saem do próprio Estúdio (parser da
Ponte, gerador com o cabeçalho que o Estúdio grava e Blockly): reabrir na Ponte reconhece o código
como o gerado (`generated-match`). Plano:
[C02](../../superpowers/plans/2026-10-30-arquipelago-c02-python-e-texto.md).

O vale, o caminho em pontos, a torre, o movimento (`andar`), o laço `atualizar` e o desenho estão
prontos. A pessoa completa três funções e o extra:

| Objetivo | Como confere | Erro causal recusado |
| --- | --- | --- |
| Enter chama a primeira onda com três nuvens | tecla e `cinzas.length` | (inicial) |
| Cada onda tem uma nuvem a mais | `quantasNaOnda` com 1, 2 e 5 | onda fixa de três |
| Alcance pela distância, com a borda | `dentroDoAlcance` em quatro casos | `<` em vez de `<=`; só o eixo x |
| Alvo mais adiantado dentro do alcance | `escolherAlvo` com perto, adiantada e longe | primeira da lista; ignora o alcance |
| A torre desfaz uma nuvem na primeira onda | 9 s de jogo e `protegidos` | (inicial) |
| Extra: R recomeça | tecla, `onda` e `cinzas.length` | R sem zerar a onda |

Executor real (`packages/studio-runtime/tests/vale-texto-browser.test.ts`: Chrome local,
`check-objectives.mjs` e o documento do `prepareClassicCheckDocument`, como no Members): 10
execuções e 30 objetivos. O gabarito passa nos 6 (Kids e adulto), o inicial reprova os 6 (Kids e
adulto) e cada um dos seis erros reprova o objetivo que quebra.

```powershell
bun docs/desafios-do-jogo/vale/gerar-manifesto-texto.ts
bun test docs/desafios-do-jogo/vale/vale-texto.test.ts
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/vale-texto-browser.test.ts
```

Os blocos derivados pela Ponte (laço `for of`, objetos, `Math.hypot`, Canvas) só terão fonte quando
os cursos do Arquiteto existirem: até lá a barreira C01a recusaria publicar. O Estúdio de desafio
do jogo abre este projeto na Ponte.
