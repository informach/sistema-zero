# Jardim que floresce, minijogo da Ilha das Nuvens

Revisão C01b1 de 30/10/2026: [inventário por atividade](../repertorio-local.md) e
[fontes por bloco](../repertorio-local.json). Intenção editorial não comprova concessão de
blocos. As lacunas de fontes obrigatórias continuam explícitas; não usar opcionais como
repertório universal nem contar estruturas prontas como aprendizagem.

Pacote da fase4-10, formato `arquipelago-desafios` v1, escopo `ilha`, público `kids`.
O arquivo de entrega é [nuvens.manifesto.json](nuvens.manifesto.json). Plano e decisões:
[2026-10-29-arquipelago-jardim-que-floresce.md](../../plans/2026-10-29-arquipelago-jardim-que-floresce.md).
A importação e a publicação no Admin ficam para outra etapa.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| Jardim que floresce | Quadro das Cores | 6 | 20 | 10 |
| Rega forte | Desafio do dia | Nenhum | 10 | 5 |
| Sol forte | Desafio do dia | Nenhum | 10 | 5 |
| Chuva | Desafio do dia | Nenhum | 10 | 5 |

Os valores vêm de `MOEDAS_PADRAO_POR_TIPO`. Quadro 6 e ordens 60 a 63 seguem a convenção dos outros
pacotes; o quadro deve estar livre quando o pacote for importado. O principal dá cor, as variações
não. `recompensa.atracao` é `jardim-que-floresce`. Revisão C01b de 30/10: sem botões em grupo,
"e" lógico nem opacidade (só apareciam em cursos extras ou fora da trilha), o Jardim e os quadros
1 a 4 pedem publicação (`publicar: true`). Lacunas de 01/11/2026 (pela proposta e pela Jornada):
os quadros 1 a 5 foram refeitos como o Jardim em grade, só com blocos da trilha, e nada mais espera
curso que não ensina o bloco (a decisão A43 deixou de valer). Não houve publicação remota.

## Os quadros 1 a 5: o Jardim em grade (lacunas, 01/11/2026)

A proposta e a Jornada põem nas Nuvens a construção e gestão de um mundo do Gênio (grade,
ocupação, custo e produção). Os cinco quadros montam o Jardim em grade (`jardim-em-grade.ts`)
um passo de cada vez: três canteiros lado a lado, as teclas 1, 2 e 3 escolhem o canteiro (pronto
no cenário) e cada quadro traz pronto o que os anteriores fizeram. Sem lista: um Se por canteiro.
Antes eram retomadas soltas (reserva, luz, canteiros, recursos) e uma colheita com lista e laço em
grupo, que nenhum posto ensina em blocos. A grade em arquivos e o salvar o jardim ficam no Pro
(quadro 6).

| Quadro | Atividade | O passo | Recusa causal (executor real) |
| --- | --- | --- | --- |
| 1 | Plantar com moedas | Plantar custa 2 moedas; sem saldo, não planta | Plantar sem moedas |
| 2 | Canteiro ocupado | Canteiro com planta recusa outra e não cobra | Plantar por cima |
| 3 | A produção do jardim | Cada canteiro plantado rende 1 moeda por segundo | Sem produção |
| 4 | Colher os canteiros | C colhe os plantados, conta e esvazia | Colher sem esvaziar |
| 5 | A meta do jardim | Com 20 moedas, a meta, uma vez | Meta que nunca chega |

O extra de todos é o Enter recomeçar o jardim. Prova:
`packages/studio-runtime/tests/quadros-nuvens-browser.test.ts` (com `SZ_CHECK_CHROMIUM` apontando
para o Chrome), os cinco quadros com gabarito, inicial e erros.

Comandos adicionais, na raiz:

```powershell
bun test docs/desafios-do-jogo/nuvens/quadros-iniciais.test.ts
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/quadros-nuvens-browser.test.ts
```

[Capturas e resultados locais](../../qa/2026-10-30-quadros-nuvens/README.md).

## Simulação e variáveis

O jardim do céu da Iriê (proposta: "Jardim que floresce: simulação e variáveis") é uma simulação de
passo fixo com quatro variáveis: `agua`, `sol`, `tempo` e `crescimento`, mais a marca `florida`.

- Começo: 0 de água, 3 de sol, tempo 0, crescimento 0.
- Regar guarda 3 de água; Sol guarda 3 de sol.
- A cada 1 segundo: o tempo aumenta 1; se há água e sol, a flor cresce 10 e gasta 1 de cada. Com
  100, o jardim floresce uma vez e o recado muda. Sem água ou sem sol, a flor espera, sem perder.
- A flor troca de desenho sozinha: muda abaixo de 40, botão até 100, flor aberta em 100.

No principal, a pessoa completa as duas teclas (Espaço ou A rega, seta para cima dá sol) e a
simulação ("a cada 1 segundo", um bloco raiz), com as duas condições num se dentro do outro.
O cenário, a flor, o placar e a troca de desenho estão prontos; Enter (+) recomeça no extra. Cada variação começa com
o jardim funcionando e muda uma regra só:

- Rega forte: Regar guarda 5 de água em vez de 3.
- Sol forte: com sol de 6 para cima, a flor cresce 20 em vez de 10 (se e senão).
- Chuva: a cada segundo cai 1 de água, antes de a flor crescer.

O extra, separado da regra principal, é a tecla Enter recomeçar o jardim.

## Blocos e arte

`ilhas.ts` abre as Nuvens em `champion`, Gênio da Criação, cuja recompensa de blocos é
`avancado-2d`. O teste do contrato confere os oito projetos contra a união das listas de blocos dos
cursos dos postos até o Gênio, lidas das pastas de `docs/aulas-interativas` (o Arquiteto e o Gênio
ainda não têm cursos, então vale a mesma união do Pico). Os blocos usados são de variável (criar,
mudar, somar), se e senão, comparação, "e", "a cada N segundos", clique em grupo, imagem, trocar
imagem, rótulo e placar. Não há `blocosManuais`, objetos JavaScript, HTML, CSS ou Canvas.

Os SVGs em `projetos.ts` desenham o céu lilás com nuvens e o arco-íris, o canteiro de nuvem, a muda,
o botão de flor, a flor aberta (pétalas nas cores dos fios da Iriê) e a muda desbotada dos
quadros (troca de imagem no lugar da opacidade). Não há imagem
externa, modelo novo ou dependência do Blender.

## Objetivos

Os objetivos olham as variáveis ao longo do tempo, nunca a arte. Como a simulação anda de segundo em
segundo, cada conferência é feita depois de toda a água ou todo o sol disponível ter sido gasto
(por exemplo, regar e esperar 3,6 s gasta os 3 de água e os 3 de sol: 30 de crescimento), e o
resultado não depende de em que ponto do segundo o clique caiu. Cada desafio cabe no orçamento de
40 s e nenhuma espera passa de 10 s.

## Gerar e conferir

```powershell
bun docs/desafios-do-jogo/nuvens/gerar-manifesto.ts
bun test docs/desafios-do-jogo/nuvens/nuvens.test.ts packages/arquipelago-contracts/tests/manifesto-das-nuvens.test.ts
cd packages/studio; bun test src/blockly/__tests__/nuvensManifest.test.ts; cd ../..
bun test packages/arquipelago-api/tests/integration/manifestos.test.ts
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/nuvens-browser.test.ts
bun docs/desafios-do-jogo/nuvens/conferir-browser.ts
node --max-old-space-size=8192 packages/studio/node_modules/typescript/bin/tsc --noEmit -p docs/desafios-do-jogo/nuvens/tsconfig.json
```

O teste do executor real fica ignorado sem `SZ_CHECK_CHROMIUM`. Ele usa `check-objectives.mjs`, o
runtime oficial e o julgador do core: cada objetivo passa no gabarito e falha no inicial, e os
casos incorretos também reprovam:
- tempo parado;
- crescer sem água;
- não gastar água;
- rega pouca;
- nunca florescer;
- rega antiga;
- sol forte sempre;
- chuva dobrada;
- Enter sem ação nas quatro versões.

A conferência visual prepara a página com Bun e controla o Chrome com Node e SwiftShader, sem
servidor da plataforma, credenciais ou banco.

Relatório e prints: [conferência das Nuvens](../../qa/2026-10-29-nuvens-manifesto.md). Celular
físico continua pendente. Nenhum desafio foi cadastrado e nenhum progresso foi alterado.

## C02: Jardim em grade no Pro (30/10/2026)

Aplicação na linguagem do Gênio: JavaScript Pro em arquivos, modelo `vanilla-vite` (Vite e
TypeScript). Arquivos: [Kids](nuvens-pro.manifesto.json) e
[adulto](nuvens-pro-adulto.manifesto.json), um desafio do dia cada (`publicar: false`, ordem 70,
10 e 5 moedas, sem cor). Fontes: `pro-projetos.ts` (a árvore do projeto), `pro-objetivos.ts` e
`gerar-manifesto-pro.ts`. Plano: [C02](../../superpowers/plans/2026-10-30-arquipelago-c02-python-e-texto.md).

O modelo fica separado da apresentação. `src/main.ts` (pronto) desenha a grade de 4 por 6 (até 8
colunas), liga o clique a `construir`, as teclas 1 e 2 à planta, C a `colher`, E a `expandir` e S e
R a `salvar` e `carregar` com `localStorage`. Desde as lacunas de 01/11/2026 os critérios não são a
lista da missão do Gênio (A Base da Lua: ocupação, saldo, devolução ao retirar, salvar e abrir):
essas regras vêm prontas em `src/regras.ts`, e a pessoa completa as do jardim do céu, só com
funções puras exportadas: `vizinhas` (as quatro vizinhas dentro da grade), `colher` com o bônus das
plantas juntas, `expandir` (uma coluna por 4 moedas, sem mudar o jardim recebido) e, no extra,
`plantasPorTipo`. Prova no executor real: `packages/studio-runtime/tests/desafios-pro-smoke.ts
--ilha=nuvens` (8 execuções, 25 objetivos).

| Objetivo | Como confere | Erro causal recusado |
| --- | --- | --- |
| Ocupação e limites | `podeConstruir` em quatro casos | constrói por cima |
| Custo | `construir` em três casos (planta, sem moedas, ocupada) | constrói sem moedas |
| Produção | `colher` com flores e árvore | uma moeda por planta |
| Guardar e reabrir | `reabrir` (`carregar(salvar(j))`) em dois jardins | guarda sem as moedas |
| A tela usa o modelo | clique na primeira célula, `jogo.jardim.moedas` de `src/main.ts` igual a 7 | (inicial) |
| Extra: remover | `remover` devolve metade do custo; célula vazia não muda | remove sem devolver |

Executor real (`packages/studio-runtime/tests/desafios-pro-smoke.ts`): a imagem de produção do
studio-runtime, sem rede, faz o `vite build` offline com o `package.json` e o `vite.config.mjs`
confiáveis do modelo e roda `check-objectives.mjs`, como o `/v1/check`; os arquivos saem do
`proCheckSourceFiles`, o mesmo que o Members manda. Em 30/10: 9 execuções e 29 objetivos, todos
compilados. O gabarito passa nos 6 (Kids e adulto), o inicial reprova os 6 (Kids e adulto) e cada
um dos cinco erros reprova o objetivo que quebra.

```powershell
bun docs/desafios-do-jogo/nuvens/gerar-manifesto-pro.ts
bun test docs/desafios-do-jogo/nuvens/nuvens-pro.test.ts
bun packages/studio-runtime/tests/desafios-pro-smoke.ts
```

Limites: o Estúdio de desafio do jogo abre o Pro e compila pela rota do desafio (C02b); o Estúdio
do Admin ainda não abre projetos Pro. A
persistência (`localStorage`) é conferida pela ida e volta de `salvar` e `carregar`; recarregar a
página não é um passo do executor. Ver `../conteudo-por-posto.md`, seção C02.
