# Studio Pro — review completo da evolução

Base integrada: staging local `b030c443e0adf6fd7a6bf6c33702d63b949fca8c`.
Branch de trabalho: `feat/studio-pro-evolution`, em worktree isolada. Alterações
não commitadas da worktree original foram preservadas. Nenhum push/deploy.

## Entregas e revisão por lote

- Lote 0 (`fdc0a101e`): fixtures, dados brutos, fingerprints e budgets de laboratório.
- Lote 1 (`45625e97e`, `4850a4db9`, `3f7848c8a`): hashes por fonte, busca limitada,
  símbolos vinculados à fonte ativa e ZIP grande em worker descartável.
- Lote 2 (`c007938f5`): abertura rápida, comandos Monaco, busca dedicada,
  breadcrumbs e Guias separados da árvore; revisão documental preservada.
- Lote 3 (`3e5fecb28`): estados de análise, diagnóstico técnico e contexto Zappy,
  materiais paginados com usos literais e guias ligados a símbolos reais.
- Lote 4 (`3490bac39`): exportação com snapshot reconciliado, cancelamento por
  projeto/perfil, avisos visíveis e instruções derivadas do manifesto/locks.

Os reviews intermediários estão em `batch-0.md` a `batch-4.md`, com a comparação
específica de diagnósticos e busca. O review final abrange o diff inteiro e os
contratos com hosts, persistência, linguagem, filesystem, materiais e Zappy.

## Achados tratados no full review

1. **F1/Localizar após fechar um diff:** trace real revelou `InstantiationService
   has been disposed`. O Monaco registrava uma fábrica global sobre um serviço
   filho descartável. Patch versionado transfere esse registro para a inicialização
   global standalone. Não retém editores, não engole erros e não introduz espera.
   A hipótese inicial de foco do Modal foi descartada; nenhuma alteração experimental
   de Modal ficou no diff. O teste agora espera o diff real carregar e depois usa
   F1 e Ctrl+F. Detalhes e referência upstream em `patches/README.md`.
2. **Carregamento antecipado e fragmentação:** limites de arquivos já falhavam
   na base em Ponte (21/20) e Código (21/18). Controles/histórico acompanham a carga
   de Monaco; materiais/previews/executor de atividade são demandados pelo uso.
   Logs e configuração importam contratos puros; constantes de loop não carregam
   Babel. O cabeçalho de geração tem dono único, eliminando a dependência dos modos
   no executor reverso. No Vite local, contratos pequenos do host compartilham um
   chunk sem arrastar dependências. Nenhum teto existente foi aumentado. A configuração
   de chunks não é atribuída ao Next de produção.
3. **Falha ao carregar o executor de atividade:** erro é apresentado com nova
   tentativa, sem fabricar nota e sem reapresentar falha de outra aula/projeto.
4. **Verificação de preview lazy:** teste de Blocos passou a esperar o iframe
   real; continua exigindo preview no layout estreito com `showPreview=false`.
5. **Ambiente combinado de testes Kids:** as mesmas cinco falhas de AsyncLocalStorage
   foram reproduzidas na staging. O preload agora fornece a implementação real de
   Node usada pelo bootstrap Next, antes dos imports de rotas. Os 102 cenários
   selecionados passaram juntos; não dependem de isolamento por arquivo.
6. **Provas de exportação:** React e convertido foram instalados e compilados em
   diretórios temporários independentes. Canvas/Phaser/Three passaram instalação,
   build e provas no browser, com lockfiles preservados. O script de grid verifica
   o destino temporário antes da remoção recursiva.
7. **Qualidade da instrumentação:** geração das fixtures evita repetição excessiva
   fora da região medida sem alterar seus bytes; logs temporários de foco foram
   removidos. Relatório de bundle registra todos os modos antes das asserções,
   expondo falhas que antes ficavam escondidas pela primeira asserção.

8. **Digitação contínua no build de produção:** reprodução reduzida com uma abertura
   e 203 teclas expôs React #185. Instrumentação do reconciliador localizou trabalho
   redundante ao final dos commits, em workspace e símbolos. A reconciliação de
   abas só publica mudanças reais; símbolos fechados não invalidam por conteúdo;
   análise publica transições de estado e digitação só fixa uma aba temporária.
   A gravação canônica continua síncrona. Hipóteses parciais foram descartadas;
   não ficaram delays, throttles, instrumentação de React ou erros ignorados.
   A reprodução mínima passou e o benchmark completo passou com 30 aberturas,
   30 ciclos de layout e digitação antes/depois da conversa Zappy.

9. **Ordem da renomeação e preservação de buffers:** a primeira versão do guard
   de reconciliação reagia também à organização das abas, antes da chegada da árvore
   renomeada, e fechava o arquivo. Um teste unitário mínimo confirmou o defeito.
   A reconciliação só publica quando houve remoção ou mudança de tipo de nó e
   mantém a atualização funcional, respeitando remapeamentos já enfileirados. O E2E exige o mesmo ID de model ao passar por
   TS → JS → texto e recuperação; o critério não foi relaxado.
10. **Inspeção assíncrona nos E2Es:** a captura de models importava Monaco antes
    de atualizar o output. O teste podia ler a captura anterior e declarar um
    model ausente mesmo com a aba correta. A fixture agora versiona a captura;
    workspace e benchmark aguardam essa versão antes de comparar. Isso também
    impede um falso positivo na verificação de buffers preservados pelo layout.
    O novo cenário de digitação com símbolos abertos verifica texto integral e
    ausência de erro de página, sem atrasar artificialmente cada tecla.

## Desempenho medido

Todos os 11 hashes de saída CPU coincidem com a base. Tempos abaixo são
laboratoriais na máquina descrita ao final, não promessas para qualquer dispositivo.

| Cenário | Base | Final |
| --- | ---: | ---: |
| Busca sem resultado, 2.000 arquivos, p95 | 44,40 ms | 15,08 ms |
| 100 diagnósticos em arquivo grande, mediana | 2.536,44 ms | 21,87 ms |
| Abertura browser (30 amostras), p95 | 1.150,13 ms | 1.113,03 ms |
| Tecla até segundo frame, p95 | 46,00 ms | 33,15 ms |
| Ciclo ampliar código → código/jogo, p95 | 219,85 ms | 154,44 ms |
| Tecla com conversa Zappy aberta, p95 | Não medido na base | 32,44 ms |

Abertura mediana subiu de 619,37 ms para 677,43 ms, embora p95 tenha caído;
portanto não se declara melhoria uniforme. ZIP no microbenchmark CLI (inclui descompactação/verificação) passou de
50,06 ms para 89,76 ms na mediana: a mudança prioriza tirar codificação/compressão
da thread visual e preservar buffers, e não reduzir a duração total do empacotamento.
A prova browser confirma worker único descartado, sucesso e cancelamento.
Busca com correspondência na fixture pequena passou de 0,033 para 0,051 ms
na mediana. Os dados completos estão em `cpu-final.json` e `browser-final.json`.
A proxy de digitação teve máximo de 41,75 ms; isso não mede uma tarefa contínua
na thread nem prova a ausência de long tasks no host autenticado.

## Bundle local (Vite, build de produção)

| Entrada | JS gzip base | JS gzip final | Arquivos base → final |
| --- | ---: | ---: | ---: |
| Lista inicial | 112.968 B | 113.604 B | 8 → 9 |
| Rota do editor | 1.226.436 B | 1.157.208 B | 19 → 18 |
| Blocos | 1.161.203 B | 943.569 B | 20 → 15 |
| Ponte | 1.032.403 B | 815.584 B | 21 → 17 |
| Código/Pro | 608.602 B | 443.309 B | 21 → 17 |

Valores por entrada incluem dependências transitivas; não devem ser somados como
se não houvesse arquivos compartilhados. A lista inicial cresceu 636 B gzip e
permanece abaixo dos três tetos. A redução do Pro é de aproximadamente 27% gzip.
Os JSONs `bundle-baseline.json` e `bundle-final.json` contêm os grafos e bytes.

## Preservação de contratos

Zappy mantém pergunta manual, investigação, construção por trecho/jogo, revisão,
aplicação explícita, histórico/recuperação, voz opcional, créditos e callbacks do
host. A nova ação de diagnóstico apenas prepara pergunta e referência validada.
Nenhuma nova chamada de IA, store de documento ou catálogo de jornada foi criada.

Project.assets continua canônico. Persistência/revisão/flush e o escritor único
useWebContainerSync continuam donos da gravação. Dois flushes síncronos cercam a
espera dos escritores antes do snapshot de exportação. Identidade, lineage,
adapter e escopo impedem reaproveitar um pedido antigo, inclusive A → B → A.

Os gates de acesso, hosts de aula/remoto, modo observador, Pensa e publicação
permanecem nos adapters existentes. Observação conserva o contrato inert do host.
Nenhuma migração de projetos Pro legados foi introduzida.

## Validação final

- Studio: `bun test ./src` — **9.101 testes / 602 arquivos**, zero falhas.
- Workspace/arquivos: **28 testes / 8 arquivos** na rodada focada após os achados.
- Browser: `bunx playwright test --config e2e/pro-workspace.config.ts` —
  **13 cenários** de workspace, builder e assistência; todos passaram.
- Browser/performance: configuração `e2e/pro-workspace-performance.config.ts` —
  **2 cenários** passaram, incluindo worker ZIP e os budgets definidos no lote 0.
- Hosts: **247 testes member-shell / 21 arquivos** e **102 testes Kids / 15 arquivos**;
  Kids passou em uma única execução combinada, com bootstrap nativo corrigido.
- Qualidade: **65 arquivos** de código/configuração do diff passaram no Biome;
  `git diff --check` sem erros. `bunx tsc --noEmit --pretty false` passou (exit 0).
- Budgets: cinco entradas do build local passaram, sem aumentar tetos.
- Contratos dos kits e bibliotecas TypeScript 5.9.3 foram verificados pelos scripts
  existentes (`check:pro-kits` e `check:pro-typescript-libs`).
- Exportações: Canvas, Phaser, Three, React e convertido foram instalados e
  compilados fora do monorepo. Canvas e grid também tiveram provas no navegador.
  Evidências: `canvas-export.json`, `grid-export.json`, `additional-exports.json`.

Falhas intermediárias estão registradas nos achados acima; os testes que as
reproduzem não foram removidos, os limites não foram ampliados e as hipóteses
experimentais não ficaram no produto. A integração Git local é registrada após
a verificação da árvore resultante.

## Inspeção visual

Capturas reais foram conferidas em 1440×1000 e 700×900. Árvore, abas,
breadcrumbs, comandos e regiões de código/jogo permanecem organizados;
Zappy usa seu painel estreito com os modos e o escopo de seleção preservados.
A faixa “Inspecionar buffers” pertence exclusivamente à fixture de teste.
As imagens estão em [workspace amplo](workspace-wide.png) e
[Zappy no estreito](workspace-narrow-zappy.png).

## Limites reais da evidência

Máquina local: Ryzen 5 5600G, aproximadamente 16 GB, RTX 3050. A fixture browser
usa runtime/tutor controlados; não é a rota Kids autenticada, instalação real de
WebContainer, jogo 3D pesado simultâneo ou inferência paga. A métrica de digitação
até o segundo animation frame é uma proxy de apresentação, não INP nem latência
exata de pixels. Não foram realizados ensaio físico em 8 GB/iGPU, estudo com
alunos ou sessão manual de VS Code; os exports foram construídos e executados
pelas provas automatizadas. Esses aceites externos não são declarados aprovados.
