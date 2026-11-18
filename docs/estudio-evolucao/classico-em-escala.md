# Clássico em escala (pacote C)

As tabelas abaixo pertencem à sessão inicial no Linux. A continuação registra resultados novos
e condições em [`diagnostico-windows.md`](diagnostico-windows.md). O script atual aceita
`SZ_PROFILE_SAMPLES` (31 por padrão), mantém as amostras no JSON v2, calcula p50/p95 por rodada
e separa a criação da fixture da carga do modelo. Não comparar esses números com as tabelas
históricas como se fossem um antes/depois da mesma máquina.

## C0: quanto custa cada edição de bloco (17/11/2026)

`packages/studio/scripts/profile-js-classic.ts` mede, num Blockly **sem tela**, as etapas que o
`BlocklyPanel` roda a cada edição (depois do agrupador de 120 ms). Base: o jogo final de A Chave
do Farol, com os eventos de "Quando acontecer" repetidos até o tamanho pedido. Mediana de 7
rodadas, em milissegundos, nesta máquina (não compare com números de outra).

```bash
cd packages/studio && bun scripts/profile-js-classic.ts
```

Desde a continuação (18/11/2026) o padrão são 31 rodadas, com p50 e p95, e o `--json` mudou de
formato: era uma lista de resultados e agora é `{ version: 2, resultados, amostras }`. Nenhum script
do repositório lê esse JSON; quem guardou um arquivo do formato antigo precisa ler `resultados`.

| Blocos | Estado (KB) | Linhas de código | Abrir | Serializar | Virar texto | Ler a IR | Diagnósticos | Gerar | **Por edição** |
|---|---|---|---|---|---|---|---|---|---|
| 80 (o Farol) | 8 | 50 | 53 | 0,3 | 0,05 | 0,7 | 3,5 | 1,8 | **6** |
| 512 | 49 | 428 | 44 | 0,4 | 0,1 | 1,8 | 16 | 10 | **28** |
| 2 000 | 192 | 1 730 | 126 | 1,3 | 0,5 | 4 | 50 | 32 | **88** |
| 5 008 | 481 | 4 362 | 384 | 4 | 1,2 | 10 | 121 | 79 | **216** |
| 10 000 | 961 | 8 730 | 1 193 | 9 | 2,5 | 21 | 244 | 168 | **444** |

### O que a medição diz

- O custo cresce em linha reta com o número de blocos: cerca de 0,044 ms por bloco por edição.
- **Diagnósticos são 55% e a geração de código 38%.** Serializar, virar texto e ler a IR somam 7%.
- Nos jogos dos cursos (80 blocos) uma edição custa 6 ms: não há o que otimizar ali, e nada do
  pacote C precisa tocar o que as aulas usam.
- Um quadro de 60 por segundo tem 16 ms: a edição passa disso por volta de 350 blocos, e de
  100 ms (onde a pessoa sente) por volta de 2 300.

### O que muda no plano

O plano previa começar pela IR incremental (C2). A regra era seguir o custo medido e tirar o que
pesa menos de 10%:

- **Saem:** IR incremental (5%) e serialização menor (2%).
- **Entram na frente:** diagnósticos e geração só do que mudou, por filho direto de área, com a
  prova de que o resultado incremental é igual ao inteiro em cada edição (os sete projetos dos
  cursos e as referências de `e2e/fixtures/protected-lessons/` servem de acervo).

### O que esta medição NÃO cobre

- **Desenhar os blocos** (abrir um projeto grande na tela, arrastar, rolar): é do navegador e
  costuma ser o maior custo percebido. O "Abrir" da tabela é só montar o modelo, sem desenho.
- A gravação no IndexedDB, a Ponte (ler o código de volta) e a prévia.
- Aparelhos fracos: os números são de um servidor.

Falta, portanto, a medição no navegador (`e2e/classic-scale.spec.ts`, não escrito) antes de
decidir a montagem sob demanda (C3).

## C1: o perfil de CPU, e o que ele mudou (17/11/2026)

O perfil de CPU do mesmo script (`SZ_PROFILE_BLOCKS=5000 bun --cpu-prof scripts/profile-js-classic.ts`)
mostrou que o custo não pedia cache: pedia tirar trabalho repetido.

| Onde | O que era | Peso no perfil | O que mudou |
|---|---|---|---|
| Geração (`generators/js.ts`) | `treeHasStatementType` andava a árvore inteira para cada tipo perguntado, dezenas de vezes por edição | 79% da geração | `statementTypesIn`: uma varredura, depois é consulta a um conjunto |
| Diagnósticos (`ir/schema.ts`) | `createCanvas3DStatementContextIndex` copiava a tabela de símbolos três vezes por corpo de bloco, em todo projeto | 36% dos diagnósticos | só é montado quando o programa importa classes do three (`programImportsThreeClasses`); sem o import ele sairia vazio |
| Diagnósticos (`ir/programmingReferences.ts`) | as cópias criavam listas intermediárias | parte dos 40% de `cloneSymbols` | laços diretos |

Nenhuma das três muda resultado: são o mesmo cálculo, feito uma vez. Provas: 7 437 testes do IR,
dos geradores, dos blocos, dos parsers e das extensões (as 4 falhas da suíte de extensões são as
mesmas sem a mudança); `ir/__tests__/canvas3dIndexShortcut.test.ts` confere, em todos os exemplos
oficiais e nos projetos dos cursos, que o índice de verdade sai vazio quando o atalho é usado; e
as aulas protegidas geram o mesmo código, linha por linha.

### Antes e depois (mesma sessão, mesma máquina, mediana de 7, em ms por edição)

| Blocos | Diagnósticos antes | depois | Gerar antes | depois | **Por edição antes** | **depois** |
|---|---|---|---|---|---|---|
| 80 (o Farol) | 3,5 | 2,8 | 1,8 | 0,9 | **6** | **5** |
| 512 | 16 | 10 | 10 | 2,7 | **28** | **15** |
| 2 000 | 50 | 29 | 32 | 7,6 | **88** | **43** |
| 5 008 | 121 | 71 | 79 | 18 | **216** | **106** |
| 10 000 | 244 | 127 | 168 | 40 | **444** | **199** |

A edição passa de 100 ms por volta de 4 700 blocos (era 2 300).

### O que sobra, pelo perfil de agora (5 mil blocos)

- Diagnósticos são 68% da edição. Dentro deles: a validação de referências 45% (com 30% em
  cópias da tabela de símbolos, uma por corpo de bloco), o parse do zod 15% a 20%, as regras de
  ciclo de vida 10%.
- Geração: 17%. Ler a IR: 10%.

Próximo alvo, se for preciso descer mais: a tabela de símbolos em camadas (sem copiar os nomes
implícitos a cada corpo) e o parse estrutural guardado por filho de área. A memória por raiz na
geração, que o plano previa (C4), **sai**: a geração deixou de ser o gargalo.

## C5: o perfil no navegador (17/11/2026)

`packages/studio/e2e/classic-scale.spec.ts` abre o dia 3 de A Chave do Farol com os eventos
repetidos (`/aula?…&escala=N`), edita um campo de número e arrasta a área "Ao iniciar". Chromium
153 **sem interface e sem placa de vídeo**, tela de 1440 por 900.

```bash
cd packages/studio && PW_CHROMIUM=/opt/pw-browsers/chromium bunx playwright test e2e/classic-scale.spec.ts --project=chromium --trace off
```

| Blocos | Abrir e desenhar | Editar um campo (tarefas longas) | Arrastar uma área (tarefas longas, maior) |
|---|---|---|---|
| 70 (o curso) | 1,7 s | nenhuma | nenhuma |
| 502 | 2,2 s | nenhuma | 202 ms (82 ms) |
| 2 002 | 4,8 s | 69 ms | 1 926 ms (717 ms) |
| 5 002 | 18,2 s | 605 ms | 10 900 ms (3 105 ms) |

Onde o tempo vai (contadores do navegador, 2 mil blocos, 38 mil nós na página, 19 por bloco):

| | Script | Estilo | Layout | Total da tarefa |
|---|---|---|---|---|
| Abrir | 2 308 ms | 626 ms | 308 ms | 3 886 ms |
| Arrastar | 46 ms | 10 ms | 5 ms | 493 ms |

- **Arrastar não é JavaScript**: de 493 ms, 46 são script. O resto é pintura do SVG. Um perfil
  de CPU do arrasto confirmou: 130 ms de script, metade do próprio Playwright.
- **Editar um campo ficou barato** depois do C1: nenhuma tarefa longa até 500 blocos.
- **Abrir** cresce mais rápido que o número de blocos (2,2 s para 4,8 s para 18 s).

### O que isso decide

O que sobra de escala no Clássico é **quantidade de nós desenhados**, não processamento. O remédio
é desenhar menos: a montagem sob demanda (recolher o que está longe da tela), que o Python
Clássico já tem em `python/blocks/programNavigation.ts`. Ela entra só acima de um limiar e
**nunca em aula**: nos cursos (70 blocos) não há nada a ganhar e o robô acha os blocos pelo texto
na tela.

### Ressalvas desta medição

- Sem placa de vídeo, a pintura aqui é por software: num computador comum o arrasto deve custar
  menos, e num tablet fraco pode custar mais. Os números servem para comparar antes e depois
  nesta máquina, não como orçamento.
- O arrasto variou entre rodadas (493 ms numa, 1 926 ms noutra, com 2 mil blocos).
- Os tamanhos grandes são o Farol repetido: muitos eventos iguais lado a lado numa área só. Um
  projeto de verdade tem outra distribuição.
- O Playwright não devolve um objeto com centenas de blocos encadeados (a serialização dele
  estoura e acusa uma navegação que não houve): o teste lê o projeto como texto.

## Estado

| Item | Estado |
|---|---|
| C0 perfil sem tela | **feito** |
| C0 perfil no navegador | feito no C5; a gravação no IndexedDB segue sem medir |
| C1 perfil de CPU e os três desperdícios tirados | **feito** |
| C2 acervo de equivalência para caches | não foi preciso (nenhum cache entrou); a prova do atalho está em `canvas3dIndexShortcut.test.ts` |
| C3 diagnósticos por diferença, tabela de símbolos em camadas | pendente |
| C4 memória por raiz na geração | saiu do plano |
| C5 perfil no navegador | **feito** (sem placa de vídeo) |
| Montagem sob demanda no JavaScript (fora das aulas) | pendente; é o próximo passo de escala |
