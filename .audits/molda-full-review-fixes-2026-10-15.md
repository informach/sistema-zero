**Molda — correções da revisão de 15/10/2026**

Escopo: os cinco achados do [full review](architectural-analysis-2026-10-15-molda-full-review.md), sobre o merge local `44bcbdb05`. Trabalho isolado em `sistema-zero-molda-integracao`; nenhum arquivo do workspace principal foi alterado.

| Achado | Correção | Prova de regressão |
|---|---|---|
| R1 · inversão e pivô | A inversão transporta os metadados do intervalo para a nova chave de destino. | `animationPivotEditing.test.ts`: matrizes intermediárias, pivôs diferentes, inversão dupla e arquivo nativo; `sceneGlbAnimations.test.ts`: reprodução no mixer independente do Three. |
| R2 · chegada e compensação | A curva de referência do pivô tem representação própria no intervalo, independente da curva angular. Nenhuma chave de posição autorada é sincronizada ou sobrescrita para esconder o desvio. | Nove testes de edição do pivô abrangem as três chegadas, posições independentes, marcação repetida, mover/retimar poses completas, copiar/remover, validação e arquivos anteriores; três casos adicionais de exportação GLB. |
| R3 · revogação de acesso | O ciclo de acesso da interface invalida confirmações antigas, inclusive após liberar novamente. Corte cancela a sessão e aborta o worker; renomear fecha o formulário; ações adiadas conferem o ciclo atual antes de gravar. | Oficina real com provider e editor; worker controlado com corte/serialização reais, confirmação capturada e resposta tardia; StrictMode, reativação e desmontagem. |
| R4 · pivô numérico | Cada grupo de campos consulta sua própria família. Revogar pivô cancela seu gesto e remove os campos; blur não grava um rascunho sem acesso. | Coordenadas sem pivô e pivô sem coordenadas; edição autorizada/desfazer; retirada de acesso com campo focado. |
| R5 · legenda de Pintar | A legenda pertence ao palco 3D também durante a pintura, usando os mesmos tokens dos eixos. O comportamento compacto existente permanece no CSS. | Ausência reproduzida por Playwright antes da correção; presença X/Y/Z verificada nos três temas e capturas inspecionadas. Somente os três PNGs de Pintar foram atualizados. |

**Contrato de animação**

`incomingPivotInterpolation` registra a curva da corda de referência usada para compensar a origem. `incomingPivot` continua sendo o ponto geométrico do intervalo de chegada. O sampler usa a curva angular para calcular a orientação atual e a curva de referência para a parcela de translação derivada. Dessa forma, mudar Suave/Reto/Degrau altera a velocidade do giro sem introduzir uma edição de posição.

Arquivos anteriores sem o novo campo conservam o comportamento de leitura. Ao editar sua chegada, a curva de referência anterior torna-se explícita antes de mudar a curva angular. Gravação, remarcação, transformação de poses, inversão e leitor preservam/validam os dois metadados. O exportador GLB considera separadamente a curvatura e os degraus da compensação no limite de erro do canal derivado.

Mover e retimar foram testados em poses completas, incluindo os canais de posição e rotação. A edição isolada de um canal continua independente: não se afirma que retimar somente Girar retime também Mover. Inversão de degraus conserva a semântica nativa de retenção de saída; os testes de equivalência temporal exata de ida e volta usam intervalos contínuos.

**Contrato de acesso**

`useMoldaToolGate` pertence somente à UI. Cada ciclo comprometido de uma capacidade autoriza suas próprias ações; uma revogação invalida esse ciclo, e liberar novamente cria um novo. O domínio, arquivos, reprodução e exportação não passam a conhecer níveis de jornada. O worker de corte recebe o AbortSignal existente; a recusa também ocorre antes da confirmação e antes de aceitar a resposta.

**Validação**

| Verificação | Resultado |
|---|---|
| Molda, três partições | **3.212 passaram**, zero falhas: 1.094 + 1.031 + 1.087, em 445 arquivos. A partição de domínio/componentes foi repetida integralmente após o último ajuste do ciclo de acesso. |
| Regressões incorporadas | **19 testes novos**: nove de edição de pivô, três de GLB, cinco de acesso na oficina, um de worker e um do ciclo de autorização. |
| Reproduções originais da revisão | **5 passaram**, zero falhas; desvios medidos de pivô agora iguais a zero; corte/renomear negados não alteram documento ou revisão. |
| Kids e Estúdio | **75 + 30 passaram**, zero falhas. |
| TypeScript | `tsc --noEmit`, saída 0. |
| Biome | 21 arquivos TS/TSX verificados, zero erros e sem supressões novas. |
| Chromium, build de produção | **11 cenários passaram**, incluindo os três níveis e resize; **15 comparações visuais** passaram sem atualizar referências na rodada final. |
| Diff | `git diff --check`, saída 0. |

Evidências duráveis: [resumos das suítes, tipos e lint](molda-full-review-2026-10-15/fixes-verification.log), [cinco reproduções originais](molda-full-review-2026-10-15/fixes-regressions.log) e [navegador](molda-full-review-2026-10-15/fixes-browser.log). O teste do worker substitui somente o transporte assíncrono para controlar a entrega; utiliza corte, protocolo, editor e permissões reais.

As cinco reproduções funcionais originais falharam antes das correções e passaram depois. A asserção da legenda falhou antes da correção e passou nos três temas. O teste adicional de revogação seguida de reativação também foi executado vermelho antes da correção do ciclo de acesso.

Não foram alterados temas, fontes ou paleta da plataforma. Firefox/WebKit e os benchmarks de desempenho não foram repetidos nesta rodada; permanecem os limites registrados no relatório original.
