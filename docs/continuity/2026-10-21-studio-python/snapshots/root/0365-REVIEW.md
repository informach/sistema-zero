# Free Pro remoto: análise do caminho atual

Base lida: Root `01f7d35a87a70e006004f9fa992713b067f3ad7a`, limpo. Somente leitura de fontes/recibos; nenhum build, browser, provider ou alteração produtiva. O compilador hospedado pode retirar a VM/npm/Vite da inicialização do navegador, mas a API de build atual não equivale ao ambiente Pro completo.

## Evidência e limite causal

O novo ensaio funcional de 2048 MiB falhou antes do primeiro visual. `pro-legacy-staging-ui-functional-execution-r1/native-owner/receipt.json`: NEG em 36.648 s; primeira amostra negativa 2064.63671875 MiB, Node 116.859375, descendentes 1947.77734375, private commit agregado 1822.59765625, SO livre 2578.859375. Maior descendente: 1046.515625 MiB. Cleanup normal, Active=0, sem força. Os dois NEG de 1024 continuam NEG.

Isso demonstra custo incompatível com o orçamento do fluxo atual. Não identifica sozinho qual renderer/worker aloca o maior volume: o recibo preserva identidade kernel, não o papel interno Chrome. Também não demonstra leak nem que o compilador remoto sozinho reduzirá o total abaixo do orçamento. A hipótese de hash do Node como causa única já foi refutada no diagnóstico anterior.

O caminho produtivo está determinado: `creator/studio-pro-client.tsx:273` monta `StudioProEditor freeRuntime`; `studio-pro-editor.tsx:125` cria apenas preparador de lock, não adapter build. `ProPreview.tsx:94` escolhe WebContainer quando proRuntime falta; `:309` monta, `:385` executa npm install e `:422` npm run dev. Monaco/TS e a UI continuam sendo custos locais mesmo se esse ramo sair.

## Reuso real disponível

- `member-shell/server/free-pro-toolchain.ts:23`: fronteira Free autorizada pelo MESMO guard da página, limite corporal, timeout, operação fechada. Hoje aceita SOMENTE prepare-dependencies; não é endpoint de execução.
- Apps `api/studio/pro-runtime/dependencies/route.ts`: adulto usa getCreativeToolsState + studioAvailable/tier.pro; Kids usa sessão, acesso, jornada, recusa suporte somente leitura e resolveStudioProAccess. Reusar esses guards, sem fazer staff/admin virar autorização própria.
- `member-shell/server/studio-pro-runtime.ts:184`: buildStudioProProject já valida arquivos, dependências e binários, preservação dos materiais, usa bearer só servidor e valida artefato/origem/expiração. URL/token STUDIO_PRO_RUNTIME_* já existem; nenhuma infra nova é necessária para um build desse contrato.
- `studio/studio/pro-runtime.tsx:23`: adapter existente oferece build, prepareDependencies, signal e limites. Admin e aulas já o usam; Live acrescenta revisão/journal por necessidade da sala. Free não deve simular matrícula/journal nem consultar snapshot de outra pessoa: compila a cópia local autorizada para aquela sessão.
- `RemoteProPreview.tsx:82`: build inicial e rebuild manual; snapshot, abort em troca de projeto/adapter, último resultado válido marcado como anterior quando há alterações, retirada por signal revogado.

## Paridade e diferenças que não podem ser ocultadas

| Área | Com o compilador atual |
|---|---|
| Árvore, arquivos, edição, undo, importação | Permanecem no ProjectStore/Monaco. Não dependem de execução local. Não remontar editor ao trocar autoridade. |
| Salvar, nuvem, reabrir, ZIP fonte/deploy | Independentes do compilador: `export/sourceExport.ts:89`, `fileMap.ts:321` trabalham na árvore e materiais. Preservar fonte/config/scripts mesmo que não executáveis remotamente. |
| Preview | Artefato isolado real, rebuild explícito, sem Vite HMR. Recarregar reinicia a mesma compilação; Executar alterações cria outra. Mantém edição durante o build e identifica resultado antigo. |
| Console e progresso | Ponte de console autenticada por source/origin e StorageBridge já existem (`ProArtifactPreview.tsx:66,101`). RemoteProPreview fornece backend durável por projeto/namespace; propostas permanecem efêmeras. Build output não é shell interativo. |
| Pinta/Molda e binários | `buildStudioProProject:239` usa buildProAssetBundle e hashes; preview aceita arquivos compilados do próprio artefato. Export continua byte-preservador. Upload total/base64 e saída precisam caber nas cotas; não implica que todo projeto grande atual cabe. |
| Terminal, npm e ferramentas arbitrárias | NÃO existe port remoto equivalente. Terminal atual abre jsh no WebContainer. Apenas passar proRuntime deixa professional:true habilitar Terminal (`config.ts:178`); clicar pode reabrir a VM. Desligá-lo é mudança de produto explícita, não paridade. |
| Dependências | Catálogo fechado de 10 pacotes exatos (`core/studio/pro-dependencies.ts:2`): Vite, TS, pluginReact, React/ReactDOM/tipos, Three/tipos e Phaser. Workspaces/overrides/optional/peer e libs fora do catálogo recusados. `/v1/dependencies` retorna SOMENTE lock, não instala npm arbitrário. |
| Configuração/scripts | Parser remove reservados e execução usa trustedPackageJson/trustedViteConfig (`studio-runtime/src/contracts.ts:60,155,195`). Não executa devScript, postinstall, Vite/PostCSS/plugin/env personalizados. Arquivos continuam no projeto/ZIP; resultado pode divergir se se fingir que a configuração foi usada. |
| LSP | Monaco e TS 5.9.3 worker local sobrevivem, inclusive stdlibs e fontes do projeto. Mas `ProCodeEditor.tsx:155` lê manifests/d.ts do WebContainer; sem mount, dependências ficam vazias e estado instalação unavailable. React/Three/Phaser perdem informação semântica e podem produzir module-not-found. A API existente NÃO fornece declarations. |
| Rede do jogo | Artefato usa CSP connect/img/media/worker limitado ao próprio artefato + data/blob (`artifacts.ts:174`). Não equivale ao dev-server para fetch externo, WS, remote/CDN assets, câmera/microfone/form. Não alargar CSP para simular paridade. |
| Offline | Edição/save local/ZIP permanecem possíveis com o app carregado; build remoto exige rede e serviço. Artefato tem 24 h e cache privado, não é promessa de preview offline. WC atual também exige rede no boot/install; não inventar garantia offline histórica. |
| Cotas | 80 fontes, 256k caracteres/arquivo, 1.5M total, envelope 2M bytes, saída 2.5M bytes/338 arquivos. `StudioCore.tsx:256` captura runtime.limits na preparação, `projectStore.ts:466` as impõe em escrita: passar os limites cegamente pode impedir abrir/editar documentos antes válidos. Limite de execução deve ser distinto da preservação/abertura. |
| Zappy/Proposta | Artefato de proposta já é remoto. Captura de seleção/diagnósticos permanece; installedPackages/installation dependem hoje do FS local (`ProCodeEditor:33–66`), logo devem declarar estado real da fonte de tipos, nunca fingir instalação. Não chamar IA para compilar. |

## Menor lote coerente para revisão

1. **Free build autorizado**, reaproveitando `createFreeProToolchainPreparation`/helper do servidor e guards dos dois apps; operação build com prazo próprio, BFF sessionFetch, parentOrigin derivado do request, bearer servidor, catálogo/limites atuais e erro fechado. Pode ser endpoint irmão `/api/studio/pro-runtime/free-build` para não colidir com o `/build` de aulas. Adapter Free estável por sessão/viewer/audiência/projeto, com signal encerrado na troca; nunca fallback local silencioso se rede/serviço falhar. Ao receber revogação/SESSION_CHANGED, retirar resultado além de abortar chamada.
2. **Montagem remota explícita desde o início** em StudioProEditor quando Free JS; Python e classic inalterados. `features.terminal=false` nesse ramo. O provider WC atual é lazy e não boota sozinho, mas ProCodeEditor depende de seu contexto; separar contexto de tipos/diagnósticos da posse da VM e não registrar gatilho de mount no ramo remoto. Não criar um falso container. Manter frontend do editor e sua história.
3. **Compatibilidade antes de executar, não perda de documento**: validar projeto para compilador e apresentar erro acionável sem alterar código/scripts/config, sem bloquear abertura/exportação. A reparação Vite8.0.16→8.1.6 existente permanece transacional antes do build. Não grandfather de lock não verificado. Projetos fora do contrato não podem ser apresentados como compilados fielmente nem enviados ao WC escondido.
4. **Tipos das dependências são a lacuna funcional que precisa decisão antes de chamar isso Pro completo.** Para manter autocomplete/diagnósticos dos 10 pacotes, fornecer ao cliente um snapshot limitado de package.json/d.ts/lista de arquivos, derivado das versões instaladas reais, carregado só por dependências declaradas e com hash/versão/cotas/cancelamento. Pode usar o mesmo serviço/artefato estático, sem nova infraestrutura, mas é API/dado novo e demanda revisão e qualificação próprias. Não baixar biblioteca arbitrária nem reaproveitar o endpoint Python. Só stdlibs+fontes, com dependências indisponíveis, seria redução explícita de funcionalidade, não solução completa.
5. **Uma prova causal do percurso real**, após testes focados: mesma fixture Vanilla reparada, mesmos Save/ZIP6/fontes/lock, primeiro visual, console/page0, editar→rebuild, reabrir/contexto novo e preservação. Provar zero boot/spawn WC e nenhum npm no browser; usar as medições já existentes, sem aumentar 2048. Comparar os novos números com NEG preservado, sem declarar os dois ensaios 1024 aprovados. Um segundo caso com React ou Three confirma tipos, assets e console (não toda a matriz de jogos).

Não recomendo substituir o Pro inteiro por build-only e dizer que nada foi perdido. Dentro da restrição sem novas infra/recursos, é possível um modo remoto completo para o catálogo suportado, com os limites e diferenças acima explícitos. Shell npm aberto + HMR + plugins/config customizados não são implementáveis por essa API atual; preservá-los exigiria outro contrato de workspace remoto, fora do menor lote.

## Focos existentes aproveitáveis; ainda não executados neste review

- `member-shell/tests/pro-toolchain.test.ts` e `studio-pro-runtime.test.ts`: guard, limite, cancelamento, reparo e contratos; acrescentar build Free sem confundir guard de aula.
- `studio/src/modes/pro/ProPreview.test.tsx`, `RemoteProPreview.test.tsx`: seleção remota, nenhuma montagem WC, troca de autoridade/projeto, erro/retry/resultado anterior.
- `monaco/pro/languageService.test.ts`, `dependencyDeclarations.test.ts`: tipos reais do catálogo, atualização/removal e separação entre projetos.
- `core/__tests__/proAssets.test.ts`, `export/__tests__/sourceExport.test.ts`, existentes ProToolchain: bytes e fonte preservados, falhas sem persistência parcial.
- Testes do host Free: unsupported browser não barra ramo remoto; terminal não pode reativar WC; sessão/role/selectorPython permanecem independentes.
- UI existente deve mudar apenas o oracle de preview para o resultado compilado real, não as condições de conteúdo/ZIP/console/identidade. Hosted R5 Members→Worker prova infraestrutura/contrato; NÃO prova BFF Free novo nem UI.

Impacto: proposta toca MemberShell + dois adapters de rota + Studio contexto/editor; sem implementação neste review. Se adicionar entrega de declarações no Worker, será novo bundle/contrato a qualificar, embora a imagem instalada possa continuar a mesma se bytes/dependências não mudarem. Nenhuma herança automática de identidade/perfil ou aceite de performance.
