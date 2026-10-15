**Molda — revisão completa da implementação, 15/10/2026**

**Atualização posterior:** os cinco achados deste snapshot foram corrigidos e revalidados. O [relatório de correção](molda-full-review-fixes-2026-10-15.md) registra as mudanças, os 19 testes de regressão incorporados e a validação final. O diagnóstico abaixo foi preservado como histórico da revisão de `44bcbdb05`.

**Resultado: precisa de ajustes antes de considerar a entrega concluída.** Foram confirmados quatro problemas funcionais de prioridade P2 e uma pendência visual P3. Cinco testes adicionais reproduzem os problemas funcionais, mesmo com a suíte existente passando. Nenhum P0/P1 foi confirmado nesta revisão.

Snapshot revisado: merge local `44bcbdb05f0b7aeb3b51d98a546ad3db262d1826`, contendo a implementação `7e80172e71611312ed789dafca5571fb3a9329a0`, comparado com `400b3e5b37e258279aa56d18fd4b7f86ee36a98c`. Escopo: 235 arquivos, 18.826 linhas adicionadas e 2.204 removidas. A revisão foi feita no worktree `sistema-zero-molda-integracao`, sem alterar código do produto, commits ou branches.

**R1 · P2 · Preservar o pivô do intervalo ao inverter o movimento — confiança alta**

Local: [reverseSceneAnimation](../packages/molda/src/scene/animationCommands.ts:274); contrato novo consumido em [sampleAnimation](../packages/molda/src/scene/sampleAnimation.ts:208) e criado em [animationArrival](../packages/molda/src/scene/animationArrival.ts:308).

O novo `incomingPivot` pertence ao intervalo que termina na chave. A inversão espelha os tempos, troca a interpolação de saída, mas mantém esse metadado na chave original pelo spread de `key`. Ao inverter duas chaves, o pivô fica na primeira chave e a nova chave de destino fica sem ele. O sampler então deixa de compensar o giro entre os extremos. A função de inversão é anterior à implementação; a regressão surge porque ela não foi adaptada ao novo contrato de dados.

Reprodução: caixa com pivô local `[1, -1, 1]`, giro de 0° a 90° em Y durante um segundo, chegada suave, seguida de Inverter movimento. No meio do movimento, o pivô deveria continuar em `[1, 0, 1]`; fica em `[1.414213562373095, 0, 1]`. Desvio de **0,414213562373095 unidade**. Os dois extremos continuam corretos, portanto um teste que confira só tempos ou poses nas chaves passa indevidamente.

Correção necessária: transformar os metadados de intervalo junto com sua orientação temporal. Não basta copiar o pivô atual do nó: movimentos podem conter intervalos gravados com pivôs diferentes. Testar inversão simples, inversão dupla, três ou mais chaves, pivôs diferentes e reprodução intermediária no arquivo nativo e no GLB.

**R2 · P2 · Manter a compensação de posição ao editar a chegada de um giro — confiança alta**

Local: [setScenePoseArrival](../packages/molda/src/scene/animationArrival.ts:45) e [sceneAnimationPivotOffset](../packages/molda/src/scene/sampleAnimation.ts:185).

Gravar um giro com pivô deslocado também grava chaves de translação para compensar o centro. Ao trocar a chegada da pose de Girar, `setScenePoseArrival` muda somente o canal de rotação. A translação gerada automaticamente continua com a curva anterior. A correção do sampler usa o peso da rotação, que passa a divergir do peso da translação. Assim, mudar a velocidade de chegada cria um deslocamento que não foi autorado pelo usuário.

Reprodução: na mesma caixa de R1, sem inverter, selecionar a pose de Girar em 1 s e trocar Suave por Reto. Em 0,25 s, o pivô passa de `[1, 0, 1]` para `[1, 0, 0.8125]`; em 0,75 s, chega a `[1, 0, 1.1875]`. Desvio de **0,1875 unidade**, sem qualquer edição manual de Mover. Novamente, conferir apenas os extremos ou o meio exato não detecta o problema.

Correção necessária: representar e editar a compensação derivada separadamente da translação que o usuário realmente autorou, ou estabelecer um contrato equivalente que preserve a trajetória. Sincronizar indiscriminadamente todas as chegadas de Mover com Girar apagaria intenções legítimas de animação e seria uma correção inadequada. Validar também mover/copiar/apagar/retimar poses e os três tipos de chegada, sem transformar essas operações ainda não reproduzidas em achados confirmados.

**R3 · P2 · Encerrar autoria aberta quando a permissão for retirada — confiança alta**

Locais: [sessão de corte](../packages/molda/src/components/editor/scene/useSceneWorkshop.ts:524), [barra de corte](../packages/molda/src/components/editor/scene/SceneSolidCutBar.tsx:8), [formulário de renomear](../packages/molda/src/components/editor/scene/SceneAnimationClips.tsx:68).

Os botões de entrada consultam o acesso, mas algumas sessões já abertas não são revogadas. Foram reproduzidos dois casos independentes da mesma lacuna de ciclo de vida:

- Abrir Cortar, conferir um plano válido e retirar `model.cut` do provider. A barra e a sessão continuam abertas; confirmar ainda substitui `corpo` por `corpo (1)` e `corpo (2)`.
- Abrir Renomear em um movimento e retirar `animate.create`. O formulário permanece, e o submit altera `Acenar` para `Revogação ignorada`, gerando revisão 1.

O efeito de corte depende de modo, ferramenta e seleção, sem depender da capacidade. A barra verifica apenas a ferramenta atual. O formulário de nome depende apenas de `renaming`; a permissão só controla suas entradas. O `run` genérico não conhece qual família cada comando exige.

Correção necessária: revogar as sessões na interface quando perderem a capacidade, abortar tarefas pendentes e conferir o acesso atual na confirmação. Manter o domínio independente das regras de jornada. O portão é pedagógico, não uma fronteira de segurança de servidor; o defeito é a incoerência do contrato de autoria do host. Testar revogação durante prévia, arrasto e worker, além da abertura inicial com acesso negado.

**R4 · P2 · Aplicar `model.pivot` também aos campos numéricos — confiança alta**

Local: [ScenePieceCoordinates](../packages/molda/src/components/editor/scene/ScenePieceCoordinates.tsx:58), chamado por [SceneNodeProperties](../packages/molda/src/components/editor/scene/SceneNodeProperties.tsx:131).

O catálogo separa `model.coordinates` (posição, tamanho e giro) de `model.pivot`, mas o formulário de coordenadas sempre inclui Pivô. Um host que permite coordenadas e nega pivô perde o botão da ferramenta, porém continua com campos editáveis que alteram esse mesmo dado.

Reprodução: montar a oficina com as famílias básicas exceto `model.pivot`, escolher `corpo`, preencher Pivô X com 9 e sair do campo. O documento passa a ter `pivot: [9, 0, 0]`. A família negada permanece acessível sem nenhuma sessão anterior.

Correção necessária: filtrar os campos pela capacidade pertinente e validar o acesso no momento de confirmar. Conferir combinações independentes de famílias, não apenas os três pacotes de nível, que normalmente liberam coordenadas e pivô juntos.

**R5 · P3 · Completar a legenda de eixos em Pintar — confiança alta**

Local: [SceneCanvas](../packages/molda/src/components/editor/scene/SceneCanvas.tsx:1021). Evidência: [print fornecido](../docs/plans/references/2026-10-15-molda-fidelidade/04-pintar.jpeg) e [captura implementada](../docs/plans/references/2026-10-15-molda-fidelidade/implemented/default/04-pintar.png).

O print de Pintar tem a legenda X/lado, Y/altura e Z/frente e fundo no canto inferior esquerdo. A implementação a omite explicitamente com `mode !== 'paint'`. Essa condição é herdada da interface anterior: trata-se de uma pendência do escopo de fidelidade, não de uma regressão introduzida agora. Não consta entre as diferenças deliberadas documentadas. A comparação automática passa porque sua referência já contém essa ausência.

Correção necessária: incluir a legenda no palco 3D de Pintar, respeitando os controles de imagem e o layout compacto. Validar sua presença nos três temas e atualizar as capturas depois da conferência.

**Verificação executada nesta revisão**

| Verificação | Resultado fresco | Evidência |
|---|---|---|
| Suíte completa do Molda | 3.193 passaram, zero falhas: 1.091 + 1.015 + 1.087, em 442 arquivos de teste | [Log](molda-full-review-2026-10-15/unit-tests.log) |
| TypeScript do Molda | `tsc --noEmit`, código de saída 0 | [Log](molda-full-review-2026-10-15/types.log) |
| Biome nos arquivos aplicáveis do diff | 198 arquivos, sem correções e sem erros | [Log](molda-full-review-2026-10-15/lint.log) |
| Kids: cliente, persistência, conformidade, guia e acesso | 75 passaram, zero falhas | [Log](molda-full-review-2026-10-15/kids.log) |
| Estúdio: importação, articulação, flipbook e skin | 30 passaram, zero falhas | [Log](molda-full-review-2026-10-15/studio.log) |
| Chromium em build de produção | 11 cenários passaram, incluindo autoria básica/intermediária/avançada e resize | [Log](molda-full-review-2026-10-15/browser.log) |
| Capturas dentro desses cenários | 15 comparações, cinco composições × três temas; referências não atualizadas | Mesmo log de navegador |
| Regressões adicionais desta revisão | **5 falharam**, reproduzindo R1, R2, dois casos de R3 e R4 | [Saída resumida](molda-full-review-2026-10-15/regressions-summary.log) |
| Higiene do diff | `git diff --check 400b3e5b3..HEAD`, código de saída 0 | Conferência local |

As cinco falhas novas não estão incluídas nos 3.193 testes da suíte existente. Elas são diagnósticos da revisão e não foram incorporadas ao produto. Cópias dos testes: [pivô](molda-full-review-2026-10-15/pivot-repro.test.ts.txt) e [permissões](molda-full-review-2026-10-15/permissions-repro.test.tsx.txt). Os arquivos executáveis permanecem em `packages/molda/.tmp/molda-review-*.test.*` no worktree da revisão.

Para reproduzir, na raiz desse worktree:

```powershell
bun test --preload ./packages/molda/test-setup.ts ./packages/molda/.tmp/molda-review-pivot.test.ts ./packages/molda/.tmp/molda-review-permissions.test.tsx
```

Para repetir a verificação existente, executar `bun run test` e `bun run typecheck` em `packages/molda`. Os cenários de navegador executados foram `e2e/fidelity.spec.ts`, `e2e/scene-authoring.spec.ts` e `e2e/scene-timeline-resize.spec.ts`, com `--project=chromium`, porta 5223 e build de produção iniciado pelo servidor de teste.

**Cobertura da revisão e avaliação arquitetural**

O [inventário dos 235 arquivos](molda-full-review-2026-10-15/files.tsv) delimita o trabalho: 143 arquivos de implementação/configuração/scripts, 58 arquivos de testes/fixtures, 14 documentos/JSONs de evidência e 20 imagens. O inventário registra escopo, não uma promessa de prova formal de cada linha. A revisão combina leitura do diff e dos fluxos críticos, rastreamento dos consumidores, execução da suíte e reproduções independentes.

As cópias das três especificações são idênticas aos documentos originais enviados em Downloads, conforme comparação SHA-256. Foram confrontados os cinco prints, a proposta revisada, a matriz de aceitação, as capturas e o código integrado. As diferenças de proporção da caixa 6×2×8, contagem de grupo, tipografia e cores da plataforma estão justificadas na proposta e não foram tratadas como defeitos.

| Área | Resultado da análise |
|---|---|
| Documento, coordenadas e pivô | Metadado persistente, leitura validada, coordenadas locais e preservação das poses existentes têm cobertura. As falhas estão na edição posterior da animação e no acesso aos campos, conforme R1/R2/R4. |
| Corte | Fluxo exato de caixas e processamento geral separados; fechamento, volume, materiais, UV, revisão de origem, cancelamento e uma operação de histórico cobertos. Peças vinculadas a skin, ossos e hierarquias recusadas são limites documentados. A revogação do acesso ficou incompleta em R3. |
| Pintura | Preparação por contato, isolamento dos recursos compartilhados, transação entre peças, espelho, conta-gotas, grade e composição das cores foram inspecionados. A suíte e o cenário Chromium passaram; pendência visual em R5. |
| Animação básica e avançada | A semântica de chegada é centralizada, as prévias têm dono e confirmação, a timeline preserva tempos importados e resize não entra no histórico. O novo metadado de pivô não foi propagado de maneira completa às operações existentes. |
| Áreas intermediárias/avançadas | Seleção de componentes, alinhamento, corte numérico, malha, UV, materiais, pesos e curvas mantêm o viewport e o histórico existentes. Foram conferidos os caminhos de entrada e os cenários correspondentes. |
| Viewport e recursos | Projeção ortográfica, alças em pixels, seleção geométrica, oclusão, sombras, deformação e descarte de recursos têm proprietários explícitos. A hipótese de alças do pivô usarem a pose base foi descartada: `setPose` atualiza o índice de matrizes usado pelas alças. |
| Importação/exportação e hosts | Leitura nativa, novos metadados, exportação GLB com translação derivada, importação simples e restrições avançadas foram conferidas. Testes do Kids e do Estúdio passaram no snapshot integrado. |
| Identidade e acessibilidade | Tokens, fontes e temas da plataforma preservados; atalhos contextualizados, campos equivalentes a gestos e resize acessível têm cobertura. A ausência da legenda em Pintar permanece fora das adaptações declaradas. |

A varredura estática de dependências abrangeu 838 módulos de produção do Molda e 1.646 exports de valores. Não encontrou componente cíclico de imports envolvendo módulos novos. Trata-se de uma análise textual de imports relativos, não de uma prova sobre imports dinâmicos ou todo o monorepo. As linhas adicionadas não introduzem `as any`, anotações `: any`, `@ts-ignore` ou `@ts-expect-error`.

Os seis candidatos a exports novos sem consumidor externo de produção foram conferidos: constantes da timeline, `scenePaintIndicators`, `setScenePivotVertex`, `cutSceneSolid` e `pickSceneCutEdge`. Há uso interno ou como entradas exercitadas pelos testes; não foram classificados como arquivos mortos. `SceneSkinTools` foi removido sem referências restantes, com sua entrada substituída pela área Ossos e pesos. Não foi confirmada duplicação que justifique outra alteração de produto nesta revisão.

O risco arquitetural concreto é o contrato de animação distribuído entre gravação, compensação, edição de chegada, inversão e exportação. R1 e R2 mostram por que testes separados desses módulos não substituem invariantes geométricos entre as operações. A correção deve fechar esse contrato compartilhado. O outro ponto transversal é o ciclo de vida da capacidade na UI: esconder a entrada não encerra uma operação já iniciada.

**Limites da evidência e ajuste da aceitação**

- P11 (girar usa o pivô escolhido) e A10 (jeitos de chegada reais) não podem continuar sendo interpretados como integralmente concluídos, por R1/R2. A matriz precisa receber as novas provas após a correção.
- A conformidade de acesso precisa incluir retirada de capacidades com sessões abertas e combinações independentes de famílias; os perfis completos dos três níveis não detectam R3/R4.
- As comparações PNG verificam regressão contra a implementação, não igualdade com os JPEGs do usuário. R5 demonstra uma omissão presente na própria referência automatizada.
- Nesta rodada, os cenários de navegador foram executados em Chromium. O `playwright.config.ts` restringe Firefox/WebKit a `scene-workshop.spec.ts`; os novos cenários não têm a mesma cobertura nesses navegadores. A ressalva histórica de encerramento do WebKit continua sem nova conclusão nesta revisão.
- As medições de desempenho arquivadas usam SwiftShader e já registram p95 de 33,4 ms contra 16,8 ms da base em alguns cenários. Elas não foram repetidas aqui e não certificam GPU física, dispositivos móveis ou todas as cenas no limite.

Ordem recomendada: corrigir o contrato de animação e promover as reproduções a testes de regressão; fechar os caminhos de permissão e cancelamento; completar a legenda; atualizar a matriz de aceitação e conferir novamente os cenários afetados. As alterações desta revisão são somente o relatório e suas evidências. O produto e o merge local permanecem no mesmo commit revisado.
