# Entrega do adendo Canvas Survival — 15/10/2026

A implementação do kit próprio **Guardiões da arena · 2D** está no mesmo worktree `C:/Users/tocha/projects/sistema-zero`, branch `feat/studio-pro-completo`. A sessão principal recebeu avisos diretamente pelo turno ativo do Codex, confirmou a divisão de arquivos e já integrou seu driver ao runtime. Esta sessão não fez commit, staging, checkout, merge, push ou deploy.

## O que foi entregue

- Kit `canvas-survival`: modelo puro a 60 Hz, seed repetível, movimento normalizado, dois comportamentos de inimigos, pulso, colisões contínuas, limite de entidades, vitória por tempo/eliminações e precedência da derrota.
- Controller com um agendador de frames, disponibilidade separada da fase, cancelamento/retry e descarte. Loader valida manifesto canônico, hashes, PNGs, dimensões, animações e limites; bitmaps tardios são descartados.
- Três sprites originais com quatro estados, fonte de geração, hashes e licenças. Nenhum código ou asset do P27 foi redistribuído.
- Catálogo, criação pública com árvore e materiais completos, cópia independente e proteção de perfil A→B→A durante criação/persistência/navegação.
- Integração com Materiais por ID, guia do Zappy por arquivos, documentação para personalização e suporte a PNG simples/spritesheet/hitbox opcional.
- Helpers compatíveis com os kits anteriores: teclado/toque/gamepad agregados, rearme, pausa, áudio limitado e interrompido, preferência de movimento reduzido, progresso confirmado após ACK.
- ZIP independente com lock próprio, documentação preservada e instruções Pro corretas. Docker usa o lock antes de instalar. Gerador determinístico e verificações no CI.

## Verificação executada

| Prova | Resultado |
|---|---|
| `bun run check:pro-kits` no pacote Studio | Pack, lock e fontes geradas conferidos; inclui revisão dos helpers |
| `bun run test:canvas-survival` | **53 testes, 607 assertions, zero falhas**; cinco cenários Chromium de assets/render e oito de controller dentro dessa suíte |
| Catálogo/factory/criação/export combinados | **74 testes, zero falhas** |
| Criação de projeto e regressões de lista/persistência/modal | **100 testes**, pela frente responsável; sobrepõe parte da linha anterior |
| Assets, sincronização, storage e previews | **21 testes, zero falhas**; o harness HappyDOM não carrega iframes reais e emite seus avisos esperados |
| Onze templates pelo runtime | Typecheck, Vite e pack passaram |
| Typecheck completo do Studio, incluindo geradores/verificadores | Passou após corrigir uma tipagem de mock; nenhuma supressão de diagnóstico acrescentada |
| Biome nos arquivos próprios e `git diff --check` | Passaram; sugestões informativas de estilo não são erros |
| ZIP extraído fora do monorepo | `npm ci`, `npm ls --all`, `npm run typecheck`, `npm run build` passaram; lock inalterado, sem junction ou substituição do package |
| `dist` exportado em Chromium | Caminho `/nested/game/`, materiais reais, movimento, pulso, spawn e pausa; zero erros de página/console |
| Recursos do controller | Vinte ciclos de montar/jogar/descartar com RAF, listeners, ResizeObservers e ImageBitmaps rastreados zerados |
| Layout | Capturas desktop e 360 CSS px revisadas; toque de três contatos e mudança para paisagem testados |

Não somar as quantidades de suites como testes exclusivos: há sobreposição. Os testes de toque/gamepad usam fronteiras automatizadas; não equivalem a dispositivos físicos.

A sessão principal registrou mais **12/12 playtests Chromium dos seis kits**, **29 testes do runtime** e smoke Docker com usuário não privilegiado, rede desabilitada, 1 CPU/1 GB, TypeScript/Vite/pack/playtest em origem opaca. Na arena, mediu 111.895 bytes de artefato com captura. Essas provas são atribuídas à sessão principal e constam no [registro de coordenação](../docs/superpowers/plans/2026-10-15-studio-canvas-coordenacao.md).

## Medidas do projeto exportado

| Item | Medida |
|---|---:|
| Arquivos textuais | 29 |
| Arquivos de materiais | 4, incluindo manifesto |
| PNGs originais | 6.705 bytes |
| Pixels dos três sheets | 122.880; 491.520 bytes RGBA |
| Envelope Worker completo, com base64/hashes/origem | 147.286 bytes |
| ZIP de fontes | 53.487 bytes |
| `dist` | 51.606 bytes |
| Captura real desta prova | 53.455 bytes |
| `dist` + captura | 105.061 bytes |

O envelope passou o `parseBuildRequest` real, incluindo a verificação de transitivas do lock contra a imagem. Nenhum limite foi ampliado. A captura varia com o estado visual; o relatório guarda a medição efetiva. [Dados de exportação](studio-canvas-survival-browser-2026-10-15/export-evidence.json), [desktop](studio-canvas-survival-browser-2026-10-15/arena-playing.png), [360 px](studio-canvas-survival-browser-2026-10-15/arena-mobile.png), [ZIP executado](studio-canvas-survival-browser-2026-10-15/arena-export.png).

## Aceites da proposta

“Coberto” abaixo identifica a prova automatizada disponível. As linhas parciais não foram transformadas em aprovação global por terem código implementado.

| Critério | Evidência ou etapa restante |
|---|---|
| C01 | Coberto: ID próprio, puzzle preservado e rejeição de motor incompatível/ID desconhecido |
| C02 | Coberto: assets/árvore independentes, falhas, quota/retry, commit e A→B→A, desmontagem e navegação obsoleta |
| C03 | Factory completo passa tipos/build/pack e consumo do manifesto; prova visual de diagnósticos deliberados no editor pertence à homologação do host |
| C04 | Coberto: disponibilidade, erro/retry, menus, duas vitórias e derrota; cancelamento e retry depois de dispose |
| C05 | Coberto: ticks em agrupamentos 30/60/120, diagonal, clamp, borda preservada sem tick e fundo/pausa |
| C06 | Coberto: ordem pulso/contato/objetivo, prioridade da derrota e liberação lógica antes do efeito visual |
| C07 | Coberto: capacidade, reciclagem, spawn seguro, cooldown, invulnerabilidade, contato e swept/flip |
| C08 | Coberto: agregação, repeat, rearme e limpeza; gamepad em fixture, hardware pendente |
| C09 | Coberto: três contatos, cancelamento, teclado/foco e campo editável; dispositivo físico pendente |
| C10 | IDs/copiar/binding implementados; PNG/sheet/renomeação/hashes/metadados e invalidação testados. Jornada autenticada completa no Pinta ainda precisa de homologação integrada |
| C11 | Coberto por parser, loader e browser: hash/dimensões/frames/estados, timeout/abort, resultados tardios e retry. O erro de contexto Canvas segue o mesmo tratamento de disponibilidade |
| C12 | Desktop, 360 CSS px, paisagem, smoothing e DPR testados; inspeção em dispositivos físicos/host final pendente |
| C13 | Áudio, falha de resume, cancelamento de vozes, movimento reduzido e qualidade independente cobertos |
| C14 | ACK/pendência/falha/save inválido cobertos; protocolo de storage por origem/revisão nas regressões. Roteiro autenticado de reload entre perfis permanece na homologação |
| C15 | Local/materialização, remoto isolado e ZIP servido com PNGs reais cobertos; publicação definitiva não é inferida dessas provas |
| C16 | Coberto: JSON, ZIP independente, lock, build/browser, documentos autorais e créditos |
| C17 | Vinte ciclos e ausência de RAF em pausa cobertos. Soak de 30 minutos, BFCache real e metas de desempenho no hardware alvo **não atestados** |
| C18 | Integração do construtor é do lote 7/sessão principal; API, guia e cenário entregues |
| C19 | Compatibilidade de execução pelo código/dependências existentes preservada; matriz de versões, capacidades e desativação de card é do fechamento da sessão principal |
| C20 | Gerador/check/CI e tipos dos geradores + projeto final cobertos; fontes autorais e helpers têm revisão explícita |
| C21 | Medidas reais e limites PNG cobertos. BFF/Worker limite−1/limite/limite+1 e rejeição da arte substituída são do contrato compartilhado/sessão principal |
| C22 | Onze templates compilam; seis kits passam interface e objetivos na rodada conjunta da sessão principal; export e criação preservados |
| C23 | Publicação permanente, autorização e rollback são do lote 9; esta sessão não publicou |

A implementação técnica do adendo foi entregue; **M1 ainda depende do fechamento dos aceites de homologação listados**, M2 do lote 7 e M3 do lote 9. Esse registro permite à sessão principal continuar sem redescobrir contratos ou tratar provas locais como autorização de publicação.

## Arquivos de entrada para manutenção

- `packages/studio/pro-kits/README.md`: processo de autoria e comandos.
- `packages/studio/pro-kits/canvas-survival/src/`: código modular próprio.
- `packages/studio/src/components/code/pro-templates/games/canvas-survival.ts`: composição entregue ao aluno.
- `docs/superpowers/plans/2026-10-15-studio-canvas-survival-implementacao.md`: execução e pendências.
- `docs/superpowers/plans/2026-10-15-studio-canvas-coordenacao.md`: propriedade de arquivos, handoff e provas conjuntas.
