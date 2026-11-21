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

## Não conferido aqui

- O mesmo gesto da busca no staging depois do conserto (implantação em andamento ao escrever).
- O Kids (a mesma tela do Estúdio Completo, o mesmo código).
- A subida para a conta de um projeto de 7 mil blocos medida à parte: o travamento coincidiu com
  ela, mas a causa medida foi a das funções abertas.
