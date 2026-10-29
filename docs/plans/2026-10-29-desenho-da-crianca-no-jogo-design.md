# O desenho da criança no jogo, dentro da aula (design, 29/10/2026)

Decisão da dona, a partir do extra do Faísca **Meu primeiro desenho no Pinta**. No Faísca a criança
ainda não tem o Pinta Completo nem o Estúdio Completo: o extra usa só os blocos da aula (Pinta e
Estúdio). Ela desenha num bloco de Pinta e o desenho entra sozinho nos materiais do jogo do bloco
de Estúdio seguinte. Nada de baixar e reenviar arquivo.

Pedido da dona: "do jeito profissional, sem gambiarra". O vínculo entre os blocos é CONFIGURAÇÃO
de autoria (Admin e manifesto), nunca fixo no código, porque os dois blocos servem a muitos
cursos.

## O que existe hoje (levantamento de 29/10/2026)

- O bloco `pinta` da aula guarda o desenho no aparelho e na conta (criação `lesson-pinta`), e a
  entrega vai a `studio_submissions` com `kind: 'pinta'` (um `PintaAsset`).
- O bloco `studio` da aula não lê nada do Pinta. A cadeia (`chain`) só liga blocos do MESMO tipo
  (`findPrecedingChainBlock` filtra o kind). "Trazer do Pinta" e "Meus desenhos" são do Pinta
  Completo (`pintaOwned`) e ficam desligados na aula.
- O seletor de imagem do Estúdio (`FieldAssetPicker`) oferece qualquer imagem de `project.assets`
  pelo nome; basta o desenho estar lá.
- A Chave do Farol aceita qualquer personagem, barco, chave e cenário, mas o objetivo da parte do
  farol exige um dos quatro faróis acesos de fábrica.

## O desenho: a vaga de arte

Uma **vaga de arte** é um nome, válido no curso (como a `chain`), para um desenho que a criança
faz para um jogo: `minha-chave`, `meu-personagem`. O bloco de Pinta PREENCHE a vaga; o bloco de
Estúdio declara as vagas que IMPORTA.

### Bloco de Pinta (`PintaBlock.artSlot?`)

- `artSlot?: { name: string; replaces?: string }`.
  - `name`: o nome da vaga, que também vira o nome da imagem nos materiais do jogo. Mesma régua
    de forma dos nomes de asset do Estúdio (minúsculas, números e hífen).
  - `replaces`: o nome da imagem do jogo que o desenho substitui (`chave-dourada`). Serve para o
    Admin mostrar a referência e para o modo "trocar sozinho" do Estúdio.
- O tipo (pixel art ou vetor) e o tamanho continuam escolhidos no bloco, como hoje (o snapshot
  `initialAsset`). Não há molde por baixo do desenho (decisão da dona: confundiria a criança; o
  vídeo da aula ensina a desenhar).
- No Admin, seção **Desenho para o jogo**: escolher o jogo de referência (um bloco de Estúdio do
  curso), ver as imagens dele com miniatura e nome, escolher a que a criança vai redesenhar. O
  nome da vaga sugere `minha-<nome>`/`meu-<nome>` e pode ser editado.

### Bloco de Estúdio (`StudioBlock.artSlots?`)

- `artSlots?: { name: string; mode: 'add' | 'replace' }[]` (até 8).
  - `add` (padrão): o desenho entra em Materiais › Imagens com o nome da vaga; a criança faz a
    troca nos blocos. É o caso do extra, porque a troca é o que ela aprende.
  - `replace`: o desenho toma o lugar da imagem `replaces` da vaga; os blocos que já usavam a
    imagem passam a mostrar o desenho. Para cursos em que trocar não é o assunto.
- No Admin, seção **Desenhos da criança**: as vagas dos blocos de Pinta ANTERIORES do curso, com
  uma caixinha para importar e o modo.

### Na aula

1. Ao abrir o bloco de Estúdio, o member-shell pede ao members a entrega mais recente de cada vaga
   (`GET /members/lessons/:lessonId/blocks/:blockId/art-slots`). O members resolve, no mesmo curso,
   o bloco de Pinta publicado de cada vaga e devolve a entrega do PERFIL (régua do carryover:
   acesso pela conta, conteúdo pelo perfil). Sem entrega, a vaga vem vazia.
2. O member-shell converte o `PintaAsset` em imagem do Estúdio com o exportador que o Pinta já
   usa para o Estúdio (`packages/pinta/src/export/studioLibrary.ts`; vetor vira SVG, pixel vira
   PNG), dentro dos tetos do Estúdio (512 px, 800 mil caracteres por imagem).
3. A imagem entra em `project.assets` com o nome da vaga e uma origem própria
   (`source: 'lesson-art'`), fora da impressão do conteúdo como as imagens da biblioteca do curso
   (senão toda abertura marcaria o projeto como mudado). Vaga vazia: no `add` não entra nada e a
   criança vê só as imagens do jogo; no `replace` fica a imagem original. O jogo nunca quebra.
4. Redesenhou e reenviou o Pinta: a próxima abertura do Estúdio traz a versão nova com o mesmo
   nome, e os blocos que já usavam o desenho o mostram sem nenhuma troca.

### Manifesto e validação

- Os dois campos viajam no `content` dos blocos e no DTO do members (TypeBox declara tudo; o
  `normalize` do Elysia descarta o resto).
- A autoria recusa, ao salvar o bloco e ao importar ou publicar o manifesto:
  - duas vagas com o mesmo nome no curso;
  - um Estúdio importando uma vaga que nenhum Pinta do curso preenche;
  - uma vaga preenchida só DEPOIS do Estúdio que a importa (ordem do curso);
  - `replace` sem `replaces` na vaga, ou com `replaces` que não é imagem do jogo do bloco;
  - `add` com o nome de uma imagem que o jogo já tem (acrescentada na etapa 2: o desenho colidiria
    com a imagem nos materiais).
- A ordem é a do curso até a PARTE da aula (módulo, aula, parte, bloco): na mesma aula, o desenho
  vem numa parte antes do jogo. Reordenar e excluir aulas e módulos passam pela mesma conferência.
- Só recusa o que a gravação cria: um curso que já tem um problema não prende quem mexe em outra
  coisa. O "Conferir" do rascunho mostra o problema antes do "Publicar".
- O conteúdo da vaga é do aluno: a view pública do bloco leva os nomes, nunca a entrega de outro
  perfil.

### Objetivos

- O objetivo de montagem do farol (Chave do Farol, partes `decisao` em diante) deixa de exigir os
  quatro faróis de fábrica: aceita qualquer imagem no **Trocar imagem do sprite farol** do então.
  O objetivo que roda o jogo confere que a imagem do farol MUDA ao vencer. A exceção de 06/10/2026
  sai das diretrizes.
- No extra, o objetivo da troca confere a imagem `minha-chave` no **Criar sprite com imagem** da
  chave (estrutura) e que a chave continua sendo recolhida (execução).

## O extra "Meu primeiro desenho no Pinta" (Faísca)

Uma aula curta, depois do par do posto, com o jogo pronto da Chave do Farol:

1. Jogo pronto e Passo a passo do projeto.
2. **Desenhe a sua chave**: bloco de Pinta em vetor, quadro quadrado (a chave do jogo é um sprite
   de 32 × 32), vaga `minha-chave` (`replaces: chave-dourada`). O vídeo ensina as ferramentas que o
   bloco libera e o desenho passo a passo. Entrega do desenho.
3. **A sua chave no jogo**: bloco de Estúdio com `artSlots: [{ name: 'minha-chave', mode: 'add' }]`.
   A criança troca a imagem da chave pela dela, testa e envia.

Operação de interface (escolher cor, desenhar forma) não é conceito e não ganha experiência
(DIRETRIZES, seção 2). O extra não exige nada para subir de posto.

## Fora do escopo

- Molde por baixo do desenho.
- Desenho no 3D (não há molde 3D no Faísca).
- Levar o desenho para o Estúdio Completo ou para "Meus desenhos" (o Pinta Completo já faz isso).
- Desenhar o farol (duas imagens, apagado e aceso). O objetivo do farol já fica livre para um
  extra futuro.

## Plano de implementação

Ordem pensada para cada passo ficar verde sozinho. ⚠️ Mudança de contrato de bloco: o members sobe
antes do Admin, do member-shell e dos apps.

1. **Core e members, contrato.** `PintaBlock.artSlot` e `StudioBlock.artSlots` no domínio
   (`packages/members/src/domain/course/lesson-block.ts`), validação de forma e tetos, DTO TypeBox,
   projeção pública (nomes sim, entrega não). Testes unitários do domínio.
2. **Members, validação de curso.** ✅ (29/10/2026) As recusas na publicação do rascunho (por onde
   passa a importação de manifesto), em reordenar e excluir aula e módulo e no `BlockAdminService`,
   sob a trava da linha do curso (`withStudioAuthoringLock`). Teste SQL da consulta em
   `tests/db/art-slots-sql.test.ts`.
3. **Members, leitura da aula.** ✅ (29/10/2026) `GET /members/lessons/:lessonId/blocks/:blockId/art-slots` →
   `{ slots: { name, mode, replaces, asset: PintaAsset | null }[] }` (`GetArtSlotsService`, acesso pela conta,
   entrega pelo perfil, só blocos publicados). Rota no gateway. Teste de integração.
4. **Studio, a origem `lesson-art`.** ✅ (29/10/2026) Asset com `source: 'lesson-art'` fora da impressão do conteúdo
   e do teto do projeto contado como os da biblioteca; o seletor mostra o desenho com o nome da
   vaga. Testes em `core/projectAssets` e no `FieldAssetPicker`.
5. **Member-shell, o bloco de Estúdio.** ✅ (29/10/2026) Buscar as vagas ao montar o projeto, converter com o
   exportador do Pinta e mesclar nos assets (`add`) ou substituir (`replace`). Falha de leitura ou
   de conversão não derruba o bloco: segue sem o desenho e mostra um recado curto. Testes do bloco.
6. **Admin.** ✅ (29/10/2026; as opções vêm do rascunho da aula, outra aula entra pelo nome) Seções **Desenho para o jogo** (Pinta) e **Desenhos da criança** (Estúdio) em
   `packages/admin/src/components/editor/lesson-structure-editor.tsx`, lendo as imagens do jogo do
   bloco de Estúdio escolhido e as vagas anteriores do curso.
7. **Chave do Farol, objetivo do farol livre.** ✅ (29/10/2026; a imagem que muda é lida em `farol.imageName`) `desafio-farol-criterios.ts` (estrutura com
   qualquer imagem + execução "a imagem do farol muda ao vencer"), cenários do executor 2D,
   manifestos regenerados e a exceção retirada das DIRETRIZES.
8. **O extra.** ✅ (29/10/2026; `docs/aulas-interativas/faisca/meu-primeiro-desenho-no-pinta`, curso `jornada-faisca-extra-2`. A entrega do desenho fica na parte de Entrega e o jogo no Fechamento, porque a régua das entregas só aceita Estúdio ou Pinta nessas partes; assim o desenho é enviado antes de o jogo abrir) Proposta, conteúdo (roteiro na régua das DIRETRIZES), gerador, manifesto, caderno
   PDF no padrão do Cadê, registro no curso e na jornada (`creator-journey-curriculum.json`, a
   tabela do Faísca), validadores e testes do curso.
9. **Verificação de ponta a ponta.** ✅ (29/10/2026; `packages/community-kids/e2e-art-slots`, `bun run e2e:art-slots`, também no CI: o members de verdade em memória com o extra importado e publicado, o executor de verdade no Chromium e os componentes reais da aula. O ensaio pôs no roteiro o Entendi! das Dicas rápidas do Pinta, o Expandir nos dois blocos, rolar até o fim das Imagens e esconder a pré-visualização para ver o fim do bloco; afastou as áreas do projeto do extra, porque o Quando acontecer cobria a imagem da chave; e achou o teto de 2000 caracteres do texto dos materiais na publicação, que o members agora alinha aos 50000 do core) Navegador real: desenhar no Pinta da aula, enviar, abrir o
   Estúdio da parte seguinte, ver `minha-chave` em Materiais, trocar, jogar, verificar e enviar;
   redesenhar e ver o jogo atualizado.
