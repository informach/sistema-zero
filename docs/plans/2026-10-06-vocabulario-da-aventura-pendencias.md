# Vocabulário da aventura: o que falta (06/10/2026)

O commit desta data subiu a troca de vocabulário da área da criança: curso → aventura, aula → fase,
seção → parte, unidade → Mundo, caderno → Mapa da Aventura, professor → guia (à noite, → equipe;
ver "A equipe no lugar do guia", abaixo). O menu "Aprender"
virou "Explorar". A regra está em `docs/aulas-interativas/DIRETRIZES-PEDAGOGICAS.md`, seção 6.
O envio foi feito às pressas, a pedido da dona; esta nota diz o que ficou sem conferir.

No fim do dia, o full review do vocabulário resolveu parte da lista e trouxe decisões da dona
(registradas nas Diretrizes, seção 6, e no registro de revisões). Os itens resolvidos estão
marcados com ✅.

## Já conferido antes do envio
- Typecheck de `community-kids` e `member-shell`, antes das últimas edições de texto.
- Testes de `community-kids`, com 1186 aprovados e 0 falhas na última rodada (os dois últimos testes
  foram corrigidos e rodados depois).
- Testes de `member-shell`: 1080 aprovados, 0 falhas.
- `biome check` em todos os arquivos alterados. Sobrou só um aviso antigo no Admin (`noImgElement`).
- O guarda novo `tests/copy-vocabulario.test.ts` (Kids) lê o texto de tela com o parser do TypeScript.
  Ele reprova palavra da escola no app e nos componentes compartilhados das fases; conferido por
  mutação nos dois lados.
- Cursos (resultados relatados pelos agentes de cada curso):
  - Corre, Nave, Cadê e Farol: testes do curso e `validar-roteiros.py` do prefixo passam.
  - Meu Jeito: o mesmo, e o PDF regenerado.
  - Como Fazer: `bun docs/como-fazer/validar.ts` OK.

## Falta rodar (primeira coisa a fazer)
- Typecheck de `studio`, `pinta`, `core` e `community` (adulto); de novo em `community-kids` e
  `member-shell` depois das últimas edições.
- Testes de `community` (adulto), `core`, `studio` e `pinta`.
- `python3 docs/aulas-interativas/validar-roteiros.py` (todos os 37 roteiros).
  - Com a régua única (abaixo), ele chegou a acusar `corre-dino-aula-13.roteiro.md/video-entrega`:
    "um cacto uma unidade mais rápido" (unidade de medida, mas a régua não distingue). A frase saiu
    na reescrita do agente do Corre, e na última rodada o validador passou nos 37 roteiros.
- `bun docs/aulas-interativas/qa/validar-manifestos.ts`.
- `bun test docs/aulas-interativas/qa` (inclui `vocabulario-crianca.test.ts`).
  - ✅ Agora roda no CI, no passo "Testes dos cursos e guardas de vocabulário", junto com o passo
    "Tutoriais do Como Fazer" (`bun docs/como-fazer/validar.ts`). Antes, o
    `bun run --filter '*' test` só cobria `packages/*`. Os testes não usam banco nem navegador
    (happy-dom). Enquanto os agentes dos cursos reescrevem as falas, o passo pode ficar vermelho.
  - ⚠️ O agente do Meu Jeito viu falhar `diretrizes-pedagogicas.test.ts` em `desafio/dia-3:
    ponte-d3-decisao`: o manifesto dizia "Complete a parte então" e o roteiro "Complete o espaço do
    então".
  - O agente do Farol depois regenerou os manifestos, então deve estar resolvido. Conferir.
  - ✅ No full review do fim do dia, `diretrizes-pedagogicas.test.ts` passou (5 testes) e
    `vocabulario-crianca.test.ts` também (5 testes, com a régua única e a concordância). O resto de
    `docs/aulas-interativas/qa` (testes de cada curso) não foi rodado nessa sessão.
- `bun run build:kids` e `bun run build:community`.
- Varredura de travessão (`copy-sem-travessao`) já está no `bun test` do Kids.

## Documentação que falta atualizar
- `packages/community-kids/CLAUDE.md`:
  - o item do menu agora é "Explorar", não "Aprender";
  - o vocabulário da aventura;
  - o `KidsLessonCopy` em volta do `(app)`;
  - o guarda `copy-vocabulario` (parser TS, área dos pais fora, lista `SO_NO_ADULTO`);
  - o `conclusaoRecusada`.
- `packages/member-shell/CLAUDE.md`:
  - o `LessonCopy` e o `useLessonCopy`, com `erroDoServidor` (o Kids troca a frase do servidor pelo
    `code`);
  - o `voltarParaSecao` do `TeacherLessonLink`;
  - o conserto do PDF do certificado ("concluiu" duplicado, `bodyText`).
  - As linhas que citam "Esta atividade mudou" agora são "Esta experiência mudou" (o texto do
    player mudou, e o teste `lesson-scene-servidor-recusou` também).
- ✅ `DIRETRIZES-PEDAGOGICAS.md`, seção 6: pôr no glossário os nomes que surgiram depois:
  - Voltar à parte;
  - Seu projeto no Estúdio;
  - Objetivo do projeto (painel do Estúdio, com "meta alcançada" e "meta: N");
  - Minhas aventuras;
  - Aventuras da Lenda;
  - Abrir o Mural;
  - Recados da equipe, com o autor "Equipe" (era "Recados do guia" até a noite de 06/10);
  - Dúvida na fase / Seu projeto (rótulos dos recados).
- ✅ Conferir as citações de botões em:
  - `docs/aulas-interativas/ESPEC-ROTEIRO.md` (Próxima parte, Concluir fase, Enviar meu projeto,
    a fala do Mapa da Aventura e "clique no jogo e segure a seta");
  - `docs/aulas-interativas/README.md`;
  - `REFERENCIA-PLATAFORMA.md` (menu Explorar e Minhas criações, a setinha da lista de fases e a
    seção 9 nova, com os rótulos da fase no Kids);
  - `qa/novo-modelo.ts` (não cita botão; nada a mudar).
- `tests/visual/comunidade-preview.tsx` (Kids) ainda diz "Recados do professor" e "devolutivas".
  É só a maquete visual, mas vale alinhar.

## Trabalho no Admin e de produção (depois do deploy)
- Reimportar os manifestos dos cinco cursos, para levar os títulos de seção novos e o título do
  certificado "Certificado de Criador".
- Atualizar as descrições dos cursos.
- Trocar os anexos de PDF pelos novos `output/pdf/*-caderno.pdf`, com o rótulo "Mapa da Aventura".
- A arte da imagem-base do certificado do Farol precisa dizer "Certificado de Criador".
- Refazer os prints do Como Fazer. A lista é `docs/como-fazer/PRINTS-A-REFAZER-2026-10-06.md`:
  - 73 passos (71 imagens), com 15 a conferir, mais 3 prints novos da galeria
    (`plataforma-enviar-trabalho-da-galeria`, que não tinha imagem);
  - entraram o print do perfil (`plataforma-trocar-de-perfil/escolher`, "Quem vai criar hoje?") e
    o do certificado baixado de novo (`plataforma-pegar-certificado/novamente`, "Certificado de
    Criador"); o `abrir` do certificado agora mostra o caminho do Cadê Todo Mundo?;
  - o CDN estava bloqueado nesta sessão, então as imagens não foram abertas.
- Reimportar o `docs/como-fazer/como-fazer.json` em staging e produção (reconciliado por ambiente,
  como manda o README do Como Fazer): o full review mudou os textos dos 42 tutoriais ("clique em",
  Guia do Pensa, "Quem vai criar hoje?", certificado e Mural).
- Depois de reimportar os manifestos, gerar de novo as vozes do Zappy (botão do Admin) nas cenas e
  nos diálogos dos cinco cursos. As vozes são indexadas pelo texto, e as falas mudaram.
- Conferir se os certificados do Cadê e do Desafio têm imagem base no Admin. Com imagem, o título
  do PDF vem da arte e não do "Certificado de Criador" do manifesto.
- Meu Jeito: três comparações trocadas precisam de ilustração nova (fase 1 `video-copias`, fase 5
  `video-mudanca-pequena`, fase 6 `video-nomes`).
- Os PDFs foram gerados com o Chromium de Linux (o de antes era o Chrome de Windows). A captura do
  Corre não é determinística.

## Decisões da dona no full review (06/10, fim do dia)
- ✅ A grade de perfis pergunta "Quem vai criar hoje?". O código é de outro agente; o tutorial
  `plataforma-trocar-de-perfil` já diz assim. Falta o print (acima).
- ✅ No Como Fazer, botões e controles usam "clique em" ("clique no", "clique na"), como as falas.
  O toque num objeto dentro do jogo segue como as fases falam.
- ✅ "Guia" é só a pessoa que recebe o projeto. O painel do Pensa é o "Guia do Pensa", o nome que
  já está na tela. Revisto na mesma noite: a pessoa virou "a equipe" (seção abaixo).
- ✅ "Então" sem papel de ligação em todo curso em que a criança monta o bloco Se (Farol, Nave e
  Corre, Dino!).
- ✅ Três vozes e conversa contínua valem nos cinco cursos. A aplicação na Nave, no Corre e no Meu
  Jeito estava em andamento, com outros agentes.

## A equipe no lugar do guia (06/10, à noite)
"Enviar para o guia" soava estranho para a dona. O botão de envio passou a dizer o que a criança
envia, e quem recebe e responde os recados passou a ser a equipe. "Guia" ficou só no Guia do Pensa.
- ✅ Código (outra frente): **Enviar meu projeto** / **Enviar de novo** / **Enviar o seu projeto?** /
  **Recado (opcional)** / **Projeto enviado!** / **A equipe já viu o seu projeto.** no Estúdio da fase;
  **Enviar meu desenho** / **Enviar o seu desenho?** / **Desenho enviado!** no Pinta; **Enviar (1)** /
  **Recebido!** na galeria; **Enviar para a equipe** no pedido de ajuda; **Recados da equipe** e
  "1 recado novo da equipe" no sino; **Envie um projeto** na missão.
- ✅ Os cinco cursos: falas, pontes do Zappy, notas de gravação e Mapas da Aventura, editados na
  fonte e regenerados (manifestos, trios e os cinco PDFs). O tutorial de ajuda do Farol virou
  **Como pedir ajuda à equipe**.
- ✅ Como Fazer: cinco títulos novos (pedir ajuda, enviar um projeto, enviar da galeria, ler os
  recados e trazer o projeto enviado), passos e textos alternativos com os rótulos novos; slugs,
  ids e links iguais. A lista de prints diz o que cada um precisa mostrar agora.
- ✅ Diretrizes (seção 6), ESPEC-ROTEIRO, README, REFERENCIA-PLATAFORMA (seção 9) e os `modulos-*.md`.
- ✅ Guarda `GUIA_PESSOA` em `qa/palavras-da-escola.ts`: o `vocabulario-crianca.test.ts` confere o
  manifesto e o roteiro inteiros, e o `docs/como-fazer/validar.ts` confere os tutoriais.
- Falta, junto do resto acima: reimportar os manifestos e o `como-fazer.json` JUNTOS (os links do
  Farol citam o título novo do tutorial de ajuda), gerar de novo as vozes do Zappy das falas de
  envio, trocar os PDFs anexados, capturar os prints da galeria e gravar os vídeos com os botões novos.

## Guardas novos do full review
- ✅ Régua única das palavras da escola em `docs/aulas-interativas/qa/palavras-da-escola.ts`,
  agora com unidade, atividade, entrega, estudar, trabalho, devolutiva, lição, formatura e
  diploma. Usada pelo `vocabulario-crianca.test.ts`, pelo `validar-roteiros.py` (que lê o literal
  do arquivo) e pelo `docs/como-fazer/validar.ts`.
- ✅ Concordância ("o fase", "no parte", "próximo parte", "na Mundo") nos manifestos, nos roteiros
  e no Como Fazer.
- ✅ O `vocabulario-crianca.test.ts` passou a ler os rótulos de `completion.projectChecks`
  (Objetivos desta parte) e o `showcase` (título e resumo do Compartilhar).
- ✅ O Como Fazer barra palavra da escola, concordância errada e "toque em **Botão**" no título,
  no resumo, nos passos e no texto alternativo; ficam de fora as `keywords` e o endereço dos links.
- Os testes próprios do Corre (`corre-dino.test.ts`) e do Meu Jeito (`meu-jeito.test.ts`) ainda
  têm listas de palavras próprias, mais curtas; o Kids tem a dele em
  `packages/member-shell/src/lib/lesson-copy-kids.ts`. Vale trocá-las pela régua única quando os
  donos desses arquivos mexerem neles.

## Decisões em aberto para a dona
- No Pensa, "etapa" continua: é o nome dos passos do método ZERO (Etapa Z…), não da escola. O
  guarda do Como Fazer deixa passar "etapa" só no Pensa e explica por quê no código.
- As mensagens de erro do members seguem na voz adulta. O Kids troca as frases pelo `code`
  (`erroDoServidor`, `conclusaoRecusada`), e uma frase desconhecida com palavra da escola cai na
  frase padrão do componente.
