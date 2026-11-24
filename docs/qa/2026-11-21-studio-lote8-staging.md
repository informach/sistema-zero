# Conferência logada do lote 8 no staging (21/11/2026, noite)

Chrome conectado, app adulto (`community-staging-66f2.up.railway.app`), conta da equipe, Estúdio
Completo. Apps de staging em `7b00717b6` (Members, community, community-kids e admin, deploy
manual por SHA completo); os consertos achados aqui foram implantados em seguida em `1750d5881`
(community, community-kids e admin).

## O que foi conferido

| Proposta aprovada | O que foi feito | Resultado |
|---|---|---|
| 2. Origem do Pro | Projeto novo "QA origem 21-11" (JavaScript, blocos, em branco) → menu ⋯ → "Virar profissional" → confirmação ("vamos guardar uma cópia completa deste jogo em Blocos") | o Pro abriu; o menu ⋯ tem "Abrir a versão em blocos" no grupo "O meu jogo", ligado; ele abriu "QA origem 21-11 (Blocos)" no editor de blocos; na lista, o cartão do Pro diz "Feito a partir de QA origem 21-11 (Blocos)" |
| 3. Histórico do projeto | No Pro: Rodar, criar `notas.js`, menu "Mais" → "Histórico do projeto" | a janela diz "As versões ficam guardadas neste computador…"; a linha "Hoje, 19:30 · Você rodou o jogo · primeira versão guardada"; "Voltar para esta versão" tirou o `notas.js` e o histórico ganhou "Antes de voltar para a versão de Hoje, 19:30 · 1 arquivo mudou" e a operação "Voltar para a versão de 21/11 às 19:30" com "Recuperar" |
| 1. Procurar no programa | Jogo pronto "Reino Zero Ultra (na mão)" (7.297 blocos), botão "Procurar no programa", termo "se tecla" | "7 blocos"; cada resultado é a linha do próprio bloco ("Se a tecla 1 está apertada? então"), com a área ("Ao iniciar"); num jogo de menos de 300 blocos (Reino Zero Pro) o botão não aparece |

## Achados e consertos

1. **"Virar profissional" abria o Pro com "Problemas 42".** Todos do TypeScript (`any` implícito,
   `window.__SZGAME_SOUNDS`) em `public/sz-input.js` e `public/sz-audio.js`, os arquivos de apoio
   que a própria conversão escreve. Conserto `10b267b0b`: o tsconfig gerado exclui só os arquivos de
   apoio (teclas, som e fonte); o `public/script.js` da criança continua conferido. Vale para as
   conversões novas: o "QA origem 21-11" convertido antes segue com os 42.
2. **"Ver mudanças" dizia "Esta versão é igual ao projeto de agora"** depois de criar um arquivo
   vazio (só o texto era comparado). Conserto `51bef14ec` (`workspace/treeChanges.ts`, com teste).
   O "Voltar para esta versão" da lista já conferia a existência e voltou certo.
3. **Escolher um resultado da busca no Reino Zero Ultra travou a aba por cerca de três minutos**
   (o Chrome não respondia nem a um `Runtime.evaluate`). Reproduzido duas vezes numa cópia
   recém-criada; numa cópia já guardada na conta, o mesmo gesto levou 280 ms. Medido no playground
   (Chromium local): o "Mostrar o bloco" abria **78 funções recolhidas** da área "Ao iniciar", o
   projeto passava a "Alterações não salvas" e era salvo de novo (uma tarefa de ~550 ms); no app,
   isso ainda dispara a subida de um projeto de 7 mil blocos para a conta. A causa: o
   `revealBlockInWorkspace` subia pelo `getParent()` (numa pilha, o bloco de cima). Conserto
   `1750d5881`: sobe pelo `getSurroundParent()` e abre só o que envolve o alvo (medido de novo: uma
   função aberta, a que contém o alvo). ⚠️ O tempo de três minutos é desta máquina (o Chrome
   conectado desenha devagar quando a janela não está à vista); a parte que cabia ao Estúdio era não
   mudar o projeto à toa.

4. **"Erro ao salvar" no Reino Zero Ultra com a aba escondida** (era o achado aberto desta
   conferência). Na segunda cópia, o topo passou a "Erro ao salvar", com a dica "A cópia de
   recuperação completa não pôde ser preparada…". Medido no playground: o registro de recuperação
   do projeto aberto tem 3.068.580 caracteres, acima do teto de 2 milhões da cópia síncrona (a do
   `localStorage`), e a saída rejeitava mesmo com a cópia nativa (IndexedDB) confirmada. Conserto
   `ed9412f96`: com a página viva (aba só escondida), a cópia nativa confirmada basta; no
   `pagehide` nada mudou. Detalhe em `docs/estudio-evolucao/persistencia-matriz.md`.

## Conferência depois dos consertos (apps em `4eddccb1b`, 21/11/2026, 22h30)

Community, community-kids e admin implantados em `4eddccb1b` (deploy manual por SHA completo; o
Members segue em `7b00717b6`, sem mudança de servidor desde então). Aba nova do Chrome conectado; a
aba antiga, presa na cópia com "Erro ao salvar", ficou aberta e intocada.

| O que | Como | Resultado |
|---|---|---|
| Busca no Reino Zero Ultra | Cópia nova pelos jogos prontos, "Procurar no programa", "se tecla", resultado da tecla R | "7 blocos", cada resultado com a linha do próprio bloco; o bloco da tecla R ficou selecionado e só a função que o envolve (`updateGame`) abriu: as outras 76 continuam recolhidas (antes do `1750d5881` eram 78 abertas). Escolher um resultado cuja função já está aberta (tecla 1) não gerou tarefa longa |
| Aba escondida | Com uma alteração pendente ("Desfazer"), a página foi dada como escondida no instante em que o selo virou "Alterações não salvas" (simulado: `visibilityState` trocado e `visibilitychange` disparado, porque a aba do Chrome conectado não fica escondida ao trocar de aba) | Nenhum "Erro ao salvar". Enquanto escondida, o selo fica em "Alterações não salvas" (a cópia de saída foi aceita; a gravação normal espera a página voltar, como num projeto pequeno). De volta à vista, "Salvo · Guardado na sua conta" em 4 s |
| "Virar profissional" | Projeto novo "QA problemas 21-11 noite" (JavaScript, blocos, em branco) → menu ⋯ → "Virar profissional" | O Pro abriu com "Problemas ✓": "Nenhum problema encontrado por estas conferências." Seguiu zerado depois de rodar (antes do `10b267b0b` eram 42) |
| "Ver mudanças" com arquivo novo vazio | No mesmo Pro: Rodar, "+ Novo" → `notas.js` vazio, "Histórico do projeto" → "Ver mudanças" | A comparação abriu com "Arquivo para comparar: notas.js" (antes do `51bef14ec`: "Esta versão é igual ao projeto de agora") |

**O travamento continua neste Chrome, mas é do navegador conectado.** Escolher o resultado da
tecla R na cópia nova travou a aba por uma tarefa única de 243.449 ms. O mesmo gesto, na mesma
cópia nova, medido no playground (Chromium local): maior tarefa de 522 ms, com o mesmo estado final
(852 grupos de blocos na página, 76 funções recolhidas). Para separar a máquina do Estúdio, o mesmo
teste sem Estúdio nenhum (1.500 textos em SVG, 300 medições de largura, que é o que o Blockly faz ao
desenhar) deu:

| Navegador | Laço de CPU | Medições de texto em SVG |
|---|---|---|
| Chrome conectado (Chrome 157, Windows, RTX 3050, 12 núcleos) | 51 ms | 4.119 ms |
| Chrome 157.0.8103.80 desta máquina, com janela | 60 ms | 46 ms |
| Chrome 157 desta máquina, sem janela | 60 ms | 52 ms |
| Chromium 148 do Playwright | 72 ms | 54 ms |

O texto em SVG é cerca de 90 vezes mais lento naquele navegador, com a CPU até mais rápida. Ligar à
força a acessibilidade (`--force-renderer-accessibility`) ou os domínios DOM, CSS, Overlay e
Accessibility do CDP não reproduziu a lentidão aqui. A causa dentro daquele navegador não foi
achada; não é da versão do Chrome nem do Estúdio.

## Os dois intermitentes da homologação 44954172658, consertados pela causa

- **`ProjectList.creationScope`** (`ff230c579`): o `NewProjectModal` escolhia a linguagem num
  efeito depois de abrir. O primeiro quadro com a janela mostrava a escolha de linguagem, e na lista
  (janela carregada sob demanda, fora do `act`) o teste via esse quadro sem a opção "Com código". O
  estado de abertura agora é ajustado durante a renderização, na transição fechado → aberto. Teste
  novo lê o primeiro quadro num efeito de layout: reprova no código antigo.
- **`css-learning.spec.ts`** (`4eddccb1b`): era perda de código de verdade. Trocar da Ponte para os
  Blocos antes de a Ponte traduzir o código aciona a recuperação do `BlocksMode`. Se ela gravava os
  blocos novos entre a carga dos blocos velhos e o `FINISHED_LOADING` dela, o `BlocklyPanel`
  regenerava arquivos e blocos a partir do canvas velho: o HTML e o CSS digitados sumiam e o canvas
  ficava vazio (o trace do CI mostrou o canvas vazio por 15 s). Medido: 5 ms separavam o caso bom
  do ruim. A regeneração de uma carga agora não vale quando a store já tem outros blocos. O e2e
  novo `bridge-blocks-race.spec.ts` força a ordem ruim (quadros congelados, o pacote dos parsers
  preso) e reprova sem o conserto com o mesmo sintoma.

## Não conferido aqui

- O Kids (a mesma tela do Estúdio Completo, o mesmo código).
- A aba realmente escondida (janela minimizada) no Chrome conectado: a troca de aba não esconde a
  página ali, então o caminho foi simulado. Os testes do serviço cobrem o evento de verdade.
- A subida para a conta de um projeto de 7 mil blocos medida à parte.
