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
| Iniciante 2D | 1 a 6 |
| Iniciante 3D | 1 a 5 |
| Intermediário 2D | 1 a 5 |
| Intermediário 3D | 1 a 5 |
| Avançado 2D | 1 a 5 |
| Avançado 3D | 1 a 5 |

São 31 posições obrigatórias. `careerSlot = null` identifica um curso bônus, que não participa da progressão pedagógica.

A posição 1 é o curso base de cada etapa. Ao entrar em uma etapa, a criança abre primeiro esse curso. Os demais cursos da mesma etapa só abrem depois que o curso base for concluído e publicado. Cursos de etapas futuras mostram uma mensagem de continuação da carreira e não criam um link para um curso que ainda está bloqueado.

## Matriz dos níveis

| Nível | Requisito acumulado | Etapa estudada | Liberação no Estúdio livre |
|---|---|---|---|
| Faísca (`noob`) | Nenhum | Iniciante 2D | Usa o Estúdio apenas dentro das aulas |
| Construtor(a) (`coder`) | Posição 1 do Iniciante 2D | Iniciante 2D | Estúdio livre, blocos e Jogo 2D Essencial |
| Inventor(a) (`hacker`) | 6 posições do Iniciante 2D | Iniciante 3D | Jogo 2D Iniciante completo |
| Explorador(a) de Mundos (`explorer`) | mais 5 posições do Iniciante 3D | Intermediário 2D | Jogo 3D Iniciante |
| Mestre dos Jogos (`elite`) | mais 5 posições do Intermediário 2D | Intermediário 3D | Jogo 2D Intermediário e modo Ponte |
| Arquiteto(a) de Mundos (`architect`) | mais 5 posições do Intermediário 3D | Avançado 2D | Mundo 3D Intermediário e modo Ponte |
| Gênio da Criação (`champion`) | mais 5 posições do Avançado 2D | Avançado 3D | Jogo 2D Avançado e modo Ponte |
| Lenda (`god`) | mais 5 posições do Avançado 3D | Carreira concluída | Jogo 3D Avançado, modo Ponte e modo Pro |

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

No bloco Estúdio, o autor escolhe entre projeto em blocos e projeto Pro. Ao escolher Pro, também escolhe um dos cinco modelos. Trocar tipo ou modelo substitui o projeto inicial somente após confirmação.

O backend valida o identificador do modelo contra o catálogo fechado. O preview do Admin chama o mesmo executor remoto usado pelas aulas. Configure no Admin e no Community Kids:

```env
STUDIO_PRO_RUNTIME_URL=https://studio-runtime.exemplo.workers.dev
STUDIO_PRO_RUNTIME_TOKEN=um-segredo-longo-e-compartilhado
```

O token nunca é enviado ao navegador. Os BFFs validam sessão, tamanho real do corpo e projeto antes de chamar o runtime.

## Operação e prontidão

O painel de cursos carrega todas as páginas de cursos Kids antes de calcular a prontidão. A carreira está completa para lançamento quando as 31 posições existem e os cursos necessários estão publicados e autorados.

O banco aplica a mesma regra do domínio:

* somente cursos Kids podem ter `career_slot`;
* Iniciante 2D aceita posições 1 a 6;
* as demais etapas aceitam posições 1 a 5;
* uma posição não pode se repetir na mesma etapa.

As migrações `0048_normalize_creator_career_slots` e `0049_needy_iron_man` precisam ser aplicadas nessa ordem. A primeira remove posições legadas inválidas colocando `career_slot = null`. A segunda reforça a restrição. Antes do deploy, confira o backup e a quantidade de linhas que a normalização atingirá. Em caso de necessidade, prefira uma nova migração de correção em vez de editar o histórico aplicado.

## Pontos principais no código

* matriz e regras de trava: `packages/core/src/career/catalog.ts`;
* cálculo dos marcos: `packages/members/src/infrastructure/persistence/drizzle/gamification.repository.ts`;
* regra de autoria e posições: `packages/members/src/application/content-admin/content-admin.service.ts`;
* capacidades do Estúdio por nível: `packages/member-shell/src/lib/studio-tier.ts`;
* bloqueio de projetos com extensão futura: `packages/studio/src/studio/project-access.ts`;
* autoria Pro: `packages/admin/src/components/studio/studio-embed.tsx`;
* executor remoto: `packages/studio-runtime`;
* apresentação infantil: `packages/community-kids/src/lib/level-info.ts` e `career-rewards.ts`.
