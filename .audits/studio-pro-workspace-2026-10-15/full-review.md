# Full review — Studio Pro

16/10/2026. Base final incorporada: staging local `7c820700b`. Escopo: implementação das seções 1–10 da proposta, em cinco lotes revisados, seguida da revisão integrada. As iniciativas adiadas na seção 11 continuam fora desta entrega.

## Conclusão da revisão

Nenhum achado bloqueante permanece nas alterações revisadas. O editor continua usando o documento, materiais, runtime, autenticação, ledger e adapters do Sistema Zero. Não foi incorporada a infraestrutura do Polaris, criado um segundo projeto documental ou mantido um protocolo antigo do Pro. A instrução de inexistência de usuários Pro foi aplicada diretamente aos contratos e à migration.

## Conferência de escopo e integração

| Área | Resultado verificado |
| --- | --- |
| Navegação e organização | Abas temporárias/fixadas, busca em arquivos fechados, árvore por teclado, caminho navegável, mapa/referências/voltar e comandos agrupados. Pastas reais preservadas; descrições dependem de receitas compatíveis. |
| Editor e layout | Código, preview e assistência mantêm suas instâncias ao reorganizar painéis. Fonte inicial Pro 15 px, preferência explícita preservada, ferramentas inferiores recolhíveis e problemas com origem/revisão verificáveis. |
| Refatoração | TypeScript calcula mudanças de símbolo/arquivo/pasta, inclusive imports em arquivos fechados. Revisão antes de aplicar, guardas de base/perfil/adapter/autoria, colisões e limites. HTML/CSS e caminhos dinâmicos têm conferência manual declarada. |
| Recuperação e persistência | Operações locais e Zappy usam o mesmo journal, com origem explícita. Documento e inversa são gravados juntos; falha conserva recibo pendente e retry idempotente. Recuperação recusa apagar edições posteriores. Preferências usam banco separado e não entram no projeto/exportação. |
| Materiais | Biblioteca existente e adapters de Pinta/Molda/equipe preservados. Caminhos canônicos, exemplos explícitos e revisáveis, validação de material/arquivo/símbolo. Excluir e recuperar inclui binário, posição e capa, sujeito aos limites reais de histórico. |
| Jornada | Kits organizados por resultado, detalhes técnicos secundários e primeiros passos opcionais. Canvas, Three, React, convertido e customizado testados; nenhum progresso de fase é concluído implicitamente. |
| Zappy | Explicar/investigar/pedir mudança têm consequências distintas e envio explícito. Seleção captura linhas/hash; alcance validado no Core, executor, Members, BFF e aplicação local. Versão e hash da candidata conferidos antes de aplicar. Diff ampliável, colorizado e com descarte explícito de modelos. |
| Execução fora da aba | Intenção durável na linha do job; coordenador Members, endpoint de serviço member-shell, leases e orçamento existentes. Polling sem `advance`, cancelamento de domínio, prazo e limites 3+3. Resposta ambígua não dispara outra inferência. |
| Integrações existentes | Suites de classic, StudioLesson/StudioEditor, observer/handoff, conversão/Pensa, assets, publicação/exportação e isolamento por instância/perfil passaram na regressão das áreas afetadas. Nenhum segundo sistema de tarefas, materiais ou notas foi adicionado. |

## Achados corrigidos na revisão final

1. A fila precisava revisitar jobs terminais cujo fechamento de consumo falhou. A conclusão financeira é novamente tentada sem chamar o modelo; sua fila alterna com execuções ativas.
2. O proxy Kids interceptaria o executor como uma requisição de navegador. A rota de serviço foi excluída do matcher e exige segredo próprio; teste usa o matcher real do Next. Disponibilidade interna foi incluída no Gateway HMAC.
3. A atribuição de diagnósticos precisava respeitar o arquivo retornado pelo TypeScript e `jsconfig.json`. Corrigidos caminho/hash, deduplicação por coluna e indicação do limite de 100 problemas.
4. A restrição por linhas passou a reconhecer LF, CRLF e CR sem normalizar o conteúdo fora da seleção.
5. A orientação de conversão presumiu inicialmente `src/converted` para todos os projetos. O teste com o conversor real mostrou o caso de scripts globais em `public/`; texto e fixture foram corrigidos.
6. A regra arquitetural de IndexedDB precisava reconhecer explicitamente o novo banco de preferências, independente do banco documental. A proteção de transações de projetos não foi relaxada.
7. A nova regra de linguagem de staging identificou dois rótulos do workspace. Ambos foram adequados ao vocabulário da criança; não foram criadas exceções para contornar a regra.
8. O conflito ao incorporar staging dizia respeito ao texto do antigo controlador de navegador. Foi preservado o novo polling, junto dos demais ajustes de linguagem e integração de staging.

As revisões anteriores detalham os demais achados corrigidos: [lotes 1–4](reviews.md), [lote 5](batch5.md).

## Evidência final

| Verificação | Resultado |
| --- | --- |
| Studio: `bun test src/components src/core src/modes src/monaco src/state src/studio src/export src/preview` | 1.432 passaram, 8.600 asserções, 160 arquivos |
| member-shell: arquivos `studio*.test.ts(x)` e `*zappy*.test.ts` | 273 passaram, 1.147 asserções, 23 arquivos |
| Core: `bun test src/studio` | 10 passaram, 32 asserções |
| Members: ledger, conta e builder em Postgres + coordenador | 27 passaram, 116 asserções; banco local dedicado, migrations executadas |
| Gateway: `bun test tests/unit/config.test.ts` após incorporar staging | 37 passaram, 169 asserções |
| Kids: vocabulário + matcher do executor | 17 passaram, 100 asserções |
| Chromium: `bunx playwright test --config e2e/pro-workspace.config.ts` | 7 passaram; três builds Vite de produção, StrictMode, resize, Monaco real, ajuda, aplicação e recuperação |
| Gravação de saída incluída na suite Studio | Chromium e WebKit: pagehide, CAS grande pendente, reabertura e conflito entre abas passaram |
| Typecheck | Core, Studio, member-shell, Members, Gateway e Community Kids passaram |
| Biome | 97 arquivos TS/TSX/JSON alterados passaram; snapshots gerados de migration não foram reformatados |
| Playground | `vite build --config playground/vite.config.ts` passou com saída própria em `.cache/pro-playground-build` |
| Diff | `git diff HEAD --check` passou; sem arquivos em conflito |

A primeira tentativa de executar todo `bun test src` no mesmo processo esgotou memória e encerrou o Bun 1.3.11 durante o exemplo Reino Zero Ultra. O arquivo envolvido passou isoladamente (11 testes, 115 asserções); a regressão acima cobre integralmente as áreas alteradas e compartilhadas enumeradas. Não se declara a execução monolítica de todos os testes do Studio aprovada. O primeiro teste de conversão também revelou ausência das dependências do compilador confiável; após `npm ci --ignore-scripts --no-audit --no-fund --prefix packages/studio-runtime/runtime`, a compilação Three real passou. As falhas foram resolvidas/verificadas sem reduzir asserções.

Os builds mantêm avisos existentes de chunks Monaco grandes e imports simultaneamente estáticos/dinâmicos. Os testes de componentes existentes podem emitir avisos React `act`; os cenários de navegador revisados não registraram erros de página.

## Operação e limites

- Merge somente local; sem push, deploy, chamadas pagas de IA ou acesso a banco de produção.
- A migration e o par URL/segredo do executor precisam ser aplicados na implantação, conforme [ADR](../../docs/architecture/studio-pro-builder-coordinator.md). Sem configuração, novas construções ficam indisponíveis; código manual e consulta de propostas permanecem utilizáveis.
- Os testes de inferência usam respostas controladas. Não houve homologação de latência/custo de um provedor real nem pesquisa de usabilidade com crianças.
- Histórico local continua limitado (20 operações, 8 MB/projeto, 32 MB/perfil). Refatoração não promete reescrever referências dinâmicas; autoria completa em celular, colaboração simultânea, GitHub e IA em linha seguem adiadas.

## Integração local

A implementação foi mantida no worktree `sistema-zero-studio-pro-workspace`, branch `feat/studio-pro-workspace`. A base de staging foi atualizada de `1e5b0debc` para `7c820700b` antes das verificações finais. Commit de implementação `77c7e43b7`; merge local em staging `835ea35e2`. Ancestry confirmada e árvore do merge idêntica à árvore validada. As cinco alterações pendentes de outros trabalhos em staging foram preservadas: SHA-256 do diff antes/depois `b6bf115c1c785897d33a952467c4b35e49487cd97ab8991f3b76ad6fb40c8c47`. O PostgreSQL exclusivo da revisão foi encerrado. Nenhum push ou deploy foi realizado.
