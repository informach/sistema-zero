# Carreira do Criador e Estúdio

Este documento é a referência de produto e operação para a Carreira do Criador. A fonte técnica da matriz fica em `packages/core/src/career/catalog.ts`. Os textos infantis ficam no Community Kids e nunca devem redefinir a regra.

## Princípio pedagógico

A criança aprende uma ferramenta dentro de um curso e só depois recebe essa ferramenta no Estúdio livre. As atividades de aula continuam disponíveis com a configuração definida pelo professor, mesmo quando o Estúdio livre ainda está bloqueado.

Um curso obrigatório conta para a carreira quando os dois marcos existem para o mesmo curso e para a mesma criança:

1. curso concluído;
2. projeto publicado no Mural.

XP, quantidade total de cursos e cursos bônus não substituem esses marcos. Alterar o nível de um curso depois da conquista também não rebaixa a criança, pois o evento registra uma fotografia da etapa e da posição.

## Organização dos cursos

A carreira possui sete etapas:

| Etapa | Posições obrigatórias | Quem estuda |
|---|---:|---|
| **Primeiros Passos** | 1 | Faísca |
| Iniciante 2D | 1 a 8 | Construtor(a) |
| Iniciante 3D | 1 a 8 | Inventor(a) |
| Intermediário 2D | 1 a 8 | Explorador(a) |
| Intermediário 3D | 1 a 8 | Mestre dos Jogos |
| Avançado 2D | 1 a 8 | Arquiteto(a) |
| Avançado 3D | 1 a 8 | Gênio da Criação |

São **49 posições obrigatórias** (1 na entrada + 8 em cada uma das outras seis etapas). `careerSlot = null` identifica um curso bônus, que não conta para subir de nível.

**Primeiros Passos (14/08/2026) é a trilha da Faísca.** Até então o curso base morava no Iniciante 2D e a divisão entre Faísca e Construtor(a) existia só na tela do mapa — por isso a Faísca **não podia ter curso bônus**: todo bônus do Iniciante 2D caía na trilha do Construtor(a). Agora ela tem etapa própria, com uma posição obrigatória (o curso de entrada) mais os bônus dela, que abrem quando esse curso é concluído e publicado.

**O Iniciante 2D voltou a ter 8 posições (15/08/2026).** Quando o curso base saiu para a etapa nova, ele havia sido encolhido para 7, de modo que o total continuasse 48. A decisão foi desfeita: **toda etapa que não é a de entrada tem 8 posições**, sem exceção. O total passou de 48 para 49 e são **9 cursos da Faísca até Inventor(a)** (1 + 8). A regra uniforme vale mais que o total redondo.

A posição 1 é o curso base de cada etapa. Ao entrar em uma etapa, a criança abre primeiro esse curso. Os demais cursos da mesma etapa só abrem depois que o curso base for concluído e publicado. Cursos de etapas futuras mostram uma mensagem de continuação da carreira e não criam um link para um curso que ainda está bloqueado.

### Curso bônus é RECOMPENSA da etapa (`tier-reward`, 24/07)

O bônus **não abre de cara**: ele é o prêmio da etapa em que está tagueado (`level` + `track`). Abre quando a criança completa **todos os cursos com posição** daquela etapa (concluídos **e** publicados no Mural — a mesma régua da carreira), o que é exatamente o momento do level-up. Etapa já completada = recompensa ganha para sempre; etapa atual ou futura = o card mostra 🎁 "Recompensa: complete a etapa X" (motivo `tier-reward` no 423). O bônus continua **fora da contagem** de nível (não qualifica slot) e a tag de etapa do bônus agora importa de verdade — confira o degrau dos bônus ao montar cada etapa.

**Regressão aceita ao montar uma etapa:** quando você publica o curso-base de uma etapa, os bônus dela passam a valer a trava — uma criança que estava no MEIO de um bônus perde o acesso a ele até completar a etapa (decisão de produto de 24/07; só acontece em etapa com base publicada, pelo fail-open). O que **não** é afetado: jogo já publicado continua no Mural e no link público de jogar (o post é um snapshot independente do curso), e todo XP/marco já ganho fica.

### Sem curso base publicado, a etapa não trava (fail-open)

A trava da posição 1 só faz sentido quando existe um curso base **publicado** para destravar. Se a etapa tiver cursos nas posições 2 ou seguintes mas nenhum curso base publicado (ainda não cadastrado, em rascunho ou removido), a trava `foundation-first` é ignorada e esses cursos ficam acessíveis. **O mesmo vale para o bônus-recompensa**: etapa sem curso base publicado não tem o que completar, então o `tier-reward` também falha aberto — é o que garante que, no deploy em produção (onde todo curso kids nasce bônus antes de as etapas serem montadas), nada tranca. Sem isso a etapa inteira — e, no caso do Iniciante 2D, a carreira toda — congelaria: não haveria nada a concluir para liberar. A regra vive em `resolveCareerCourseLock` (parâmetro `foundationAvailable`) e vale tanto na listagem quanto no acesso direto por URL.

Isso é uma rede de segurança, não o estado desejado: o painel de prontidão continua marcando a posição 1 vazia como "Falta curso". Cadastre e publique o curso base para que a progressão pedagógica volte a valer.

⚠️ **Armadilha do Mural:** a posição 1 só *qualifica* quando a criança conclui o curso base **e publica no Mural**. Se o curso base não tiver um bloco de Estúdio com vitrine (`showcase.enabled`), ela conclui o curso mas nunca publica — a posição 1 nunca qualifica e os demais cursos da etapa seguem travados. Todo curso base precisa terminar com um projeto publicável.

O Admin agora **avisa sozinho** (full review 24/07): a listagem admin do members marca cada curso-base kids com `hasShowcaseBlock` (existe aula **publicada** com bloco de Estúdio `showcase.enabled`?). Curso-base publicado sem vitrine aparece com ⚠️ **"Sem vitrine"** no painel de prontidão (e **não conta como pronto**) e com um alerta no formulário de edição. O aviso não bloqueia salvar — é sinalização para o operador adicionar o bloco de vitrine.

## Mapa da Carreira na página de cursos (kids, 24/07)

No Community Kids, a página **/cursos** é o **Mapa da Carreira**: uma fita curva SVG com os 8 níveis ilustrados pelos personagens Dedé e Debinha (`public/carreira/<slug>.webp`; sem a arte, cai no ícone do nível). Nível não atingido fica **preto-e-branco com cadeado e não navega** (balança + recado); nível atingido abre **`/cursos/trilha/<slug do nível>`** (rota por NÍVEL, ex.: `/cursos/trilha/coder`). Cada posto é dono de uma etapa inteira: Faísca mostra Primeiros Passos, Construtor mostra Iniciante 2D e assim por diante. A Lenda mostra somente os cursos de nível `lenda`, que são bônus de formatura e ficam fora da contagem da carreira. O nó atual mostra "Você está aqui" e o progresso honesto sobre os cursos já publicados. Deep-link numa trilha bloqueada mostra recado gentil; a equipe nunca é murada. Sem gamificação disponível, a página cai na grade clássica. A régua REAL de acesso continua no members — o mapa é apresentação.

### O mapa acompanha o catálogo (horizonte, 08/2026)

A carreira exige **49 cursos** (1 nos Primeiros Passos + 8 em cada um dos outros seis degraus). Enquanto eles não existem, o mapa **não
mostra a escada inteira**: ele desenha até o **horizonte do catálogo**, que é o nível mais alto que
os cursos publicados hoje conseguem entregar de fato, e fecha com um nó **"E tem muito mais pela
frente"** (toque balança o nó e mostra um recado de que essa parte está em construção). Sem isso a criança lê
"faltam 8 cursos" de cursos que ninguém gravou e encara uma fileira de cadeados, que ela entende
como culpa dela.

Duas consequências para quem opera:

- **Publicar um curso move o mapa na hora.** O contador do nível atual conta só os cursos que
  existem ("1 de 3"), então cada curso novo aparece como um passo a mais no nó. Quando a criança faz
  tudo que existe, a tela diz **"Você está em dia!"** e oferece o Estúdio, em vez de prometer curso.
- **Completar um degrau inteiro (1 na entrada, 8 nos demais) abre o próximo posto no mapa.** É o horizonte
  avançando. Quando os 49 estiverem publicados, o horizonte chega na Lenda e a tela volta sozinha à
  escada completa de 8 medalhões — não há nada para desligar.

A régua da carreira **não muda nada disso**: nível, travas e o que o Estúdio libera continuam sendo
calculados pelo members exatamente como antes. O horizonte é só o que a tela DESENHA.

## A paleta do Estúdio vem do CURRÍCULO (08/2026)

Até aqui o conjunto de blocos do **Estúdio livre** era fixo por NÍVEL da carreira. Agora **cada
curso declara o que libera** e a criança tem a **união** dos cursos que **concluiu E publicou no
Mural** (a mesma régua do posto). A separação que fica:

> **O posto da carreira decide o MODO** (Estúdio livre, Ponte, Pro). **O currículo decide a PALETA.**

**Como cadastrar:** na modal de criar/editar curso (Kids), o campo **"Ferramentas que este curso
libera no Estúdio"** usa o MESMO picker da lista de blocos da aula, com busca, grupos e
**importação por JSON** (`{"blocks": ["sz_g2d_..."]}`), que recusa id inexistente ou repetido. As
**extensões saem sozinhas dos blocos**: não há campo de extensão.

**Liste os blocos que o curso USA**, inclusive os fundamentos que já apareceram em cursos
anteriores. Repetir é o normal: todo jogo reusa criar sprite, mover, colidir. Quem acumula é a
criança, e a caixa de ferramentas dela é a união de tudo que conquistou, **sem repetir** — ela
recebe só o que ainda não tinha, e a comemoração festeja só esse pedaço novo.

⚠️ O único caso a ter em mente: um curso cujos blocos a criança **já tem por inteiro** (uma
prática que não introduz mecânica nova) não rende ferramenta nem comemoração de gaveta. A festa de
publicar no Mural continua acontecendo. Se quiser que todo curso entregue algo, garanta que cada um
traga ao menos um bloco inédito.

**Três garantias que valem a pena conhecer:**

1. **Cumulativo, e o que se ganha não se perde.** Tirar um bloco do JSON vale para quem ainda não
   concluiu o curso. Quem já conquistou continua com ele, mesmo se o curso for despublicado ou
   apagado. (O que já foi servido fica congelado por aluno; a leitura é a união do JSON atual com
   esse congelado.)
2. **Acrescentar chega sozinho.** Um bloco novo no JSON de um curso aparece para quem já o concluiu,
   sem refazer nada.
3. **Curso sem JSON não deixa ninguém sem nada.** Enquanto um degrau não estiver etiquetado, a
   criança segue com a paleta do NÍVEL, como antes (fail-open do rollout). A EQUIPE ignora o
   currículo e continua vendo o Estúdio inteiro.

⚠️ **Primeira coisa a fazer no rollout:** etiquetar o curso-base do Iniciante 2D com os blocos que
o Construtor já tem hoje (o conjunto "Jogo 2D Essencial", 47 blocos com o 🚀 Kit espaço inteiro).
Sem isso, quem virar Construtor depois desse lote abre o Estúdio com menos ferramentas do que antes.

### Runbook do degrau Primeiros Passos (uma única vez)

O valor `primeiros-passos` nasce na migration `0063`. O PostgreSQL não permite escrever um valor de
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

## Matriz dos níveis

⚠️ **O nível NÃO libera mais blocos.** Desde a reforma do currículo (08/2026) quem entrega
ferramenta é o CURSO (ver "A paleta do Estúdio vem do CURRÍCULO" acima). O nível decide o **modo**
do editor e quais **produtos** abrem. Os perfis de bloco por nível continuam existindo, mas só como
**fail-open**, para quem ainda não tem nenhum curso qualificado.

| Nível | Requisito acumulado | Etapa estudada | O que o posto abre |
|---|---|---|---|
| Faísca (`noob`) | Nenhum | Primeiros Passos | Usa o Estúdio apenas dentro das aulas |
| Construtor(a) (`coder`) | Posição 1 de Primeiros Passos | Iniciante 2D | **Estúdio livre** (modo Blocos) e **Pinta** |
| Inventor(a) (`hacker`) | Primeiros Passos + 8 posições do Iniciante 2D | Iniciante 3D | **Pensa** e **Zappy** (os que chamam IA) |
| Explorador(a) de Mundos (`explorer`) | mais 8 posições do Iniciante 3D | Intermediário 2D | O posto e a trilha nova (nenhuma ferramenta nova) |
| Mestre dos Jogos (`elite`) | mais 8 posições do Intermediário 2D | Intermediário 3D | O posto e a trilha nova (nenhuma ferramenta nova) |
| Arquiteto(a) de Mundos (`architect`) | mais 8 posições do Intermediário 3D | Avançado 2D | O posto e a trilha nova (nenhuma ferramenta nova) |
| Gênio da Criação (`champion`) | mais 8 posições do Avançado 2D | Avançado 3D | **modo Ponte** |
| Lenda (`god`) | mais 8 posições do Avançado 3D | Carreira concluída | **modo Pro** |

As duas barras dos produtos vendidos à parte vivem em `packages/member-shell/src/lib/studio-tier.ts`
e são **distintas de propósito** (14/08/2026): `FREE_CREATION_MIN_LEVEL = 'coder'` para o que é
criação livre (Estúdio Completo e Pinta, sem custo por uso) e `AI_APPS_MIN_LEVEL = 'hacker'` para o
que chama IA (Pensa e Zappy, custo por pergunta — a criança precisa de repertório antes de
perguntar). Até 14/08 era uma constante só e o Pinta ficava preso junto com a IA.

O perfil **Jogo 2D Essencial** do Construtor (fonte:
`packages/studio/src/career/blockProfiles.ts`) traz os blocos da referência do Desafio
do Primeiro Jogo mais o **🚀 Kit espaço completo** — inclusive "soltar um asteroide de
uma borda" e "atirar do sprite para a frente", que não aparecem no jogo-base (decisão
de 26/07/2026): com o kit inteiro a criança cria variações do jogo de nave ensinado no
Faísca, não só a réplica. Hoje ele vale como o fail-open descrito acima.

As extensões acumuladas por nível (também fail-open — com currículo, elas são DERIVADAS dos blocos
conquistados por `extensionsForBlocks`) são:

| Nível | Extensões permitidas |
|---|---|
| Faísca | nenhuma no Estúdio livre |
| Construtor(a) e Inventor(a) | `game-2d` |
| Explorador(a) | `game-2d`, `game-3d` |
| Mestre dos Jogos | anteriores e `game-2d-advanced` |
| Arquiteto(a) de Mundos, Gênio da Criação e Lenda | anteriores, `world-3d` **e `game-3d-advanced`** |

Os modos do editor liberam separado das extensões: **Blocos** desde o Construtor, a **Ponte**
(código lado a lado) a partir do **Gênio da Criação**, e o **modo Pro** (Código puro) só na **Lenda**.

Projetos importados ou antigos não furam essa regra. Quando um projeto usa uma extensão ainda não conquistada, ele permanece salvo sem alterações e o Estúdio explica que será aberto depois da conquista.

## Modo Pro

O modo Pro só está disponível para a Lenda e para funções privilegiadas da equipe. Ele trabalha em modo Código e oferece cinco modelos confiáveis:

* `vanilla-js`
* `vanilla-vite`
* `react-ts`
* `three-js`
* `three-ts`

A opção de promover um projeto aparece para a Lenda. A promoção cria uma cópia Pro para que o projeto original de blocos continue preservado. O aluno pode começar com blocos e continuar pelo código quando chegar ao limite das ferramentas visuais.

Nas aulas, o professor pode criar um projeto Pro antes de a criança chegar à Lenda. Isso não libera o Pro no Estúdio livre. O bloco da aula usa um executor remoto isolado, sem depender de WebContainer, COOP ou COEP no Community Kids e no Admin.

## Autoria no Admin

### Cadastrar o curso base e as posições da etapa

No painel **Cursos** (`/admin/membros/cursos`), o formulário de curso (tanto ao criar quanto ao editar — o botão **"Editar curso"** também aparece dentro do editor de conteúdo de cada curso) tem o campo **Posição na Carreira do Criador**. Ele só fica habilitado quando a Audiência é **Kids**.

* **Nenhuma — bônus:** recompensa da etapa (abre quando a criança completa os cursos com posição da etapa do bônus; não conta para subir de nível).
* **1 — Curso-base da etapa:** o curso que destrava as demais posições.
* **2 em diante:** os demais cursos da etapa, liberados após o curso base.

O select mostra qual curso já ocupa cada posição da etapa selecionada e desabilita posições ocupadas por outro curso (o banco recusa duplicata na mesma etapa). O número de posições é **por etapa**: Primeiros Passos aceita só a posição 1 e todas as demais aceitam de 1 a 8.

O painel **Carreira do Criador** no topo da página é clicável: uma posição vazia abre o cadastro já mirando a etapa e a posição corretas; uma posição ocupada abre a edição daquele curso. Use-o para preencher a etapa Iniciante 2D primeiro, começando pela posição 1. A posição 1 publicada sem aula publicada com bloco de Estúdio de vitrine aparece como ⚠️ **"Sem vitrine"** (ver a Armadilha do Mural) — resolva antes do lançamento da etapa.

### Autoria do bloco Estúdio (blocos ou Pro)

No bloco Estúdio, o autor escolhe entre projeto em blocos e projeto Pro. Ao escolher Pro, também escolhe um dos cinco modelos. Trocar tipo ou modelo substitui o projeto inicial somente após confirmação.

O backend valida o identificador do modelo contra o catálogo fechado. O preview do Admin chama o mesmo executor remoto usado pelas aulas. Configure no Admin e no Community Kids:

```env
STUDIO_PRO_RUNTIME_URL=https://studio-runtime.exemplo.workers.dev
STUDIO_PRO_RUNTIME_TOKEN=um-segredo-longo-e-compartilhado
```

O token nunca é enviado ao navegador. Os BFFs validam sessão, tamanho real do corpo e projeto antes de chamar o runtime.

## Operação e prontidão

O painel de cursos carrega todas as páginas de cursos Kids antes de calcular a prontidão. A carreira está completa para lançamento quando as 49 posições existem e os cursos necessários estão publicados e autorados.

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

* matriz e regras de trava (incl. `foundationAvailable` = fail-open sem curso base): `packages/core/src/career/catalog.ts`;
* projeção da trava na listagem: `packages/members/src/application/career-course-locking/career-course-locking.ts`;
* gate de acesso direto (423) + checagem de curso base publicado: `packages/members/src/application/access/check-access.service.ts` e `hasPublishedFoundationCourse` no repositório de cursos;
* cálculo dos marcos: `packages/members/src/infrastructure/persistence/drizzle/gamification.repository.ts`;
* regra de autoria e posições: `packages/members/src/application/content-admin/content-admin.service.ts`;
* capacidades do Estúdio por nível: `packages/member-shell/src/lib/studio-tier.ts`;
* bloqueio de projetos com extensão futura: `packages/studio/src/studio/project-access.ts`;
* autoria Pro: `packages/admin/src/components/studio/studio-embed.tsx`;
* executor remoto: `packages/studio-runtime`;
* apresentação infantil: `packages/community-kids/src/lib/level-info.ts` e `career-rewards.ts`.
