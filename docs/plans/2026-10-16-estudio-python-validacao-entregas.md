# Estúdio JS/Python: validação, entregas e critérios de aceite

16/10/2026 · Revisão 3 · Anexo da [proposta principal](2026-10-16-estudio-javascript-python-turtle-proposta.md). Plano de entregas verificáveis; não é registro de implementação concluída. Nenhum teste Python abaixo foi executado nesta rodada.

## 1. Matriz transversal

Executar os cenários aplicáveis nas quatro combinações: JS clássico, JS Pro, Python clássico e Python Pro. “Não aplicável” só vale para semântica própria da linguagem/API, acompanhada de justificativa; não pode esconder falta de persistência, publicação, autoria ou assistência.

| ID | Requisito | Evidência exigida |
|---|---|---|
| R01 | JavaScript padrão e preservado | Criar sem escolha explícita gera JS; abrir fixtures antigas mantém fontes, blocos, IDs, extras, assets e comportamento |
| R02 | Linguagem/tipo/runtime coerentes | Separar validade, autorização e disponibilidade do host/browser; incompatibilidade não cria projeto vazio |
| R03 | Clássico Blocos/Ponte | Quatro codecs por bloco, mapeamento, seleção, erros, desfazer/refazer e fonte adiantada |
| R04 | Python Pro funcional | Árvore, imports locais, diagnósticos, navegação, rename revisado, formato, console/input e execução |
| R05 | Admin completo | Criar, importar, configurar semente/extensões/curadoria, ensaiar, publicar e reabrir |
| R06 | Aula gravada Pro | Entrar com matrícula válida sem Pro livre, executar, salvar, enviar, reabrir e revisar |
| R07 | Sala ao vivo | Aluno, observador, assistência, demonstração do professor, reconexão e troca de dispositivo |
| R08 | Autoridade | Lease/epoch/revisão protegem edições, importação de saída, dependências e aplicação de IA |
| R09 | Players e mural | JavaScript clássico/Pro continuam jogáveis; Python clássico/Pro publicam no mural e `/jogar/:id`; visitantes jogam sem Python instalado; a página identifica o perfil publicado, e preview, entrega, candidato e embed usam o mesmo perfil |
| R10 | Continuidade | Cadeias, drafts, biblioteca pós-oficina, fonte mais recente e políticas de acesso preservadas |
| R11 | Turtle compatível | Catálogo contratado passa conformance web e CPython/Tk, com semântica e recursos verificáveis |
| R12 | VS Code | ZIP fresco aberto, dependências preparadas e programa executado fora da plataforma, sem editar fontes geradas |
| R13 | Publicação reproduzível | Manifesto v2 inclui runtime/extensões; retenção/GC transitivos, idempotência e revogação explícita; JS v1 continua legível |
| R14 | Assistência e atividades | Zappy/atividades Python com CAS completo de ambiente; preservar permissões, créditos, recuperação e todas as integrações JS |
| R15 | Desempenho | Passar [fixtures e metas](2026-10-16-estudio-python-desempenho.md), incluindo vídeo e professor |
| R16 | Futuro preparado | Novo perfil pode ser registrado sem condicional de linguagem em cada host; bibliotecas futuras não são oferecidas agora |
| R17 | Pinta e escopo Molda | Importar/atualizar imagem, vetor, frame e mapa Pinta; publicar/exportar bytes reais; preservar originais/JS; Molda em Python reservado a Raylib 3D |
| R18 | Pensa JS preservado | Missão continua JS; handoff, evidência e conclusão recusam vínculo acidental com projeto Python; Pensa Python não é oferecido |
| R19 | Programação Python independente | Categorias e recursos da seção 7, sem Turtle; console/entrada, Ponte, Pro, publicação e exportação; sem renderer gráfico carregado |
| R20 | Turtle como extensão do projeto | Adicionar/remover/reabrir/importar/remixar, permissões e dependências; ausência não apaga fonte; catálogo e Zappy refletem a extensão efetivamente adicionada |
| R21 | Pac-Man completo | Todas as funcionalidades do episódio 9, incluindo áudio portável explícito, Pro, publicação e exportação; P01–P16 do [contrato adicional](2026-10-16-pacman-aceite.md) |
| R22 | Space Arena | Corpus fixado, variante explícita para fronteiras OS/Python atual e S01–S10 do [contrato adicional](2026-10-16-space-arena-aceite.md); sem distribuição automática dos assets de terceiros |

## 2. Entregas, dependências e revisão

| Lote | Entrega concreta | Depende de | Aceite para concluir |
|---|---|---|---|
| L0 | Baseline JS; recorte runtime Turtle independente do editor, fonte desktop; prova Pyright e materialização Pinta | Nenhuma mudança de contrato em produção; rota pública real em L7 | Direção local qualificada com limites explícitos no relatório L0/ADR001; homologação integrada em L8 e segunda máquina após validação local, conforme usuário |
| L1 | Contratos, schemas, catálogo server-safe e cadeia de migrações | L0 aprova a direção | Fixtures v1/v2/v3; bytes autorais preservados v2→v3; CAS Pro v2 e manifesto artefato v2 definidos; rejeição segura de versões futuras |
| L2 | Adaptar JS aos contratos comuns | L1 | Suítes JS e fluxos atuais passam antes de Python ser oferecido |
| L3 | Runtime Python e distribuição Turtle | L0/L1 | Ciclo de vida, isolamento, filesystem, input, callbacks e quota/desempenho |
| L4 | IR/parser/gerador, Programação Python, blocos Turtle e Ponte | L1/L3 | Catálogo completo contratado, separação núcleo/extensão e round-trip sem perda; R19/R20 no Clássico |
| L5 | Python Pro e serviço de linguagem; lock browser e gestão da extensão Turtle | L1/L3 | Ferramentas reais, FS/autoridade, análise segura; núcleo independente e R20 no Pro; sem instalador externo fictício |
| L5A | Pinta: materialização por representação, identidade/sincronização dos derivados | L1/L3 | R17; imagens completas, atualização, cancelamento e exportação sem perda do original |
| L6 | Admin/aula/live/demonstração/continuidade | L2/L4/L5 | R05–R10 nas quatro combinações; Pro gravado relatado verificado/resolvido; gravação e baseline de semente preservadas |
| L7 | Publicação, players, exportações, atividades/Zappy e proteção Pensa JS | L3–L6 e L5A | R09–R14/R17–R20; mural e dispositivos públicos com/sem Turtle; fonte VS Code; revisão/CAS de ambiente |
| L8 | Qualificação integrada, carga e liberação | Todos os lotes anteriores | Toda matriz, metas de desempenho, retenção e recuperação verificadas |

L3 e os preparativos de L4/L5 podem evoluir paralelamente depois do contrato comum; não publicar formatos divergentes. L6 pode começar pelos fluxos JS Pro já existentes enquanto Python é integrado. Liberação para alunos depende do conjunto, não de terminar um seletor de linguagem.

L0 deve produzir código experimental isolado, fixtures e relatório; não introduzir lógica temporária no produto. Se a candidata JSPI/Pyodide não entregar sincronismo, navegador e desempenho exigidos, registrar rejeição e revisar a decisão de runtime. Não prosseguir supondo que a integração futura resolverá a limitação automaticamente.

Atualização explícita do usuário em 16/10/2026: o teste no segundo computador Windows com Chrome/Edge só acontecerá depois da implementação e validação completas nesta máquina. Preparar o pacote em L0; executar essa prova externa na etapa final, sem bloquear L1–L8 locais. A aprovação técnica local não será apresentada como homologação de desempenho do computador de referência.

Saídas obrigatórias de L0: patch/hash da candidata e CPython/Tk de referência; mapa de origem/CSP/bootstrap/worker/imports e prova de FFI/subworkers; traces de eventos Turtle durante execução síncrona; exportação com entrypoint/imports; matriz desktop; memória/boot/cancelamento/isolamento de Pyright; orçamento de materialização Pinta. Aprovação técnica exige esses resultados, não só um quadrado desenhado. Compatibilidade experimental upstream não é veto automático nem aprovação automática. Revisão 4: o usuário priorizou programação no computador e adiou a homologação física Android/iOS. Consulta móvel responsiva continua obrigatória; execução/jogabilidade móvel só recebe suporte anunciado após evidência própria.

L0 precede compromisso com datas finais: runtime gráfico compatível, Ponte reversível, serviços e integração transversal são frentes de engenharia distintas. A estimativa de implementação deve ser feita por lote com base nessas provas e no inventário JS; não apresentar um prazo único como se o trabalho fosse acrescentar uma flag.

## 3. Testes por fronteira

### 3.1 Documento, migração e armazenamento

Fixtures: JS v1, JS v2 clássico com fontes alteradas na Ponte, Pro JS com npm/lock e assets, Python clássico/Pro v3, documento futuro, runtime inexistente, extensão incompatível e transporte incompleto.

Asserções: v1 atravessa somente v1→v2→v3; v2 não passa novamente por migrações históricas; rodar migração duas vezes é idempotente; fontes/assets/IDs são preservados; linguagem e lock sobrevivem a todas partições; interrupção mantém original recuperável. Testar upload/download, IndexedDB, nuvem, remix, envio e importação de manifesto.

Fingerprint novo varia com release/lock relevante, mas não por arrastar bloco. Hash de partes antigas continua idêntico. Cliente antigo não sobrescreve formato que não compreende.

Gerar candidato Pro, alterar apenas entrypoint/lock/runtime e tentar aplicar: o CAS v2 deve recusar. Testar inverso/undo de configuração e fonte juntos. Promover clássico mantém ID ativo e backup confirmado; falha/revisão concorrente não perde vínculo com aula/nuvem/Pensa JS. Confirmar que envelope core e validadores server-safe não importam UI nem criam core→Studio.

### 3.2 Python e Turtle

Núcleo sem extensão: criar Python vazio no Clássico e no Pro; executar conversa, calculadora, quiz, sorteio e lista/placar com coleções. Cobrir funções, imports locais, classe simples e tratamento de erros na seleção avançada. Comparar resultados/erros de cada bloco com CPython, inclusive índices zero, limite exclusivo de `range`, conversões explícitas, `None`, divisão, mutação de coleções e escopo. Conferir os codecs e preservação de fonte das famílias novas, sem prometer round-trip de herança/generators/comprehensions. Salvar/reabrir, promover, publicar com console/input e exportar para execução desktop sem Turtle/Tk.

Catálogo: paleta, busca, admin, ajuda e Zappy compartilham IDs e caminhos. Nenhum bloco de fundamento é exclusivo de Turtle, nenhuma categoria vazia é mostrada e dependências de encaixes/parâmetros não ficam escondidas por erro de nível. Rótulos portugueses geram Python padrão. Permissões JS não liberam blocos Python por coincidência de nome.

Extensão: adicionar Turtle em projeto existente sem modificar automaticamente sua fonte; executar com a versão declarada; tentar importar sem extensão; testar adição proibida pelo admin. Remover com referência conhecida deve apontar o uso e preservar tudo; remover sem uso não apaga assets. Tentar import dinâmico após remoção gera diagnóstico. Testar cancelamento, falha de persistência, desfazer e resposta de IA antiga após alterar extensões. Reabrir/remixar/importar mantém dependências; publicação anterior permanece executável com sua revisão. Não executar instalador PyPI para Turtle. Medir ausência de adapter/renderizador Turtle no projeto que só usa Programação.

Fixtures: quadrado, flor parametrizada, corrida com aleatoriedade controlada, labirinto com teclado, carimbo com PNG, timer recorrente, clique/arraste, várias tartarugas, imports aliases e módulo auxiliar.

Testar erro de sintaxe incompleto durante digitação, código válido não representável, comentários, docstrings, kwargs, Unicode, CRLF, scopes e ordenação de efeitos. Não executar código para fazer reverse parse. Parse atrasado não muda projeto/revisão nova.

Conformance compara fonte idêntica no navegador e CPython/Tk. Fixar seed e entradas nos cenários controlados, sem modificar a implementação da biblioteca em teste. Separar comparação semântica de tolerância visual. Testar APIs explicitamente não suportadas e confirmar erro claro, nunca sucesso vazio.

Incluir timer durante `while` com movimento antes de `mainloop`, `tracer(0)`, callback que chama `update`, callback que falha e `bye` em callback. Comparar com patch fixo, incluindo diferenças de métricas de fonte em `write(move=True)`. REPL/input não abrem segunda execução concorrente nem alteram a evidência da revisão autoral.

Corpus de [jogos reais](../../.audits/estudio-turtle-repositorios-2026-10-16.md): testar classe Turtle extensível, atributos autorais, cores Tk e overloads; corrida com input antes da tela, 2/10 participantes e saída de console; loops com update/sleep e sem mainloop alcançável. Qualificar sleep não negativo, GIF de vários quadros como representação estática de referência e exportação dos mesmos arquivos. Exemplos com dependência externa/OS não homologada devem falhar com diagnóstico, sem emulação silenciosa. Manter manifesto do corpus com commit, licença, hashes e indicação original/adaptado.

### 3.3 Runtime, publicação e segurança

Worker infinito, flood de log, render saturado, pacote ausente, hash inválido, URL de recurso não autorizada, mensagem forjada, origem inesperada, sessão obsoleta, erro de download e expirado. Confirmar encerramento de worker **e** renderer, cancelamento e manutenção de fonte autoral.

Abrir JS e Python simultaneamente, alternar projetos e executar revisão candidata sem alterar execução principal indevidamente. Em modo observador, tentar mutações pela árvore, console, installer e comandos. O resultado é recusado pelo dono autoritativo, não apenas por botão desabilitado.

Publicar, atualizar, reabrir revisão antiga, remover preview temporário e executar a publicação novamente. Fontes, recursos e runtime devem corresponder ao manifesto; uma atualização do catálogo não modifica o jogo publicado.

Validar CSP efetiva no documento e no worker; tentar rede direta por FFI, workers filhos, acesso entre sessões e mensagens brutas forjadas. O host só recebe eventos limitados pelo supervisor isolado. Testes de pressão de memória verificam recuperação; não declaram quota rígida de processo inexistente.

Tentar GC de runtime ainda referenciado e simular perda da resposta de publicação. O manifesto v2 deve sobreviver à normalização/hash e proteger dependências transitivas. Separar release retirada de criação, revogada e indisponibilidade de rede; não atualizar bytes silenciosamente. Projeção pública remove assistência/grants/origens privadas nas duas linguagens.

Abrir mural e `/jogar/:id` sem sessão do autor: cards não carregam runtime; jogo Python clássico/Pro é interativo nos alvos anunciados. Testar loading além do antigo prazo JS, retry, tela inicial/input, reinício, foco, orientação, controles, celular físico e incompatibilidade explicada. Nenhum Monaco/Blockly/LSP/renderer Molda no tráfego público.

**Reforço explícito do usuário durante a implementação:** a página pública publicada pelo Mural precisa executar ambas as linguagens. Cobrir quatro percursos reais de publicar → sair da conta do autor → abrir `/jogar/:id` → jogar: JS clássico, JS Pro, Python clássico e Python Pro. Conferir assets Pinta, teclado/controles, áudio quando presente, reinício e revisão publicada. Seleção pelo perfil/manifesto da publicação, sem usar apenas `kind === 'pro'` como decisão de executor. Execução correta no editor não satisfaz este requisito. Consulta móvel responsiva permanece obrigatória; homologação física móvel segue o adiamento já autorizado.

### 3.4 Serviço de linguagem

Testar completion, definição, referências, símbolos e renomeação multiarquivo em revisão atual. Aplicação concorrente ou obsoleta deve exigir nova proposta. Derrubar o serviço durante edição; texto, salvar, exportar e execução continuam disponíveis.

Casos hostis: `pythonPath`/`venvPath` externos, arquivos que imitam executável, `sitecustomize.py`, configuração de plugin, URI com traversal, symlink e `workspace/executeCommand` não autorizado. Confirmar ausência de execução autoral, rede e leitura de outro workspace. Conexão reaberta usa grant e snapshot atuais, sem dados de outro aluno.

Ensaio L0 executa o serviço real/stubs com F4 e registra bootstrap, pico, completion fria/quente e expiração. L5 integra o editor; L8 mede carga. Não mover toda a prova de viabilidade operacional para depois da construção do Pro.

### 3.5 Aula e sala ao vivo

No admin, preparar e publicar cada combinação. No aluno, entrar, modificar, executar, sair durante análise/save, reabrir, enviar e receber revisão. Revisar a configuração real do runtime gravado para diagnosticar o relato; registrar causa reproduzida e correção, sem presumir ausência total de suporte.

No live: editar durante pedido de ajuda, confirmar flush, trocar epoch, tentar escrever com token antigo, devolver, reconectar e trocar dispositivo. Se persistência falhar, não conceder nova autoria nem dizer que o rascunho foi salvo. Demonstração do professor e assistência usam o mesmo catálogo e executores; nunca iniciar runtime para todos os cards.

Testar expiração, cancelamento de matrícula, professor sem vínculo e continuidade por assinatura. Um grant de aula não libera Pro no Completo; um arquivo importado não amplia bibliotecas permitidas.

Ensaio de rascunho admin não exige publicação. Atualizar semente/perfil enquanto projeto aluno está salvo ou gravando: preservar baseline e conteúdo; conceder acesso atual sem impor semente incompatível. Assistência aguarda pausa de gravação confirmada, inclusive falha do gravador. Cursor com edição não salva não aparece sobre conteúdo diferente. Abrir outro perfil no mesmo mount troca providers/limites atomicamente e descarta retornos antigos.

### 3.6 Exportação e desempenho

Descompactar ZIP fonte numa pasta limpa; não usar caches nem módulos internos do monorepo. Preparar ambiente Python anunciado, executar pelo terminal do VS Code, alterar uma regra e executar novamente. Testar paths, materiais, README autoral e arquivo autoral que sombreia Turtle. Guardar hashes do ZIP e dos arquivos executados.

Executar também Pro com entrypoint em subdiretório; validar `__name__`, imports, cwd e paths relativos. Preservar pyproject/documentação autorais e diagnosticar conflitos de nomes; o comando gerado usa o entrypoint real. Turtle puro não recebe dependência PyPI nem wheel fictício.

Executar o contrato de desempenho com funcionalidade correta e chamada ativa. Distinguir cold, cache HTTP, reinício e nova sessão. Medir custo no cliente e no servidor LSP. Não declarar aprovação com cenários pulados, mocks de runtime ou hardware mais potente sem informar a limitação.

### 3.7 Pinta, Molda e Pensa

Pinta: importar→editar original→atualizar derivado→salvar→publicar→exportar desktop. Testar PNG, vetor, frame e mapa achatado; confirmar que o mapa não usa miniatura como fonte final. Derivados não sobrescrevem original nem quebram sync JS. Trocar projeto/revisão/perfil durante a conversão cancela aplicação atrasada. Testar ausência de posse Pinta e materiais preparados pelo admin separadamente. Turtle não anuncia biblioteca Molda; JS mantém seus fluxos GLB/HDR/texturas, e arquivos já existentes não são apagados.

Pensa: novas missões são JS e legados continuam JS. Tentar abrir link de missão com Python ativo, vincular evidência Python e concluir tarefa JS: recusar combinação sem perder nenhum projeto. Missões JS com Pinta/Molda/equipe e promoção para Pro preservam vínculos. Zappy/atividades Python continuam funcionando independentemente de missões Pensa Python estarem fora desta entrega.

## 4. Suítes existentes a preservar

Comandos abaixo são **orientação para implementação**, não comandos executados nesta rodada. Usar o diretório indicado; conferir os scripts no checkout de execução se o repositório avançar.

| Diretório | Comando existente | Finalidade |
|---|---|---|
| `packages/studio` | `bun run test` | Estado, codecs, editor, exportação e runtimes atuais |
| `packages/studio` | `bun run typecheck` | União documental e todos os consumidores locais |
| `packages/studio` | `bun run check:pro-kits` | Fontes/locks/catálogos dos kits JS |
| `packages/studio` | `bun run check:pro-typescript-libs` | Bibliotecas TypeScript existentes |
| `packages/studio` | `bun run verify:canvas-export` | Exportação real do kit Canvas |
| `packages/studio` | `bun run verify:grid-export` | Exportação real dos jogos de grade |
| `packages/studio` | `bunx playwright test --config e2e/pro-workspace.config.ts` | Editor Pro, revisão e Zappy |
| `packages/studio-runtime` | `bun run test` | Contratos, builds, artefatos e publicação |
| `packages/studio-runtime` | `bun run typecheck` | Fronteiras do runtime |
| `packages/studio-runtime` | `bun run check:validation-profile` | Identidade de validação/toolchain |
| `packages/members` | `bun run test` e `bun run typecheck` | Autorização, DTOs, aulas, live e persistência |
| `packages/admin` | `bun run test` e `bun run typecheck` | Autoria, ensaio e revisão |

Conservar também E2E de CSP, player público, execução de código do aluno, artifacts e materiais. Adicionar cenários Python aos hosts reais, incluindo community-kids e demais shells consumidores afetados; testar somente o playground não valida aulas.

Localizações propostas para provas novas: `studio/src/languages/python/*.test.ts`, `studio/src/runtime/python/*.test.ts`, `studio/src/export/__tests__/pythonSource.test.ts`, `studio/e2e/python-turtle.spec.ts`, `studio/e2e/python-performance.spec.ts`, testes de snapshot/cursor/autoria nos pacotes existentes e conformance em `studio-python-runtime/tests`. Esses caminhos são futuros; não foram criados como testes vazios.

## 5. Evidência e definição de pronto

Cada lote entrega diff revisável, testes pertinentes, fixtures/versões e registro de falhas ou limites. Revisar desempenho durante L0/L3/L5, não apenas no fim. Testes adicionais devem cobrir comportamentos e fronteiras, sem espelhar cada função ou criar mocks que eliminem justamente o risco que deveria ser medido.

O pacote final deve registrar: base/commit, arquivos de prova, comandos, navegador/OS/hardware/rede, Python/Tk, versões/hashes do runtime, amostras e percentis, resultados de portabilidade e inventário de compatibilidade. Benchmarks publicados sem máquina de entrada ou sem execução desktop são parciais.

Esta proposta só pode ser marcada implementada quando R01–R22 estiverem atendidos nos contextos contratados. Não converter uma limitação técnica em “concluído com observação” quando ela impede Programação Python independente, Turtle portátil como extensão, Pro em aula/live, publicação pública, Pinta, preservação JS ou as metas de desempenho.
