# Cursos ao vivo: a oficina vira um curso com modalidade (14/10/2026)

Decisões da dona, tomadas na conversa de 14/10/2026 depois do full review das oficinas
(`docs/plans/2026-10-14-oficinas-ao-vivo-full-review.md`). Este documento substitui o "roteiro da
oficina" (`LiveProgram` com `LiveLessonPlan`) por um CURSO de modalidade "ao vivo".

## 1. O que ela decidiu

1. **Um curso tem UMA modalidade: gravado OU ao vivo.** São dois produtos. O mesmo tema nas duas
   formas são dois cursos (o clone de curso que já existe ajuda a começar um a partir do outro).
2. **Gravado** é o de hoje: trilha, Jornada do Criador, catálogo.
   **Ao vivo** só aparece em **Oficinas**. Nunca na trilha, nunca na Jornada, nunca ocupa posição
   (`careerSlot`), nunca entra na chave-mestra. "É uma coisa a mais, para vender mais."
3. **Mesma infraestrutura de aula**: módulos, aulas, partes (seções), blocos, o MESMO editor e o
   MESMO manifesto. A diferença é a transmissão: a aula ao vivo não tem bloco de vídeo, tem a
   **Transmissão do encontro**, que é da aula inteira (não de uma parte).
4. **A turma é de um curso ao vivo.** Cada aula é um encontro marcado. O acesso dura o prazo da
   turma (`accessDays`, como hoje), e durante o prazo a criança revê com a gravação.
5. **A gravação vai para o Vimeo**, como os vídeos dos cursos gravados (mesma privacidade, mesma
   pasta). O arquivo da plataforma só fica até o Vimeo terminar de processar.
6. **Capítulos por parte**: cada vez que a professora abre uma parte, a plataforma marca o tempo.
   Na gravação, abrir a parte leva o vídeo ao trecho dela ("Ver este trecho").
7. **Layout da sala = layout da aula gravada**: esquerda com a transmissão FIXA no alto e a
   orientação curta da parte embaixo; direita com a atividade da parte (Estúdio, cena, quiz). A
   divisória arrasta; o Estúdio ampliado leva a transmissão para o vídeo flutuante; no celular,
   empilha (vídeo fixo no alto, a parte embaixo, abas Ver/Criar). Botão "Ampliar a transmissão".
8. **Ritmo conduzido pela professora**: ela abre as partes ("Próxima parte"); a tela de todos vai
   para a parte aberta com o aviso "A turma está na parte N". A criança pode VOLTAR às partes já
   abertas, nunca pular para a frente ("A professora abre já já"). Depois do encontro (gravação,
   durante o prazo) tudo abre e cada uma vai no próprio ritmo. A professora vê nos cartões quem
   já concluiu a parte. Quem termina antes usa um bloco opcional (desafio extra) que a autora põe.
9. **Recompensas**: XP, foguinho e missões contam, com a MESMA régua do gravado (nada de bônus
   por presença). Conquistas próprias ("Primeiro encontro ao vivo", "Oficina completa", com troféu
   no quarto). Níveis, postos e posições da Jornada NÃO. Missões de oficina só para quem tem
   turma ativa (como as do Clube/Estúdio).
10. **Mural**: a criança pode publicar o jogo feito na oficina (já existe na sala).
11. **Um projeto só**: o Estúdio da sala é o BLOCO ESTÚDIO da aula. A ajuda da professora
    (entrar no projeto, devolver) passa a funcionar nesse bloco.
12. **Desenho sobre a tela e quadro branco** durante a transmissão: caneta, marca-texto, seta,
    retângulo, círculo, texto, borracha, limpar, "luz mágica" (ponteiro que brilha e some) e quadro
    branco (fundo branco ou escuro). O desenho entra NA imagem transmitida (as crianças veem e fica
    na gravação).
13. **Separação por plataforma** (Kids × Adultos) igual aos cursos: vem do `audience` do curso. O
    Admin filtra pelo seletor de plataforma; a comunidade adulta ganha as telas de Oficinas.
14. **Anotações da professora por parte**: campo visível só para quem conduz ("mostrar o bloco de
    colisão, desenhar a seta no sprite"). Nunca chega à criança.

## 2. Contrato (core)

- `CourseModality = 'recorded' | 'live'` em `CourseView`/DTO do members (padrão `recorded`).
  Validação: curso `live` não aceita `careerSlot` (recusa com recado) nem `journeyRole`.
- `LessonSection.teacherNotes?: string` (até 4000). Só autoria e sala da professora; a view do
  aluno (`GetLessonService`, sala da criança) NUNCA leva o campo.
- `LiveCohort.courseId: string` (o curso ao vivo) no lugar de `programId`.
  `LiveSession.lessonId: string` + `order`; `plan` sai. `LiveCreateCohort.schedule` = um intervalo
  por AULA PUBLICADA do curso, na ordem do curso.
- `LiveOccurrence.section?: { openedIds: string[]; currentId: string | null }` e
  `LiveOccurrence.marks?: { sectionId: string; at: string }[]` (instante ISO de cada abertura).
  Comando novo `{ kind: 'open-section'; sectionId: string }` (professora, só ao vivo; abre e
  torna atual; reabrir uma já aberta só muda a atual, sem marca nova).
- `LiveParticipation.activity` passa a reportar `sectionId` (no lugar de `stepId`) e
  `completedSectionIds?: string[]` vem do progresso real da aula (para os cartões da professora).
- Gravação: `recording.vimeo?: { videoId: string; embedUrl: string; status: 'processing' | 'ready'
  | 'failed' } | null` e `recording.chapters?: { sectionId: string; seconds: number }[]` (offset na
  gravação, descontando as pausas). A sala devolve a gravação da OCORRÊNCIA da turma da criança.
- `LiveRoomView` ganha `lesson: { courseSlug: string; lessonId: string }` para a sala montar o
  player da aula pelas rotas de aula de sempre. O `plan`/`planRevision`/`steps`/`materials` da sala
  SAEM (o conteúdo vem da aula).
- Sai: `LiveProgram`, `LiveLessonPlan`, `LiveLearningStep*`, `LiveMaterial`, templates
  (`live_project_templates`), `suggest-step`, `LiveLearningService` (atividades das partes passam
  pelas rotas de aula). O que for tabela fica sem uso nesta release e é removido depois (as
  oficinas nunca foram para produção; dado de staging pode ser descartado: turmas antigas viram
  `archived`).

## 3. Acesso

`CheckAccessService` (members) aprende a modalidade:
- curso `recorded`: como hoje (matrícula/chave-mestra/trava da Jornada).
- curso `live`: a aula abre para quem tem `live_access_grants` ATIVO da sessão daquela aula
  (dentro do prazo), para a professora atribuída à turma e para a equipe. A chave-mestra NÃO dá
  acesso a curso ao vivo. A trava sequencial e a trava por data não se aplicam fora disso: o
  grant já é por aula e por data.
Com isso TODAS as rotas de aula (progresso, vídeo, quiz, Estúdio, Pinta, materiais com marca
d'água, ajuda) funcionam para a aula ao vivo sem rota nova. Durante o encontro a navegação entre
partes é conduzida (item 1.8); depois, livre.

## 4. Onde o curso ao vivo NÃO entra

Listagens do aluno (trilha, mapa da Jornada, catálogo, "Meus cursos" da home), gamificação da
Jornada (níveis/posições), chave-mestra `all_courses`/`all_kids_courses`, liberação de blocos do
Estúdio pelo currículo, base do Zappy e o seletor de "Ver como aluno" para cursos (o ao vivo abre
pela sala). Toda consulta que filtra `status='published'` para essas superfícies passa a filtrar
`modality='recorded'` também (lista do mapeamento: `course.repository.ts`, `gamification.repository`,
`learning.repository`, `studio-unlock-eligibility`, `zappy-knowledge.repository`).

## 5. A sala

- **Criança**: `LessonSections` com o `LessonPlayerProvider` real (rotas de aula) e duas props
  novas: `stage` (a transmissão, fixa no alto da coluna da esquerda; no empilhado, fixa no alto) e
  `sectionControl` (`{ openedIds, currentId }`: navegação só entre as abertas; trocar a atual leva
  a criança junto, com o aviso). A barra de chamada (microfone, câmera, falar, ajuda, conversa,
  materiais) fica no rodapé como na sala redesenhada.
- **Professora** (Admin): a mesma aula, com os controles da sala, os cartões da turma (com quem
  concluiu a parte), "Próxima parte" e as anotações da parte.
- **Estúdio**: no curso ao vivo, o bloco Estúdio usa o projeto ao vivo (`live_workspaces`:
  revisões, lease, ajuda da professora) em vez do rascunho local + envio. Chave do projeto =
  (curso, criança, `chain` do bloco ou o id do bloco). Semente = `initialProject` do bloco;
  curadoria = os campos do bloco. Publicar no Mural continua pela prova HMAC do projeto ao vivo.
  Não há "Enviar para a equipe" no ao vivo (a professora vê o projeto ao vivo).
- **Gravação na aula**: durante o prazo, a mesma tela com a gravação no Vimeo no lugar da
  transmissão; abrir uma parte leva o vídeo ao capítulo dela.

## 6. Gravação → Vimeo

Quem tem as credenciais do Vimeo é o Admin. Ao PUBLICAR a gravação revisada, o Admin pede ao
members uma URL temporária do MP4 e cria o vídeo no Vimeo por `pull` (o Vimeo baixa), com a
privacidade e a pasta de sempre; guarda `vimeo.videoId` na gravação; acompanha o processamento como
faz com os vídeos das aulas. Pronto no Vimeo → a criança assiste pelo player do Vimeo (com a marca
d'água dos vídeos das aulas). O MP4 da plataforma pode ser apagado depois do `ready`.

## 7. Admin

- Curso: campo **Modalidade** (Gravado / Ao vivo) na criação; trocar depois só sem turma. Selo e
  filtro na lista. Curso ao vivo esconde "Posição na jornada".
- Editor de aula do curso ao vivo: cartão fixo "Transmissão do encontro" no topo; sem bloco de
  vídeo na lista de blocos (bloco antigo continua editável, com aviso); campo "Anotações da
  professora" em cada parte.
- Manifesto: o mesmo formato; numa aula de curso ao vivo, `plannedVideo` é recusado com recado e
  cada seção aceita `teacherNotes`.
- **Oficinas ao vivo** (Admin) vira a gestão das TURMAS dos cursos ao vivo, filtrada pela
  plataforma: escolher o curso, datas por aula, professoras, vagas, inscrições. O editor de
  roteiro antigo sai.

## 8. Aluno (Kids e adulto)

- Oficinas: as turmas dos cursos ao vivo em que a criança tem vaga (próximo encontro, encontros,
  gravações), sem divulgação nas outras telas.
- Comunidade adulta: as mesmas páginas (sala, oficinas, área de pais não se aplica).
- Trilha/Jornada: só gravados.

## 9. Ordem de entrega

1. Contrato + servidor (modalidade, turma de curso, acesso, partes conduzidas, marcas, exclusões,
   conquistas, gravação com Vimeo e capítulos, Estúdio ao vivo por bloco).
2. Admin (modalidade, editor da aula ao vivo, turmas, publicação no Vimeo, manifesto).
3. Sala e telas do aluno (layout da aula com a transmissão, partes conduzidas, gravação com
   capítulos, Oficinas nos dois apps).
4. Desenho sobre a tela e quadro branco (independente, pode andar em paralelo).

## 10. Rotas e nomes combinados entre as frentes

O contrato TS está em `packages/core/src/live/contracts.ts` (campos novos ao lado dos antigos,
marcados `@deprecated`; a limpeza final apaga os antigos) e `packages/core/src/course/modality.ts`.

**Members (via gateway):**
- Cursos: `modality` em `CourseView`, no POST e no PATCH de curso (`/members/admin/courses`), e o
  filtro `?modality=recorded|live` na listagem admin. Trocar a modalidade só sem turma.
- `GET /members/admin/live/catalog?audience=adult|kids` → `LiveCatalogView` com `courses`
  (cursos ao vivo da plataforma, com as aulas publicadas) + `cohorts` + `sessions`.
- `POST /members/admin/live/courses/:courseId/cohorts` (corpo `LiveCreateCohort` sem `courseId`)
  substitui `/programs/:id/cohorts`. As rotas `/programs*` saem.
- `GET /members/admin/live/sessions/:id/lesson` → a aula PUBLICADA do encontro no formato da view
  do aluno + `teacherNotes` em cada parte (equipe ou professora atribuída).
- Gravação: `GET /members/admin/live/occurrences/:id/recording/source` → `{ storageKey, bucket }`
  da gravação revisada (o Admin assina a URL temporária com as credenciais dele) e
  `PUT /members/admin/live/occurrences/:id/recording/vimeo` `{ videoId, embedUrl, status }`.
- Projeto ao vivo por bloco: `GET /members/live/workspaces?sessionId=<id>&blockId=<id>` abre ou
  cria o projeto da criança para o bloco Estúdio da aula (chave = curso + criança + `chain` do
  bloco ou o id do bloco). As demais rotas do projeto seguem pelo id do projeto.
- Comando da sala `{ kind: 'open-section', sectionId }`.
- O relato de atividade (`/sessions/:id/heartbeat` ou o que a sala usa hoje) aceita `sectionId` e
  `completedSectionIds`.

**Gamificação:** conquistas `live-first-encounter` ("Primeiro encontro ao vivo") e
`live-course-complete` ("Oficina completa", troféu `trofeu-oficina-completa` no quarto); missão
semanal `live_encounter` ("Participe de um encontro ao vivo"), só para quem tem vaga ativa.
Lockstep: `BADGE_SLUGS` (members) + `BadgeSlug` (member-shell) + `BADGE_INFO` e o catálogo do
quarto (kids), travados pelos testes de conformidade.

**Sala (member-shell):** `LessonSections` ganha `stage?: ReactNode` (a transmissão, fixa no alto
da coluna da esquerda; no empilhado, fixa no alto) e `sectionControl?: { openedIds: string[];
currentId: string | null }` (navegação só entre as abertas; mudar `currentId` leva a criança
junto com o aviso "A turma está na parte N"). Sem as duas props, nada muda para as aulas gravadas.
