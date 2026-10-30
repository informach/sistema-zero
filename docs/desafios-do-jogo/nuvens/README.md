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
1 a 4 pedem publicação (`publicar: true`). A Colheita da lista (quadro 5) depende de lista e laço
em grupo, que nenhum curso em blocos da trilha ensina; nas Nuvens isso vem em JavaScript (C02),
então ela segue com `publicar: false`, como as três variações. Não houve publicação remota.

## Cinco quadros complementares (L03)

Os quadros aplicam limites de reserva, faixa de luz, ocupação, consumo de dois recursos e retirada de uma lista. No quinto, o Para cada vem montado com corpo vazio. Falta somar e destruir a flor da vez, sem contar a colheita novamente.

| Quadro | Atividade | Tipo | Moedas | Extra |
| --- | --- | --- | --- | --- |
| 1 | Reserva de água | Quadro das Cores | 20 | 10 |
| 2 | Luz na medida | Quadro das Cores | 20 | 10 |
| 3 | Canteiros livres | Quadro das Cores | 20 | 10 |
| 4 | Dois recursos | Quadro das Cores | 20 | 10 |
| 5 | Colheita da lista | Quadro das Cores | 20 | 10 |

O [manifesto Kids](nuvens.manifesto.json) e o [manifesto adulto](nuvens-adulto.manifesto.json)
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
bun test docs/desafios-do-jogo/nuvens/quadros-iniciais.test.ts
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/quadros-nuvens-browser.test.ts
bun docs/desafios-do-jogo/nuvens/conferir-quadros-browser.ts
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
