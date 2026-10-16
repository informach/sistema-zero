# Arquitetura do Studio

Este é o mapa canônico e curto da arquitetura atual. O `CLAUDE.md` registra
decisões e regressões históricas; quando houver conflito, este documento e o
código/testes atuais prevalecem.

## Fronteiras

- `src/studio/`: composição pública, configuração por instância e ciclo de vida.
- `src/core/` e `src/ir/`: modelo persistido e contratos sem dependência de UI.
- `src/parsers/` e `src/generators/`: conversão código ⇄ IR. Codecs recebem
  callbacks dessas camadas; não devem importá-las em ciclo de runtime.
- `src/blockly/`: IR ⇄ workspace e UI Blockly.
- `src/modes/`: entradas lazy de Blocos, Ponte e Código.
- `src/preview/`: documento sandbox, CSP, runtime e bridges autenticadas.
- `src/official-extensions/`: blocos, codecs, exemplos e runtimes por extensão.
- `src/projects/`, `src/persistence/` e `src/asset-library/`: dados locais e
  operações que podem falhar. Mutações destrutivas exigem confirmação e sucesso
  persistido antes de atualizar a UI.

## Regras verificadas automaticamente

- O carregamento inicial e cada modo têm orçamento bruto e gzip em
  `src/projects/__tests__/initialBundleBudget.test.ts`.
- `src/generators/__tests__/architecture.test.ts` impede ciclos conhecidos e
  dependências sem consumidores.
- A IR dos exemplos do Jogo 3D Avançado é gerada por
  `scripts/gen-game-3d-examples.ts`; `bun run check:game-3d-examples` detecta
  drift sem reescrever arquivos.
- Segurança da imagem do runtime: `bun run audit:image` e `bun run build:image`
  em `packages/studio-runtime`.
- Acessibilidade automatizada: `bun run e2e:a11y`.

## Pro: documento, terminal e linguagem

`modes/pro/useWebContainerSync.ts` é o único dono da montagem e da reconciliação
bidirecional. O watcher sinaliza mudanças; `proFsSync.ts` serializa leituras e
escritas e `reconcileProTree.ts` compara base/editor/disco, preservando conflitos.
`state/projectOperations.ts` drena a fila antes de salvar/exportar/capturar um
handoff. Os pedidos/sinais de montagem do terminal são isolados por store, além
do ID do projeto. A posse do container só termina depois das operações em voo.

`monaco/pro/` atende TS/JS com TypeScript 5.9.3 em worker por instância, separado
dos defaults do Monaco usados pela Ponte. O filesystem virtual contém fontes
fechadas, configurações e declarações reais lidas das dependências instaladas;
patches e invalidação acompanham npm e edição. Os models visuais continuam
restritos às abas. `scripts/gen-pro-typescript-libs.ts` atualiza as bibliotecas
padrão junto à versão fixada do compilador e sua licença. Nunca encobrir imports
inválidos com declarações universais ou desligando diagnósticos.

`studio/tutorMode.ts` define a política pedagógica por tipo: normal/Ponte em
blocos, Pro em código. O Studio fornece contexto limitado; o BFF aplica a mesma
política a prompts, conhecimento, respostas e sugestões. O histórico registra o
modo de origem. Referências Pro são validadas contra arquivos/linhas enviados,
com revisão para avisar quando o código já mudou.

`Project.assets` é a fonte durável dos materiais. `core/proAssets.ts` deriva bytes
e manifesto com hashes; `proAssetSync.ts` participa da mesma fila do filesystem,
antes do preview e do flush. Imagens, áudio, GLB e HDR criados pelo terminal em
`public/` são incorporados à biblioteca com o caminho preservado. Arquivos que
não podem ser persistidos impedem a confirmação de save, com motivo explícito.
Falhas parciais não duplicam conflitos na tentativa seguinte. Exportação e build
remoto usam a mesma materialização; binários não entram na árvore de texto.

A conversão salva uma cópia completa em Blocos e mantém a identidade ativa do
projeto, necessária ao Pensa. `proMeta.origin` aponta para essa cópia. O código
convertido usa módulos em `src/converted`, dependências npm e fontes TS originais;
colisões, arquivos omitidos ou eventos HTML incompatíveis impedem a conversão.

O runtime remoto entrega arquivos compilados imutáveis no R2 privado, acessíveis
por token aleatório temporário. O manifesto é o último write; cada arquivo tem
hash e tamanho verificados. CSP/CORS/COEP são cabeçalhos da origem, sem interceptar
as APIs de recursos. O iframe permanece opaco e preserva o último build válido
quando uma compilação posterior falha. O player permanente ainda é outro marco
do plano; expiração de preview não é política de publicação.

Limites atuais: binários arbitrários fora de `public/` ainda não são materiais
persistíveis; devem ser movidos ou importados antes de salvar. Escrita interrompida
pelo fechamento do navegador antes de ser observada não tem garantia de flush.
Construção assistida, conta OpenRouter e publicação seguem o
[plano por lotes](../../../docs/superpowers/plans/2026-10-15-studio-pro-implementacao.md).

## Evolução do workspace Pro (16/10/2026)

O explorador, busca, materiais e guias são visões do mesmo workspace. Ctrl/Cmd+P,
Ctrl/Cmd+Shift+F, Ctrl/Cmd+Shift+O, F2 e Shift+F12 passam pelos descritores de
`workspace/commands.ts`; ações Monaco pertencem à instância, consultam o estado
atual e mantêm a revisão explícita das mudanças. Guias usam o catálogo Core;
“Investigar com Zappy” prepara contexto validado sem enviar uma pergunta.

A análise informa pending/ready/error. Hashes são reutilizados por nó/fonte,
resultados antigos continuam rejeitados e símbolos acompanham a fonte ativa.
Busca e guias invisíveis não são recalculados. Materiais são materializados ao
abrir, com paginação e uma prévia selecionada; uso literal não inclui caminhos
dinâmicos. O estado canônico continua em Project.assets.

Controles/histórico do código carregam com Monaco. Materiais, previews e o
executor de atividades são demandados pelos fluxos que os usam. Contratos de
logs/configuração importam módulos puros, sem arrastar o compilador do preview.
No build Vite de laboratório, contratos pequenos do host são agrupados; o host
Next mantém seu próprio bundler. Os budgets existentes não foram aumentados.

`prepareSourceDownload` coordena buffers, escritores assíncronos, escopo e
snapshot. Há um pedido ativo por instância; troca de projeto/perfil e unmount
cancelam o pedido. Manifesto, scripts e locks determinam as instruções; documentação
do autor é preservada e avisos/falhas ficam visíveis. ZIP grande codifica/comprime
em um worker descartável, sem transferir os buffers canônicos.

Monaco possui um patch de ciclo de vida global documentado em
[patches/README.md](../../../patches/README.md). Não substituir essa correção por
retenção de diffs, aquecimento artificial de menus ou espera antes de F1.

## Comandos locais

```sh
bun run test
bun run check
bun run e2e:smoke
bun run e2e:gallery
bun run e2e:security
bun run e2e:a11y
bun run check:game-3d-examples
```

## Arquivos concentrados

`parsers/js.ts`, `ir/schema.ts` e `blockly/buildIR.ts` são fachadas históricas
grandes. Código novo de extensão deve entrar em módulos de codec da própria
extensão e ser injetado nessas fachadas; não acrescente um novo domínio inline.
Ao extrair código existente, mantenha primeiro os testes de parse, geração e
round-trip, mova um domínio por vez e só então reduza a fachada.

O caminho de digitação mantém a gravação canônica síncrona. Efeitos de workspace
não publicam reconciliações idênticas; o painel de símbolos fechado mantém entrada
nula estável, e a sessão de linguagem notifica apenas transições de análise.
Isso evita encadear atualizações React sem mudança de estado em eventos Monaco.
A regressão de produção é coberta pelo benchmark browser com digitação contínua.
