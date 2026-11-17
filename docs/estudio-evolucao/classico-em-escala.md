# Clássico em escala (pacote C)

## C0: quanto custa cada edição de bloco (17/11/2026)

`packages/studio/scripts/profile-js-classic.ts` mede, num Blockly **sem tela**, as etapas que o
`BlocklyPanel` roda a cada edição (depois do agrupador de 120 ms). Base: o jogo final de A Chave
do Farol, com os eventos de "Quando acontecer" repetidos até o tamanho pedido. Mediana de 7
rodadas, em milissegundos, nesta máquina (não compare com números de outra).

```bash
cd packages/studio && bun scripts/profile-js-classic.ts
```

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

## Estado

| Item | Estado |
|---|---|
| C0 perfil sem tela | **feito** |
| C0 perfil no navegador (desenho, arrasto, gravação) | pendente |
| C1 perfil de CPU e os três desperdícios tirados | **feito** |
| C2 acervo de equivalência para caches | não foi preciso (nenhum cache entrou); a prova do atalho está em `canvas3dIndexShortcut.test.ts` |
| C3 diagnósticos por diferença, tabela de símbolos em camadas | pendente |
| C4 memória por raiz na geração | saiu do plano |
| C5 perfil no navegador e montagem sob demanda | pendente |
