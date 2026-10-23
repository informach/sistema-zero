# Jornada do Criador e Estúdio

Referência do modelo Kids canônico em implementação. A ativação integrada ainda precisa ser
qualificada em staging; este texto não afirma que houve deploy. Detalhes e evidências ficam em
[PRD e tarefas](../.compozy/tasks/kids-configurable-journey/README.md).

## Uma política publicada, autoridades separadas

Os oito postos mantêm nome, identidade e sequência. Requisitos de avanço, capacidades globais e
regras de acesso às etapas vêm de uma única política persistida e versionada no Members. O seed
inicial reproduz as regras anteriores; leitores normais não recalculam um default em paralelo.
Ausência/corrupção após provisionamento é indisponibilidade, nunca uma nova política ou Faísca.

| Decisão | Autoridade |
|---|---|
| Avanço, ferramenta global e acesso pedagógico por etapa | Política publicada + conquistas permanentes, no Members |
| Produto comprado e matrícula/acesso ao curso | Licenças e matrícula, conferidas separadamente |
| Blocos/extensões adquiridos no currículo | Conclusão/publicação e concessões curriculares |
| Ambiente, blocos e extensões de uma atividade | Curadoria da aula e contrato de runtime |
| XP, moedas, streak, badges universais | Gamificação; XP não substitui requisito de posto |

A professora pode configurar uma aula Pro antes da liberação global de Pro. Isso não concede o
modo no Estúdio livre. JavaScript e Python mantêm seus documentos, runtime, paletas e autoria;
esta política não traduz nem migra projetos de uma linguagem para outra.

## Seed inicial: oito postos e 49 posições

São sete avanços. No seed, cada um exige concluir e publicar no Mural os cursos das posições da
etapa anterior; os avanços se encadeiam. `showcase` exige os dois marcos no mesmo curso/perfil.
`complete` exige conclusão sem impor publicação. Depois da ativação, consulte a versão publicada:
essa tabela descreve o seed, não uma segunda regra do servidor.

| Posto | Novo requisito no seed | Ferramentas globais conquistadas |
|---|---|---|
| Faísca (`noob`) | Nenhum; início | Estúdio dentro das aulas |
| Construtor(a) (`coder`) | Primeiros Passos 2D, posição 1 | Estúdio livre e Pinta |
| Inventor(a) (`hacker`) | Iniciante 2D, posições 1–8 | IA e Pensa |
| Explorador(a) de Mundos (`explorer`) | Iniciante 3D, posições 1–8 | Molda básico |
| Mestre dos Jogos (`elite`) | Intermediário 2D, posições 1–8 | Nenhuma ferramenta nova |
| Arquiteto(a) de Mundos (`architect`) | Intermediário 3D, posições 1–8 | Molda intermediário |
| Gênio da Criação (`champion`) | Avançado 2D, posições 1–8 | Ponte |
| Lenda (`god`) | Avançado 3D, posições 1–8 | Pro e Molda profissional |

Limites estruturais: uma posição em Primeiros Passos 2D e oito em cada uma das outras seis etapas.
Total: 49. A política pode exigir posição ou curso específico, com marco explícito; mantém os sete
avanços e valida dependências de ferramentas. Lenda/formatura é identidade curricular fora dos
requisitos de promoção, sem novo gate artificial de acesso ao curso.

## Acesso às etapas e preservação

Cada regra `tierAccess` declara etapa, posto de entrada (`opensAt`), posto de revisão integral
(`completedAt`) e primeira aventura (`foundation`: posição 1, marco e `whenMissing`). Não há
mapeamento fixo de índice entre posto e etapa no funcionamento normal.

> Nota de vocabulário (23/10/2026): "primeira aventura" é o nome técnico da regra `foundation`, o
> curso da posição 1 da etapa, e é o rótulo que o Admin ainda mostra em Professor → Jornada Kids
> ("Primeira aventura", "Acesso às aventuras"). Na tela da criança e na fala das aulas vale a
> linguagem comum de 21/10/2026: é um curso. Trocar o termo neste documento só junto com o Admin.

- Curso com posição: entrada na etapa + primeira aventura para as posições seguintes, ou direito
  de revisão/expansão já conquistado.
- Recompensa (`reward`): revisão da etapa, direito de recompensa preservado ou a dispensa da base
  prevista pela política. Recompensa não implica entrada na etapa.
- Extra (`extra`): continua sem trava pedagógica da etapa, exigindo matrícula/acesso ao produto.
- `whenMissing=open` só dispensa base ausente num catálogo conhecido. Não trata falha/unknown como
  catálogo vazio. No seed conserva o caso anterior em que recompensa pode abrir sem entrada.

Publicar uma regra mais restrita não retira conquistas. A baseline materializa posto, capacidades e 21 direitos limitados (entrada/expansão/recompensa nas sete etapas), inclusive de crianças sem XP
ou que não visitaram entre versões. Expansão implica entrada; recompensa não. Isso não congela
IDs dos cursos atuais nem concede matrícula. Revogar produto continua impedindo acesso ao produto.

A pausa retém a política vigente e congela novos postos/ferramentas. Concluir de verdade a primeira
aventura ainda pode expandir acesso pedagógico pela mesma regra retida; não abre todos os cursos.

## Interface da criança

A criança lê a mesma estrutura da comunidade adulta: curso → módulo → aula → parte (Diretrizes
Pedagógicas, seção 6; "módulo" decidido em 23/10/2026). Os postos, a "Trilha <posto>", a Jornada do
Criador e os títulos de posto como "Explorador(a) de Mundos" continuam só do Kids. A trilha do curso
e o baú mostram "Módulo N" desde 23/10/2026 (era "Mundo").

Mapa/trilha e ferramentas leem a projeção da mesma versão persistida. Horizonte de conteúdo não
reduz posto ou direitos já conquistados. Não há anúncio de ferramenta pelo nome fixo do posto:
a promessa precisa corresponder à capacidade, ao alcance do percurso e à licença.

Requisitos de curso fora do agrupamento da trilha aparecem por `resolvedCourseId` da mesma captura
do que foi avaliado. Identidade ausente/ambígua é null; um marco histórico satisfeito não vira dívida.
Aliases de curso/posição não duplicam a contagem visual, mas nenhum requisito é removido da regra.

Selos de curso e blocos curriculares continuam separados da conclusão do avanço. Um requisito
complete-only pode satisfazer o posto sem satisfazer uma concessão curricular que pede publicação.
Erro/initializing aparece explicitamente; dado já carregado pode continuar consultável, com novas
operações bloqueadas. Não se exibe uma perda de posto como se fosse progresso normal.

## Configurar no Admin

Professor→Jornada Kids tem painéis separados para postos/ferramentas e acesso às aventuras. A
permissão visual vem do mesmo guard de escrita do Members. Equipe própria ativa pode consultar e
comparar; publicação exige conta própria admin/superadmin, sem perfil/impersonação. O servidor
revalida identidade e origem a cada chamada; papel ou flag do navegador não concede acesso.

1. Edite requisitos, marcos e capacidades ou as regras de acesso por etapa.
2. Compare. O servidor mostra alterações/readiness e uma simulação identificada de novo aluno;
   isso não é um relatório de todos os veteranos. Mode-only também aparece.
3. Informe motivo e prepare. Nenhuma versão é publicada nessa etapa.
4. Verifique o próximo lote por ação explícita. O candidato fica fixo; o endereço contém um ID
   retomável. Retomar não executa advance ou publicação automaticamente.
5. Publique só quando ready. A chamada leva versão e os três hashes da mesma preparação. O servidor
   revalida catálogo/CAS/baseline e registra ator, motivo e histórico.

Busy de autoria exige nova tentativa explícita; conflito requer atualizar/comparar/preparar outra
vez. Nenhum retry troca a versão esperada silenciosamente. Edição invalida a comparação anterior.
Catálogo futuro incompleto pode gerar warning sem invalidar o seed inteiro; autobloqueio, curso de
audiência errada/formatura ou catálogo indisponível não são apresentados como percurso pronto.

## Bootstrap e rollout controlado

Não há reseed de leitura. O bootstrap system materializa V0 e captura a coorte Auth inteira antes
da publicação inicial V1. Perfis futuros passam pending→initialize Members→ready, com mesmo ID,
retry durável, quota e fence de exclusão. Todo perfil ready pertence à coorte Members, mesmo sem XP.
Não há advisory lock entre bancos nem RPC dentro de transação de perfil.

A ordem de retirada de instâncias Auth antigas, provisionamento V0, captura, publicação e exposição
dos novos leitores precisa ser confirmada operacionalmente; o script não inspeciona instâncias
remotas. Consulte o plano detalhado e valide staging antes de produção. Ainda faltam qualificação
integrada de bootstrap/admission, credencial dedicada e retenção terminal; não inferir prontidão
operacional a partir dos testes locais do editor.

## A paleta do Estúdio vem do CURRÍCULO (08/2026)

Até aqui o conjunto de blocos do **Estúdio livre** era fixo por NÍVEL da jornada. Agora **cada
curso declara o que libera** e a criança recebe a união dos cursos elegíveis. O critério depende
do papel do curso:

- **curso Kids com posição:** concluído **e** publicado no Mural, critério curricular independente do marco configurado para avançar de posto;
- **curso Kids sem posição (`careerSlot = null`, bônus ou extra):** concluído, mesmo sem projeto ou vitrine;
- **curso Adult:** mantém a exigência de conclusão e publicação.

O bônus entrega ferramentas, mas continua fora da contagem de nível. Se ele tiver uma vitrine, a
publicação no Mural permanece disponível; ela apenas não condiciona a ferramenta.

> **A política e as capacidades conquistadas decidem o MODO** (Estúdio livre, Ponte, Pro). **O currículo decide a PALETA.**

**Como cadastrar:** na modal de criar/editar curso (Kids), o campo **"Ferramentas que este curso
libera no Estúdio"** usa o MESMO picker da lista de blocos da aula, com busca, grupos e
**importação por JSON** (`{"blocks": ["sz_g2d_..."]}`), que recusa id inexistente ou repetido. As
**extensões saem sozinhas dos blocos**: não há campo de extensão.

**Liste os blocos que o curso USA**, inclusive os fundamentos que já apareceram em cursos
anteriores. Repetir é o normal: todo jogo reusa criar sprite, mover, colidir. Quem acumula é a
criança, e a caixa de ferramentas dela é a união de tudo que conquistou, **sem repetir** — ela
recebe só o que ainda não tinha, e a comemoração festeja só esse pedaço novo.

⚠️ O único caso a ter em mente: um curso cujos blocos a criança **já tem por inteiro** (uma
prática que não introduz mecânica nova) não rende ferramenta nem comemoração de gaveta. Se o curso
tiver vitrine, a festa de publicar no Mural continua acontecendo. Se quiser que todo curso entregue
algo, garanta que cada um traga ao menos um bloco inédito.

**Três garantias que valem a pena conhecer:**

1. **Cumulativo, e o que se ganha não se perde.** Tirar um bloco do JSON vale para quem ainda não
   recebeu a ferramenta. Quem já conquistou continua com ela, mesmo se o curso for despublicado ou
   apagado. (O que já foi servido fica congelado por aluno; a leitura é a união do JSON atual com
   esse congelado.)
2. **Acrescentar chega sozinho.** Um bloco novo no JSON aparece para quem já atende ao critério do
   curso, sem refazer nada.
3. **Sem curso concluído, sem blocos (02/10/2026).** Não existe mais reserva: enquanto a criança
   não conquistou nenhum bloco, o Estúdio livre mostra o recado "Termine o seu primeiro curso e
   publique no Mural". O Zappy e o Pensa usam a MESMA lista (`earnedStudioTier`, no member-shell),
   sem corte pelo nível do posto. A EQUIPE ignora o currículo e continua vendo o Estúdio inteiro.

⚠️ **Todo curso da Jornada precisa da lista cadastrada no admin.** Sem ela, quem conclui o curso
não ganha bloco nenhum e o Estúdio livre continua trancado. Em produção todos os cursos têm a lista
(conferido pela dona em 02/10/2026); em staging e no local nem sempre, e ali o Estúdio pode
aparecer trancado. Até 02/10/2026 havia uma reserva (o "Kit essencial" do Construtor e a paleta do
nível para os outros postos), que saiu por decisão dela.

### Histórico: migração curricular Primeiros Passos (0063/0064)

Este procedimento pertence à migração curricular histórica; não é o bootstrap da política configurável. Não repita uma operação já finalizada. O valor `primeiros-passos` nasce na migration `0063`. O PostgreSQL não permite escrever um valor de
enum novo antes do commit da transação que o criou, então o curso-base não pode ser movido pela
própria migration. O rollout deve ocorrer com o Community Kids em manutenção:

1. aplicar o deploy do members e confirmar que a `0063_deep_psylocke` foi registrada;
2. no ambiente do members, com a `DATABASE_URL` de produção, executar:

   ```sh
   bun run career:finalize-first-steps --course-slug <slug-do-curso-base> --confirm
   ```

3. conferir no resultado o `courseId`, a quantidade de eventos e de perfis afetados;
4. validar um comprador que ainda não concluiu e uma criança que já concluiu: o curso abre para os
   dois; a primeira continua Faísca e a segunda continua Construtor(a);
5. encerrar a manutenção.

O comando é idempotente e transacional: valida que encontrou exatamente o curso Kids esperado,
move-o para `primeiros-passos / 2d / posição 1` e recongela os eventos `course_complete` e
`course_showcased` no novo degrau. Se encontrar um estado inesperado, aborta tudo. Não faça a
reetiquetagem separadamente pelo admin durante esse rollout.

A criança vê o que conquistou em **"Minhas ferramentas"** no perfil, agrupado nas **gavetas** da
caixa de ferramentas (🎮 Sprites, 💥 Colisões, 🚀 Kit espaço…).

## Autoria no Admin

### Cadastrar o curso base e as posições da etapa

No painel **Cursos** (`/admin/membros/cursos`), o formulário de curso (tanto ao criar quanto ao editar — o botão **"Editar curso"** também aparece dentro do editor de conteúdo de cada curso) tem o campo **Posição na Jornada do Criador**. Ele só fica habilitado quando a Audiência é **Kids**.

* **Nenhuma — bônus:** recompensa da etapa, conforme `completedAt`/direito permanente; só conta para um avanço se a política o referenciar explicitamente.
* **Nenhuma — curso extra:** curso sem posição, liberado por matrícula específica ou acesso geral à comunidade, sem a trava da etapa.
* **1 — Curso-base da etapa:** o curso que destrava as demais posições.
* **2 em diante:** os demais cursos da etapa, seguindo a regra publicada de entrada/primeira aventura e os direitos preservados.

O select mostra qual curso já ocupa cada posição da etapa selecionada e desabilita posições ocupadas por outro curso (o banco recusa duplicata na mesma etapa). O número de posições é **por etapa**: Primeiros Passos aceita só a posição 1 e todas as demais aceitam de 1 a 8.

O painel **Jornada do Criador** no topo da página é clicável: uma posição vazia abre o cadastro já mirando a etapa e a posição corretas; uma posição ocupada abre a edição daquele curso. Use-o para preencher a etapa Iniciante 2D primeiro, começando pela posição 1. A posição 1 publicada sem aula publicada com bloco de Estúdio de vitrine aparece como ⚠️ **"Sem vitrine"** (ver a Armadilha do Mural) — é um aviso curricular. Se a política exigir showcase, confirme também a vitrine; se exigir complete, o aviso não deve inventar uma exigência de publicação para o posto.

### Autoria do bloco Estúdio (blocos ou Pro)

No bloco Estúdio, o autor escolhe entre projeto em blocos e projeto Pro. Ao escolher Pro, também escolhe um modelo autorizado do catálogo do runtime. Trocar tipo ou modelo substitui o projeto inicial somente após confirmação.

O backend valida o identificador do modelo contra o catálogo fechado. O preview do Admin chama o mesmo executor remoto usado pelas aulas. Configure no Admin e no Community Kids:

```env
STUDIO_PRO_RUNTIME_URL=https://studio-runtime.exemplo.workers.dev
STUDIO_PRO_RUNTIME_TOKEN=um-segredo-longo-e-compartilhado
```

O token nunca é enviado ao navegador. Os BFFs validam sessão, tamanho real do corpo e projeto antes de chamar o runtime.

## Operação e prontidão

O painel de cursos carrega todas as páginas de cursos Kids antes de calcular a prontidão. Essa prontidão curricular não substitui a prontidão da política: a configuração pode exigir cursos explícitos ou marcos diferentes. O seed conserva 49 posições, mas o catálogo futuro incompleto não impede seu provisionamento; bloqueios de percurso e avisos têm severidades distintas.

O banco aplica a mesma regra do domínio:

* somente cursos Kids podem ter `career_slot`;
* Primeiros Passos existe somente no eixo 2D e Lenda nunca ocupa posição;
* o número de posições é por etapa: 1 nos Primeiros Passos e 1 a 8 em todas as demais;
* uma posição não pode se repetir na mesma etapa.

As migrações `0048_normalize_creator_career_slots` e `0049_needy_iron_man` precisam ser aplicadas nessa ordem. A primeira remove posições legadas inválidas colocando `career_slot = null`. A segunda reforça a restrição (versão 6/5). A migração `0053_career_slot_max_8` alargou a restrição para 1 a 8 em toda etapa (reforma de 07/2026).
A migração **`0063_deep_psylocke`** (14/08/2026) cria o degrau Primeiros Passos e APERTA a
restrição no Iniciante 2D (8 → 7). ⚠️ Como `ADD CONSTRAINT ... CHECK` **valida as linhas que já
existem**, ela normaliza antes: todo curso Kids fora da faixa nova (na prática, o que estivesse na
posição 8 do Iniciante 2D ou uma posição em Lenda) recebe `career_slot = null` e vira bônus — sem isso a migração abortaria e
derrubaria o deploy inteiro. A finalização do curso-base e dos snapshots segue obrigatoriamente o
runbook acima.

A migração **`0064_peaceful_malcolm_colcord`** (15/08/2026) desfaz esse aperto: o Iniciante 2D volta
a aceitar de 1 a 8. ⭐ **Alargar não precisa de normalização** — a regra nova é um superconjunto da
antiga, então nenhuma linha que passava pode falhar. É exatamente o inverso do cuidado exigido pela
`0063`: apertar valida o passado, alargar não. Nenhum curso foi atingido pela normalização da `0063`
em staging ou produção (conferido nos dois bancos antes da mudança), então não há posição a resgatar.

Em caso de necessidade, prefira uma nova migração de correção em vez de editar o histórico aplicado.


## Pontos principais no código

- Contrato/validação/projeção: `packages/core/src/journey/kids-{policy,validation,projection,tools}.ts`.
- Seed de provisionamento: `packages/core/src/journey/kids-seed.ts`; não é fallback normal.
- Snapshot, baseline, CAS e histórico: `packages/members/src/infrastructure/persistence/drizzle/kids-journey.repository.ts`.
- Leitura/configuração/bootstrap/admission: `packages/members/src/application/kids-journey/`.
- Metadados curriculares e posições: `content-admin.service.ts`; vocabulário estrutural em Core catalog.
- Locks de listagem e acesso direto 423: `journey-course-locking.ts` e `check-access.service.ts`.
- Paleta e concessões: `gamification.repository.ts`, `studio-unlocks.ts` e `kids-journey-access.ts`.
- Editor e BFF: `packages/admin/src/app/admin/professor/jornada-kids/` e `src/server/kids-journey.ts`.
- Admissão/perfis: `packages/auth/src/application/profiles/profile-admission.service.ts` e worker.
- Apresentação: `packages/community-kids/src/lib/journey-{map,presentation,rewards}.ts`.

O cálculo fixo restante em `domain/gamification/levels.ts` e `creativeToolAvailability` atende os
ramos Adult existentes. Não governa Kids. O resolvedor Kids anterior/tabela de faixas ficam apenas
em fixtures de teste para prova de migração, sem export produtivo/fallback paralelo.
