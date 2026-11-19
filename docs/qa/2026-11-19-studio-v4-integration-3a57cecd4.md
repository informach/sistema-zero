# Integração do laboratório v4 com o Estúdio atual

## Referências

O laboratório partiu de a6ccb75dc (v4 e observação da colagem), com backup `backup-estudio-v4-before-main-ec060ad92-20261119`. A integração incorpora 3a57cecd445128dac594bc60253af21696230d3f, contendo origin/staging até 933ac4255, carregador canônico de cenas e Three unificado. Não houve edição da árvore compartilhada, merge em staging/main ou implantação.

A primeira preparação contra ec060ad92 passou nos tipos e em 676 testes, mas encontrou uma fixture de atualização do Vite com o antigo pin Three. A integração foi refeita contra 3a57cecd4, que corrige essa fixture e preserva a rejeição de pins incompatíveis, além das 13 fontes dos exemplos.

Os três conflitos eram de testes e documentação. Foram preservados os 14 casos de PreviewIframe, a captura de operações reais da marca, o observador de DOM, os testes de namespace e os registros dos dois lados. Dependências instaladas por lock congelado e npm ci; Three instalado: revisão 184.

## Evidências locais

- Estado, persistência, prévia, biblioteca, cenas, parsers e cursos protegidos: **1.319 testes / 6.514 asserções / 164 arquivos**, sem falhas (99,60 s).
- Perfil imutável conferido; resolvedor e contratos: **18 testes / 339 asserções**, sem falhas.
- Bundle: **49 asserções aprovadas**, sem ampliar tetos. Repetição com recibo JSON:

| Carga | Bytes brutos | Bytes gzip | Arquivos |
|---|---:|---:|---:|
| Inicial | 367.448 | 119.949 | 2 |
| Blocos | 4.736.173 | 1.269.392 | 17 |
| Ponte | 4.215.155 | 1.132.784 | 18 |
| Código | 2.653.316 | 744.642 | 11 |

O teto inicial é 120.000 bytes gzip: restam 51 bytes. Não se aumentou a cota. O recibo completo e o grafo estão em `.cache/mission/v4-main-3a57cecd4-bundle.json`.

O ensaio nativo profundo passou em Chromium e WebKit: 12 recargas imediatas por motor, duas abas, conflitos e ancestrais profundos. Usa a fixture real de 10.000 blocos e metadados de 40.000 níveis. Total: **56,52 s**, mantendo os limites de 55 segundos do processo filho e 60 do teste. Recibo preservado em `.cache/mission/v4-main-3a57cecd4-native-deep-driver.txt`. Isso comprova integridade de transporte e persistência, não renderização simultânea de 10 mil SVGs ou desempenho em qualquer aparelho.

## Qualificação local e bloqueio restante

O build novo foi gerado em 27,755 s, com processo próprio registrado em `.cache/mission/v4-main-server.json`, porta 5347. O servidor anterior da porta 5327 foi encerrado.

A rodada coletiva parou pelo limite global de sete minutos imposto ao comando: 12 casos passaram e seis não concluíram. Não se elevou nenhum prazo por teste. Separadamente, os dois dias restantes do desafio passaram nos prazos originais (2,3 min e 4,4 min). Portanto, as cinco montagens dos cursos passaram pelo Blockly real e pela verificação de objetivos configurada no harness. O teste não substitui o percurso externo de Enviar/Concluir na página Members.

A rodada final de recarga/salvamento teve **6 passes e 1 falha**. O caso da aba oculta no Chromium parou antes da importação: o clique no item Mais blocos terminou, mas o menu permaneceu aberto e a galeria não abriu. O mesmo caso passou no WebKit. Essa falha intermitente continua bloqueando a qualificação integral; não foi atribuída à persistência nem declarada resolvida.

A captura diagnóstica foi estendida a esse fluxo e a captura/perda do ponteiro. Uma versão com comunicação por evento entre navegador e Node passou em 12/12 repetições, sem explicar a falha. Para reduzir o efeito da observação, a captura atual guarda os eventos no documento e recebe somente os dados dos frames pertencentes ao teste, sem RPC por evento, mudança de foco, leitura de layout ou evento sintético. Ela também passou em 12/12 repetições. Isso valida a instrumentação, não prova correção do produto. O anexo permanece exclusivo das falhas, e essa instrumentação não entra nos testes de isolamento de segurança.

A checagem completa de tipos encontrou apenas um erro na nova fixture: o estado podia ser Python ou JavaScript. A fixture passou a usar `javaScriptProject`, sem casts. Seus cinco testes / 49 asserções passaram, assim como a checagem completa de tipos após a correção. O mesmo ajuste está em 51d3cad74 na branch principal da missão. A captura final também passou na checagem estrita de tipos e no Biome.

Foram recuperadas as capturas da revisão 76c2a2d54, run 44515314703, artifact `studio-browser-windows-chromium`. Oito partes dos quatro primeiros dias foram comparadas: todas mantêm 1440×900, com diferenças de pixels registradas, não igualdade artificial. As partes recolher e guardar também foram inspecionadas visualmente: mantêm categorias, nomes, cores, conexões e organização. Não há alterações de CSS do Estúdio nesse intervalo. Recibo: `.cache/mission/v4-main-course-visual-before-after.json`. O ensaio não substitui o inventário dos vídeos privados inacessíveis.

Este é um candidato para qualificação remota, não a conclusão da ativação v4. A falha de menu e a missão global continuam abertas; a PR principal permanece v3 até integração qualificada. Todos os números são de laboratório Windows; não se mediram FPS, heap prolongado ou aparelhos físicos.
