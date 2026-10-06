# Vocabulário da aventura: o que falta (06/10/2026)

O commit desta data subiu a troca de vocabulário da área da criança: curso → aventura, aula → fase,
seção → parte, unidade → Mundo, caderno → Mapa da Aventura, professor → guia. O menu "Aprender"
virou "Explorar". A regra está em `docs/aulas-interativas/DIRETRIZES-PEDAGOGICAS.md`, seção 6.
O envio foi feito às pressas, a pedido da dona; esta nota diz o que ficou sem conferir.

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
- `bun docs/aulas-interativas/qa/validar-manifestos.ts`.
- `bun test docs/aulas-interativas/qa` (inclui `vocabulario-crianca.test.ts`).
  - ⚠️ O agente do Meu Jeito viu falhar `diretrizes-pedagogicas.test.ts` em `desafio/dia-3:
    ponte-d3-decisao`: o manifesto dizia "Complete a parte então" e o roteiro "Complete o espaço do
    então".
  - O agente do Farol depois regenerou os manifestos, então deve estar resolvido. Conferir.
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
- `DIRETRIZES-PEDAGOGICAS.md`, seção 6: pôr no glossário os nomes que surgiram depois:
  - Voltar à parte;
  - Seu projeto no Estúdio;
  - Objetivo do projeto (painel do Estúdio, com "meta alcançada" e "meta: N");
  - Minhas aventuras;
  - Aventuras da Lenda;
  - Abrir o Mural;
  - Recados do guia, com o autor "Guia";
  - Dúvida na fase / Seu projeto (rótulos dos recados).
- Conferir as citações de botões em:
  - `docs/aulas-interativas/ESPEC-ROTEIRO.md`;
  - `docs/aulas-interativas/README.md`;
  - `REFERENCIA-PLATAFORMA.md`;
  - `qa/novo-modelo.ts`.
- `tests/visual/comunidade-preview.tsx` (Kids) ainda diz "Recados do professor" e "devolutivas".
  É só a maquete visual, mas vale alinhar.

## Trabalho no Admin e de produção (depois do deploy)
- Reimportar os manifestos dos cinco cursos, para levar os títulos de seção novos e o título do
  certificado "Certificado de Criador".
- Atualizar as descrições dos cursos.
- Trocar os anexos de PDF pelos novos `output/pdf/*-caderno.pdf`, com o rótulo "Mapa da Aventura".
- A arte da imagem-base do certificado do Farol precisa dizer "Certificado de Criador".
- Refazer os prints do Como Fazer. A lista é `docs/como-fazer/PRINTS-A-REFAZER-2026-10-06.md`:
  - 71 passos (69 imagens), com 17 a conferir;
  - o CDN estava bloqueado nesta sessão, então as imagens não foram abertas.
- Meu Jeito: três comparações trocadas precisam de ilustração nova (fase 1 `video-copias`, fase 5
  `video-mudanca-pequena`, fase 6 `video-nomes`).
- Os PDFs foram gerados com o Chromium de Linux (o de antes era o Chrome de Windows). A captura do
  Corre não é determinística.

## Decisões em aberto para a dona
- "Quem vai aprender hoje?" (grade de perfis, `perfis-client.tsx`) ficou como está. Trocar para
  "Quem vai criar hoje?" mudaria também o tutorial `plataforma-trocar-de-perfil` e o print dele.
- No Pensa, "etapa" continua: é o nome dos passos do método ZERO (Etapa Z…), não da escola.
- As mensagens de erro do members seguem na voz adulta. O Kids troca as frases pelo `code`
  (`erroDoServidor`, `conclusaoRecusada`), e uma frase desconhecida com palavra da escola cai na
  frase padrão do componente.
