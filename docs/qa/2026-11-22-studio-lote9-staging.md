# Lote 9 do Estúdio no staging: implantação e conferência (22/11/2026)

Fecho do plano de conclusão de 22/11 (lotes 1 a 9 e 7b). Só staging; produção não mudou.

## O que foi implantado

| Peça | Versão | Como |
|---|---|---|
| Worker `sistemazero-studio-runtime-staging` | versão `464c90e2`, imagem construída do HEAD `2c5cf41c4` (perfil de validação `6901a026…`, o mesmo da imagem qualificada no CI 45089148987) | `bun run deploy:staging` nesta máquina. A 1ª tentativa caiu por "timeout awaiting response headers" ao enviar uma camada ao registro do Cloudflare; a 2ª passou. `/healthz` 200, `/v1/build` sem token 401 |
| Members | `2c5cf41c4` | deploy manual por SHA completo (`serviceInstanceDeployV2`), antes dos apps; sem migração nova. `CENARIOS_REGIOES=true` ligado depois dos leitores |
| community-kids, community, admin | `2c5cf41c4`, depois `c9f69bf6b`, `73f8fbc34`, `abc47abbe` e `b1b3de3ab` (os consertos da conferência logada, abaixo) | deploy manual por SHA completo, depois do Members |
| Worker, de novo | versão `4b6c9bd5`, imagem do `abc47abbe` (o runtime das cenas do Pro com o céu consertado e o perfil de validação novo) | `bun run deploy:staging`; `/healthz` 200, `/v1/build` sem token 401 |
| api-gateway | sem mudança (só um teste mudou desde `4eddccb1b`) | não implantado |

### O que NÃO foi implantado, e por quê

- **A versão nova do motor Python (`2026-11-22-areas-1`).** O envio ao R2 de staging
  (`promote-python-runtime.ts upload`) trava nesta máquina: a conexão remota do `wrangler` fica
  em "Establishing remote connection…" (o `workerd` local não sobe; a frente do Pinta registrou o
  mesmo em 21/11). O outro caminho, o serviço temporário de promoção
  (`packages/studio-runtime/promotion-worker/README.md`), pede uma aprovação operacional revisada
  pela dona e um segredo de operador criado para isso. Fica para ela decidir. Por isso o seletor de
  staging do `wrangler.jsonc` voltou ao catálogo que já está no R2 (`fa8847d2…`, commit
  `2c5cf41c4`), e o catálogo do Members `01c079c1…` continua no repositório sem ser ativado
  (`STUDIO_AUTHORING_POLICY_SHA256` não mudou). Consequência no staging: os 20 exemplos do Turtle
  com o "repetir a cada" e os blocos de região do Raylib 3D seguem recusados pela release de
  agora. O hash da distribuição da imagem nova continua `f3b6ef00…`, então o plano `41e4a42a…`
  segue valendo para quando o upload for feito.

## Build hospedado no Worker de staging (lote 4, item 2)

Pedidos de verdade ao `/v1/build` do Worker implantado, com o token do Members de staging injetado
pelo `railway run` (nunca impresso). Evidência sem os ids dos artefatos:
[`evidencias/build-hospedado-staging-2026-11-22/conferencia.json`](../estudio-evolucao/evidencias/build-hospedado-staging-2026-11-22/conferencia.json).

| Caso | Resultado |
|---|---|
| three-ts | 200 em 11 s; a página e os módulos saem do próprio caminho; o three está empacotado |
| react-ts | 200 em 10 s; o React está empacotado |
| phaser | 200 em 13 s; o Phaser está empacotado |
| three-ts com faixa `^` e a trava preparada | 200 em 8 s |
| import sem declarar (`nanoid`) | 422 `DEPENDENCY_NOT_DECLARED`, "A biblioteca nanoid não está no package.json deste jogo. Se ela é uma das bibliotecas do modelo, escreva ela no package.json; se não, tire o import." |
| erro de sintaxe | 422 `BUILD_FAILED`, "O projeto tem um erro de compilação." |
| rede de fora | a política do artefato só deixa conectar no próprio artefato (`connect-src data: blob: <o artefato>`) |

## Conferência logada (comunidade adulta de staging)

A extensão do Chrome estava desconectada no fecho, então a conferência foi feita com o Playwright
desta máquina (Chromium, 1440 × 900), entrando com a conta de equipe no login do staging (o
roteiro confere que o host é o de staging antes de digitar; a credencial nunca é impressa). Fotos
comprimidas em
[`../estudio-evolucao/evidencias/conferencia-staging-2026-11-22/`](../estudio-evolucao/evidencias/conferencia-staging-2026-11-22/).

### Galeria "Ver os jogos prontos" e o jogo D

- O card "Mundo das Portas" aparece no grupo do Jogo 2D com a capa do próprio jogo
  (`galeria-jogo-d.jpg`). A galeria segue só para a equipe nos dois apps (decisão dela).
- No clique, o editor abre o jogo nos blocos e a prévia fica "Rodando"; com as setas o herói andou
  e o placar mostra "Pontos 3 · Vidas 5 · Vila" (`jogo-d-andou.jpg`).

### O jogo E: o primeiro arquivo abria em branco

- Na primeira conferência (Members e apps em `2c5cf41c4`), o card "Terra das Seis Regiões"
  abria um projeto com o nome do jogo, sem blocos e com a prévia vazia. Causa: o projeto do jogo E
  é do modo Ponte (o programa mora em `files['script.js']` e a `ir` fica vazia), e o
  `gen-jogo-e-galeria.ts` copiava a `ir`. O arquivo no R2 tinha `behavior` vazio.
- Conserto em `c9f69bf6b`: o gerador monta a IR do `regioes.programa.js` e recusa IR sem programa
  ou com código cru; o carregador da galeria recusa arquivo sem programa (teste vermelho antes). O
  arquivo novo, `jogo-e/0e2c2214….json` (19,9 MB), foi enviado ao R2 de staging com o hash
  conferido na leitura pública.
- Segunda conferência (apps em `c9f69bf6b`): o jogo rodava (prévia "Rodando", o texto "Ande pelas
  seis regiões e pegue as moedas." e "Vila" no canto), mas o editor mostrava "Não deu para abrir
  estes blocos", e o console repetia a cada quadro "Corpo pequeno ou rápido demais para resolver
  a colisão do cenário com segurança" no "para cada objeto do grupo". Duas causas:
  - O programa dava corpo físico às moedas dentro de um "para cada", e o "Dar corpo físico" só
    vale direto no Ao iniciar. O construtor dos blocos troca por código o bloco que não cabe no
    lugar, mas só conhece o lugar de um bloco de extensão pelas regras registradas, e a galeria
    montava os blocos antes de o editor registrar o Jogo 3D: o bloco ficava no lugar errado e a
    carga inteira falhava. Vale para qualquer exemplo da galeria, não só o jogo E.
  - As moedas nasciam a 12 m com gravidade; as que ficavam abaixo do relevo caíam sem apoio até o
    motor recusar o passo.
  - Os testes sem navegador não pegaram porque montavam os blocos sem as regras do Jogo 3D (a
    linha virava código cru, que encaixa em qualquer lugar), e a prova das regiões não olha as
    moedas nem os blocos.
- Conserto em `73f8fbc34`: a galeria registra as regras dos blocos das extensões do exemplo antes
  de montar os blocos (`KitGallery.placement.test.ts`, vermelho antes com o mesmo erro do
  navegador); as moedas ficam de pé logo acima do relevo, sem física, com a altura lida do
  terreno compilado; o gerador recusa linha que vire código cru. Arquivo novo
  `jogo-e/85c7fd55….json` no R2 de staging (hash conferido); sem navegador, com as regras do
  editor, ele abre com 178 blocos, nenhum de código, e os 6 blocos "Quando … entrar na região".
- Terceira conferência (apps em `73f8fbc34`): o jogo abre nos blocos (Ao iniciar com o cenário
  `seis-regioes-r39`, o herói com corpo físico e a câmera; os "Quando heroi entrar na região"),
  a prévia roda, o herói anda até as casas da Vila e o console não tem mais o erro da física.
  Ficou o céu preto, igual na capa tirada pela prova do CI: a esfera do céu do cenário tem 3000 m
  de raio e a câmera dos motores 3D do Estúdio enxerga 1000 m, então a esfera inteira ficava fora
  do alcance. Vale para todo jogo do Estúdio que usa um cenário do Molda. Conserto em
  `abc47abbe`: o céu ajusta o raio a 90% do alcance da câmera (a oficina, que enxerga 4000 m ou
  mais, não muda), com os runtimes gerados e o perfil de validação; o Worker de staging foi
  implantado de novo com a imagem desse commit.
- Quarta conferência (apps em `abc47abbe`): o céu azul-claro aparece. A
  gaveta mostrava "Problemas 1": o aviso do bloco da tela ("Descreva o jogo ou desenho dentro da
  tela Canvas"). Conserto em `b1b3de3ab`: a tela do exemplo leva a descrição, e o gerador recusa
  página com aviso de acessibilidade (a mesma régua do editor). Arquivo novo
  `jogo-e/6740b0f4….json` no R2 de staging.
- Quinta conferência (apps em `b1b3de3ab`): os blocos abrem com a descrição da tela, a prévia
  roda com o céu, e a aba Problemas diz "Nenhum problema por aqui. Pode rodar!"
  (`jogo-e-blocos-e-previa.jpg`, `jogo-e-sem-problemas.jpg`).

### A ferramenta Regiões no Molda Cenários

Com `CENARIOS_REGIOES=true` no Members de staging (variável declarada em `.railway/variables.ts`):

- A aba Jogo mostra o painel "Regiões" (e o item "Regiões" na barra da esquerda), com o texto que
  explica o uso no Estúdio e "Nenhuma região ainda." (`regioes-painel-vazio.jpg`).
- Na vista de cima, "Nova região" e dois cliques no chão criaram a Vila; a Floresta foi criada ao
  lado, com "Encaixar na vizinha" e a Vila marcada como vizinha. Cada uma passou pela prévia
  ("Prévia · ainda não guardada", `regioes-previa-floresta.jpg`) e foi guardada. O painel ficou
  com "Regiões do cenário · 2": Vila, 22 m por 30,5 m, vizinha de Floresta; Floresta, 25 m por
  31 m, vizinha de Vila (o par gravado dos dois lados), e o selo "Guardado"
  (`regioes-duas-regioes.jpg`). Nenhum erro no console.
- Observação: as bordas das regiões no relevo saem bem claras na vista de cima; os nomes aparecem
  nítidos.

### Observações do console

- "Failed to execute 'postMessage' … target origin ('https://community-kids-staging…') does not
  match" no app adulto: é o aperto de mão da casca da prévia, que manda o "pronto" para cada
  origem permitida (adulto e Kids; `packages/core/src/studio/classic-shell.ts`). A mensagem para a
  origem certa chega; o navegador só avisa da outra. Inofensivo, não mudado.
- "Failed to load resource: 409" em `POST /api/creations/studio/<id>/upload`: é o passo do envio
  em partes para a conta (`CREATION_PARTS_NEED_BYTES`, "Faltam os bytes de partes novas; reserve
  de novo com eles"); o cliente reserva de novo com os bytes. O navegador registra o código.

### O que não foi conferido no staging

- O tempo da busca no Reino Zero Ultra no Chrome conectado: a extensão estava desconectada. O
  trabalho do gesto está provado no CI com a CPU 4× mais lenta
  (`e2e/classic-reveal-scale.spec.ts`).
- A versão nova do motor Python (seção acima).
