# Transferência do Estúdio JavaScript/Python para outra máquina

Data do levantamento: 21/10/2026. Este é um relatório de continuidade, não um aceite de produção. As evidências citadas têm a data, o código e o ambiente de sua execução; precisam de nova conferência antes de qualquer implantação.

## 1. Decisão e situação em linguagem direta

Recomendo transferir a continuação para uma máquina com mais memória disponível. Neste computador de 16 GB, a consulta durante a preparação mostrou aproximadamente 1,7 GB livres. Isso limita principalmente navegador, compilação, Docker e testes simultâneos. A implementação não precisa começar novamente: a base Python, a conciliação do remoto, o seletor administrativo e a frente pedagógica já foram incorporados ao código em staging.

A falta de memória não explica todas as pendências. Há trabalho real de homologação, ativação de infraestrutura e publicação/assistência Python a concluir. O Railway também registrou uma pausa de builds em 21/10 às 07:24 UTC, que uma máquina local maior não resolve.

Além disso, algumas provas foram interrompidas por um teto explícito do supervisor, não apenas por falta de RAM física. Mantendo o mesmo teto, elas podem ser interrompidas também na máquina nova. É necessário diagnosticar o consumo e separar homologação funcional de qualificação de desempenho, sem aumentar limites silenciosamente ou transformar resultados negativos antigos em positivos.

O próximo responsável deve trabalhar em duas linhas separadas:

1. **Prioridade de liberação e gravação:** concluir a homologação JavaScript dos percursos que serão gravados, preservando as falas e deixando o seletor de criação Python apenas para administradores.
2. **Conclusão Python:** ativar o ambiente de staging de forma consistente e fechar a matriz Python, incluindo aulas, salas, Mural/player público, exportação, jogos, Pinta e Zappy.

Não é preciso exigir que todas as funcionalidades Python estejam homologadas para começar a gravar um percurso JavaScript já aprovado. Também não se deve afirmar que todos os percursos JavaScript estão aprovados apenas porque o CI passou.

## 2. Regras confirmadas com o usuário

- JavaScript continua sendo o padrão; nenhuma funcionalidade atual deve ser retirada para acomodar Python.
- A oferta de criação Python aparece apenas para `admin` e `superadmin`. `staff` não recebe essa oferta.
- Esse recorte é de interface. Não acrescentar bloqueios novos em importação, remix, Mural ou runtime que o usuário não pediu.
- Exemplos são administrativos. Durante a validação, os administradores usarão projetos Python em staging.
- Preservar roteiros, falas, montagem, sequência e valores ensinados. Flexibilidade pertence à **verificação dos objetivos**, com coerência de comportamento; não transformar o roteiro em instruções vagas.
- No curso Nave, aceitar qualquer efeito sonoro no evento correto, mantendo o som ensinado no roteiro.
- Turtle é uma extensão, separada dos recursos comuns de programação Python. Blocos em português geram os comandos da API Python contratada.
- Python executa no navegador através da distribuição baseada em Pyodide e de adaptações compatíveis; exportação desktop deve continuar como Python, usando Turtle/Tk e dependências portáveis explícitas quando necessárias.
- Turtle utiliza materiais do Pinta; Molda em Python fica reservado à futura frente Raylib 3D. Pygame CE, Pygame Zero e Raylib são evolução futura, não requisitos de implementação agora.
- Pensa permanece JavaScript neste escopo.
- Programação é prioritariamente no computador; responsividade de consulta continua necessária. Não declarar suporte móvel completo sem prova.
- O teste no outro computador de referência será posterior à validação local completa. A transferência de desenvolvimento não substitui essa prova.
- Produção dos aplicativos depende da validação e da decisão do usuário. Configurar infraestrutura não equivale a promover os aplicativos.
- Revisar entre lotes; fazer revisão final, corrigir achados, verificar e integrar de forma consistente.

## 3. Onde está o código

Repositório: `https://github.com/informach/sistema-zero`.

| Frente | Worktree nesta máquina | Branch | HEAD no levantamento |
| --- | --- | --- | --- |
| Staging | `C:/Users/tocha/projects/sistema-zero` | `staging` | `8c0bb250dc7660869c247f799f126e99e0e93d9c` |
| Coordenação/Python | `C:/Users/tocha/projects/sistema-zero-python` | `feat/studio-python-turtle` | `5503f6a245d2f2434fc91289fba05bbf6f229f29`, antes deste relatório |
| Jogos | `C:/Users/tocha/projects/sistema-zero-python-games` | `feat/studio-python-games-acceptance` | `9557e17bcafbe529d0079c8d941485b7f67061c4` |
| Aulas/Admin/Kids | `C:/Users/tocha/projects/sistema-zero-python-lessons` | `feat/studio-python-lessons-acceptance` | `b763fb6e1773a122188fe37fa044b142c9442f62` |
| Revisão/memória | `C:/Users/tocha/projects/sistema-zero-python-review` | `feat/qa-native-job-owner` | `5c81f089edce0bc5822692a85fa7a0e8d1e4a597` |

O HEAD final da transferência e as referências transportadas constam do manifesto do pacote, pois o próprio relatório será acrescentado depois deste levantamento. Não tratar `5503f6a` como um commit que já contém este arquivo.

Antes deste relatório, a branch principal estava limpa, sete commits à frente de `origin/staging`. São mudanças de QA/documentação, sem novo delta produtivo em relação a staging:

```
2cc0259f5 test(qa): add native Windows job ownership primitive
4b854325a test(qa): fix named job access and overlapping custody
643e62def docs(qa): preserve native ownership plan as UTF-8
1771ee255 test(qa): add Node job owner for hosted Pro browser flow
35b20497c test(qa): capture native browser memory diagnostic snapshots
01f7d35a8 test(qa): add explicit hosted functional memory profile
5503f6a24 docs(studio): reconcile staging promotion and acceptance evidence
```

As branches paralelas são antigas em relação a staging e alguns lotes foram incorporados por reconciliação/cherry-pick. **Não fazer merge automático dessas branches completas nem copiar a árvore antiga sobre a atual.** Preservá-las como referência e conferir somente o delta de escopo ainda necessário. Um diff de árvores entre elas e staging mostra também mudanças remotas posteriores, não apenas entregas pendentes.

## 4. O que já foi entregue e o limite de cada comprovação

| Área | Situação comprovada | O que essa situação não comprova |
| --- | --- | --- |
| Conciliação e CI | Staging `8c0bb250d`; workflow `39548882315` com nove jobs de validação e deploy concluídos | Aceite autenticado de todos os fluxos de uso |
| Aplicativos staging | Cinco serviços principais observados `SUCCESS` no mesmo commit | Que toda configuração Python esteja ativa |
| Base JS/Python | Contratos, documentos, runtime, blocos/Ponte, Pro, autorização e integrações têm implementação no código integrado | Matriz funcional completa aprovada no ambiente hospedado |
| Seletor | Decisão administrativa em Kids e Adulto; observado oculto para `staff` no ensaio real | Todos os papéis/telas homologados no ambiente publicado |
| Pedagogia | Lote integrado; 74 manifestos canônicos e 4.610 linhas citadas de roteiro preservadas nas verificações registradas | Necessidade de regravar todas as falas; isso não foi autorizado nem é o objetivo |
| Jornada | Frente configurável já integrada; não é uma nova frente aberta neste handoff | Direito de reaplicar branches históricas sobre staging |
| JavaScript | Cenários de CI de edição/persistência/Pensa e provas focadas; compilação autenticada Members→Worker com 52 verificações | Preview/reabertura do Pro completo com WebContainer |
| Pro completo JS | Login, importação, reparo Vite/lock, salvamento e exportação de seis fontes avançaram em staging | Primeiro resultado visual e reabertura: ainda pendentes |
| Runtime/linguagem Python | Distribuições e serviços preparados; leitura pública anterior e verificações focadas registradas | Editor→execução→publicação completo em staging |
| Áudio Python | Release de 41 arquivos promovida ao armazenamento de staging, com integridade, replay condicional e revogação verificados | Ativação do catálogo, publicação e Zappy dessa release |
| Jogos | Variantes e observers reais preparados; cenários nativos parciais já executados | Todos os contratos Pac-Man/Space Arena ou equivalência navegador/desktop |
| Aulas | Producer e cenários de QA existentes; lote de 13 arquivos integrado | Fluxo real Admin→aula→criança Python concluído |

CI: https://github.com/informach/sistema-zero/actions/runs/39548882315.

## 5. Frente principal: pendências na ordem recomendada

### A. Transferir e conferir a base

1. Restaurar o código e os anexos desta transferência; instalar as versões e dependências com o lock.
2. Comparar o staging remoto atual com `8c0bb250d`. Revisar qualquer avanço antes de incorporar; não assumir que o remoto ficou parado.
3. Conferir estado dos provedores e autenticar CLIs na máquina nova. Recriar contextos privados; não transportar sessões de navegador ou tokens.
4. Executar verificações leves de preparação, conferir hashes dos materiais e reservar testes pesados em sequência.

### B. Fechar a liberação JavaScript para gravação

1. Aprovar o percurso real **Admin→aula gravada Pro→aluno**, com matrícula e autorização reais, edição, compilação, execução, salvar e reabrir. Aulas usam o compilador remoto existente; isso permite avançar independentemente do WebContainer do Estúdio Completo.
2. Homologar o **Estúdio Completo Pro**: documento JavaScript antigo, reparo determinístico Vite/lock, primeiro preview, terminal/npm/HMR quando aplicáveis e reabertura com fontes preservadas. Diagnosticar o consumo antes de nova tentativa equivalente.
3. Confirmar os controles JS Clássico/Ponte e os fluxos de sala/publicação afetados pela configuração final, usando testes existentes e evidências atuais.
4. Conferir seletor de linguagem visível para admin/superadmin e oculto para aluno/staff em Kids e Adulto, preservando JS padrão.
5. Entregar uma lista explícita de telas/aulas liberadas para gravação, separada das pendências Python. Não redesenhar a interface ou reescrever roteiros durante esse lote.
6. Revisar o delta final, executar os checks exigidos pelo repositório, integrar staging, acompanhar CI e conferir implantação coerente. Produção é uma decisão posterior à homologação.

### C. Ativar o piloto Python em staging

1. Após a recuperação do Railway, observar novamente as configurações reais e garantir leitura posterior e rollback antes de qualquer alteração.
2. Conferir o plano aditivo preparado: mantém a release antiga e as origens existentes, acrescentando a release de áudio. A política candidata passou por verificação offline com documentos JS Clássico/Pro reais e Python Clássico/Pro; isso não substitui prova no navegador.
3. Preparar a implantação exata do Worker leitor, preservando fonte, imagem, bindings, rotas, bucket, origens e capacidades JS; alterar somente o delta revisado. Não redeployar um bundle qualquer apenas para trocar uma variável.
4. Conferir a versão ativa e leitura dos objetos antigos/novos; então habilitar as duas variáveis públicas de Members conforme plano revisado. `--skip-deploys` apenas prepara configuração: não altera automaticamente o processo já em execução.
5. Executar o gate real de implantação Auth/Members/jornada e os aplicativos dependentes. Members `SUCCESS` isoladamente não constitui ativação consistente.
6. Homologar criação, edição, executar/parar, exportação e REPL dentro das quatro capacidades autorizadas. Preservar os negativos de origem, versão, extensão e permissão.

### D. Concluir Python além do piloto

1. Homologar Blocos/Ponte/Código, Python sem Turtle, Turtle como extensão e Pro com arquivos/imports/diagnósticos/console/input.
2. Fechar aulas, Admin, salas, observação/assistência, troca de autoridade, reconexão e continuidade com o documento correto.
3. Qualificar publicação e assistência e criar **nova release imutável** se essas capacidades forem aprovadas. A release piloto atual não pode ser ampliada mantendo a mesma identidade/hash.
4. Provar Mural e `/jogar/:id` anônimo nas quatro combinações JS/Python × Clássico/Pro, incluindo salvar/publicar/reabrir, revisão publicada, stop e revogação. Um iframe de preview ou build HTTP 200 não basta.
5. Qualificar Zappy com linguagem/runtime/extensão reais, permissões, CAS de revisão e descritores/tipagens de `sz_audio`, sem usar resposta mock como aceite de integração.
6. Fechar Pinta: importação/atualização dos materiais, bytes publicados/exportados e continuidade desktop. Não incluir Molda 3D nesta entrega Turtle.
7. Finalizar os jogos e sua galeria administrativa conforme anexo Jogos, com distinção JS/Python.
8. Medir os requisitos de desempenho e carga/aula ao vivo; fechar Stop/cancelamento e recursos após cada prova. Só depois executar a prova no computador de referência e os recortes móveis que forem anunciados.
9. Fazer full review da matriz R01–R22, corrigir achados e registrar o aceite por requisito. Preparar produção com baseline próprio, preservando JavaScript, após aprovação de staging.

## 6. Memória: fatos que precisam acompanhar a transferência

As quatro tentativas hospedadas do Pro JS foram interrompidas pelo orçamento de soma conservadora dos working sets. Houve amostras de aproximadamente 1.078 MiB e 1.406 MiB no perfil de 1.024 MiB; aproximadamente 2.065 MiB e 2.062 MiB no perfil funcional separado de 2.048 MiB. Esses são resultados **NEG**, mesmo com etapas funcionais parciais aprovadas.

Na última tentativa, um processo identificado por CDP como `renderer` atingiu aproximadamente 1.019 MiB. A página estava na fase `starting`, com marcador de download Rolldown; seu heap JavaScript principal estava em cerca de 36 MiB. Isso orienta a investigação, mas não identifica sozinho o worker responsável nem demonstra regressão causada por Python ou pelo fornecedor.

- A soma de working sets pode contar páginas compartilhadas mais de uma vez: não é RAM física exclusiva.
- `PrivateUsage` é commit privado, não private working set.
- Os sete módulos relevantes de WebContainer/montagem/LSP comparados não mudaram em relação à base anterior Python. Vite 8 já existia; a atualização de segurança trocou 8.0.16/Rolldown 1.0.3 por 8.1.6/1.1.5.
- O loader WASI das duas versões tem memória inicial declarada de 1 GiB. Isso não prova que 1 GiB físico esteja residente nem a causa do pico observado.
- Não fazer downgrade vulnerável, não desativar sandbox e não substituir o Pro completo pelo compilador remoto: este não mantém terminal, npm arbitrário, HMR e configurações do mesmo modo.
- Não repetir a mesma tentativa sem hipótese ou mudança verificável. Não reabrir o diagnóstico Bun: o caminho Node/Chrome com ownership nativo já teve prova mínima aprovada.
- Os ensaios terminaram com limpeza normal e reconciliação dos processos conhecidos; não foi usado encerramento dos aplicativos do usuário.

Na máquina nova, manter separados: (a) ambiente com folga de RAM para executar a homologação; (b) orçamento de desempenho do produto; (c) limites de segurança/encerramento do runner. Uma máquina maior ajuda o primeiro, sem aprovar automaticamente os outros dois.

## 7. Infraestrutura e configuração a retomar

### Railway

Projeto `415d5a1c-5f75-432c-8445-b395d0977ce3`; staging `f634cff6-aafb-4804-8b69-172fad4e946e`; Members `aa282801-ffba-477c-af6d-394b2f4f9af9`.

- Consultas de valores via `variable list` e GraphQL retornaram `Problem processing request`. A listagem de deployments funcionou com o mesmo contexto; não presumir falha de autenticação.
- A consulta oficial de **nomes**, sem valores, concluiu em 21/10 às 07:59:57 UTC e provou ausentes no serviço/escopo compartilhado as chaves `STUDIO_AUTHORING_POLICY_JSON` e `STUDIO_RUNTIME_HOSTS_JSON`.
- Não é necessário pedir ao usuário que copie essas variáveis agora. A ausência é um baseline histórico; reconferir antes de escrever e verificar o valor completo depois.
- Não foi demonstrado que a pausa de builds cause o erro de variáveis. São fatos separados.
- Nenhuma dessas duas variáveis foi aplicada nesta etapa.

Aplicativos observados: `https://admin-staging-f8fe.up.railway.app`, `https://community-kids-staging.up.railway.app`, `https://community-staging-66f2.up.railway.app`.

### Cloudflare/runtime

Conta `bcc0f2d44140e05b69152cba326132f8`; bucket staging `sistemazero-studio-artifacts-staging`; origem `https://sistemazero-studio-runtime-staging.helena-bcc.workers.dev`.

| Identidade | Valor observado |
| --- | --- |
| Worker staging | versão `26063240-4fc5-4598-a5da-004f3f5a23ab`, deployment `484eecc0-85b0-42ef-9c1e-46b751fd2877` |
| Bundle fonte | `276cfc1c5a39fadf2a367587a5715ddc278bb1ff8be57204459283fa52d39445` |
| Configuração atualmente ativa | `40ce822aab07184da90bec7a0902296d4889c011740063be6c859bc5b60c57b2` |
| Nova distribuição armazenada | `a8a6c625e8c35552c66265f03a7de1bcda96f44306306206d2ac5f88366b6b4a` — 41 arquivos/22.407.495 bytes |
| Release piloto | `python-browser/2026-10-20-audio-1` |
| Manifesto piloto | `7026b09b04a1222cfbc594d5ab3ec9de8649eece71c613c823a2c33d8c43ce5f` |
| Configuração candidata armazenada | `2dc37fc221789ba23780d13754743470bbe687a703ac115ed14a2e12d9e79df4` — 33.105 bytes; ainda não ativa |

O piloto autoriza somente `edit`, `export-source`, `execute`, `python-repl`. **Não autoriza `publish` nem `assist`.** A publicação de 41 arquivos/43 objetos foi realmente executada em R7; não repetir o upload antigo porque uma checklist histórica estava desatualizada. A medição do pico do isolate frente a 128 MiB permanece pendente; resposta HTTP bem-sucedida não é essa medição.

O par Worker/imagem do compilador JS foi observado em staging com o perfil `9e33`; preservar a correspondência. A configuração de produção tem outra origem/baseline e não pode receber uma cópia cega de staging. A implantação compartilhada de produção ainda não está homologada para a nova release.

## 8. Frentes paralelas incluídas nesta passagem

### Jogos de referência

Sessão `01a15a4f-d555-7c81-80a2-a0fe887e9bbf`. Escopo: Pac-Man P01–P16 e Space Arena S01–S10, cenários reais, portabilidade e galeria. Há testes nativos parciais e preparação de testes de navegador; não está concluída.

Foi preparado **um** novo caso nativo Space Arena `Q08-pause`, ainda sem autorização de início/sem execução no corte deste relatório. O pacote está em `.cache/studio-python-l0/games-functional-r1/space12-native-q08-pause-package-r1` na worktree Games. A transferência substituiu a próxima janela local; não executar um comando com prazo antigo. `Q08-bgm` é outro caso, mais longo, e não foi autorizado implicitamente.

O anexo próprio da frente contém cenários restantes, resultado de cada controle, hashes, comandos e arquivos de continuidade. Os resultados Pac-Man/Space Arena não devem ser tratados como conformance completa do Turtle nem aceite do Mural.

Anexo: [Jogos de referência](2026-10-21-handoff-games.md).

### Aulas/Admin/Kids

Sessão `01a15a51-df0d-7841-95cb-795fc949dbb0`. O lote existente de 13 arquivos de QA já foi incorporado na frente principal. A execução real Admin→Kids ainda está pendente. A proposta mais recente prepara o percurso **JavaScript Pro hospedado**, prioritário para a liberação, em `.cache/hosted-js-lesson-prep-r1` na worktree Lessons.

Não reescrever o producer nem adotar o antigo writer de formato JS v2 para produzir Python v3. Usar matrícula e autoridade reais. `StudioLesson` desliga export/download por padrão: não inventar um botão que a aula não oferece para cumprir um oráculo. A rota gravada também não recebe o mesmo contrato de revisão de workspace do live; testar os conflitos reais de rascunho e os contratos de cada host.

A proposta atual recomenda primeiro uma aula gravada Adulto com dois atores QA novos, admin e customer. Esse recorte é uma preparação ainda não implementada e não conclui Admin→Kids/Python. Corrigir na revisão da proposta dois pontos já identificados pela própria frente: observar a árvore antes do reparo na requisição real de preparação, sem supor que a publicação ocorra antes dele; observar o itemId efetivamente enviado à nuvem, sem assumir que seja blockId.

Os controllers locais antigos de Admin/Next/PG não podem simplesmente receber o novo Job nativo: alguns encerram/dispose o último handle antes do fim dos filhos. A integração local permanece em HOLD de código. Priorizar o fluxo hospedado com Node/Job já preparado; não criar outro framework de ownership.

Anexo: [Aulas, Admin e salas](2026-10-21-handoff-aulas.md).

### Apoio de CI/infra e revisão

Sessão `01a15a53-f486-74c1-84be-d4c84b80049a`. Está em conciliação somente leitura; os 18 pontos de baseline/bootstrap/coorte já foram resolvidos e o CI `8c0` passou. Não reabrir essas pendências históricas. A worktree Review também contém um desenho local não commitado de callers nativos; preservá-lo como referência, não como implementação concluída.

Anexo: [Autoria, CI e revisão](2026-10-21-handoff-autoria-python.md).

As três sessões receberam HOLD de novos serviços/testes e pedido de relatório. Os anexos finais e o manifesto indicam o estado efetivamente entregue. A sessão pedagógica já foi encerrada pelo usuário; sua entrega integrada não deve virar outra reescrita pedagógica.

## 9. O que transportar e o que recriar

**Código:** o staging remoto contém a implementação principal. O bundle incremental da transferência preserva os commits locais selecionados e suas referências, mas depende de uma cópia do repositório que já tenha `8c0bb250d` e seus ancestrais. Ele não é um clone completo offline.

**Documentação:** levar este relatório, os anexos das frentes e o manifesto de SHA-256. Os documentos antigos de implementação contêm histórico e caixas não atualizadas; este corte e os recibos posteriores prevalecem para status, sem apagar os negativos antigos.

**Materiais ignorados pelo Git:** usar o inventário de continuidade do pacote. Os diretórios `.cache` não aparecem automaticamente no clone remoto. O pacote compacto inclui os arquivos explicitamente selecionados e verificados; não é uma cópia integral de todos os experimentos.

Atualização solicitada pelo usuário: os planos e preparações selecionados também estão versionados em [docs/continuity/2026-10-21-studio-python](../../continuity/2026-10-21-studio-python/README.md). São 382 snapshots com origem e SHA, incluindo scripts, fixtures, observadores, propostas e recibos. Os binários gerados do runtime e os dois ZIPs de mídia ficam no pacote de transferência, com 43 entradas identificadas no inventário. O sufixo `.snapshot` impede a execução/descoberta automática de scripts históricos; restaurar só o recorte revisado, preservando os bytes e gerando autoridade nova.

**Recriar:** `node_modules`, venv Python, caches de navegador, containers, contextos locais, builds efêmeros e autenticação Railway/Cloudflare/GitHub. Não copiar `.env`, tokens, cookies, perfis de navegador, dumps de banco ou logs brutos. Acesso ao provedor deve ser restabelecido na máquina nova.

**Caminhos e ownership:** os recibos históricos referem-se a caminhos, PIDs, FILETIMEs, handles, SID, hashes e prazos desta máquina. Conservá-los como evidência de origem; não fazer busca/substituição nesses recibos para fingir validade no destino. Gerar novos planos, pins e janelas para as novas execuções. Nunca reutilizar o nome de uma saída de execução já reservada.

Não copiar somente as pastas de worktree: o `.git` de cada uma é um ponteiro para o repositório compartilhado nesta máquina. Usar clone+bundle e worktrees novos.

## 10. Retomada na máquina nova

O pacote deve ser extraído em um diretório privado de trabalho; os exemplos abaixo usam `C:/trabalho`. Ajustar esse diretório uma única vez na preparação de novos planos, preservando as evidências antigas.

```powershell
git clone https://github.com/informach/sistema-zero.git C:/trabalho/sistema-zero
Set-Location C:/trabalho/sistema-zero
git fetch origin staging
git cat-file -e '8c0bb250dc7660869c247f799f126e99e0e93d9c^{commit}'
git bundle verify C:/trabalho/transferencia/continuacao.bundle
git fetch C:/trabalho/transferencia/continuacao.bundle 'refs/heads/feat/studio-python-turtle:refs/heads/transfer/python' 'refs/heads/feat/studio-python-games-acceptance:refs/heads/transfer/games' 'refs/heads/feat/studio-python-lessons-acceptance:refs/heads/transfer/lessons' 'refs/heads/feat/qa-native-job-owner:refs/heads/transfer/review'
git worktree add C:/trabalho/sistema-zero-python transfer/python
Set-Location C:/trabalho/sistema-zero-python
git status --short
git log --oneline origin/staging..HEAD
```

O comando `git cat-file` precisa concluir com exit 0 antes da verificação/importação do bundle incremental. Se o remoto avançou, revisar o intervalo e integrar na branch de continuidade, sem reset/descarte do trabalho local. O comando de fetch acima cria referências novas `transfer/*` para não substituir branches existentes.

Versões utilizadas nas últimas provas: Node 24.22.0, Bun 1.3.11, PowerShell 7.6.7, Railway CLI 5.62.1, Wrangler 4.120.1, Playwright 1.60.0, Chrome 155.0.8059.85, CPython 3.14.2/Tk para referência desktop. As versões do lock e os binários efetivamente instalados no destino precisam ser conferidos; não chamar um teste de reprodução exata se forem diferentes. Os helpers de ownership aqui preparados são Windows; outro sistema exige adaptação e prova próprias.

```powershell
bun install --frozen-lockfile
git diff --check
node --version
bun --version
railway --version
```

A instalação não foi executada como parte da elaboração deste relatório. Autenticar os CLIs normalmente no destino e conferir o contexto explícito de staging antes de qualquer mutação. Não executar todos os testes, builds e Docker simultaneamente. O handoff de cada frente fornece seus comandos; comandos históricos com janela expirada são referência, não uma ordem de executar.

### Prompt para a sessão coordenadora nova

> Continue a implementação do Estúdio Python a partir de docs/superpowers/plans/2026-10-21-transferencia-estudio-python.md e seus anexos. Preserve as decisões do usuário e as evidências negativas. Primeiro confira o manifesto, o HEAD restaurado e o remoto atual. Priorize liberação JavaScript para gravação com seletor Python apenas admin/superadmin; depois feche o aceite Python completo. Não reescreva os roteiros nem reabra os 18 pontos de baseline já encerrados. Não reaplique branches paralelas antigas inteiras. Recrie planos/ownership/pins para esta máquina. Faça lotes com review, checks adequados e full review ao final. Informe claramente o que está integrado, implantado e efetivamente homologado. Não declare produção liberada a partir do CI ou da presença dos arquivos no bucket.

## 11. Referências para aprofundar sem recomeçar a pesquisa

- [Proposta funcional](../../plans/2026-10-16-estudio-javascript-python-turtle-proposta.md).
- [Matriz R01–R22 e entregas](../../plans/2026-10-16-estudio-python-validacao-entregas.md).
- [Metas de desempenho](../../plans/2026-10-16-estudio-python-desempenho.md).
- [Liberação JS/Python administrativo, com checkpoint atualizado](2026-10-20-liberacao-js-python-admin.md).
- [Promotor operacional, com R7 conciliado](2026-10-20-python-operational-promoter.md).
- [Ownership Windows de QA](2026-10-21-qa-windows-native-job-ownership.md).
- [Histórico do aceite integrado](2026-10-19-studio-python-final-acceptance.md): leitura histórica, não checklist atual isolada.
- Journal de coordenação: `.cache/studio-python-l0/parallel-sessions/COORDINATOR-STATUS.md` da worktree Python.

O manifesto e os anexos desta transferência complementam estas referências com os arquivos efetivamente transportados, status por frente e instruções de retomada.

O usuário solicitou que a passagem seja integrada e enviada a **staging remoto**. Depois da confirmação de push, a retomada pode começar por `git clone --branch staging https://github.com/informach/sistema-zero.git C:/trabalho/sistema-zero-python`, sem depender do bundle para obter os planos e os commits da coordenação. Conferir o SHA remoto contra o manifesto. O bundle continua útil para recuperar também as referências históricas selecionadas das outras worktrees. Push e CI não equivalem a deploy concluído, especialmente durante a pausa de builds do Railway.

## 12. Corte final da passagem

Em 21/10 às 08:18 UTC, `git ls-remote origin refs/heads/staging` ainda retornou `8c0bb250dc7660869c247f799f126e99e0e93d9c`. Todas as frentes foram instruídas a não iniciar novos testes/serviços. O caso Q08-pause permanece não executado. A preparação desta transferência não fez deploy nem promoveu produção.

Antes do push da passagem, nova consulta encontrou `bb0d15971d4945bfa38731421d4f3f016b5def7c`: somente dois testes adicionais do Molda em `booleanSolids.test.ts`, sem alteração produtiva. O diff foi revisado e essa atualização será incorporada à integração de staging; o manifesto final registra o commit resultante. Os resultados de CI anteriores continuam pertencendo a `8c0bb250d`, não ao novo commit de passagem.

O pacote `transfer-20261021-r1` contém um bundle Git incremental, este relatório e os três anexos, além de uma seleção de 425 arquivos de continuidade que totaliza 50.285.431 bytes antes do empacotamento. Cada cópia foi conferida por SHA-256. Foram excluídos 24 arquivos de ambiente/binários do inventário Games e dois logs da seleção Lessons; seus nomes e hashes permanecem no inventário como referência. Os executáveis e o venv devem ser reinstalados.

A pasta `evidencias/` preserva a identificação das quatro worktrees e os bytes históricos; **não é uma árvore para copiar por cima do checkout**. Os manifestos originais das frentes também foram preservados, inclusive seus caminhos absolutos antigos. `evidence-manifest.json` descreve o que foi realmente copiado; `pacote-manifest.json` descreve o pacote final e as referências Git. `verificar-pacote.ps1` confere integridade local sem iniciar serviços, acessar provedores ou executar os scripts históricos.

Revisão independente do relatório principal não encontrou achado concreto; a conclusão se limita à coerência documental. Não foi executado novo navegador, jogo, build, Docker, TSC ou teste de produto para produzir este handoff.
