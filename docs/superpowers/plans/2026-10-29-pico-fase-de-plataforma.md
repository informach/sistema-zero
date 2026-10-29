# Fase de plataforma do Pico Gelado, fase3-10

**Objetivo:** entregar um manifesto validado, com um Quadro das Cores e três desafios do dia,
sem importar ou publicar nada no Admin.
**Arquitetura:** o molde do Recife (fase3-05, `920c8bd21`): IR JavaScript em blocos, arte SVG
embutida, objetivos comportamentais, gerador determinístico e provas no contrato, no Blockly, no
HTTP em memória e no executor real. Nenhum código do jogo, salvamento, serviço ou Blender muda.
**Especificação:** tarefa fase3-10 de 29/10/2026, o pacote do Recife e as regras §7.

## Decisões

- **O Pico abre no `elite`, Mestre dos Jogos** (`ilhas.ts`). A recompensa de blocos desse posto é
  `intermediario-2d` (`creatorJourneyLevel('elite')`), então nenhum bloco pode passar dele.
- **Os blocos são a união das listas dos cursos** dos postos até o Mestre, lidas das pastas
  `faisca`, `construtor`, `inventor`, `explorador` e `mestre` de `docs/aulas-interativas` (hoje
  nove listas: os sete cursos principais e os dois Poderes do Faísca). Sem `blocosManuais`. O jogo
  usa só blocos que já estão nos cursos principais: a gravidade e o pulo vêm do Corre, Dino
  (Inventor) e o "para cada do grupo que colidir", do Construtor. O único bloco acima do
  `iniciante-2d` é a conta (`sz_math_arithmetic`, `intermediario-2d`), exatamente o teto do posto.
  No Recife ela foi retirada porque passava do Explorador; aqui ela cabe.
- **Por que o pulo não usa o kit do dino:** o `controlDino` pousa só na linha do chão do palco e
  troca a pele do sprite para `dino` (`skin.kind`), o que desenharia um dinossauro no lugar do
  pinguim. E nenhum curso até o Mestre ensina o `collidePlatform`. Por isso a fase é montada com
  blocos básicos: a gravidade do mundo, a velocidade, o "manter na tela" e o contato com o grupo
  dos gelos. Pousar é a regra: encostou num gelo vindo de cima (o topo do pinguim 30 acima do
  topo do gelo), o pinguim é colocado de pé no topo dele e `noChao` vira verdadeiro. A mesma regra
  serve para o gelo do chão e para um gelo flutuante (a variação do pulo alto).
- **O pulo é um botão**, como o "Soltar bolha" do Recife: o runtime não cria tecla sintética no
  toque, então a seta para cima da tela não chegaria a um "Quando apertar a tecla". O extra é
  justamente a seta para cima também pular, só no gelo.
- **O jogo principal** (Quadro das Cores): cenário de neve, o pinguim, dois blocos de gelo com um
  buraco de 90 entre eles, a água embaixo, a bandeira, os botões Pular e Recomeçar e o Recomeçar
  já prontos. A criança completa o laço (gravidade, setas, velocidade, manter na tela e pousar no
  gelo), o Pular (só no gelo), a água (volta ao começo) e a bandeira (marca o fim uma vez só).
- **Três variações**, no padrão do Recife: cada inicial já funciona e só uma regra falta.
  - Pulo alto: um gelo flutuante com a bandeira em cima; o Pular tem força 9 e passa a 13.
  - Floco de neve: o floco já desenhado acima do começo; falta o contato que marca `pegouFloco`,
    esconde o floco e soma um, uma vez só.
  - Quedas: o placar de quedas aparece; falta somar um a cada queda na água.
- **Quadro 6 e ordens 60 a 63**, a convenção do Bosque, da Vila e do Recife (cada um na sua
  ilha). Nenhum desafio do Pico existe no repositório, então os seis quadros estão livres aqui. O
  banco do Admin não foi consultado (nenhuma leitura nem escrita): o cadastro precisa conferir que
  o quadro 6 do Pico está livre.
- **Moedas** de `MOEDAS_PADRAO_POR_TIPO`: 20 e 10 de extra no quadro, 10 e 5 nos desafios do dia.
- **O pinguim** é o bicho do Pico na arte do jogo (os pinguins da `CapsulaDoPinguim`). Nada de
  personagem, nome ou dado inventado.
- Não tocar em `packages/arquipelago/src`, salvamento, Blender, GLBs, .env, CI ou bancos.

## Execução

- [x] `docs/desafios-do-jogo/pico/{projetos,objetivos,gerar-manifesto}.ts`, JSON e README.
- [x] Teste da pasta: JSON igual à fonte, IR válido, blocos até `intermediario-2d`, orçamento,
  e cada variação mudando só um evento principal.
- [x] Contrato: quatro desafios, moedas, posto, cobertura dos blocos pelas listas, arte e textos.
- [x] Blockly: oito projetos abrem e regeneram o mesmo JavaScript.
- [x] HTTP: importar, exportar e reimportar com repositório em memória, sem revisão extra.
- [x] Executor real: cada objetivo passa no gabarito e falha no inicial; 15 mutações reprovam.
- [x] Conferência visual com SwiftShader: computador, celular emulado com toque e janela compacta.
- [x] Biome e revisão do diff. Typecheck: ver o relatório de QA.
