# Carreira do Criador e Estúdio

Este documento é a referência de produto e operação para a Carreira do Criador. A fonte técnica da matriz fica em `packages/core/src/career/catalog.ts`. Os textos infantis ficam no Community Kids e nunca devem redefinir a regra.

## Princípio pedagógico

A criança aprende uma ferramenta dentro de um curso e só depois recebe essa ferramenta no Estúdio livre. As atividades de aula continuam disponíveis com a configuração definida pelo professor, mesmo quando o Estúdio livre ainda está bloqueado.

Um curso obrigatório conta para a carreira quando os dois marcos existem para o mesmo curso e para a mesma criança:

1. curso concluído;
2. projeto publicado no Mural.

XP, quantidade total de cursos e cursos bônus não substituem esses marcos. Alterar o nível de um curso depois da conquista também não rebaixa a criança, pois o evento registra uma fotografia da etapa e da posição.

## Organização dos cursos

A carreira possui seis etapas:

| Etapa | Posições obrigatórias |
|---|---:|
| Iniciante 2D | 1 a 8 |
| Iniciante 3D | 1 a 8 |
| Intermediário 2D | 1 a 8 |
| Intermediário 3D | 1 a 8 |
| Avançado 2D | 1 a 8 |
| Avançado 3D | 1 a 8 |

São 48 posições obrigatórias (**8 por degrau** — reforma de 07/2026; antes eram 6 no Iniciante 2D e 5 nas demais, totalizando 31). `careerSlot = null` identifica um curso bônus, que não conta para subir de nível.

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

No Community Kids, a página **/cursos** é o **Mapa da Carreira**: uma fita curva SVG com os 8 níveis ilustrados pelos personagens Dedé e Debinha (`public/carreira/<slug>.webp`; sem a arte, cai no ícone do nível). Nível não atingido fica **preto-e-branco com cadeado e não navega** (balança + recado); nível atingido abre **`/cursos/trilha/<slug do nível>`** (v2 24/07 — rota por NÍVEL, ex.: `/cursos/trilha/coder`, não mais por degrau de curso). A listagem divide o degrau por `careerSlot`: a **Faísca (noob) vê só o curso-base** (slot 1) e o **Construtor (coder) vê o resto do degrau + os bônus**; dos Inventores em diante cada nível mostra o seu degrau inteiro (`coursesForLevel` em `lib/career-map.ts`). O nó do nível atual mostra "Você está aqui" + quantos cursos faltam. A Lenda é o nó final de celebração (sem trilha — `/cursos/trilha/god` é 404). Deep-link numa trilha bloqueada mostra recado gentil; a equipe nunca é murada (o escape é medido sobre os cursos QUE AQUELA trilha mostra: algum liberado → abre). Sem gamificação disponível, a página cai na grade clássica. A régua REAL de acesso continua no members — o mapa é apresentação.

## Matriz dos níveis

| Nível | Requisito acumulado | Etapa estudada | Liberação no Estúdio livre |
|---|---|---|---|
| Faísca (`noob`) | Nenhum | Iniciante 2D | Usa o Estúdio apenas dentro das aulas |
| Construtor(a) (`coder`) | Posição 1 do Iniciante 2D | Iniciante 2D | Estúdio livre, blocos e Jogo 2D Essencial |
| Inventor(a) (`hacker`) | 8 posições do Iniciante 2D | Iniciante 3D | Jogo 2D Iniciante completo |
| Explorador(a) de Mundos (`explorer`) | mais 8 posições do Iniciante 3D | Intermediário 2D | Jogo 3D Iniciante |
| Mestre dos Jogos (`elite`) | mais 8 posições do Intermediário 2D | Intermediário 3D | Jogo 2D Intermediário e modo Ponte |
| Arquiteto(a) de Mundos (`architect`) | mais 8 posições do Intermediário 3D | Avançado 2D | Mundo 3D Intermediário e modo Ponte |
| Gênio da Criação (`champion`) | mais 8 posições do Avançado 2D | Avançado 3D | Jogo 2D Avançado e modo Ponte |
| Lenda (`god`) | mais 8 posições do Avançado 3D | Carreira concluída | Jogo 3D Avançado, modo Ponte e modo Pro |

O perfil **Jogo 2D Essencial** do Construtor (fonte:
`packages/studio/src/career/blockProfiles.ts`) traz os blocos da referência do Desafio
do Primeiro Jogo mais o **🚀 Kit espaço completo** — inclusive "soltar um asteroide de
uma borda" e "atirar do sprite para a frente", que não aparecem no jogo-base (decisão
de 26/07/2026): com o kit inteiro a criança cria variações do jogo de nave ensinado no
Faísca, não só a réplica.

As extensões acumuladas por nível são:

| Nível | Extensões permitidas |
|---|---|
| Faísca | nenhuma no Estúdio livre |
| Construtor(a) e Inventor(a) | `game-2d` |
| Explorador(a) | `game-2d`, `game-3d` |
| Mestre dos Jogos | anteriores e `game-2d-advanced` |
| Arquiteto(a) de Mundos e Gênio da Criação | anteriores e `world-3d` |
| Lenda | anteriores e `game-3d-advanced` |

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

O select mostra qual curso já ocupa cada posição da etapa selecionada e desabilita posições ocupadas por outro curso (o banco recusa duplicata na mesma etapa). Toda etapa aceita posições 1 a 8.

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

O painel de cursos carrega todas as páginas de cursos Kids antes de calcular a prontidão. A carreira está completa para lançamento quando as 48 posições existem e os cursos necessários estão publicados e autorados.

O banco aplica a mesma regra do domínio:

* somente cursos Kids podem ter `career_slot`;
* toda etapa aceita posições 1 a 8;
* uma posição não pode se repetir na mesma etapa.

As migrações `0048_normalize_creator_career_slots` e `0049_needy_iron_man` precisam ser aplicadas nessa ordem. A primeira remove posições legadas inválidas colocando `career_slot = null`. A segunda reforça a restrição (versão 6/5). A migração `0053_career_slot_max_8` alarga a restrição para 1 a 8 em toda etapa (reforma de 07/2026, 8 por degrau) — como só amplia a faixa, não conflita com dados existentes. Antes do deploy, confira o backup e a quantidade de linhas que a normalização atingirá. Em caso de necessidade, prefira uma nova migração de correção em vez de editar o histórico aplicado.

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
