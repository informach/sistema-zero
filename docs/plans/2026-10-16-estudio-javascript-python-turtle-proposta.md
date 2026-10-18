# Estúdio JavaScript e Python: base comum, aulas, Pro e Turtle

16/10/2026 · Revisão 5 — implementação em lotes; programação priorizada no computador por decisão do usuário. Núcleo Python em Programação e Turtle como extensão opcional. Provas locais revisaram bootstrap, proteção de workers e métricas de Parar; teste no outro computador fica após implementação/validação local.

Base de código consultada: checkout local, HEAD `43202b67c` ao registrar este documento. As conclusões vêm de leitura de código e documentação primária; não representam execução validada do novo ambiente.

Documentos complementares: [contrato Turtle e portabilidade](2026-10-16-turtle-api-portabilidade.md), [desempenho](2026-10-16-estudio-python-desempenho.md), [matriz de aceite e entregas](2026-10-16-estudio-python-validacao-entregas.md), [análise inicial](../../.audits/estudio-javascript-python-viabilidade-2026-10-16.md) e [pesquisa das oficinas](../../.audits/estudio-python-extensoes-oficinas-2026-10-16.md).

Registro desta revisão: [lacunas encontradas, decisões e provas pendentes](../../.audits/estudio-python-revisao-proposta-2026-10-16.md). Requisitos de produto abaixo estão definidos; a escolha efetiva de distribuição, bootstrap e navegadores depende das provas de L0. Especificar uma prova obrigatória não equivale a afirmar que ela já passou.

## 1. Resultado contratado

Acrescentar projetos Python à base compartilhada do Estúdio, preservando integralmente os recursos JavaScript existentes. JavaScript continua selecionado por padrão. A primeira extensão Python será **Turtle**, com blocos em português, código Python padrão na Ponte e uso textual no Pro. pygame-ce, Pygame Zero e Raylib são expansões futuras, preparadas pelos contratos, sem implementação ou anúncio de disponibilidade nesta entrega.

**Separação de produto confirmada:** escolher Python disponibiliza o núcleo da linguagem em **Programação**, utilizável sem extensão gráfica. Turtle é uma extensão opcional adicionada ao projeto pelo mesmo fluxo de extensões usado em JavaScript, como Jogo 2D. Não equivale a instalar um pacote chamado `turtle` pelo pip. Templates e aulas podem entregá-la já adicionada, com essa dependência declarada. A seção 7 define a organização pedagógica do núcleo Python.

O usuário confirmou duas decisões: “Dart” significava Turtle; uma implementação gráfica para navegador é aceitável, desde que mantenha a API Python e permita continuar os projetos exportados no VS Code. Assim, não estamos propondo executar Tkinter em servidor nem apresentar uma implementação própria como o módulo original do CPython.

**Portabilidade faz parte do aceite:** os projetos produzidos pelo conjunto Turtle contratado devem executar, sem alteração manual do código da criança, tanto no navegador quanto em CPython com o Turtle original. A exportação desktop não leva um módulo próprio chamado `turtle.py` ou diretório `turtle/` que sombreie a biblioteca padrão. VS Code é o editor; Python e suporte a Tk precisam estar disponíveis no computador.

**Compartilhar continua sendo parte do produto:** projetos Python clássicos e Pro devem publicar no Mural dos Criadores e funcionar na página pública `/jogar/:id`, sem instalação de Python pelo visitante. No navegador executa-se CPython compilado para WebAssembly, com Turtle gráfico adaptado; no computador a fonte exportada usa CPython/Tk. Não é tradução do programa para JavaScript nem um aplicativo web obrigatório no desktop. O fluxo de publicação está detalhado na seção 13.

### 1.1 Escopo desta entrega

| Incluído | Resultado exigido |
|---|---|
| Documento, catálogo, persistência e execução por linguagem | JS e Python identificados explicitamente, sem arquivos web fictícios em Python |
| Clássico e Pro | Clássico em Blocos/Ponte; Pro em Código; promoção preserva a linguagem |
| Estúdio Completo | Escolha de linguagem na criação, JS padrão, templates e extensões compatíveis |
| Admin e aulas gravadas | Linguagem, tipo, projeto inicial, curadoria, extensões, atividade e ensaio completos |
| Sala ao vivo | Quatro combinações de linguagem/tipo, mantendo projeto canônico e assistência |
| Players e continuidade | Conheça o jogo, entregas, revisão, biblioteca, publicação, remix e reabertura |
| Turtle | API contratada, blocos, parser, gerador, runtime web, exemplos e documentação |
| Programação Python independente | Fundamentos, coleções, funções, entrada/saída e recursos avançados organizados por nível; projetos sem Turtle também executam, publicam e exportam |
| Python Pro | Arquivos, análise, navegação, refatorações essenciais, console e dependências compatíveis |
| Exportação | Documento editável, fonte desktop e distribuição web como produtos distintos |
| Integrações | Zappy e Pinta em Python/Turtle; Molda e missões Pensa existentes preservados em JS |

**Preservar JS** significa preservar seus fluxos, APIs públicas pertinentes, dados, permissões, motores, extensões, terminal, builds, editor e integrações. Não significa transformar APIs DOM/HTML/CSS em Python. Para Python, recursos do produto equivalentes são implementados com semântica própria; ferramentas incompatíveis não aparecem como funcionais.

### 1.2 Fora desta entrega

Implementações pygame-ce, Pygame Zero e Raylib; missões Pensa Python (recomendação de etapa posterior); conversão automática JS↔Python; Tkinter completo no navegador; desktop remoto; pacotes arbitrários do PyPI; backend Python persistente do aluno; reformulação de assinaturas; mudança da jornada JS; reescrita do editor ou introdução de outro framework de serviços.

## 2. Situação atual e causas das lacunas

| Área | Evidência atual | Consequência |
|---|---|---|
| Documento | [Project](../../packages/studio/src/core/project.ts) exige arquivos web; Pro usa árvore adicional | Python precisa de variante documental real |
| Migração | [migrateProjectDocument](../../packages/studio/src/project-migrations/index.ts) aplica transformações históricas a formatos anteriores | Subir a versão sem encadear migrações repetiria conversões JS |
| Extensões | [Contratos](../../packages/studio/src/extensions/types.ts) pressupõem bootstrap JS e exemplos SZIR | Separar manifesto comum de implementação por linguagem |
| Ponte | [Reverse parse](../../packages/studio/src/modes/bridgeReverseParse.ts) usa parsers web | Python requer análise própria e preservação de fonte |
| Pro | [Adapter remoto](../../packages/studio/src/studio/pro-runtime.tsx) só compila; local usa WebContainer | Python requer executor, sem alterar o funcionamento dos executores JS |
| Admin/aula gravada | Já há Código Pro e build remoto autorizado pela aula | Completar e verificar o fluxo, não recriá-lo paralelamente |
| Conheça o jogo | [Autoria](../../packages/admin/src/lib/project-play-authoring.ts) rejeita Pro | Player e validação precisam aceitar os perfis suportados |
| Sala | [Snapshot](../../packages/members/src/domain/live/workspace-snapshot.ts) rejeita Pro e exige arquivos web | Validar o documento e suas capacidades, mantendo limites e autorização |
| Fonte exportada | [sourceExport](../../packages/studio/src/export/sourceExport.ts) já distingue fonte/deploy, mas é web | Acrescentar builder Python e prova desktop |
| Desbloqueios | [Elegibilidade](../../packages/members/src/infrastructure/persistence/drizzle/studio-unlock-eligibility.ts) exclui cursos ao vivo | Preservar a diferença entre acesso à oficina e acesso ao Estúdio livre |

O relato de que Pro não funciona em aula gravada precisa de reprodução durante a implementação. Há suporte em autoria, Members e player; não foi determinada nesta análise a causa da falha percebida. Configuração do runtime, template, ensaio, publicação da aula e bloco Conheça o jogo são cenários concretos a verificar. A entrega exige resolver o fluxo completo, não apenas mostrar um seletor no admin.

### 2.1 Centralização e responsabilidades

Hoje validações de formato e curadoria aparecem no Studio, DTOs Members, manifesto learning, admin e live. Cada consumidor tem motivo para validar sua entrada; o problema é repetir a definição do formato e divergir.

Centralizar em `packages/core/src/studio` os contratos leves de identidade, esquema documental, perfis, compatibilidade e curadoria. Manter autorização contextual em Members/hosts. Manter parsers, geradores e executores específicos em seus pacotes. Servidor não importa Blockly, Monaco ou React para validar documentos.

O core **não importa o pacote Studio**. Seu `StudioProjectDocument` define envelope, variantes, arquivos, metadados e payloads JSON com limites estruturais. `Project` no Studio refina esse documento com as IRs tipadas; não redefine os campos comuns. A validação semântica de IR/blocos pertence aos módulos puros de cada linguagem, compostos pelos consumidores que precisarem dela. Validar JSON não prova coerência fonte↔IR nem autoriza executar/avaliar o projeto; operações que dependem dessa coerência usam o validador da linguagem e a revisão autoritativa. Separar imports de catálogo/validação dos imports de UI das extensões evita o ciclo core→Studio→core.

A implementação segue os padrões existentes de TypeScript, Zod, funções e adapters. Esta expansão não introduz Effect nem outra arquitetura de aplicação.

## 3. Decisões de arquitetura

| Alternativa | Avaliação | Decisão |
|---|---|---|
| Acrescentar um booleano e condicionais em cada tela | Mantém pressupostos JS e multiplica divergências | Rejeitada |
| Contratos comuns e implementações específicas de linguagem/runtime | Reaproveita o produto, torna compatibilidade verificável | Adotada |
| Reescrever tudo em uma IR universal ou segundo estúdio | Amplia risco de regressão e duplica coordenação | Rejeitada |

```text
Completo / Admin / Aula / Sala / Entrega / Player
                    |
       autorização + curadoria do contexto
                    |
      documento canônico + catálogo validado
                    |
        Studio e seus coordenadores atuais
          /                         \
 linguagem JavaScript          linguagem Python
 parsers/IR/geradores JS        parser/IR/gerador Python
          |                         |
 preview JS / WebContainer      Pyodide + Turtle web
 compilador remoto JS          em origem isolada
          \                         /
       fonte / artefato web / publicação / avaliação
```

São dimensões distintas:

1. `programmingLanguage`: família JavaScript ou Python. TypeScript continua dentro da família JavaScript, e a linguagem de cada arquivo continua explícita.
2. `kind`: clássico ou Pro. No documento normalizado novo é obrigatório; legados preservam o significado atual.
3. `mode`: Blocos/Ponte no clássico, Código no Pro.
4. `runtime`: perfil e distribuição versionados. O host resolve o executor permitido: por exemplo, um projeto JS Pro usa WebContainer no Completo e compilação remota na aula.
5. Permissões e curadoria: restringem o que o usuário pode fazer naquele contexto; nunca são concedidas pelo conteúdo de um arquivo importado.

## 4. Contrato documental e identidade

Propor formato **v3**, com migração explícita v2→v3. O `Project` público evolui para uma união discriminada por linguagem e tipo. Todos os campos atuais compartilhados permanecem: identidade, datas, nome, assets, capa, extensões, ferramentas, metadados de autoria e estado pertinente. A alteração não deve apagar informações de Pro, assistência, publicação ou árvores existentes.

Fragmento normativo dos novos contratos, proprietário proposto `packages/core/src/studio/project-environment.ts`:

```ts
export type StudioProjectLanguage = 'javascript' | 'python'

export interface StudioRuntimeSelection {
  profileId: string
  releaseId: string
  manifestSha256: string
}

export interface StudioProjectEnvironment {
  programmingLanguage: StudioProjectLanguage
  runtime: StudioRuntimeSelection
}

export interface StudioDependencyResolution {
  distribution: string
  version: string
  imports: readonly string[]
  requires: readonly string[]
  artifacts: readonly { path: string; sha256: string }[]
}

export interface StudioDependencyLock {
  lockVersion: 1
  target: 'browser'
  pythonVersion: string
  runtimeManifestSha256: string
  requirementsSha256: string
  packages: readonly StudioDependencyResolution[]
}
```

Os identificadores `profileId` e `releaseId` são strings no transporte, **validadas contra o catálogo canônico**. Não são URLs, comandos ou plugins executáveis fornecidos pelo aluno. SHA-256, caminhos, versões, coerência de linguagem e dependências têm schemas próprios. O lock acima é específico da resolução Python **browser** para a distribuição fixada; npm e seus locks continuam próprios da variante JS Pro. `requires` referencia distribuições resolvidas no mesmo lock; artefatos pertencem ao manifesto aprovado. O hash de requisitos vincula a resolução à entrada declarativa usada para produzi-la.

Nesta entrega Turtle não instala pacotes externos: `packages` é vazio, e runtime/extensão identificam os recursos fornecidos. Implementar verificação do lock e catálogo, sem simular um instalador PyPI nem contratar agora resolução universal. Adicionar/remover Turtle usa o fluxo de extensões. Pacotes externos e locks desktop por sistema/ABI ficam com a primeira biblioteca futura que os exigir, mantendo este lock versionado e sem reinterpretá-lo como universal.

| Variante | Fonte e representação |
|---|---|
| JS clássico | `files` canônicos e extras atuais; IR JS e estado Blockly preservados |
| JS Pro | Árvore atual e metadados JS existentes; não reconstruir projetos antigos |
| Python clássico | `main.py` e módulos Python auxiliares; IR Python e estado Blockly próprios |
| Python Pro | Árvore real com `.py`, `.pyi`, configuração e recursos; entrypoint explícito |

Python não recebe `index.html`, `style.css` ou `script.js` vazios. O HTML que inicializa a publicação pertence ao artefato produzido pelo executor, não ao programa da criança.

O campo de linguagem não é opcional no formato novo. Somente a migração de documento antigo introduz JavaScript por ausência; linguagem desconhecida ou inconsistência entre perfil e documento gera erro recuperável. Nunca normalizar Python inválido para um projeto JS vazio.

### 4.0 Localização canônica dos campos

`Project` incorpora `StudioProjectEnvironment` **na raiz**: `project.programmingLanguage` e `project.runtime`, sem outro `project.environment` concorrente. `project.kind` e `project.mode` permanecem na raiz. Para Python, `project.python` contém `entrypoint` e `dependencyLock`; não usar `proMeta.devScript` para executar Python.

| Variante v3 | Campos específicos obrigatórios | Campos que não serão criados |
|---|---|---|
| JS clássico | `files`, `ir`, `blocksState`; extras conforme contrato atual | `python`, árvore Pro artificial |
| JS Pro | `tree`, `proMeta` atual; forma JS preservada durante a migração | `python` |
| Python clássico | `files: Record<string,string>` contendo `main.py`; `python.entrypoint = 'main.py'`; `python.dependencyLock`; `ir` Python ou null; `blocksState` ou null | `extraFiles`, `tree`, `proMeta`, arquivos HTML/CSS/JS fictícios |
| Python Pro | `tree` no formato existente por caminho; `proMeta` comum; `python.entrypoint` apontando para `.py` presente; `python.dependencyLock`; `ir = null`; `blocksState = null` | `files`, `extraFiles`, `proMeta.devScript` |

Python clássico guarda módulos auxiliares em `files`, sob política de caminhos do perfil; não herda a restrição de nome único sem diretórios dos extras JS. `proMeta.templateId`, `proMeta.assistance`, `proMeta.publication` e `proMeta.origin` continuam nos mesmos caminhos nas duas variantes Pro. O schema discrimina `proMeta.devScript`, obrigatório só em JS. Não mover os metadados comuns nem manter cópias em campos novos: setters, projeção pública e coordenação passam a aceitar ambas as variantes. O lock vazio de dependências externas ainda identifica Python/runtime; Turtle web é recurso versionado do perfil/extensão, não distribuição PyPI declarada pelo projeto.

O entrypoint inicial é **script**, equivalente a `python caminho/do/arquivo.py` a partir da raiz do projeto. Definir `__name__ = '__main__'`, `__file__`, `sys.argv[0]` e a precedência de imports como nessa execução CPython; caminhos absolutos do filesystem virtual não são portáveis. O diretório de trabalho é a raiz, e `sys.path[0]` corresponde ao diretório do script. Execução por `python -m` exigiria outra variante explícita e não será inferida do nome do arquivo. O anexo Turtle define o comando de exportação correspondente.

### 4.1 Autoridade e preservação

O documento é a fonte durável. Ambiente instalado, filesystem do runtime, desenho e logs são projeções/sessões. A fonte Python permanece íntegra quando contém erro de sintaxe. `bridgeCodeAhead` e o protocolo de autoridade da Ponte continuam distinguindo fonte nova de derivados antigos.

Alterar linguagem cria outro projeto ou usa uma conversão futura explícita. Esta entrega não oferece tradução automática. Promover Python clássico para Pro segue a identidade já usada em JS: salva primeiro backup clássico com ID novo, depois promove **o ID ativo existente**, preservando vínculos com aula, cadeia e nuvem; em JS, esse protocolo também preserva Pensa. Commit exige a mesma revisão de origem; falha do backup ou edição concorrente impede a promoção. `proMeta.origin` referencia o backup. A promoção preserva fontes, materiais e linguagem, sem Vite/npm; não concede acesso Pro fora do contexto autorizado. Remix/importação como novo projeto recebem novo ID e não herdam propriedade de publicação ou grants do documento original.

### 4.2 Persistência, hashes e versões

Atualizar [projectStorageRecords](../../packages/studio/src/state/projectStorageRecords.ts), resumos, snapshots, partes, drafts, envios, biblioteca, importação e exportação para transportar os campos novos. Não basta acrescentá-los à interface `Project`.

Separar versão documental, versão do transporte de partes, revisão de gravação, versão do runtime e versão dos blocos. O [fingerprint de conteúdo](../../packages/core/src/creations/content-fingerprint.ts) ganha uma versão explícita que inclui linguagem, perfil, release e dependências relevantes. Preservar a leitura de fingerprints anteriores e **não alterar os bytes de `canonicalJson`**, usados pelos hashes das partes já armazenadas.

A impressão Studio v2 acompanha o documento v3; documentos históricos e Pinta conservam a régua v1. Para o critério de reenvio, impressões de versões diferentes são incomparáveis: a migração isolada não prova edição e não bloqueia a criança. A conferência completa retoma após envio e rascunho usarem v2; não é possível afirmar se uma alteração ocorreu comparando hashes de réguas diferentes. Cliente e servidor compartilham essa regra. Isso não relaxa salvamento, concorrência ou deduplicação: falha ao salvar continua bloqueando a confirmação, e somente hashes estritamente iguais dispensam cópia de segurança.

Versionar também a revisão de alteração do Pro em [pro-revision](../../packages/core/src/studio/pro-revision.ts), usada por candidatos Zappy, aplicação e desfazer. A versão 2 discrimina linguagem e inclui fonte, assets, diretórios, runtime, versões de extensões, entrypoint/lock Python ou configuração JS no digest. Alterar só ambiente ou entrypoint já invalida uma proposta antiga. Alterações de configuração entram no mesmo compare-and-swap, revisão e inverso das alterações de fonte; não criar um segundo histórico independente. Hash documental, hash de conteúdo, revisão de persistência e revisão de execução têm finalidades distintas e não são intercambiáveis.

## 5. Catálogo de perfis, extensões e templates

Perfis iniciais: `javascript-web` e `python-browser`. O primeiro encapsula os executores JS existentes; o segundo executa o núcleo Python e admite a extensão opcional `python-turtle`. Suportar uma extensão no perfil não significa que ela esteja adicionada em todos os projetos. O catálogo publicado só anuncia capacidades implementadas e verificadas.

Manifestos leves declaram: ID, versão, linguagem, perfis compatíveis, tipos/modos aceitos, requisitos gráficos, permissões, arquivos, destinos de exportação, critérios de avaliação e disponibilidade. A implementação pesada fornece blocos, codecs, runtime, exemplos e manuais por carregamento sob demanda.

Compatibilidade efetiva = capacidade implementada ∩ runtime disponível ∩ autorização do host ∩ curadoria. A interface explica indisponibilidade concreta; esconder uma opção não substitui validação no servidor/importação.

Exemplos deixam de exigir sempre SZIR JS: cada exemplo declara linguagem/tipo e uma fábrica ou snapshot validado correspondente. Os IDs Blockly Python são próprios (`sz_py_*` e `sz_turtle_*`), evitando mudar a semântica de IDs globais quando JS e Python aparecem na mesma página.

O catálogo controla dependências oficiais aprovadas; uma extensão não pode solicitar qualquer URL de script, wheel ou executor. pygame-ce, Pygame Zero e Raylib aparecem apenas na seção futura desta proposta, não como botões de instalação sem implementação.

### 5.0 Adicionar e remover Turtle

O template **Python vazio** começa com `main.py`, Programação e console/entrada padrão, sem dependência Turtle, `import turtle` automático ou palco gráfico inicializado. O template **Python com Turtle** declara a extensão e pode trazer código inicial correspondente. Ambos existem no Clássico e no Pro, conforme o acesso autorizado. Recursos comuns da biblioteca padrão homologada, como os itens de `math` e `random` expostos pela paleta, acompanham o núcleo e não exigem uma extensão gráfica.

A ação de adicionar Turtle valida linguagem, versão, perfil e curadoria; registra a extensão no documento pela coordenação já existente; disponibiliza categoria, manual, exemplos e análise; e prepara o módulo gráfico compatível sob demanda. Não injeta um programa de exemplo no arquivo aberto sem ação explícita. No Pro, a mesma extensão fornece execução e assistência, mesmo sem paleta de blocos. A capacidade de gerenciar extensões é distinta de `install-dependencies`, reservada a pacotes externos efetivamente homologados.

Um `import turtle` escrito ou trazido por um projeto sem a extensão declarada gera diagnóstico com a ação de adicioná-la, quando autorizada. Não conceder acesso nem alterar o manifesto silenciosamente. O ambiente novo só é aplicado na execução seguinte, respeitando snapshot, revisão e cancelamento; uma execução em curso não muda de biblioteca a meio do programa. Imports dinâmicos também estão sujeitos à disponibilidade real do módulo, sem tratar análise estática como barreira de segurança.

Remover Turtle exige revisar dependências conhecidas em fontes, blocos e outras extensões. Havendo uso, explicar o impedimento e apontar as referências; o aluno pode ajustar o programa antes de remover. Não apagar comandos, materiais Pinta ou arquivos para tornar a remoção possível. Sem uso identificado, retirar a dependência e invalidar a sessão antiga de forma coordenada; import dinâmico não detectado falha com diagnóstico claro. Publicações anteriores conservam sua extensão e versão; desfazer/reabrir/importar/remixar preserva o estado correto de cada revisão.

Turtle cria a superfície gráfica quando o programa usa sua API gráfica. Python sem Turtle não baixa/inicializa seu adapter gráfico, paleta ou renderizador; descritores leves de catálogo podem ser compartilhados. A presença de uma imagem Pinta no projeto não instala Turtle automaticamente. O admin pode preparar Turtle sem permitir que alunos adicionem ou removam extensões naquela atividade.

### 5.1 Interfaces comuns de capacidade

Contratos propostos no core, usando `StudioProjectLanguage` e `StudioRuntimeSelection` da seção 4:

```ts
export type StudioProjectCapability =
  | 'edit' | 'execute' | 'pause' | 'publish' | 'export-source'
  | 'install-dependencies' | 'terminal' | 'python-repl' | 'assist'

export interface StudioRuntimeProfile {
  id: string
  languages: readonly StudioProjectLanguage[]
  kinds: readonly ('classic' | 'pro')[]
  modes: readonly ('blocks' | 'bridge' | 'code')[]
  levels: readonly string[]
  releases: readonly { id: string; manifestSha256: string }[]
}

export interface StudioRuntimeRelease extends StudioRuntimeSelection {
  /** Todos os campos abaixo integram o SHA-256 imutável da release. */
  manifest: {
    manifestVersion: 1
    profileId: string
    releaseId: string
    programmingLanguage: StudioProjectLanguage
    kinds: readonly ('classic' | 'pro')[]
    modes: readonly ('blocks' | 'bridge' | 'code')[]
    capabilities: readonly StudioProjectCapability[]
    extensions: readonly { id: string; versions: readonly string[] }[]
    sourceTargets: readonly ('browser' | 'desktop')[]
    requiredBrowserFeatures: readonly ('wasm' | 'worker' | 'jspi' | 'trusted-types')[]
    artifacts: readonly { path: string; sha256: string }[]
    python?: { version: string; packages: readonly StudioDependencyResolution[] }
  }
}

export interface StudioOperationAvailability {
  capability: StudioProjectCapability
  state: 'available' | 'checking' | 'unavailable'
  reasonCode?: string
}

export interface StudioProjectCuration {
  level?: string
  allowBlocks?: string[]
  allowCategories?: string[]
  allowedModes?: ('blocks' | 'bridge' | 'code')[]
  allowLevelReveal?: boolean
}

export interface StudioProjectCapabilityInput {
  programmingLanguage: StudioProjectLanguage
  kind: 'classic' | 'pro'
  runtime: StudioRuntimeSelection
  installedExtensions: readonly { id: string; version: string }[]
}

export interface StudioResolvedCapabilities {
  /** Validade estrutural/compatibilidade; não significa que há executor disponível. */
  valid: boolean
  modes: readonly ('blocks' | 'bridge' | 'code')[]
  capabilities: readonly StudioProjectCapability[]
  operations: readonly StudioOperationAvailability[]
  extensionIds: readonly string[]
  issues: readonly { code: string; path: string; message: string }[]
}

export declare function resolveStudioProjectCapabilities(input: {
  project: StudioProjectCapabilityInput
  profile: StudioRuntimeProfile
  release: StudioRuntimeRelease
  releaseStatus: 'active' | 'retired' | 'revoked'
  hostOperations: readonly StudioOperationAvailability[]
  grantedCapabilities: readonly StudioProjectCapability[]
  grantedExtensionIds: readonly string[]
  curation: StudioProjectCuration | null
}): StudioResolvedCapabilities
```

O resolver é puro e **não autentica**: grants vêm da autorização contextual, descrita na seção 9, nunca do documento. Todos os IDs e valores `level` são validados no catálogo server-safe. A curadoria mantém os campos atuais; `allowBlocks` vazio/ausente continua usando a política por nível, sem confundir essa regra com um grant irrestrito. Modos são a interseção válida com o tipo; uma configuração que elimina todos os modos é erro de autoria, não motivo para ignorar a restrição.

O host produz `hostOperations` a partir de adapters realmente injetados, estado dos serviços e prova de recursos do navegador. Operação não informada está indisponível. `capabilities` é apenas a lista final disponível; `operations` inclui também verificações pendentes e motivos de bloqueio. Um documento pode ser válido e exportável sem poder executar naquele navegador. `terminal` JS local não é inferido da disponibilidade do compilador remoto. O servidor revalida autorização e compatibilidade nas suas próprias operações, sem confiar nas sondagens do cliente como permissão. Manifesto de release fixa capacidades, requisitos e versões das extensões; editar o catálogo descritivo não altera o contrato de releases já publicadas.

Disponibilidade operacional de uma release fica em registro separado dos bytes imutáveis: ativa; retirada de novas criações; execução revogada por incidente. Retirada mantém abertura/execução de projetos existentes; revogação bloqueia novas execuções/publicações servidas pela plataforma e preserva fonte/exportação/diagnóstico. Atualização exige nova release e revisão explícita do projeto. Não prometer revogar cópias já baixadas ou execução offline instantaneamente.

Operações de documento, catálogo e autoridade continuam nos adapters existentes; essa lista não substitui a matriz completa de capacidades do Pro. Recursos novos ampliam a fonte canônica, sem inventar allowlists divergentes por host.

## 6. Execução Python no navegador

### 6.1 Escolha proposta

Adotar CPython via **Pyodide em worker isolado**, com o módulo Turtle web e renderização Canvas no iframe isolado. A versão pública consultada foi Pyodide `314.0.7`, cuja console identifica Python `3.14.2`; tratá-la como **candidata de qualificação**, não como uma dependência já homologada. A release efetiva fica fixada com hashes depois de passar pelas provas do lote técnico inicial. [Console oficial](https://pyodide.org/en/stable/console.html), [workers](https://pyodide.org/en/stable/usage/webworker.html).

Atualização L0: o bootstrap qualificado usa Blob **clássico** com import dinâmico do módulo versionado. O worker módulo falhou na topologia opaca Chromium. O perfil exige Trusted Types/CSP para impedir workers filhos; o [ADR001](../../.compozy/tasks/estudio-python-l0/adrs/001-worker-stop.md) registra causa, provas e revisão explícita das metas de Parar. Não usar fallback sem proteção, alterar protótipos ou conceder mesma origem.

O worker executa Python; o iframe renderiza e recebe entrada. O estado semântico Turtle pertence à biblioteca Python. Comandos gráficos identificados preservam ordem e são confirmados pelo renderer. Não retornar sucesso a uma chamada que falhou ao carregar um recurso.

Para preservar chamadas síncronas sem inserir `await` no código da criança, avaliar o caminho documentado **JSPI / `pyodide.ffi.run_sync`** dentro do adapter. Entrada no interpretador usa `runPythonAsync`/`callPromising` conforme o contrato da biblioteca. Isso é integração explícita, não transformação textual do programa. **A API `run_sync` ainda está classificada como experimental pelo Pyodide**: a proposta não a trata como homologada. Fixar versão, isolar o adapter e comprovar animação, callbacks, temporizadores, `input` e cancelamento antes de decidir a release. [JSPI no projeto](https://blog.pyodide.org/posts/jspi/), [status da API](https://pyodide.org/en/stable/usage/api/python-api/ffi.html#pyodide.ffi.run_sync).

Não declarar suporte universal de navegador. Detectar capacidades e executar uma prova funcional antes de oferecer execução Python. L0 registra versão estável/OS/dispositivo e resultado dos navegadores desktop disponíveis, distinguindo engine automatizada de navegador/dispositivo comercial. A lista final de versões anunciadas sai dessa prova. Por decisão do usuário em 16/10/2026, criação e programação são fluxos de computador; consulta no celular continua responsiva. Homologação física de execução Android/iOS deixa de bloquear a entrega e fica para etapa posterior. Jogabilidade Python móvel não é prometida sem evidência; incompatibilidade preserva consulta, sem alterar o suporte JavaScript atual.

A documentação atual do V8 informa JSPI em Chrome 137 e Firefox 139; o WebKit anunciou suporte no Safari 27 beta. Esses anúncios motivam ensaios, não homologam o nosso sandbox nem dispositivos antigos. Ausência do recurso ou falha do perfil mantém leitura/exportação e apresenta incompatibilidade; não muda a linguagem, não aciona servidor oculto e não exige flags experimentais do usuário. JavaScript conserva sua matriz atual. [V8](https://v8.dev/blog/jspi), [WebKit](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/).

### 6.2 Ciclo de vida e protocolo

Interfaces propostas em `packages/studio/src/runtime/types.ts`, consumindo `Project` do core do Studio após sua evolução:

```ts
export interface StudioExecutionIdentity {
  projectId: string
  revision: string
  instanceId: string
  runId: string
  writerEpoch: number | null
  runtimeManifestSha256: string
}

export interface StudioRuntimeSession {
  readonly identity: StudioExecutionIdentity
  readonly playback:
    | { kind: 'stop-only' }
    | { kind: 'pausable'; pause(): Promise<void>; resume(): Promise<void> }
  readonly repl:
    | { kind: 'unavailable' }
    | { kind: 'python'; evaluate(input: { requestId: string; source: string }): Promise<void> }
  run(): Promise<void>
  subscribe(listener: (event: StudioRuntimeEvent) => void): () => void
  stop(): Promise<void>
  dispose(): Promise<void>
  provideInput(requestId: string, response: { kind: 'line'; text: string } | { kind: 'eof' }): Promise<void>
}

export type StudioRuntimeEvent = {
  identity: StudioExecutionIdentity
  sequence: number
} & (
  | { type: 'state'; state: 'ready' | 'running' | 'waiting-input' | 'paused' | 'completed' | 'stopped' }
  | { type: 'console'; stream: 'stdout' | 'stderr'; text: string; omittedLines: number; omittedChars: number }
  | { type: 'input-request'; requestId: string; prompt: string }
  | { type: 'repl-result'; requestId: string; status: 'completed' | 'failed'; text: string }
  | { type: 'diagnostic'; path: string; line: number; column: number; message: string; traceback: string }
  | { type: 'failed'; code: 'runtime-unavailable' | 'package-unavailable' | 'program-error' | 'quota-exceeded'; message: string }
)

export interface StudioRuntimeProvider {
  readonly id: string
  prepare(input: {
    project: Project
    identity: StudioExecutionIdentity
    signal: AbortSignal
    /** Iframe criado e já montado pelo host; não vem do documento do aluno. */
    frame: HTMLIFrameElement
  }): Promise<StudioRuntimeSession>
}
```

`prepare` valida e monta o snapshot; sua resolução entrega uma sessão pronta. O host assina eventos e chama `run`; essa promise confirma o início, enquanto término/erro chegam pelo stream. Uma sessão executa uma única geração. As mensagens internas de renderização são tipadas pelo contrato Turtle e não viram comandos genéricos executáveis no host. Mensagens carregam identidade, sequência e limites. `subscribe` não perde transições emitidas depois de sua inscrição. `stop`/`dispose` são idempotentes; falha de preparação é rejeição estruturada da operação, nunca uma sessão pronta falsa. Pausar/retomar permanecem nos providers JS onde já disponíveis; Python só anuncia essa capacidade depois de definir e testar seu comportamento cooperativo.

`identity.revision` identifica o digest do snapshot de execução, incluindo ambiente e buffers capturados; não é o contador de gravação do workspace. O host emite `instanceId/runId` e associa o snapshot à revisão persistida quando necessário. Mensagem do programa não pode escolher uma revisão diferente para ganhar autoridade.

`repl.evaluate` confirma aceitação do comando; resultado chega identificado por `requestId`, com saída limitada. O scheduler recusa avaliação concorrente ou estado sem oportunidade de cooperação, conforme o anexo Turtle. `provideInput` entrega uma linha de texto ou EOF explícito para stdin, nunca avalia esse texto como código. Linha vazia e fim da entrada são distintos; EOF não significa Parar. Ambos validam identidade, grant e estado da sessão; nenhum dos dois grava fonte autoral automaticamente.

Estados: carregando → pronto → executando/aguardando entrada → concluído, parado ou falhou. Reiniciar encerra a sessão anterior e cria nova geração, eliminando proxies, timers e callbacks. Ocultar painel não encerra uma sessão ativa. Editar não executa a cada tecla; indicar qual revisão está em execução.

`completed` significa retorno do entrypoint, não liberação automática do interpretador: o console pode continuar disponível até Parar/fechar. `mainloop` ainda ativo mantém estado de execução. `failed` encerra aquela execução; falhas recuperáveis de callbacks são diagnósticos e seguem a semântica Turtle, sem serem automaticamente tratadas como falha fatal. Cada comando REPL tem identidade própria e não constitui nova execução autoral nem nova evidência para a revisão do projeto. Chamar `run` duas vezes na mesma sessão é recusado.

**Parar encerra o worker e o trabalho da geração no renderer**, inclusive em loop infinito. Invalidar identidade antes de cancelar RAF, filas, timers, entrada e promises pendentes. O desenho pode permanecer como imagem estática, identificado como parado. Não prometer `finally` ou preservação da memória do programa. O documento já pertence ao editor. Interrupção cooperativa é opcional e distinta; o mecanismo de `KeyboardInterrupt` do Pyodide exige condições adicionais, como SharedArrayBuffer, e não será pressuposto pelas aulas. [Interrupção oficial](https://pyodide.org/en/stable/usage/keyboard-interrupts.html).

A biblioteca controla o ciclo de eventos e os pontos de bombeamento durante movimentos, `update` e `mainloop`; não espera o entrypoint terminar para entregar eventos. `mainloop()` mantém a sessão interativa; não é substituído por um no-op. Entradas externas passam por um scheduler; listeners JS não invocam Python diretamente. Callbacks são despachados pela própria biblioteca no fluxo Python, com reentrância e falhas definidas contra o patch CPython de referência. Não iniciar outra avaliação Pyodide concorrente enquanto a anterior está suspensa. O anexo Turtle especifica as provas de ordem entre desenho, consultas, timers e entrada. Mensagens de uma geração anterior são descartadas. Contrapressão, lotes e limites de custo gráfico seguem o anexo de desempenho.

### 6.2.1 Arquivos da execução e gravações autorais

Montar fontes/recursos como snapshot de execução. Escritas realizadas pelo programa ou REPL acontecem em filesystem temporário e **não alteram automaticamente o documento**. Um arquivo gerado pode ser incorporado pela ação explícita “Adicionar ao projeto”, com validação, quota, revisão e autorização de escrita. Só depois do ACK do coordenador ele é durável. Informar esse comportamento na área de arquivos gerados; Parar descarta saídas ainda não incorporadas. Comandos reais de edição no Studio continuam usando o coordenador existente. Não prometer flush da memória de um worker já encerrado.

### 6.3 Isolamento e recursos

Reutilizar a origem de execução separada da aplicação autenticada. O [servidor de artefatos Pro](../../packages/studio-runtime/src/artifacts.ts) já possui CSP para WASM e workers; adaptar por perfil, sem relaxar globalmente o CSP do clássico JS.

O lote técnico precisa comprovar worker de módulo, carregamento WASM e JSPI na topologia isolada. **CORS por si só não resolve a criação inicial de um worker a partir de origem opaca**: o carregamento inicial tem regra de mesma origem. Bootstrap blob herda CSP do criador; um worker servido por HTTP precisa de CSP na própria resposta. L0 entrega o mapa documento→bootstrap→worker→imports e as políticas efetivas, incluindo controle de subworkers. O atual `worker-src blob:` do Pro não prova esse controle. Se a topologia opaca não satisfizer os requisitos, revisar a fronteira antes de integrar; não retirar isolamento nem conceder acesso à origem autenticada. [Carregamento normativo de módulos](https://html.spec.whatwg.org/multipage/webappapis.html#fetch-a-single-module-script), [CSP em workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#content_security_policy).

Mensagens entre host/iframe usam canal dedicado, nonce, origem/source quando aplicáveis, schemas e identidade de execução. Nunca aceitar uma mensagem apenas porque tem um `type` conhecido. A origem do aluno não recebe cookies, tokens de conta, credenciais do catálogo ou acesso a outros projetos. Python pode alcançar APIs web através de sua FFI; bloquear imports não é uma fronteira de segurança. A proteção é do navegador/origem/CSP e das capacidades do canal.

Tratar **toda saída do interpretador como não confiável**, mesmo com nonce correto. Receber mensagens brutas no supervisor isolado, limitar e normalizar antes de encaminhar eventos ao host; sem operações genéricas de fetch, HTML ou gravação autorizadas pelo worker. Testar FFI direta para rede, workers filhos, mensagens fora do protocolo e recursos de outra sessão. Cotas de comandos limitam a API gráfica; não constituem limite rígido de memória/processo contra Python/FFI arbitrário. O navegador administra esses recursos: prever encerramento/recuperação e não prometer impossibilidade de OOM da aba.

Distribuição Pyodide e extensões ficam em recursos imutáveis próprios, com manifesto e hashes. O projeto do aluno não carrega dezenas de megabytes de runtime no snapshot nem na cota atual de 2,5 MB dos artefatos Pro. Separar cota do programa, dos materiais, do runtime compartilhado e do cache. Disponibilizar somente os recursos listados no manifesto aprovado, sem CDN `latest`.

## 7. Linguagem Python, blocos e Ponte

Preservar a IR e os parsers JS. Acrescentar uma IR Python própria, com adaptadores para o registro de codecs e para o mapeamento fonte/bloco. Uma IR universal não é pré-requisito desta entrega.

O parser usa gramática Python real; a proposta adota `ast.parse` e tokenização no worker de análise da mesma família CPython, sem executar o programa para descobrir sua estrutura. A fonte é argumento de dados do parser; nunca interpolar texto autoral em um script de análise executável. Aplicar limites de tamanho/complexidade e cancelamento. AST não preserva sozinho comentários/formatação: manter tokens, intervalos e trechos originais para a reconstrução localizada.

Subconjunto visual contratado: os fundamentos e as famílias delimitadas na seção 7.1, acrescidos dos blocos de cada extensão instalada. Esta revisão amplia o recorte anterior para explicitar coleções, classes simples e tratamento de erros no núcleo. Não reutilizar `===`, coerções JS ou semântica de listas JS. Imports e definições têm escopo; uma variável chamada `turtle` não prova uso da biblioteca.

Código válido fora do subconjunto continua salvo e executável no Pro; na Ponte é preservado como trecho textual opaco com indicação de limitação visual. Erro de sintaxe não apaga blocos ou fonte. Cada alteração de bloco modifica somente os intervalos que consegue representar; se não puder garantir preservação, não aplica a regeneração destrutiva.

O editor rejeita resultados atrasados por projeto/revisão/geração. Mapeamento por caminho relativo, linha e coluna suporta Unicode e conversão de offsets UTF-8 do parser para UTF-16 do Monaco. Comentários, docstrings, aliases, argumentos nomeados, funções e múltiplas tartarugas entram nos testes obrigatórios.

Executar Python no Pro e representar Python em blocos são capacidades diferentes. Jogos importados podem usar subclasses Turtle, generators, comprehensions, slicing e outras construções fora do subconjunto visual inicial; preservar e executar a fonte compatível sem anunciar conversão integral desse programa para blocos. Dicionários e classes simples passam a ter blocos contratados, sem prometer representar todas as possibilidades dessas famílias. O corpus de repositórios reais do anexo Turtle testa justamente essa distinção.

A ordem dos comandos Turtle é a do programa. Não reorganizar instruções nas áreas de ciclo de vida JS. Rótulos portugueses explicam a ação; a Ponte mostra chamadas padrão como `tartaruga.forward(100)`.

### 7.1 Categoria Programação e organização Python

O código atual já organiza fundamentos JS sob Programação, com contrato próprio de progressão e caminho visual utilizado pelo Zappy: [programmingContract](../../packages/studio/src/blockly/programmingContract.ts), [toolbox](../../packages/studio/src/blockly/toolbox.ts) e [blockCatalog](../../packages/studio/src/blockly/blockCatalog.ts). Preservar esses contratos JS e criar o catálogo Python equivalente, sem traduzir IDs ou presumir que as APIs web sejam recursos da linguagem Python.

Cada bloco tem um lugar principal estável. Comandos e valores relacionados ficam próximos: operações de lista junto às listas; comparações junto às condições. Não criar uma categoria residual enorme de “Valores” nem repetir os mesmos blocos em Turtle. A organização proposta é:

| Subcategoria de Programação | Recursos visuais contratados | Progressão |
|---|---|---|
| Variáveis | Criar, ler, atribuir e atualizar valor; `None`; escopo preservado | Fundamentos |
| Entrada e saída | `print` e `input` no console, com retorno textual de `input` e conversão explícita quando necessária | Fundamentos |
| Lógica e decisões | Booleanos, comparações, `and/or/not`, `if/elif/else`; pertença com `in/not in` junto ao uso de coleções | Fundamentos e ampliação |
| Repetições | Repetir com `for/range`, percorrer itens, `while`, `break` e `continue` | Contagem primeiro; demais formas na ampliação |
| Números e matemática | Literais numéricos, aritmética incluindo `/`, `//`, `%`, `**`; `int/float`, `abs/round/min/max`; seleção homologada `math.sqrt/floor/ceil/pi` e `random.randint/choice` | Contas e sorteios primeiro; demais operações na ampliação |
| Textos | Literais, `str`, concatenação, tamanho, interpolação simples, maiúsculas/minúsculas, `strip/split/join/replace` | Texto simples primeiro; transformação na ampliação |
| Listas e coleções | Listas: criar, acessar/alterar item, adicionar/remover e tamanho; tuplas: criar/acessar; dicionários: criar, consultar/atribuir/remover chave, obter chaves/valores/itens; conjuntos: criar, adicionar/remover e testar pertença | Listas primeiro; tuplas, dicionários e conjuntos na ampliação |
| Funções | Definir, chamar, parâmetros posicionais/nomeados, defaults simples, retorno e chamada de métodos | Ampliação |
| Módulos | `import`, `from ... import ...`, aliases e módulos do projeto; somente módulos disponíveis no ambiente | Ampliação |
| Classes e objetos | Classe simples, `__init__`, `self`, atributos, métodos e criação de instância | Avançado |
| Tratamento de erros | `try/except/else/finally` com exceções nomeadas e `raise`; sem transformar falhas em sucesso silencioso | Avançado |

Essas famílias definem recursos da entrega, não apenas nomes de categorias futuras. O catálogo executável precisa discriminar cada operação/assinatura, entradas, retornos, encaixes, documentação e os quatro codecs antes de seu bloco ser anunciado. Listar uma família não autoriza dizer que toda a biblioteca padrão ou toda a sintaxe Python tem representação visual. Não há blocos iniciais obrigatórios para herança, metaclasses, decorators, generators, comprehensions, pattern matching, `asyncio`, rede ou processos do sistema. Código textual compatível com o runtime mantém a política de preservação já definida.

A seleção usa a semântica Python: índices começam em zero; `range` não inclui o limite final; listas, tuplas, conjuntos e dicionários conservam suas diferenças; `input` devolve texto; divisão e conversões não imitam JS. Literais, retornos, erros e formas específicas são definidos contra a versão fixada do interpretador. [Controle de fluxo Python](https://docs.python.org/3.14/tutorial/controlflow.html), [estruturas de dados](https://docs.python.org/3.14/tutorial/datastructures.html), [funções embutidas](https://docs.python.org/3.14/library/functions.html).

### 7.2 Progressão, extensões e uma única fonte de catálogo

Iniciantes recebem uma seleção pequena de Variáveis, Entrada e saída, Lógica e decisões, Repetições, Números e Textos. As outras categorias aparecem conforme nível e curadoria, sem pastas vazias ou itens anunciados antes de existir. O admin pode liberar um recurso necessário à oficina; as dependências pedagógicas do bloco — valores, parâmetros e funções exigidos para utilizá-lo — precisam estar acessíveis. Inventariar o total inicial e seus blocos auxiliares como parte da revisão pedagógica, sem simplesmente copiar níveis ou allowlists JS.

Turtle acrescenta uma categoria irmã **Turtle**, agrupada em Tartarugas, Movimento, Caneta e desenho, Aparência e imagens, Tela, Eventos e Animação e tempo. “Repetir”, “se”, “variável” e “função” continuam pertencendo a Programação. Teclado, clique e timers Turtle pertencem à extensão; não copiar eventos DOM para a base Python. `print` mostra texto no console, enquanto `turtle.write` escreve no desenho. A paleta não cria um substituto genérico de um recurso gráfico que a biblioteca não oferece.

O mesmo catálogo por linguagem alimenta paleta, busca, seleção do admin, ajuda, exemplos, análise e Zappy. Cada entrada identifica proprietário (núcleo ou extensão), nível, caminho visual, assinatura/API e disponibilidade. A curadoria usa IDs estáveis e próprios por linguagem; nomes exibidos podem mudar sem quebrar configurações antigas. O Zappy deve indicar o caminho realmente visível, como **Programação → Repetições** ou **Turtle → Movimento**. Só propõe adicionar uma extensão quando a atividade permite; uma sugestão de IA não modifica permissões nem instala recursos implicitamente.

Exemplos obrigatórios sem Turtle: conversa no console, calculadora, quiz, sorteio, lista de tarefas em memória e placar com dicionário; classes simples e tratamento de entrada inválida em exemplos avançados. Esses projetos precisam salvar, reabrir, promover para Pro, publicar com console/entrada e exportar fonte independentemente da extensão. No Pro, a organização pedagógica serve à ajuda e à descoberta de recursos, sem restringir a sintaxe válida ao conjunto de blocos.

## 8. Python no Pro e serviço de linguagem

O Pro Python usa a mesma árvore, abas, busca, revisão de alterações, atalhos, histórico, coordenação de buffers e acesso por observador já existentes. A política de filesystem passa a depender do perfil: aceitar `.py`, `.pyi`, `pyproject.toml`, lock e materiais; excluir ambientes virtuais, caches e arquivos do runtime da fonte autoral. Preservar o sincronizador e as cópias de recuperação existentes.

Coloração de sintaxe não satisfaz o contrato. Exigir diagnósticos, completion, hover, assinatura, símbolos, definição, referências, renomeação segura e formatação Python. O provider TypeScript permanece exclusivo de JS/TS.

Decisão proposta para análise sem depender de forks privados: provider Python baseado no **Pyright Language Server**, em processo de análise isolado e acessado por um adapter autenticado do host. O protocolo é LSP, com snapshots incrementais e cancelamento; não executar fontes, imports, hooks ou configuração executável do aluno. O processo só enxerga a árvore autorizada e stubs aprovados, sem credenciais. Configurações que apontem fora do workspace são recusadas. Retenção temporária e limpeza por encerramento/TTL são parte do serviço. O repositório oficial distingue Pyright de recursos adicionais do Pylance; não prometer o Pylance completo. [Pyright](https://github.com/microsoft/pyright).

Pyright pode iniciar interpretadores para introspecção; seu uso não é automaticamente livre de execução. O gateway permite apenas métodos LSP necessários e configurações construídas pelo servidor. Não encaminhar `workspace/executeCommand`, `pythonPath`, `venvPath`, caminhos de stubs ou configuração de processo fornecidos pelo projeto. Introspecção, se necessária, usa intérprete confiável em modo isolado, diretório de trabalho controlado e environment sem caminhos autorais; não importa `sitecustomize.py`/`usercustomize.py` do aluno. Processo sem rede, com filesystem/UID/cotas próprios. Provar a proteção com fixtures hostis, inclusive nomes de executáveis e hooks no workspace. [Implementação upstream que motiva essa fronteira](https://raw.githubusercontent.com/microsoft/pyright/main/packages/pyright-internal/src/common/fullAccessHost.ts).

Formatação e lint podem usar o módulo WASM oficial do Ruff em worker separado. Regras são configuradas para o público e para a versão Python; formatação é ação explícita, nunca reescrita silenciosa ao alternar modos. [Ruff WASM](https://github.com/astral-sh/ruff/blob/main/crates/ruff_wasm/README.md).

L0 inclui prova pequena do serviço Pyright antes de assumir sua viabilidade operacional: processo real, stubs da release, fixture Pro, memória de pico, bootstrap, completion fria/quente, cancelamento, isolamento e reconexão. O gateway é stateless quanto à fonte durável: autentica pelo host, cria sessão temporária vinculada a workspace/ator e transmite LSP limitado sobre canal autenticado, sem repassar credenciais ao processo. Fila, limites e TTL são aplicados antes de criar o processo; esgotamento produz indisponibilidade explícita. Transporte e implantação concreta são registrados nessa prova, reaproveitando a infraestrutura que suportar o isolamento, sem presumir que o Worker HTTP sozinho pode hospedar um processo Node.

Respostas de análise carregam versão de documento, caminho e hash. Falha do serviço não perde texto nem impede salvar/exportar/executar; a interface comunica análise indisponível. Completar uma sugestão ou aplicar renomeação usa o mesmo protocolo de revisão/autoridade do Pro. Suporte a refatorações depende da capacidade anunciada, sem declarar uma operação concluída quando nada foi alterado.

Python oferece **Console Python/REPL** e entrada padrão reais. Não simular um shell Linux ou comandos `pip` sem implementação. O terminal npm/WebContainer dos projetos JS permanece intacto. Nesta entrega a interface Python gerencia a extensão Turtle fornecida pelo runtime e informa que não há catálogo de pacotes externos homologados. A capacidade `install-dependencies` só é anunciada quando existir distribuição externa efetivamente suportada; não mostrar instalador vazio como recurso entregue. Turtle não requer `pip install turtle`.

## 9. Admin, aulas, projetos iniciais e curadoria

Um mesmo formulário de configuração serve aula gravada e oficina: Linguagem (JS padrão), tipo Clássico/Pro, template/projeto inicial, extensões, modos permitidos quando aplicáveis, curadoria, materiais, atividade e cadeia de continuidade.

A linguagem do snapshot é autoritativa. Campos do formulário são projeções dessa escolha; validação recusa divergência entre configuração e projeto. Importar um projeto identifica linguagem/tipo; mudar a configuração com trabalho já existente exige criar/substituir explicitamente a semente, sem conversão silenciosa. Atualizar semente publicada não substitui projetos dos alunos. O vínculo projeto/bloco/cadeia registra a baseline autoral de criação e seu ambiente compatível; renovar o acesso consulta direitos atuais sem impor a nova semente àquele documento. Uma mudança incompatível exige migração explícita ou outra cadeia. Revogação de acesso e revogação de runtime continuam sendo políticas distintas dessa preservação.

Preservar precedência de retomada: rascunho válido → envio/continuidade conforme regra atual → projeto inicial. Uma cadeia só admite projetos compatíveis em linguagem e perfil; publicar aula com cadeia incompatível exige outra cadeia ou migração explícita. Não selecionar um snapshot antigo apenas por ter o mesmo `chainId`.

No ensaio do admin, na aula, no envio e na revisão, injetar o mesmo resolvedor de perfil e os adapters do contexto. Pro em aula é autorizado pela matrícula/atividade, sem exigir o desbloqueio de Pro no Estúdio Completo e sem concedê-lo globalmente.

Atualizar DTOs Members, manifesto learning, ContentAdmin, StudioEmbed e StudioBlock simultaneamente. A validação deve reconhecer as quatro combinações e os limites de cada uma. Um projeto inicial pode escolher Turtle sem liberar ao aluno a instalação de qualquer extensão.

Build, LSP, instalação quando disponível, avaliação e preview usam autorização contextual resolvida **no servidor**. O grant identifica ator, contexto, workspace/projeto, baseline autoral quando houver, revisão, perfil, capacidades, templates/dependências permitidos e validade; o documento candidato é comparado ao grant. Props do cliente e perfil importado não concedem acesso.

| Contexto | Fonte autoritativa do acesso |
|---|---|
| Admin em rascunho/ensaio | Papel/permissão de autoria e revisão do rascunho, sem exigir aula publicada |
| Aula gravada | Matrícula, bloco publicado, baseline do projeto e escopo da atividade |
| Live e assistência | Vínculo na ocorrência, workspace, lease/epoch e papel atual |
| Projeto livre | Produto/perfil, propriedade do projeto e elegibilidade atual |
| Continuação pós-oficina | Direito atual sobre o projeto canônico e regra de continuidade; não exigir reabrir aula expirada |
| Publicação pública | Visibilidade/revisão ativa e runtime autorizado a servir; sem grant de edição ou login do visitante |

Revogação/expiração bloqueiam novas operações servidoras; conexões são revalidadas e sessões da interface encerradas conforme o contexto. Preservar recuperação dos buffers ao perder acesso ou rede. Código já entregue ao navegador não pode ter execução offline revogada com garantia; a autorização protege serviços e dados, não promete retirar bytes do computador do usuário.

## 10. Sala ao vivo com Pro

Substituir a rejeição `kind === 'pro'` por validação documental e de capacidade. Não retirar validação de tamanho, profundidade, identidade, versão, recursos ou permissões.

O projeto continua canônico por criança/curso/cadeia ou bloco. Manter revisões, writerEpoch, device, lease, recibos e transações atuais. Toda mutação de arquivos, configuração, dependências, REPL com escrita ou aplicação de IA passa pela mesma autorização. Um observador não ganha escrita por usar outro painel.

Pro resolve modo Código; não herda `allowedModes=['blocks']`. Extensões, terminal, IA e instalação seguem a configuração autoral. JS Pro recebe compilador remoto da aula/sala, sem exigir WebContainer e seus headers na página de videoconferência. Python recebe o provider browser isolado. Não alterar COOP/COEP da sala para satisfazer o interpretador.

No handoff: bloquear novas mutações/execuções; drenar buffers e operações de incorporação de arquivos **já aceitas pelo coordenador**, dentro de prazo; confirmar snapshot/revisão duráveis; encerrar a geração e sua entrada; trocar writerEpoch; só então conceder edição. Worker travado pode ser encerrado imediatamente porque fontes autorais estão fora dele; saídas temporárias sem ACK não são declaradas salvas. Falha de persistência mantém o handoff pendente e preserva o rascunho, sem conceder dois escritores. Perda de resposta não duplica aplicação. Retorno ao aluno e reconexão seguem o mesmo protocolo. Memória de intérprete não é transmitida como documento.

Preservar a guarda existente de gravação: assistência só é aceita após confirmação de pausa pelo serviço de recording. A meta de transferência de autoria não elimina essa confirmação. Medir tempo de pausa separadamente do commit/lease, incluindo falha e timeout; nenhum deles autoriza dois escritores ou captura indevida da assistência.

Estender cursor do live com âncora de código: caminho, faixa UTF-16, revisão e hash/versão do conteúdo apontado. A revisão persistida sozinha não identifica um buffer ainda não salvo. Só desenhar no conteúdo correspondente; aguardar sincronização ou invalidar o cursor quando houver edição pendente, rename ou mudança de arquivo. Uma indicação antiga nunca aponta para outra linha por coincidência. Cursor Blockly atual continua funcionando.

Prévia, autoria e transmissão de tela são diferentes. O professor pode executar um snapshot autorizado em uma sessão própria; isso não replica automaticamente a partida aleatória ou entrada do aluno. A visualização ao vivo da execução usa os meios de compartilhamento de tela existentes. Esta proposta não acrescenta sincronização multiplayer de estado dos programas.

Reutilizar o serviço de preview isolado, estendendo-o para manifesto/referências de runtime. Não embutir WASM em uploads HTML temporários de cada execução. Expiração e acesso à oficina continuam validados pelo servidor.

Aplicar o mesmo resolvedor à demonstração do professor (`LiveDemonstration`), além do workspace do aluno e da assistência. Cards da turma não abrem interpretadores/analisadores. Limites de sessões e ensaios com chamada/compartilhamento estão no anexo de desempenho.

## 11. Estúdio Completo e permissões

“Novo projeto” apresenta JavaScript selecionado e Python como opção autorizada. A escolha filtra templates/extensões e acompanha o projeto; não muda projetos abertos. Listagens podem mostrar a linguagem sem baixar a árvore inteira. Dois estúdios na mesma página mantêm parsers, runtimes e sessões independentes.

O host injeta um registro estável de providers; a seleção é resolvida a cada projeto/execução. Abrir outro perfil no mesmo editor faz transição atômica: confirmar ou preservar buffers, cancelar análise/execução anteriores, atualizar políticas/limites e preparar a nova identidade. Não depender de trocar uma prop fixada no mount — `StudioCore` hoje fixa `proRuntime` e seus limites — nem remontar o editor perdendo rascunhos. Registrar estados carregando, pronto e indisponível; respostas atrasadas não alteram o projeto novo. A mesma regra vale para troca de semente/tipo no admin.

Proposta de política inicial: quem já possui **direito efetivo de criar projetos clássicos** no Estúdio Completo pode criar Python clássico com o núcleo Programação e adicionar Turtle conforme a curadoria autorizada. `canCreateProject(language, kind, context)` consome a elegibilidade atual (produto, perfil, acesso e criação), concedendo então a paleta Python específica. Não reutilizar IDs de `hasPalette`/allowlists JS como blocos Python nem remover requisitos globais existentes. Pro livre mantém o gate atual. Essa é uma decisão proposta de produto, não um comportamento já existente.

A aula/oficina concede apenas as capacidades necessárias naquele projeto. Continuar o projeto canônico após a oficina segue a assinatura/regra atual; criar outros projetos e acessar Pro livre continuam decisões separadas. Sem direito de escrita, preservar leitura e exportação onde já autorizadas. A expansão não inventa novos pacotes comerciais nem concede recompensas curriculares de curso gravado a cursos ao vivo.

## 12. Atividades, IA, materiais e recursos do produto

| Integração | Contrato da entrega |
|---|---|
| Atividades | Critérios indicam linguagem/perfil; manter DOM/JS onde válidos, acrescentar estrutura Python, stdout, funções e estado Turtle observável |
| Prova de execução | Vincular resultado a revisão/runtime; resultado do cliente continua identificado como cliente |
| Zappy | Contexto informa linguagem, perfil, API e versões; manter conversar/investigar/construir, voz, histórico, créditos, escopo e recuperação |
| Construção e revisão | Candidato Python executado no perfil correto, diff e evidência da mesma revisão; não validar com Babel/TS/DOM |
| Pensa | Missões JS preservadas e identificadas explicitamente; não oferecer missão Python nesta etapa |
| Pinta | Biblioteca, edição na origem e materialização PNG por perfil; preservar sprite/mapa/vetor originais |
| Molda | Preservar integração 3D JS; integração Python reservada ao futuro Raylib 3D |
| Capas e screenshots | Capturar resultado pelo protocolo gráfico, com revisão e ordem de execução corretas |
| Som, controles e armazenamento | Capacidades verificadas do perfil; não inventar APIs Turtle para recursos que a biblioteca não oferece |

Preservar a matriz completa de Zappy e coordenação definida na [proposta Pro de 16/10](2026-10-16-polaris-studio-pro-proxima-evolucao.md). A nova dimensão de linguagem amplia seu contexto; não substitui ledger, coordenador de jobs, política de escopo ou fonte única dos materiais.

### 12.1 Turtle com Pinta; Molda com o futuro ambiente 3D

**Escopo confirmado pelo usuário:** Turtle integra Pinta; Raylib 3D integrará Molda e poderá usar também imagens/texturas do Pinta. A primeira entrega não converte modelos/céus Molda para Turtle nem oferece biblioteca Molda como recurso desse perfil. Todo fluxo Molda existente em JavaScript permanece funcionando.

Reusar o adapter de biblioteca Pinta e namespace do perfil. Ele recebe uma representação de destino, preservando a operação atual por padrão em JS. O ambiente Turtle precisa de bytes de imagem portáveis, não apenas um registro de asset que seu renderer não sabe abrir.

| Material de origem | Representação inicial no Turtle |
|---|---|
| Pinta imagem raster | PNG com tamanho/transparência preservados dentro das cotas |
| Pinta vetor | PNG rasterizado na resolução escolhida; vetor original preservado no Pinta |
| Pinta sprite/tileset | Frame/peça selecionado como PNG; folha completa pode ser importada como imagem, sem fingir animação automática |
| Pinta tilemap | Mapa realmente achatado em PNG na resolução escolhida; a miniatura atual de até 512 px não é a exportação final |

Cada derivado Pinta tem identidade própria, referência à ferramenta/ID/revisão/hash de origem e receita versionada (frame, resolução e composição do mapa). Não sobrescrever `personal:<id-original>`: sincronização atual usa esse vínculo para atualizar materiais. “Editar no Pinta” abre a criação original; “Atualizar imagem” gera uma nova derivação e aplica mudança pelo coordenador, com revisão/undo. Alteração na origem não muda silenciosamente jogo publicado ou ZIP exportado. Falha/cancelamento mantém o material anterior.

O projeto guarda a cópia necessária para jogar e exportar, com caminhos locais e metadados de licença. Não precisa carregar GLB/HDR sem consumidor para preservar o original que já pertence à ferramenta. Arquivos 3D já presentes continuam gerenciáveis, sem serem declarados executáveis no Turtle. Corrigir `has3DConsumer`, que hoje considera qualquer Pro capaz de usar 3D: capacidade depende do perfil, não do rótulo Pro.

Materiais importados conservam seus caminhos relativos portáveis, inclusive GIF/WAV na raiz usados pelos jogos de referência. `assets/` é um destino padrão de novos materiais, não uma mudança obrigatória nos imports existentes. Fonte e binários participam da mesma verificação de colisões, incluindo diferenças de caixa e pastas implícitas; nomes de código não são aceitos como caminho de mídia.

O host oferece biblioteca pessoal Pinta somente ao perfil autorizado. No Completo, preservar importação e retorno à origem. Em aulas/live/admin, distinguir materiais preparados pelo admin de biblioteca pessoal injetada pelo host; oferecer esta última onde autorizada, sem conceder posse do Pinta por escolher Python. Toda entrada usa as mesmas validações de MIME/assinatura, tamanho, paths, namespace e revisão. Publicação e exportação incluem a cópia materializada, sem depender da conta do autor para carregar imagens.

PNG entra na API padrão `register_shape`/`shape`/`bgpic`. Não criar `pinta.animate` ou `molda.load` fingindo serem Turtle. Animação de frames, quando oferecida futuramente, deverá usar timers/chamadas Python portáveis; o contrato inicial de importação não promete adaptar automaticamente animações, colisões ou camadas de jogos JS.

### 12.2 Pensa: recomendação de escopo inicial

Manter **missões Pensa em JavaScript** nesta entrega, incluindo suas tarefas Pinta/Molda, equipe, evidências e promoção Clássico→Pro. A discussão do usuário deixou Python no Pensa para avaliação posterior; esta é a recomendação da proposta, não uma alegação de decisão já confirmada. Zappy dentro de projeto Python e atividades Python definidas pelo admin continuam no escopo, pois são fluxos diferentes das missões Pensa.

Novos snapshots/contextos de missão registram `programmingLanguage: 'javascript'`; ausência nos legados significa JS. Catálogos e receitas do planejador continuam filtrados por essa linguagem, mesmo quando a criança tem acesso a Turtle no Estúdio. Ao abrir/vincular missão, registrar evidência ou concluir tarefa, validar a linguagem do documento real. Um link `?tarefa=` não pode anexar uma missão JS ao projeto Python que já estava aberto. Projeto Python livre não cria vínculo Pensa implicitamente.

A futura entrega Pensa Python deverá ampliar juntos catálogo, receitas, templates, handoff, validação de tarefas/evidências, contexto da IA e critérios de conclusão. Não bastará retirar um filtro. Preservar agora a identidade de linguagem evita essa expansão exigir reconstruir a base do Estúdio.

## 13. Exportação, publicação e continuidade fora da plataforma

| Saída | Conteúdo e finalidade |
|---|---|
| Documento editável do Estúdio | Fonte, blocos/IR pertinentes, assets, linguagem, perfil/lock e metadados para reabrir/remixar |
| Fonte para VS Code | `.py`, recursos relativos, configurações pertinentes, dependências desktop e instruções; não depende da conta Sistema Zero |
| Distribuição web | Launcher HTML, fonte/payload, recursos e runtime web versionado para hospedagem |
| Publicação | Revisão imutável do artefato web com hash, retenção e endereço público estável |

A exportação fonte já existe para JS e deve ser estendida. Preservar arquivos autorais, inclusive README. Instruções geradas usam um nome reservado livre, sem sobrescrever documentação. Não exportar tokens, caches, `.venv`, toolchain, bytes WASM como dependência nativa ou caminhos temporários.

O contrato completo está no [documento de portabilidade](2026-10-16-turtle-api-portabilidade.md). Para Turtle, exportar `import turtle` e executar no CPython original com Tk. Para bibliotecas futuras, gerar dependências das distribuições reais e versões testadas para desktop; wheels web e desktop não são intercambiáveis. Um lock web nunca é apresentado como lock universal do sistema operacional.

Código Pro livre pode usar recursos não portáveis. A análise de exportação identifica imports/chamadas conhecidos e gera diagnóstico por arquivo/linha; análise estática não prova todo programa dinâmico. Exportação da fonte continua permitida, mas só recebe indicação de compatibilidade verificada quando as evidências correspondem ao perfil e revisão. Não transformar automaticamente código arbitrário para parecer portátil.

Publicação não reutiliza a URL expirada de preview. Referências ao runtime compartilhado entram no manifesto e na política de retenção. Atualizar a plataforma não troca o runtime de uma publicação antiga. Pacote web autocontido inclui seus recursos licenciados quando oferecido; pacote com distribuição compartilhada identifica essa dependência. Ambos são distintos da fonte desktop.

Player público, embed, Conheça o jogo, prévia de candidato e revisão de entrega resolvem o mesmo perfil. O leitor público nunca depende de serviços autenticados de análise, IA ou build para jogar.

### 13.1 Do Estúdio ao mural e à página pública

1. **Compartilhar:** o coordenador captura fonte, assets e ambiente da mesma revisão, aplica a projeção pública e valida elegibilidade. Notas Pensa/Zappy, origem privada, grants e referências à biblioteca pessoal não entram no pacote público.
2. **Preparar e verificar:** o serviço escolhe o builder pelo perfil, produz launcher/payload Python e fixa as dependências de runtime. Executa um smoke test no navegador de validação homologado, com limites e evidência vinculada à revisão; não usa o build Vite para Python nem chama uma execução local do aluno de prova do servidor. Imagem de capa verificada usa esse mesmo artefato.
3. **Publicar:** persistir artefato, recursos e referências imutáveis; confirmar retenção; ativar a revisão; vincular o post do mural. Reutilizar recibos, idempotência e recuperação existentes. Resposta perdida ou falha ao criar o post não pode duplicar publicação nem substituir a versão ativa por artefato incompleto.
4. **Jogar:** `/jogar/:id` resolve a revisão pública ativa. O visitante carrega o player leve, consulta compatibilidade, inicia o ambiente e joga localmente no navegador. Não recebe Monaco, Blockly, Ruff, Pyright ou editores Pinta/Molda; não precisa instalar Python ou entrar na conta do autor. O mural mostra capa; abrir Jogar usa o mesmo player. Cards não iniciam interpretadores.
5. **Atualizar/reiniciar:** editar no Studio não altera a publicação anterior. Publicar nova revisão é ação explícita; reiniciar o jogo recria sua sessão com os mesmos arquivos/runtime publicados. Cada visitante tem sua própria partida. Sincronização multiplayer não é consequência de publicar.

O player hoje escolhe artefato compilado por `kind === 'pro'` e gera HTML para clássico. A escolha passará a ser por perfil/artefato: **Python clássico também precisa do ambiente Python**. Generalizar o contrato de publicação/headers hoje chamados `Pro`, com leitura compatível das publicações JS existentes; não duplicar um segundo serviço de mural. Preservar regras de moderação, desativação, autoria e visibilidade já existentes. Fonte de jogo entregue ao navegador não é segredo; remover apenas dados privados da plataforma, sem prometer ocultar código.

### 13.2 Manifesto, retenção e falhas

Evoluir `StudioProArtifactManifest` para manifesto versionado comum: leitura v1 preservada; v2 inclui linguagem/perfil, release/hash, entrada web, arquivos com hashes e referências imutáveis ao runtime/extensões com fechamento transitivo. O parser deve conservar e validar esses campos, e o digest deve cobri-los. A distribuição compartilhada tem manifesto próprio; não entra como arquivo do aluno sujeito ao teto atual do artefato.

Publicar só ativa depois de todos os recursos estarem disponíveis. Retenção/GC considera revisões ativas, histórico retido e operações com confirmação ambígua; remover preview não remove runtime ainda referenciado. Catálogo de disponibilidade pode retirar/revogar uma release sem alterar seus bytes, conforme seção 5. A publicação exibe motivo de indisponibilidade e preserva a fonte; não atualiza a biblioteca silenciosamente para tentar funcionar.

Preservar o transporte de partes/recursos já existente e medir bytes binários, base64 e JSON separadamente. Não enviar um projeto Python com imagens pelo envelope do compilador JS apenas por ser Pro. Limites próprios são validados na entrada e na montagem, sem aumentar cotas implicitamente ou carregar o runtime compartilhado como asset autoral. Exemplo externo que exceda a cota recebe diagnóstico; não perde materiais silenciosamente.

Erros distinguem navegador incompatível, rede/cache, artefato ausente ou revogado e erro no programa. Retry não duplica workers. O handshake distingue **documento carregado**, **interpretador pronto** e **jogo pronto/interativo**: o timeout JS atual de 10 segundos não será copiado para Python, cuja primeira carga tem outro orçamento. O prazo de rede não é a meta de desempenho; os dois são instrumentados e testados. Um jogo com tela inicial ou aguardando input pode estar pronto sem já produzir uma animação.

### 13.3 Controles e dispositivos

Preservar tela cheia, proporção, foco, reiniciar e acessibilidade do player. A proporção vem do palco lógico validado. Para Turtle, teclado, mouse e controles virtuais passam pelo adapter de entrada e chegam aos handlers oficiais; não inserir APIs privadas na fonte da criança. Os controles suportados são declarados pelo projeto/template e validados pelo perfil; análise pode sugerir mapeamento, mas não infere todas as entradas de código Pro dinâmico. Não prometer jogabilidade touch de todo jogo arbitrário de teclado.

O programa exportado usa os eventos normais de teclado/mouse no desktop. O gamepad da página é uma conveniência do player web, sem alterar a API Turtle. Android/iOS, rotação, perda de foco e retorno de aba fazem parte da qualificação pública, além dos navegadores de autoria. Controle de áudio e armazenamento só é oferecido quando a extensão tiver API e contrato próprios; Turtle inicial não ganha som ou save persistente disfarçados de métodos oficiais.

O player também oferece saída textual e resposta a `input()` em interface leve e acessível, sem REPL/editor. O pedido pode ocorrer antes de existir um Canvas; esse estado é interativo válido, não erro de inicialização. Texto é renderizado como texto, com limites, e entrada segue o request/geração atual. O resultado impresso de uma corrida deve continuar visível após o script terminar.

## 14. Superfície pública e organização proposta

Arquivos novos abaixo são **propostos**; não foram criados como código nesta rodada.

```text
packages/core/src/studio/
  project-environment.ts       identidade de linguagem/runtime/lock
  project-schema.ts            envelope documental discriminado server-safe
  runtime-profiles.ts          catálogo leve, schemas e compatibilidade
  project-curation.ts          contrato compartilhado de curadoria
packages/studio/src/
  languages/types.ts           codecs e capabilities de linguagem
  languages/javascript.ts     adaptação das implementações existentes
  languages/python/           IR, AST/tokens, gerador, source map, promoção
  runtime/types.ts             sessões/eventos/identidade
  runtime/registry.ts          seleção por perfil e host
  runtime/python/              worker, filesystem, input e lifecycle
  monaco/python/               cliente de análise, stubs e formatter
  official-extensions/turtle/  manifesto, blocos, codecs, exemplos e manual
  export/pythonSource.ts      pacote desktop e diagnóstico de portabilidade
  export/pythonWeb.ts         distribuição browser
packages/studio-python-runtime/
  python/                     módulo turtle web e protocolo interno
  renderer/                   Canvas, recursos e entrada
  distribution/               build e manifesto imutável
  tests/                      conformance e comparação com CPython/Tk
packages/studio-language-service/
  src/                        gateway de análise + processo Pyright isolado
  tests/                      autorização, versões e lifecycle LSP
```

Um pacote Python-runtime próprio permite testar e versionar a implementação gráfica sem acoplar seu ciclo ao catálogo visual. Ele não é um segundo editor. O serviço de linguagem analisa código; não é executor de projetos nem novo backend Python do aluno.

Exports públicos novos previstos: `StudioProjectDocument`, `StudioProjectLanguage`, `StudioRuntimeSelection`, `StudioProjectEnvironment`, `StudioDependencyLock`, schemas correspondentes, `StudioRuntimeProfile`, `StudioRuntimeRelease`, `StudioOperationAvailability`, `resolveStudioProjectCapabilities` e `StudioProjectCuration` pelo subpath `@sistemazero/core/studio`. No Studio: tipos de provider/sessão, adapter de linguagem e props do host, sem expor detalhes internos Pyodide/Canvas.

As assinaturas finais de `Project`, `StudioEditorProps` e eventos devem manter todos os campos públicos atuais pertinentes. Introduzir `runtimeProvider` e `languageService` por injeção do host; adaptar os caminhos JS atuais a essa fronteira. O adapter `proRuntime.build` continua atendido durante a transição dos consumidores internos e só é removido quando nenhum consumidor depender dele; não manter dois dispatchers permanentes.

Exemplo conceitual de consumo: o host autoriza o projeto, chama `resolveStudioProjectCapabilities` com documento + contexto + curadoria, seleciona o provider registrado e passa esses contratos ao mesmo `StudioEditor`. Nenhuma tela decide linguagem pela extensão de um arquivo ou por existência de `script.js`.

## 15. Mapa de alterações no código existente

| Dono atual | Alteração prevista |
|---|---|
| `studio/core/project.ts`, `proProject.ts`, `modes.ts` | União documental, arquivos/metadata por linguagem, invariantes de modos |
| `studio/state/projectValidation.ts`, `projectStorageRecords.ts`, `persistence.ts` | Validação discriminada, partições e resumos completos |
| `studio/project-migrations/*`, `core/studio/project-format.ts` | Cadeia explícita de migrações e versão v3 |
| `core/creations/content-fingerprint.ts` | Fingerprint versionado, sem alterar canonicalJson |
| `core/studio/pro-revision.ts`, `studio/state/proRevision.ts` | Revisão/CAS v2 cobre ambiente, entrypoint e lock; aplicação/inverso pelo coordenador atual |
| `studio/extensions/*`, `official-extensions/index.ts` | Catálogo por perfil, exemplos e runtimes tipados |
| `studio/modes/bridgeReverseParse.ts`, `generators/sourceMap.ts` | Dispatch de linguagem, autoridade e posições |
| `studio/monaco/pro/*`, `modes/pro/*`, `state/convertToPro.ts` | Providers, FS, ferramentas e promoção específicos |
| `studio/export/*`, `StudioProjectPlayer`, `studio/share.ts` | Fonte desktop, web, player/publicação por perfil |
| `studio-runtime/src/contracts.ts`, `artifacts.ts`, `index.ts` | Pacotes Python web, distribuição compartilhada, validação e perfis de CSP |
| `core/studio/pro-artifact.ts`, `studio-runtime/src/publications.ts` | Manifesto v2, digest, retenção/GC transitivos e ativação por revisão |
| `member-shell/server/studio-publication.ts`, `routes/studio.ts`, `community-kids/.../public-player.tsx` | Projeção pública, publicação por perfil, mural, headers e estados/controles do player |
| `admin/.../lesson-editor-client.tsx`, `studio-embed.tsx`, `project-play-authoring.ts` | Autoria e ensaio das quatro combinações |
| `members/.../content-admin.service.ts`, `interfaces/http/dtos.ts`, `core/learning/index.ts` | Mesmo contrato de snapshot/manifesto e compatibilidade da atividade |
| `members/domain/live/workspace-snapshot.ts`, `live-workspace.service.ts` | Pro aceito, validação canônica e autoridade preservada |
| `member-shell/components/live/live-workspace.tsx`, `lib/live/*`, `routes/live-preview.ts` | Provider, modos, cursores, preview e handoff |
| `member-shell/components/studio/studio-block.tsx`, rotas de runtime e acesso | Resolução contextual consistente, sem ampliar direitos globais |
| Tutor/atividades/creations | Contexto Python, validação, continuidade e evidência por revisão |
| `studio/studio/*-library.ts`, `components/assets/has3DConsumer.ts`, `personalSync` e adapters kids | Representação por perfil, identidade de derivados, atualização e capacidade 3D real |
| `pinta/export/studioBridge.ts` e adapter de biblioteca | Materialização PNG completa e sob demanda; preservar exportadores JS/originais |
| `core/pensa`, `member-shell/server/pensa-journey`, handoff e tarefas Members | Fixar missões JS, transportar linguagem e validar documento vinculado; Python Pensa futuro |

As implementações dos motores JS, componentes de layout, coordenação de persistência/FS, autenticação, pagamentos e modelo de curso permanecem em seus donos. Só se extraem regras efetivamente compartilhadas, sem mover código por estética.

## 16. Migração e liberação

1. Registrar fixtures JS e inventário das superfícies; qualificar runtime Turtle/portabilidade antes da expansão transversal.
2. Introduzir leitores e validadores v3 antes de habilitar escritores v3. Leitores antigos não podem sobrescrever formato desconhecido.
3. Separar migração v1→v2 existente da nova v2→v3. A nova adiciona ambiente JS sem regenerar fontes, blocos, IDs, assets ou árvores. A seleção usa uma tabela determinística de releases de compatibilidade e hashes, preservando versões de extensões; nunca a release mais nova disponível. Se uma combinação antiga não puder ser representada, manter o original recuperável e reportar a incompatibilidade, sem declarar migração bem-sucedida. A operação é idempotente e produz recibo/revisão.
4. Adaptar os consumidores JS ao contrato comum e passar a matriz de não regressão.
5. Integrar Python/Turtle, admin, aula, live, players e exportação; liberar criação somente quando a experiência completa passar.
6. Se a criação Python precisar ser temporariamente desativada, conservar leitores, recuperação e exportação dos projetos já criados. Rollback não rebaixa v3 nem elimina runtime publicado.

Não exigir migração artificial de usuários Pro legados quando a decisão de produto anterior registra que não existem. Isso não elimina a preservação de arquivos importados, templates e documentos JS clássicos existentes. Alterações de protocolo interno e migração de dados são problemas diferentes.

## 17. Futuras bibliotecas

| Futuro | Preparação feita agora | Trabalho reservado para sua entrega |
|---|---|---|
| pygame-ce | Perfis, wheels por destino, loop/entrada, assets e exportação | Runtime homologado, blocos/API, player, fontes desktop e testes |
| Pygame Zero | Catálogo permite distribuição/import distintos e API de alto nível | Compatibilidade concreta com ambiente 2D, callbacks, recursos e avaliação |
| Raylib | Perfil pode declarar WebGL/3D, binding Python e consumidores de materiais | Binding/distribuição, câmera/modelos/entrada, integração Molda/Pinta, formatos homologados e desktop |

Não obrigar essas bibliotecas a funcionar no Pyodide adotado para Turtle. Um perfil futuro pode usar Pygbag ou outro ambiente validado e continuar atendendo aos mesmos contratos do Estúdio. A existência de um caminho documentado não comprova compatibilidade integral: Pygbag descreve sua integração pgzero como pouco testada, e o binding Raylib documenta ressalvas específicas. [Pygbag](https://pygame-web.github.io/wiki/pygbag/), [Raylib Python](https://github.com/electronstudio/raylib-python-cffi#running-in-a-web-browser).

## 18. Desempenho como requisito de produto

O [contrato de desempenho](2026-10-16-estudio-python-desempenho.md) define referência de hardware/rede/vídeo, fixtures, metas cold/warm, latência de entrada e Parar, memória, filas e concorrência. Sua propriedade é desse anexo; não duplicar números divergentes em implementações.

O requisito inclui zero carregamento de runtimes Python ao trabalhar somente em JS, ausência de regressão mensurável JS, editor responsivo com Python e chamada ativos, execução sob demanda na visão do professor e ausência de vazamento após ciclos de uso. Os valores são metas de qualificação, não resultados obtidos. Falhar desempenho impede declarar o perfil pronto, mesmo que produza a imagem correta.

## 19. Critério de conclusão e riscos que precisam de prova

A [matriz de validação](2026-10-16-estudio-python-validacao-entregas.md) é parte normativa desta proposta. Conclusão exige preservar JS, executar Turtle real nos fluxos contratados, completar aulas/Pro/live e abrir/executar a exportação desktop. Mock de tela, arquivo `.py` aceito ou seletor de linguagem não bastam.

As incertezas técnicas principais são JSPI no sandbox e navegadores alvo, comportamento síncrono/eventos do Turtle, serviço de linguagem e desempenho com videoconferência. O lote inicial resolve essas incertezas com critérios de aprovação/rejeição antes de depender delas nas demais entregas. Não há benchmark Python nem homologação de navegadores feitos nesta proposta.

A revisão de consistência considerou [cursos ao vivo](2026-10-14-cursos-ao-vivo-design.md), [evolução Pro de 16/10](2026-10-16-polaris-studio-pro-proxima-evolucao.md) e [seu plano de implementação](../superpowers/plans/2026-10-16-studio-pro-evolution-implementation.md). Esta proposta acrescenta formato/linguagem/runtime e portabilidade; preserva os donos de coordenação, acesso, assistência e continuidade desses documentos.
