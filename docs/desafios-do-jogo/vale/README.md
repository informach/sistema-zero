# O Guardião dos ninhos do Vale dos Dinos

Lacunas de 01/11/2026 (pela proposta e pela Jornada): o Vale é a defesa de torre do Arquiteto
(ondas, caminho e alcance). Os desafios em blocos foram refeitos como o **Guardião dos ninhos**
(`projetos.ts`), só com blocos da trilha (Faísca, Construtor e Inventor): a cinza do vulcão
desce pelo caminho em ondas (grupo e relógio), a torre limpa a cinza que entra no alcance dela
(encontro do alcance com o grupo) e a que passa atinge o ninho. Saíram o "Proteja os ninhos" e
os quadros de lista, que pediam lista, laço em grupo, clique em grupo, dados no sprite,
opacidade e "e" lógico, blocos que nenhum posto ensina (a decisão A43 deixou de valer). O
JavaScript do Arquiteto fica no quadro 6 (`gerar-manifesto-texto.ts`).

| Quadro | Atividade | O passo | Recusa causal (executor real) |
| --- | --- | --- | --- |
| 1 | Uma onda de cada vez | Espaço começa uma onda por vez | Começar outra durante a onda |
| 2 | O relógio da onda | O relógio solta a cinza e a onda acaba | Onda que nunca acaba |
| 3 | A cinza no ninho | A cinza que chega ao ninho sai e é contada | Não contar |
| 4 | O alcance da torre | A torre limpa a cinza do alcance e conta o ponto | Cinza que passa pela torre |
| 5 | Ondas que crescem | Cada onda tem uma cinza a mais | Onda de tamanho fixo |

Desafios do dia (ordens 60 a 63, 10 e 5 moedas, sem cor, atração `guardiao-dos-ninhos`), cada um
mudando uma regra do Guardião pronto: ondas maiores, dois pontos por cinza, só três ondas e
bônus de onda limpa. O extra de todos é o Enter recomeçar a defesa. Provas:
`packages/studio-runtime/tests/quadros-vale-browser.test.ts` e `vale-browser.test.ts` (com
`SZ_CHECK_CHROMIUM` apontando para o Chrome).

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
