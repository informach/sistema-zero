# Full review — Pensa, Zappy e Estúdio Pro

Revisão das correções da auditoria de 15/10/2026, seguida de integração local com `staging`. A revisão abrange os contratos compartilhados, composição dos hosts, autorização, modalidade de autoria, contexto do tutor, créditos, retomada de pedidos e continuidade das missões.

## Achados da revisão

| Achado | Correção e verificação |
|---|---|
| O planejamento Pro ainda restringia dimensões conforme a extensão de blocos, mesmo com autorização Pro | O contexto permite 2D/3D no Pro autorizado sem consultar a paleta. Regressão reproduzida e corrigida em `pensa-journey-context.test.ts`, incluindo validação de uma proposta 3D sem blocos. O clássico mantém a regra das extensões. |
| Notas acima do limite geravam mensagem genérica de indisponibilidade no Conversar | Erro próprio de limite de resumo, reconhecido pela interface. A criança recebe orientação para resumir as notas; a pergunta permanece e nenhum pedido é enviado. Regressão reproduzida e corrigida em `ZappyPanel.test.tsx`. |
| O guia de transição afirmava que todo script convertido ficava em `public/script.js` | Guia e prompt agora orientam a conferir `index.html`, distinguindo scripts globais em `public/` de módulos em `src/converted/`. Conferido contra o conversor e seus casos de teste existentes. |
| A interface não explicava que reenviar uma tentativa conserva também as notas originais | Texto e ação de novo pedido mencionam código e notas. O teste de retomada confirma que retry conserva o pedido e que a ação explícita cria outro pedido com as notas atuais, preservando idempotência. |
| O botão de missão herdava a disponibilidade clássica mesmo num plano Pro | O host agora fornece `studioProAvailable`, derivado da mesma autorização da rota Pro. O Pensa escolhe a capacidade conforme a modalidade confirmada do jogo. Regressão reproduzida com Pro autorizado e paleta vazia; o teste confirma também que esse acesso não destranca uma missão clássica. |
| A próxima missão Pro abria por navegação interna a partir de outra oficina | `navigatePensaMission` ativa carregamento completo para `/estudio/pro/`, necessário ao isolamento COOP/COEP. Pinta, Molda e guia do Estúdio usam a regra comum. O teste reproduziu a navegação incorreta antes da correção. |
| Enviar um desenho de uma missão Pro ainda dependia da paleta clássica | O handoff informa o projeto Pro somente depois de conferir modalidade confirmada, produto, nível e quem programa. O Pinta libera a biblioteca para esse jogo e abre a rota Pro correta, mantendo a criação de mapas clássicos sob sua regra original. Regressão reproduzida e testes negativos de autorização aprovados. |

Os testes de regressão falharam pelo motivo esperado antes das correções e passaram depois. As reproduções históricas da primeira auditoria foram arquivadas como `.txt` para não serem descobertas como testes ativos que esperam os defeitos antigos.

## Verificação antes da integração

- Studio: 40 testes de conversa, créditos e contexto; todos passaram.
- member-shell: 387 testes em 38 arquivos; todos passaram.
- Kids: 179 testes em 25 arquivos; todos passaram.
- Pensa: 134 testes em 16 arquivos; todos passaram.
- Core: 14 testes; todos passaram.
- Biome: 67 arquivos, sem erros. `git diff --check` no escopo: sem erros.

Os logs brutos permanecem locais nesta pasta e em `../fixes/`; relatórios e manifestos compõem a evidência versionada. Os resultados anteriores completos e os limites do ambiente estão em [correções da auditoria](../fixes/report.md).

## Integração local

Commit de implementação: `0b29da6b0`. Base de integração: `staging` em `82608c4b9`, que já continha outras 29 alterações/merges posteriores à base original. A integração foi preparada na branch `fix/pensa-zappy-staging-review`, em worktree própria, sem alterar os arquivos pendentes de outros trabalhos no checkout original.

Foram preservados o novo desenho do Pensa, as perguntas com respostas rápidas e limites, a oferta opcional de arte, as proteções contra respostas tardias de outra missão/perfil e a abertura do jogo sem iniciar missão. A disponibilidade completa do catálogo Pro de `staging` também foi preservada.

Dois ajustes adicionais de integração:

- `onOpenGame` leva a modalidade confirmada ao host. O Kids abre jogos Pro por navegação completa, sem iniciar uma missão, e conserva as rotas clássicas. Testes cobrem ambas as rotas e a passagem da capacidade Pro.
- O validador recente de passos vagos passou a receber a modalidade: reparar “Implemente o pulo” no Pro agora pede uma alteração concreta no código, sem pedir blocos. O schema recente de guias (`action` + `effect`) foi mantido, assim como os prompts específicos do clássico.

A checagem de tipos do Kids detectou ainda um `useMemo` introduzido em `staging` cujo import havia saído na extração dos hooks compartilhados. O import foi restaurado, preservando a vinculação de missões de `staging`.

O typecheck em checkout limpo também encontrou um conflito de peers: `@axe-core/playwright` resolvia `playwright-core@1.62.1`, trazido por outro pacote, enquanto o executor do Estúdio usava 1.60.0. O Estúdio agora declara explicitamente `@playwright/test` e `playwright-core` em 1.60.0. A resolução do peer foi conferida, e as versões dos demais pacotes foram preservadas. A orientação oficial de manter os pacotes Playwright sincronizados foi consultada via Context7. O lockfile recebeu somente essas entradas e a normalização de uma linha em branco.

## Verificação do conjunto integrado

| Escopo | Resultado |
|---|---|
| Studio completo: `bun test src` | 9.041 casos exercitados: 9.039 passaram na primeira rodada; as duas falhas abaixo foram corrigidas e verificadas novamente |
| Studio: arquivos de criação e conversão após os ajustes | 18 passaram, 0 falharam; inclui build real da conversão com módulos npm |
| Pensa completo | 168 passaram, 0 falharam; inclui os 21 casos de JourneyApp e a separação de capacidade clássico/Pro |
| member-shell: manifesto de 38 arquivos, incluindo entrega de arte e autorização Pro | 470 passaram, 0 falharam |
| Kids: manifesto ampliado e host Pro, 27 arquivos | 203 passaram, 0 falharam; inclui Pinta, Molda e continuidade das missões |
| members: manifesto de 24 arquivos | 223 passaram, 0 falharam |
| Core: contratos Pensa e assistência Pro | 18 passaram, 0 falharam |
| PostgreSQL: jornada, equipe e migração | 32 passaram, 0 falharam |
| PostgreSQL: conta IA, uso e builder | 20 passaram, 0 falharam |
| Navegador: assistência Zappy | 5 passaram; conversa, seleção, investigação e aplicação explícita de propostas |
| Navegador: publicação Pro | 1 passou; publicação e abertura no player |
| Navegador: Pro standalone e acessibilidade da lista | 2 passaram; nenhum painel local de IA duplicado e nenhuma violação Axe séria ou crítica na lista |
| Typecheck: Core, Pensa, Studio, member-shell, members e Kids | Os seis passaram, exit 0; member-shell e Kids reexecutados após as últimas correções de autorização e navegação |
| Biome | 73 arquivos, sem erros ou ajustes pendentes |

As duas falhas da primeira rodada completa do Studio foram: um teste novo de `staging` ainda buscava “Profissional” em vez de “Pro (código)”; o teste de build da conversão precisava das dependências separadas de `studio-runtime/runtime` no novo checkout. O seletor foi atualizado e `npm ci --no-audit --no-fund` instalou o runtime pelo lockfile existente, sem alterações de dependências. Os dois arquivos inteiros foram reexecutados com sucesso; nenhum teste foi desabilitado ou teve timeout aumentado.

As dependências do monorepo foram instaladas com `bun install --frozen-lockfile`. A resolução de imports foi conferida para apontar aos pacotes desta worktree. O PostgreSQL 16 usou o container próprio `pensa-zappy-full-review-20261015`, porta 15449, removido ao terminar; os demais containers foram preservados.

Checagens concluídas no conjunto integrado antes do commit de merge. `git diff --check` passou, e não restaram conflitos no índice. O avanço da branch `staging` local usa `--ff-only` para apontar exatamente ao commit verificado. Sem push ou deploy.

## Limites da verificação

Os testes de navegador usam fixtures locais do editor e dos serviços; os de banco usam PostgreSQL real descartável. Não houve sessão autenticada completa no site implantado, cobrança real de IA, transcrição/narração reais, OAuth, publicação externa ou build Next completo. A antiga intermitência de encerramento do subprocesso de armazenamento permanece não reproduzida, sem causa comprovada; não é apresentada como um defeito cuja causa foi corrigida. Os avisos de tamanho de chunks nos builds dos fixtures não impediram os testes.
