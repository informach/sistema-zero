# Unificação de aulas, linguagem e produção de voz — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Neste repositório, a skill disponível equivalente é `executing-plans`. Não exigir instalação de uma skill ausente para ler ou continuar o plano. A execução pode ser sequencial; este registro não determina delegação.

**Goal:** Manter uma única fonte dos cinco cursos, com linguagem comum nas duas comunidades, uma gravação principal por aula e substituições kids localizadas e documentadas.

**Architecture:** Consolidar a autoria em `docs/aulas-interativas/<curso>/`, mantendo os identificadores publicados. Compartilhar a linguagem operacional e os conteúdos; a vinculação de mídia seleciona o master ou a montagem kids. Gerar os arquivos de fala e o índice de edição a partir de um roteiro de produção único, com tags ElevenLabs v4 e intervenções marcadas.

**Tech Stack:** Bun/TypeScript, React/Next.js, Python, Markdown, manifestos v5, geradores de PDF existentes e ElevenLabs v4 na etapa de produção de áudio.

**Spec:** [Decisões e desenho](../../plans/2026-10-21-unificacao-aulas-plataforma-design.md) e [contrato de voz](../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Estado da execução em 21/10/2026

Implementação local de T1–T4 e T6–T8 realizada, com revisão local de T9 concluída e base remota `8583a6e67` integrada. O usuário autorizou commit, merge e push em staging. Os itens de geração/escuta de voz, ensaio humano, vínculo de mídia remota, importação, publicação e percurso E2E continuam pendentes. Não confundir as caixas da implementação local com liberação em produção. Os resultados efetivos e as últimas decisões de tom/ilustrações estão no [registro de continuidade](../../continuity/2026-10-21-unificacao-aulas-plataforma/README.md).

## Global Constraints

- Uma única fonte editorial dos cursos para os públicos infantojuvenil e adulto.
- A professora grava TUDO; intervenções kids substituem trechos da mesma fala, sem regravar a professora.
- A aula principal deve funcionar integralmente sem Debinha e Dedé.
- Curso → aula → parte; Próxima parte; Verificar esta parte; Enviar meu projeto; Concluir aula.
- Linguagem simples, humor possível, exemplos acessíveis às diferentes idades e instruções completas.
- `.elevenlabs.txt` contém somente falas, tags de áudio e pausas; nenhuma nota, identificação ou título.
- Pausa longa entre partes gravadas; alvo editorial de cerca de três segundos, conferido no áudio.
- ElevenLabs v4: sem SSML `<break>` e sem promessa de duração exata de tags.
- Preservar identificadores, projetos salvos, anexos, mídias, respostas, envios, conclusões e certificados.
- Não juntar acesso ou contas dos dois públicos. Não mudar comportamento pedagógico por simples troca de palavras.
- A referência de voz é a URL oficial registrada no contrato; confirmar novamente antes da geração real.
- Executar verificações por lote e de forma serial nesta máquina. Não abrir serviços, Docker ou builds para conferir apenas documentos.

## Estado na criação do plano

- Branch observada: `staging`; HEAD observado: `c133a2ff5`.
- Foram encontrados cinco cursos e 37 manifestos em cada público: Cadê 3, Farol 4, Nave 9, Dino 13, Meu Jeito 8.
- A comparação da sessão anterior encontrou a mesma ordem de chaves de blocos nos 37 pares e projetos incorporados iguais. Revalidar essa evidência antes de migrar, porque o repositório pode mudar.
- Os diretórios atuais continuam `kids/` e `adulto/`; nenhum item de implementação abaixo foi executado nesta sessão.
- A decisão mais recente inclui a técnica de pensamento citado: a professora grava a frase completa e o personagem substitui somente o pensamento entre aspas na montagem kids.

## Dependências e arquivos

Executar T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9. Atualizar o [registro de continuidade](../../continuity/2026-10-21-unificacao-aulas-plataforma/README.md) ao encerrar cada tarefa.

| Frente | Fontes existentes principais |
| --- | --- |
| Contrato de linguagem | `packages/member-shell/src/lib/lesson-copy.ts`, `lesson-copy-kids.ts`, `components/lesson-copy-context.tsx` |
| Players e quiz | players dos dois apps em `src/app/(app)/cursos/[slug]/aulas/[lessonId]/`; `member-shell/src/components/quiz-block.tsx`; `community-kids/src/components/kids/kids-quiz.tsx` |
| Guardas | `community-kids/tests/copy-vocabulario.test.ts`; `docs/aulas-interativas-tecnico/qa/palavras-da-escola.ts`; `qa/vocabulario-crianca.test.ts` |
| Geradores | `qa/gerar-cade-todo-mundo.ts`, `gerar-desafio-farol.ts`, `gerar-nave-contra-asteroides.ts`, `gerar-corre-dino.ts`, `gerar-meu-jeito.ts` |
| Caminhos e validação | `qa/caminhos.ts`, `qa/validar-manifestos.ts`, `validar-roteiros.py`, testes dos cursos e `.github/workflows/ci.yml` |
| PDFs | `recursos/cade-todo-mundo/`, `desafio-farol/`, `nave-contra-asteroides/`, `corre-dino/`, `meu-jeito/` |
| Importação | `packages/admin/src/components/editor/lesson-manifest-import.tsx`, `src/lib/lesson-manifest-export.ts` e seus testes |
| Ajuda | `docs/como-fazer/como-fazer.json`, `docs/como-fazer-adulto/como-fazer.json` e ambos os validadores |
| Orientações de autoria | diretrizes pedagógicas/adultas, briefing, especificações, README técnico e `.agents/skills/aula-roteiro/SKILL.md` |

### T1. Inventariar a migração e preservar a referência atual

**Arquivos:** criar `docs/continuity/2026-10-21-unificacao-aulas-plataforma/inventario.md` e `destinos-publicacao.json` quando os destinos reais forem consultados. Este último armazena somente IDs e vínculos, sem credenciais.

**Entrada:** estado real do checkout e documentos desta decisão. **Saída:** lista completa das 37 aulas, consumidores das duas árvores e matriz de vínculos publicados por público.

- [x] Registrar branch, HEAD e alterações prévias. Não sobrescrever mudanças de outras sessões.
- [x] Listar os 37 pares e comparar `lessonSlug`, chaves de parte/bloco, projetos, critérios, anexos e mídias. Separar diferenças editoriais das diferenças de publicação.
- [x] Inventariar todos os rótulos narrados, incluindo variações mencionadas pelo usuário: Concluir aventura/fase/aula e Próxima parte/etapa/seção. Registrar ocorrências reais, sem supor que todas essas variantes existem.
- [x] Mapear catálogo, jornada, ajuda, erros de servidor, acessibilidade, quizzes, verificação, envio, publicação e certificados. Registrar componente e caminho para cada ocorrência.
- [ ] Consultar destinos remotos somente pelos meios de autoria existentes quando essa etapa começar. Se não houver acesso, concluir o inventário local e manter a publicação separadamente pendente.

```powershell
git status --short
git rev-parse HEAD
rg -n 'Concluir (aventura|fase|aula)|Próxima (parte|etapa|seção)|Enviar (meu projeto|para o professor)' packages docs/como-fazer docs/como-fazer-adulto
rg -l 'aulas-interativas/(kids|adulto)|PASTA_CURSOS_ADULTO|gerar-adulto' docs/aulas-interativas-tecnico packages scripts .github .agents/skills/aula-roteiro
```

**Aceite:** cada aula tem origem, destino e estado de mídia; cada consumidor tem destino de atualização. Não usar nomes ou slugs presumidos para substituir IDs publicados.

### T2. Aplicar a linguagem comum aos fluxos narrados

**Modificar:** arquivos de copy, contexto, players, componentes de envio/publicação/certificado, quiz e guardas identificados em T1. **Criar:** `packages/member-shell/tests/lesson-copy-comum.test.ts`.

**Interface:** exportar `COMMON_LESSON_COPY: LessonCopy` em `lesson-copy.ts`, consumida pelas duas comunidades e pela prévia pertinente do Admin. Adaptar os consumidores dos exports antigos no mesmo lote; evitar manter duas tabelas independentes. Preservar `SectionPendingItem`, códigos de erro e contratos de API existentes.

- [ ] Escrever casos que exponham a diferença atual de rótulos e repetir os casos nos dois públicos. Confirmar falha antes da alteração.
- [x] Aplicar a tabela comum da especificação e conferir verbos, gênero e estados em andamento, falha, reenvio e sucesso.
- [x] Atualizar os guardas que hoje proíbem curso/aula. Substituir essa proibição por testes dos rótulos comuns e pela detecção das variantes antigas nos contextos de navegação. Conservar as verificações de jargão interno, leitura de fontes e concordância ainda pertinentes.
- [x] Ajustar explicitamente cada fluxo diferente que aparece no vídeo. Para quiz, preservar metas, respostas corretas, revisão e tentativas. Para publicação, oferecer o mesmo encaminhamento de copiar o link nos dois públicos, mantendo as permissões.
- [x] Conferir a mesma linguagem na prévia do Admin, erros e rótulos acessíveis. Não mudar URLs, chaves ou regras de acesso para traduzir uma palavra.

Exemplo de contrato a fixar no teste novo, depois de criar o export:

```typescript
import { expect, test } from 'bun:test'
import { COMMON_LESSON_COPY } from '../src/lib/lesson-copy'

test('a navegação e a entrega usam a linguagem comum', () => {
  expect(COMMON_LESSON_COPY.secoes.proxima).toBe('Próxima parte')
  expect(COMMON_LESSON_COPY.verificacao.botao).toBe('Verificar esta parte')
  expect(COMMON_LESSON_COPY.estudio.enviar).toBe('Enviar meu projeto')
})
```

```powershell
bun test packages/member-shell/tests/lesson-copy-comum.test.ts
bun test packages/community-kids/tests/copy-vocabulario.test.ts packages/community-kids/tests/lesson-sections.test.tsx packages/community-kids/tests/lesson-quiz-retry.test.tsx
bun run typecheck:community
bun run typecheck:kids
```

**Aceite:** o mesmo comando de aula conduz à mesma ação nas duas telas; diferenças de público não alteram o texto narrado. Verificação manual cobre sucesso, erro, correção e retorno.

### T3. Implementar a exportação de fala contínua e intervenções

**Criar:** `docs/aulas-interativas-tecnico/qa/roteiro-elevenlabs.ts`, `gerar-falas-elevenlabs.ts` e `roteiro-elevenlabs.test.ts`. **Modificar:** `validar-roteiros.py`, `ESPEC-ROTEIRO.md` e o contrato de voz conforme o resultado dos testes.

**Interfaces novas em `roteiro-elevenlabs.ts`:**

```typescript
export interface IntervencaoKids {
  id: string
  clipe: string
  personagem: 'Debinha' | 'Dedé'
  falaPrincipal: string
  falaPersonagem: string
  ancoraAntes: string
  ancoraDepois: string
  ocorrencia: number
  tags: string[]
}
export interface ParteFalado {
  clipe: string
  texto: string
  intervencoes: IntervencaoKids[]
}
export function extrairPartesElevenLabs(roteiro: string): ParteFalado[]
export function montarTextoElevenLabs(partes: ParteFalado[]): string
```

O parser lê a marca **Clipe**, o bloco `text` sob **Fala para ElevenLabs** e a tabela/áudio de substituições do roteiro de produção. Rejeita clipe duplicado e intervenção sem correspondência inequívoca. O CLI compara a ordem dos clipes com os `plannedVideo` referenciados nas partes do manifesto e gera os arquivos definidos no contrato. Aceita filtro de curso e `--aula <nome-base-existente>` para converter o piloto sem exigir que as outras 36 aulas já estejam convertidas. Sem filtro, exige cobertura de todas as aulas. Não acrescenta frases nem escolhe tags automaticamente.

- [ ] Criar fixtures pequenas com duas partes gravadas, um recado de página não gravado e uma intervenção kids. Testar antes do parser e confirmar falha.
- [x] Verificar que o master conserva o pensamento citado, as frases anterior/posterior e as tags; não inclui nome de personagem, título, tabela nem nota de tela.
- [x] Verificar `[long pause]` entre partes, sem duplicação no começo/fim; os arquivos de personagem também recebem separação entre intervenções.
- [x] Cobrir erro de ID duplicado, personagem inválido, âncora ambígua, frase divergente, clipe ausente e tentativa de usar SSML de pausa.
- [x] Retirar tags da contagem de palavras/duração e da transcrição pública, preservando números e nomes de controles. Uma voz expressiva não pode mudar a instrução.
- [x] Implementar modo `--check`, que compara os derivados com a fonte e falha quando estiverem desatualizados sem escrever arquivos.
- [x] Adaptar o validador de roteiro para o novo bloco de fala, com leitura explícita do formato antigo enquanto houver aulas não migradas. Testar os dois formatos durante a transição e exigir somente o novo nas aulas convertidas. Retirar o caminho antigo ao encerrar T7.

Caso mínimo de conteúdo, após implementar as interfaces:

```typescript
import { expect, test } from 'bun:test'
import { montarTextoElevenLabs } from './roteiro-elevenlabs'

test('exporta fala integral com espaço de corte entre partes', () => {
  const principal = montarTextoElevenLabs([
    { clipe: 'abertura', texto: '[warmly] Agora jogue a versão pronta.', intervencoes: [] },
    { clipe: 'montagem', texto: '[thoughtful] Talvez você esteja pensando: “No meu jogo ainda não funcionou.”', intervencoes: [] },
  ])
  expect(principal).toBe('[warmly] Agora jogue a versão pronta.\n\n[long pause]\n\n[thoughtful] Talvez você esteja pensando: “No meu jogo ainda não funcionou.”\n')
})
```

```powershell
bun test docs/aulas-interativas-tecnico/qa/roteiro-elevenlabs.test.ts
```

**Aceite:** abrir o TXT e copiar tudo produz a fala completa, sem limpeza manual. Os áudios de personagens correspondem somente aos trechos substituíveis, e o roteiro de produção informa quem substitui o quê.

### T4. Preparar o piloto da primeira aula do Cadê Todo Mundo?

**Modificar:** trio atual em `docs/aulas-interativas/kids/cade-todo-mundo/`, gerador `qa/gerar-cade-todo-mundo.ts` e teste `qa/cade-todo-mundo-manifestos.test.ts`. A mudança de caminho definitivo ocorre em T6, junto dos consumidores.

**Entrada:** copy comum de T2 e exportador de T3. **Saída:** uma aula completa como referência editorial, com texto principal, falas dos personagens e tabela de substituições.

- [x] Revisar abertura, material de consulta, experiência e montagem com o vocabulário comum, preservando passos, blocos, valores e critérios.
- [x] Manter a professora falando integralmente. Marcar o pensamento No meu jogo ainda não funcionou como candidato de substituição, com preparação e retomada naturais.
- [x] Escolher poucas descobertas/observações transferíveis para o personagem da aula. Não usar respostas dirigidas pelo nome ao personagem no master.
- [x] Registrar cada intervenção na tabela, com ID, personagem, frase exata, contexto e ocorrência quando necessário. Colocar notas de tela curtas fora do texto copiável.
- [x] Gerar `.elevenlabs.txt`, arquivo do personagem e `.edicao.json`. Conferir palavra por palavra os derivados e o trio.
- [x] Identificar mídia já gravada e pontos de aproveitamento. Não declarar regravação ou publicação concluída por alterar arquivos locais.

```powershell
bun docs/aulas-interativas-tecnico/qa/gerar-cade-todo-mundo.ts
bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts cade-todo-mundo --aula cade-todo-mundo-aula-1
bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts --check cade-todo-mundo --aula cade-todo-mundo-aula-1
bun test docs/aulas-interativas-tecnico/qa/cade-todo-mundo-manifestos.test.ts docs/aulas-interativas-tecnico/qa/roteiro-elevenlabs.test.ts
```

**Aceite:** master legível de ponta a ponta e edição kids planejada sem frases novas da professora. Não exigir que um adulto assista a intervenções infantis para compreender.

### T5. Ensaiar voz e montagem do piloto

**Criar:** `docs/continuity/2026-10-21-unificacao-aulas-plataforma/piloto-voz.md`, registrando apenas resultados reais e referências aos arquivos de mídia.

- [ ] Conferir a documentação oficial v4, voz selecionada e configurações disponíveis. Registrar o modelo exato oferecido pelo produto, sem presumir o ID da API.
- [ ] Gerar amostras com abertura, instrução de bloco, dificuldade citada, reconhecimento de resultado e mudança de parte, no fluxo de produção que o usuário utilizar.
- [ ] Escutar pronúncia, energia, ritmo e entendimento; ajustar tags e pontuação na fonte, regenerando os derivados.
- [ ] Montar um trecho adulto e o mesmo trecho kids: manter o master completo e substituir só o intervalo marcado. Conferir ausência de voz dupla, repetição e corte de instrução.
- [ ] Medir as pausas entre partes e assegurar cerca de três segundos de silêncio para corte, ajustando a edição quando a tag não produzir isso.
- [ ] Fazer ensaio qualitativo com criança iniciante, pré-adolescente/adolescente e adulto iniciante. Observar execução sem instrução extra e percepção de tom. Registrar dificuldades e ajustes concretos.

**Aceite:** confirmar pelo ouvido e pela montagem que a fala é contínua nos dois vídeos. Tags conferidas no texto não substituem essa etapa. Se geração de áudio ou participantes não estiverem disponíveis, deixar T5 pendente e continuar somente trabalhos que não dependam de seu aceite.

### T6. Migrar as fontes para uma árvore única

**Modificar:** `qa/caminhos.ts`, cinco geradores, testes dos cursos, validadores, recursos/PDFs, links, índices e CI. **Destino:** `docs/aulas-interativas/<curso>/`.

**Interface preservada:** `caminhoAula(nome: string, pasta?: string): string` e `listarArquivosAulas(pasta?: string): string[]`. A raiz comum deve ter lista explícita de cursos para não tratar README ou documentação auxiliar como curso. Não publicar duas cópias de conteúdo para resolver caminhos antigos.

- [ ] Comparar as duas fontes e preservar correções úteis da adulta, inclusive esclarecimentos ausentes no kids. Não escolher uma árvore inteira sem revisar as diferenças.
- [ ] Mover cada curso para o destino canônico preservando nomes-base e histórico. Atualizar resolução de caminhos e todos os consumidores no mesmo lote.
- [x] Migrar os geradores de PDF para um material comum; conferir links, blocos, cores e diagramação renderizada conforme o fluxo existente.
- [x] Retirar a tradução adulto por trecho do caminho de geração ativa. Manter a referência histórica no Git, sem deixar uma segunda árvore ativa em paralelo.
- [x] Atualizar diretivas, skills de autoria e seus espelhos efetivamente encontrados, Como Fazer, README e CI. Não manter a instrução de regenerar adulto após editar uma aula comum.
- [x] Validar quantidade de aulas, unicidade, referências, reprodução da geração e ausência de escrita nas raízes antigas.

```powershell
bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts
python -X utf8 docs/aulas-interativas-tecnico/validar-roteiros.py
bun test docs/aulas-interativas-tecnico/qa
rg -n 'aulas-interativas/(kids|adulto)|PASTA_CURSOS_ADULTO|gerar-adulto' docs/aulas-interativas-tecnico .agents/skills/aula-roteiro .github
```

**Aceite:** 37 aulas únicas nos cinco cursos, consumidores ativos apontando para a raiz comum e geradores reproduzíveis. Referências históricas explicitamente identificadas podem permanecer; nenhuma regra ativa manda produzir dois cursos.

### T7. Revisar e exportar todas as aulas e materiais

**Modificar:** os 37 trios na raiz única, os cinco geradores, os módulos, materiais e tutoriais associados. **Gerar:** fala principal, falas de personagens quando houver e índice de edição de cada aula.

- [x] Revisar Cadê completo (3), Farol (4), Nave (9), Dino (13) e Meu Jeito (8), nessa ordem, em lotes por curso.
- [x] Aplicar a régua de clareza do piloto, com analogias comuns, humor moderado e sem omitir instruções para encurtar texto.
- [x] Em cada roteiro, escrever a fala contínua com tags e pausas; registrar todas as substituições kids com seus personagens e âncoras.
- [x] Conferir anúncio, experiência, montagem, teste, correção, verificação, envio, publicação, quiz e certificado. Não narrar um rótulo ainda ausente no app.
- [x] Manter a consulta como opcional, a entrega como obrigatória quando já era e os critérios pedagógicos existentes. Não criar seções sem necessidade para encaixar personagens.
- [x] Gerar materiais comuns e atualizar Como Fazer nos dois destinos de ajuda, preservando slugs, links e retorno à aula. Retirar os guardas antigos de vocabulário somente com seus substitutos testados.
- [x] Atualizar checklist por aula no registro de continuidade: texto, derivados, tags, personagem, PDF, áudio e publicação têm estados separados.
- [x] Ao concluir as 37 aulas, exigir somente o novo formato de roteiro e remover a compatibilidade transitória de T3, mantendo o histórico no Git.

```powershell
bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts --check
bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts
python -X utf8 docs/aulas-interativas-tecnico/validar-roteiros.py
bun test docs/aulas-interativas-tecnico/qa
bun docs/como-fazer/validar.ts
bun docs/como-fazer-adulto/validar.ts
```

**Aceite:** nenhuma aula sem fala copiável ou direção de voz; nenhuma intervenção sem personagem e âncoras; nenhuma nota de produção vazando para a síntese. Os PDFs precisam de conferência visual, e os áudios de escuta.

### T8. Vincular uma fonte aos dois destinos de publicação

**Modificar:** fluxo de importação/exportação do Admin e testes `packages/admin/tests/lesson-manifest-import.test.ts`, `lesson-manifest-export.test.ts`. **Criar:** `docs/aulas-interativas-tecnico/qa/destinos-publicacao.ts` e `destinos-publicacao.test.ts` para a projeção explícita de destino, usando `LearningManifest` já exportado pelo core.

**Interface planejada:**

```typescript
import type { LearningManifest } from '../../../packages/core/src/learning'

export interface DestinoManifesto {
  courseSlug: string
  lessonSlug: string
}
export function manifestoParaDestino(
  origem: LearningManifest,
  destino: DestinoManifesto,
): LearningManifest
```

- [x] Testar a projeção nos dois slugs reais: mesma aula, estrutura e conteúdo; somente vínculo explícito de destino. A origem permanece imutável.
- [ ] Tratar mídia publicada por público como vínculo distinto, com IDs e revisão: master adulto e montagem kids. Não embutir uma segunda versão da fala no adaptador.
- [x] Conferir a prévia do import e impedir destino divergente silencioso. Preservar IDs existentes e anexos já publicados; não importar moldes vazios por cima de mídias reais.
- [ ] Cobrir reimportação idempotente, destino incorreto, mídia ausente, aula com progresso e preservação de certificado/envio.

```powershell
bun test docs/aulas-interativas-tecnico/qa/destinos-publicacao.test.ts
bun test packages/admin/tests/lesson-manifest-import.test.ts packages/admin/tests/lesson-manifest-export.test.ts
bun run typecheck:admin
```

**Aceite:** uma fonte pode atualizar os dois destinos sem clonar autoria e sem alterar dados anteriores de quem aprende. Nenhuma associação de vídeo é inferida só pelo nome do arquivo.

### T9. Conferência final e implantação gradual

**Arquivos:** atualizar o registro de continuidade com comandos, saídas resumidas, artefatos e ambiente realmente atualizado. Não armazenar tokens, cookies ou dados de alunos.

- [x] Rodar verificações afetadas e registrar os resultados atuais, sem reutilizar resultados de outro commit como aprovação.
- [ ] Testar os dois públicos: entrar na aula, assistir, jogar, experimentar, montar, corrigir, verificar, enviar, rever quiz, publicar quando previsto, obter certificado e concluir.
- [ ] Reabrir aula já concluída e projeto salvo. Conferir que envios, respostas, materiais e certificados anteriores permanecem.
- [ ] Conferir desktop e celular, textos de leitor de tela, retorno da ajuda e prévia no Admin.
- [ ] Implantar primeiro o piloto e conferir o conteúdo remoto. Ampliar por curso somente após o aceite do lote anterior.
- [ ] Encerrar cada lote com revisão do diff e um commit coeso no fluxo de trabalho adotado. Não misturar correções de outras frentes.

**Aceite final:** todos os requisitos da especificação têm evidência; a árvore é única; as telas dizem os mesmos comandos; o master é integral; as substituições kids são precisas; os dois públicos completam o curso; não houve perda de dados.

## Retomada e autorrevisão

- [x] Conferir cada requisito da especificação contra T1–T9.
- [x] Conferir que nenhum comando aponta para arquivo inexistente sem estar identificado como entrega de uma tarefa anterior.
- [x] Conferir que nomes dos arquivos, interfaces e campos permanecem iguais no contrato de voz e neste plano.
- [x] Ao parar, preencher no registro de continuidade: tarefa atual, último resultado, arquivos alterados, próximo passo e impedimentos reais.

Próxima ação na execução: concluir a conferência final descrita no registro de continuidade. T1 local já foi realizado. Não iniciar a limpeza de disco da conversa anterior nem continuar handoffs de outras frentes como se fossem parte desta tarefa.
