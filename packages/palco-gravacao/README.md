# Palco de gravação

As aulas do Kids como a criança vê, para o robô de gravação do EdiAula gravar. Serviço próprio, só
no staging, só para a equipe. Nada do que acontece aqui é salvo.

## Como funciona

- **Entrada:** e-mail e senha de uma conta da equipe (superadmin, admin ou staff, ativa), pelo
  auth do ambiente. Impersonação e sessão de perfil do Kids não entram (`src/lib/staff.ts`). O
  `src/proxy.ts` pede a sessão em toda página e rota e renova o token vencido. Pedidos de escrita,
  inclusive login, passam pela mesma conferência de origem e CSRF do member-shell.
- **A aula:** no início, escolha o curso (o catálogo do Kids, `/members/catalog?audience=kids`)
  e depois a aula daquele curso. Também dá para colar o endereço de uma aula do Kids
  (`…/cursos/<curso>/aulas/<aula>`), abrir a lista de aulas de um curso em `/aulas/<curso>` ou
  abrir `/aulas/<curso>/<aula>` direto (`?parte=N` abre direto na parte N, que é como cada plano
  do EdiAula começa a sua; `&enviado=1` abre o Estúdio com o projeto já enviado, para a parte
  que vem depois do envio, como a do Compartilhar, que só libera depois dele). A aula é lida pelo
  gateway com o token da equipe, que vê tudo aberto, sem trava e sem progresso. Cada abertura é
  uma tomada nova (`?tomada=`): as atividades começam do zero, e o Estúdio abre com o que a criança
  já teria montado nas partes de antes: o projeto como ficou na tomada mais recente da parte de
  antes mais perto (o palco guarda, na memória, o que cada parte gravada montou) ou, sem ela, o
  projeto de entrada da parte nos exemplos da aula (`/members/admin/lessons/:id/draft/published`),
  ou a solução da parte de antes mais perto que tenha uma. Gravar as partes em ordem leva o
  projeto inteiro até o fim; o palco reiniciado cai nos exemplos. A página é a do Kids: o mesmo `<main>` com a pele `kids-aula`,
  a largura toda e a barra de cima em 860 px, com o botão de voltar para a lista de aulas.
  `?parte=N` abre a parte numerada a partir de um, mantendo a tomada. Número inválido ou parte
  inexistente retorna 404, sem cair silenciosamente na primeira parte.
- **Mesmos componentes do Kids:** o alias `@/` aponta para `packages/community-kids/src`, então o
  player, os blocos, o Estúdio, o livro 3D, as cenas, o CSS e as fontes são os do Kids, sem cópia.
  O palco não muda nenhum outro pacote.
- **Sem escrita:** as atividades são conferidas no navegador (`LearningExecutionProvider`), o
  rascunho na conta fica desligado e concluir só mostra a comemoração. As rotas que a aula chama
  (`/api/members/lessons/...`) são respondidas pelo palco (`src/lib/bff.ts`): navegação, posição
  do vídeo, envio do projeto e o resto recebem a resposta de sucesso que a tela espera.
- **Verificar projeto** vai ao members de verdade, como equipe: o members não guarda progresso
  nem prêmio da equipe, e o tempo da conferência é parte da aula gravada (o EdiAula acelera a
  espera sob a fala).
- **Certificado:** aparece pronto para baixar e entrega um PDF que diz ser um exemplo; nenhum
  certificado é emitido.
- **Compartilhar no Mural:** a janela mostra o sucesso, com links para uma página do palco que
  diz que nada foi publicado.
- **Livro e anexos:** o PDF vem do bucket privado do ambiente pela própria origem, sem marca
  d'água e sem registrar download.
- **Ajustes de palco** (`src/app/globals.css`): os controles do livro que só aparecem ao passar o
  mouse ficam à vista.

## Ponte de gravação

`window.__gravacao` versão 1 (contrato no README do EdiAula), em `src/lib/ponte.tsx`. Os verbos
estão em `src/lib/verbos.ts` e na seção 9 de `docs/aulas-interativas-tecnico/ESPEC-ROTEIRO.md`.
`ocupado()` responde enquanto o Estúdio ou o livro carregam, o jogo pronto prepara ou o projeto
está sendo conferido.

- **Os blocos começam organizados** (`src/lib/arrumacao.ts`): cada área de trabalho nova do
  Estúdio que abre com pilhas uma por cima da outra recebe Organizar blocos uma vez, assim que os
  blocos param de chegar. Até lá `ocupado()` responde, e o EdiAula só liga o vídeo da parte depois
  disso. O que o robô faz na área durante a gravação não é mexido.
  O gesto aguarda a ação do menu e a renderização dos blocos antes de responder. A prova com
  Blockly real roda com `node packages/palco-gravacao/qa/verificar-organizacao-browser.mjs`,
  na raiz, usando Chromium instalado pelo Playwright ou `SZ_CHECK_CHROMIUM`.
  Ela confere também a leitura dos nomes pela posição dos campos, incluindo números no
  começo e no meio do bloco, com e sem zoom, independentemente da ordem de montagem do SVG.

- **A mão procura descansar fora dos blocos:** parada em cima, o Blockly mostra a dica do bloco
  por cima da aula. Apontar um bloco, o encaixe ou o lugar abaixo dele deixa a mão no fundo da
  área, ao lado (`perto`, com o apontar `exato`), e encaixar e trocar terminam afastando a mão.
  Sem fundo livre ou sem rótulo fixo para reencontrar um campo, o gesto termina sem afastamento,
  preservando a edição e a sequência da gravação.
- **Decidir depois do clique:** os seletores do Estúdio (sprite, nome, som) herdam do campo de
  texto do Blockly e abrem uma lista. O `trocar` clica e pede `continuar` com `escolher "<valor>"`,
  que escolhe na lista aberta ou digita na caixa. Quando a fala separa os dois cliques ("clique em
  jogador, desça até o fim da lista e clique em escolhido"), o roteiro usa `abrir campo` numa fala e
  `escolher "<valor>" em "<bloco>"` na outra, e cada clique cai na sua palavra. A prévia que ainda monta depois de expandir é
  esperada do mesmo jeito.
- **Blocos-sombra:** o número de um bloco ("50", o "1" de "Somar 1") fica num bloco-sombra
  encaixado nele, que conta como parte dele.
- **O jogo sai de cena enquanto a criança monta** (09/11/2026, pedido da Helena): os verbos de
  montagem (categoria, encaixar, soltar, trocar, abrir campo, apontar bloco, apontar paleta…)
  escondem o jogo ao lado dos blocos e dão um passo de zoom (1,2 vez) preso no canto das pilhas;
  os de testar no jogo (`tocar prévia`, `apontar prévia`, setas na prévia, `rodar de novo`,
  `reduzir estúdio`) desfazem o zoom e trazem o jogo de volta. A troca é o "Mostrar o jogo" do
  menu ⋯ do Estúdio, feita pela página entre um gesto e outro (`alternarJogo`, com o menu
  invisível por `html.palco-trocando-jogo`), sem a mão: no vídeo é um corte de câmera, e nada
  da fala é cortado. O roteiro fixa a tela com `[esconder o jogo]` ou `[mostrar o jogo]` até
  `[jogo automático]`. Sem o item no menu (Estúdio estreito, com abas), nada muda.
- **Rodar de novo** (09/11/2026): o Estúdio clássico não tem mais o Atualizar acima do jogo.
  `[rodar de novo]` clica no Rodar da barra de cima pelo `data-live-target="studio-run"` (o
  rótulo muda com a fase: Rodar, Rodar de novo), que recomeça o jogo e dá o foco a ele.
- **Setas da tela do jogo** (03/11/2026, Farol): `segurar seta da direita por 1,5 s` segura a seta
  da tela do jogo pronto, e com `na prévia`, a da pré-visualização do Estúdio; `apontar setas`
  aponta as quatro. As setas são botões de 44 px dentro do iframe do jogo, presos a 8 px do canto
  de baixo à esquerda (`enableClassicControls`, no runtime do Jogo 2D do `studio`), do mesmo
  tamanho em qualquer tamanho de jogo: o ponto sai do tamanho do quadro na hora (`jogo()`,
  `previa()`), nunca dos pixels do palco do jogo. O gesto `segurar` é do contrato do EdiAula
  (botão do mouse preso pelo tempo dito), e o robô espera soltar antes do gesto seguinte.
- **Abrir sem fechar:** clicar numa categoria aberta a recolhe. `abrir categoria Jogo 2D >
  Movimento` só clica nas fechadas e aponta as abertas (`categoria()`), para a segunda montagem de
  uma parte, quando Jogo 2D ficou aberta do encaixe anterior. `categoria` continua clicando sempre
  (abrir e recolher para mostrar a paleta).
- **Experiências do andar e do limite:** `apontar selo` (o "Seta apertada?", cujo texto muda com a
  seta) e `apontar faixa fora da tela` (um desenho sem nome, `data-fora-da-tela`).
- **Área nova, bloco dentro e valor por cima** (04/11/2026, Farol Aula 2): `apontar lugar sem
  blocos` e `soltar "Quando acontecer" no lugar sem blocos` usam o mesmo lugar (`lugarLivre`), um
  retângulo só de fundo ao lado das pilhas e fora de onde a paleta abre, achado numa grade de
  `elementsFromPoint` (só o que é da área conta, mesmo com a paleta aberta por cima); com `abaixo de
  "Ao iniciar"`, o lugar é logo abaixo dessa pilha, alinhado com ela e 32 px abaixo (pedido da
  Helena: a área nova alinhada, nunca jogada de qualquer jeito); `encaixar "Quando o sprite" dentro de "Quando acontecer"` acha a boca vazia
  da área descendo do rótulo; `soltar "verdadeiro" em cima do "0" em "Criar variável temChave"`
  põe o canto do bloco novo no canto do valor. O campo de um bloco encaixado conta como campo do
  bloco de fora quando ele não tem um com esse valor (o **verdadeiro** de Criar variável).
- **Bloco nunca em cima de bloco, e a área do trabalho no meio** (04/11/2026, pedidos da Helena):
  depois de todo gesto que solta um bloco, o `afastar` confere se uma pilha cresceu por cima da de
  baixo (`desembolar`) e, se sim, a mão pega a de baixo pelo nome e a desce até ficar 32 px abaixo,
  uma vez por gesto. `arrastar até` traz o bloco para perto do meio da altura (15% de folga) mesmo
  quando ele já está à vista, para a área em que a criança trabalha ficar em destaque.
- **Mudou um campo, clica fora** (04/11/2026, pedido da Helena): `trocar` e `escolher` terminam com
  um clique na área de código fora do bloco (ao lado dele, ou num fundo livre, `fundoLivre`), para a
  mudança valer e o bloco sair da seleção; `clicar fora dos blocos` faz só isso.
- **Conferir com todos os blocos à vista:** `mostrar blocos "A", "B"` mede a caixa que os blocos
  ocupam juntos e arrasta a área de código até ela ficar à vista com 24 px de folga, perto do meio
  (`rolagemDeVarios`); já assim, só aponta o primeiro.
  Blocos a mais de uma tela de distância (Ao iniciar visto da área Quando acontecer) levam mais de
  um arrasto: o que não alcança volta com `falta` e a página é perguntada de novo.
- **Galeria parada antes da escolha** (05/11/2026): a roda anima a lista por um instante e às vezes
  começa um pouco depois do gesto; `escolher` espera a opção ficar 300 ms no mesmo lugar
  (`listaParada`), senão pedia outra rolagem e passava da imagem.
- **Nome do bloco com valor de sombra:** o "1" de Alterar variável pode vir antes dos rótulos no
  DOM; `textoProprio` põe somente esse prefixo no fim, para o bloco começar pelo nome,
  preservando valores entre rótulos. A espera da galeria mede a posição da opção e a rolagem,
  inclusive quando a opção já está totalmente visível.
- **Farol Aula 3** (04/11/2026): `jogar na lixeira ">" em "Se"` leva a pergunta pronta do Se para a
  lixeira pelo sinal de maior; `abrir "senão" em "Se"` clica no botão de mais (um `blocklyImageField`)
  que fica logo antes do rótulo, e `apontar mais de` só aponta; um nome de bloco aceita `dentro de`
  ("Se dentro de Quando o sprite personagem começar a encostar no sprite farol") para escolher entre
  blocos de mesmo começo. A porta do farol é a caixa de encostar dele, na base da torre (x 383 a 425,
  y 165 a 192 no palco do jogo): da largada, 1,95 s de seta para a direita chegam lá sem a chave.
- **O jogo da prévia é o do projeto:** o tamanho do palco do jogo vem do bloco **Preparar o
  jogo ... tela 480 × 360** da área de trabalho (`palcoDoJogo`), e só sem ele do jogo pronto da
  aula. A Aula 2 do Farol não tem jogo pronto.
- **Expandir e reduzir esperam o outro estado:** o gesto seguinte mede a prévia já no lugar novo
  (na Parte 6 do Farol, a seta segurada logo depois de expandir caiu na seta da esquerda).
- **Os roteiros do Farol são conferidos nos testes:** todo colchete do Na tela das Aulas 1 e 2 do
  Desafio do Primeiro Jogo que não é verbo do EdiAula precisa ser entendido pelo `agir`.
- **Estúdio clássico redesenhado e moldura nova das experiências** (conferido em 09/11/2026): o
  redesenho guardou o que o palco usa: o texto das categorias dos roteiros, que só ganharam ícone
  pelo CSS e "›" no lugar do triângulo; "Organizar blocos" no botão direito; "Atualizar o
  preview"; o iframe "Pré-visualização"; a lixeira `.blocklyTrash`; "Expandir"/"Reduzir"; e o
  passeio de primeiros passos fica desligado na aula. As categorias da web passaram a mostrar o nome
  em português (Página · HTML, Estilo · CSS, Figuras · SVG, Pintura · Canvas, Cena 3D, Código
  avançado): um roteiro que abra uma delas usa o nome mostrado, porque `categoria()` compara o nome
  inteiro. As áreas ganharam "· roda uma vez", "· espera acontecer" e "· repete sem parar" depois do
  nome, e o palco continua achando "Ao iniciar" e as outras pelo começo do texto. A gaveta
  Mensagens/Problemas muda o tamanho da área e o zoom 1,0 o tamanho dos blocos; o palco mede os dois
  na hora. Na experiência, a fala do Zappy segue em `.sz-scene-console-fala`. Desde 09/11 os
  roteiros não apontam controles da experiência; `tocar`, `apontar selo` e `apontar faixa fora da
  tela` continuam entendidos, mas sem uso.

## Rodar

```sh
bun run --filter @sistemazero/palco-gravacao dev   # porta 3010
bun run --filter @sistemazero/palco-gravacao test
bun run --filter @sistemazero/palco-gravacao typecheck
```

Variáveis: `GATEWAY_URL`, `JWT_JWKS_URL` (ou `JWT_HS256_SECRET` em desenvolvimento),
`JWT_ISSUER`, `JWT_AUDIENCE`, `MEMBER_SHELL_HMAC_SECRET` e, para o livro, `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_PRIVATE_BUCKET`. No staging, os valores são os
do `community-kids`.

**No computador, com o staging:** depois do `build`, suba com as variáveis do serviço do staging,
trocando só os dois endereços internos pelo gateway público (a rede interna do Railway não chega
ao computador):

```sh
railway run --service palco-gravacao --environment staging -- env \
  GATEWAY_URL=https://<gateway do staging> \
  JWT_JWKS_URL=https://<gateway do staging>/auth/.well-known/jwks.json \
  NODE_ENV=production npx next start -p 3010
```

O passo a passo de uma gravação está no README do EdiAula ("Gravar uma aula do Sistema Zero,
passo a passo").

## Deploy

Definição em `.railway/staging-services/palco-gravacao.json` (o `railway.ts` lê essa pasta só no
staging). O CI publica o palco junto de toda mudança que publica o Kids, depois que o id do
serviço está no mapa `SVC_ID` de `.github/workflows/ci.yml`.

**Ordem da primeira subida.** O CI do staging só aceita ajustes de build e deploy em serviços que
já existem; criar um é recusado e trava o deploy de todos. Então, antes do merge em `staging`:
1. `railway config plan` no staging com este código mostra só "Create service palco-gravacao";
2. a criação é feita por `railway config apply` nesse mesmo plano (mesma origem, réplicas e
   build da definição);
3. as variáveis entram no serviço, com referência às do `community-kids` do staging;
4. o id do serviço entra no `SVC_ID` de `ci.yml`, e o plano volta a não ter mudanças;
5. só então o merge.

## Acesso às mídias

O domínio do palco também precisa de leitura CORS nos buckets públicos: ele está na lista
canônica `packages/admin/scripts/student-app-origins.ts`. O comando `r2-cors-public.ts`
mescla a regra gerenciada, conserva regras externas e prova o CDN com um objeto temporário.
O livro continua pela rota privada da própria origem; nenhuma escrita de aluno é liberada.

No Admin de staging, `VIMEO_WHITELIST_DOMAINS` inclui os apps de staging e
`palco-gravacao-staging.up.railway.app`. Vídeos já existentes na pasta Testes precisam receber
esse domínio adicional, preservando os que já tinham. Alterar só a variável vale para os próximos
uploads, sem atualizar retroativamente os vídeos. Não modificar vídeos da pasta de produção
para validar o palco.

## Limites conhecidos

- Os vídeos da aula (Vimeo, YouTube) não são controlados pelo robô.
- O jogo pronto usa `Math.random` como no Kids: o que é sorteado pode mudar de uma tomada para
  outra.
- Os gestos do Estúdio acham blocos e campos pelo texto que aparece neles, e o jogo da
  pré-visualização pelo ponto do jogo (o jogo cabe inteiro, centrado).
- Estúdio em Python não funciona no palco: a conferência e o ambiente do Python pedem o vínculo
  do projeto na conta, que o palco não cria. As aulas com blocos e JavaScript funcionam.
- Quiz respondido no palco passa sempre: as respostas certas só o members conhece, e conferir
  ali gravaria uma tentativa.
