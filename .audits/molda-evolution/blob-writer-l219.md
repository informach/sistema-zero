# Lote 219 — writer por conteúdo e migração interna

Estado: implementado e verificado, 09/09/2026. Desempenho agregado ainda pendente no lote 220.
Formato público permanece 1; somente persistência da oficina isolada passa ao layout 2.

## Arquitetura e fronteiras

scenePersistence mantém API, leitura/listagem e observação. sceneRecordInspection
é dono da inspeção inline e SceneStoredRead; não há cópia de validadores.
sceneBlobStorage compartilha inspeção do snapshot com o preflight do writer.
sceneBlobWrite prepara/hasha antes do IO, valida o snapshot corrente fora da
transação e depois relê dependências/ledger em uma única transação de commit.

sceneStorageCompare compara o domínio real de registros: campos e ordem, arrays,
números inclusive -0, buffers/intervalos/aliases. Não é serializador genérico ou
validador. Mudar raw/pixels sem mudar revision ainda produz conflito. Hash declarado
ou metadata não são provas de igualdade. Recibos opacos não são lidos/interpretados
no preflight: apenas presença, registrada nas keys; seu conteúdo corrente continua
intocado. Quota usa o ledger atual na transação, com fallback raw em inconsistências.

Blobs preparados existentes são comparados byte a byte antes do reuso, sem await.
Conteúdo divergente sob a mesma chave é erro, não autorização para sobrescrever.
Blobs novos + manifesto + summary + tombstone e retiradas são um commit só. Lista
e leitura nunca migram. Próximo save autorizado converte inline sem segunda cópia
permanente; rollback conserva a representação anterior e todos os originais.

sceneBlobCollection considera somente hashes aposentados pelo alvo, não faz sweep
de órfãos. Na transação, confere referências dos manifestos reais e conserva também
referências do índice. Metadata não autoriza coleta. Originais/recibos, partições
desconhecidas, formatos futuros e fontes não verificáveis impedem a remoção.
RetainedBlobs no resultado informa count/bytes/reason=unverified-references de
candidatos retidos; não alega que são lixo nem que houve economia. Interface de
diagnóstico visual não foi acrescentada. Os bytes retidos continuam na quota.

Salvar somente metadata não tem hashes aposentados e não varre os manifestos dos
outros projetos. O ledger ainda lê todos os blobs para medição: perfil/otimização
posteriores precisam medir isso, sem esconder o custo inicial da fronteira íntegra.

Promoção v1 permanece transacional/inline e preserva recibos. Se encontrar cena já
convertida, captura registros sem escrever e verifica pixels depois da transação;
nunca await de digest em callback IDB nem fallback para a cópia antiga.

## Regressões e decisões verificadas

- 06f33e: extração inicial, 42/0; ba74b5: comparador, 2/0 e 24 asserts.
- c2b4dc: primeiros 14 testes do writer, 76 asserts, antes de integração.
- 82af45: integração encontrou seis falhas. Uma classificação real: documento
  futuro sem storageVersion ao lado de índice 2 era invalid. Reusar a inspeção
  inline antes da classificação de layout preserva unsupported e sua versão.
- Guard de originais foi separado do custo de manifesto para manter diagnóstico
  específico. Testes de quota agora usam custo físico 2; inspeção do alvo ocorre
  no preflight e no commit. O teste de writer antigo passa a exigir recusa na
  inspeção inline, enquanto o writer atual conserva layout 2 ao salvar/restaurar.
- f1db79: 78/0, 492 asserts, seis arquivos após integração.
- e91eca reproduziu falha ao reconhecer cena já convertida na promoção; correção
  acima. f2ba52: 73/0, 410 asserts, cinco arquivos. Tipos e77bfd/2bd2a0 passaram.
- 1393a3: entrada futura retornava SceneBlobError, quebrando o contrato de erro
  da persistência. Header compartilhado agora mantém MoldaUnsupportedVersionError
  antes do IO para versões >2, sem ativar a capacidade pública v2.
- 0f6e6e/259ab2: **310/0, 2.976 asserts, 38 arquivos, 10,54 s**: estado e jornadas
  Host/Start/Exit/ProjectList. b7f059: 20/0, 117 asserts de writer/comparação.
- 4ce60c/4542dd: repetição encontrou suposição FIFO incorreta entre abas (run 26):
  a segunda chamada terminou a preparação e cometeu primeiro. 59/60 passaram.
  CAS preservou exatamente um vencedor. Testes agora exigem um saved, um conflict,
  revisão única e conteúdo do vencedor; reprodução com gate garante a ordem invertida.
  Não adicionar fila global por aba nem reescrever timestamp para forçar vencedor.
- 9849c5/58cf6d: **90/0, 1.200 asserts, 13,95 s**, 30 repetições de CAS, ordem
  invertida explícita e eventos reais. Tipos finais 6bb3fa/944b56 passaram;
  Biome cb408d: 1.131 arquivos, sem mudanças. Integral em execução.
- 666a3d: a integral voltou a emitir cinco avisos act em ModelEditor.paint.test
  (LoadedEditor, EditorTopBar duas vezes, FacePaintDialog e ModelEditor). Pendência
  histórica 203/214/216, sem causa provada; não confundir com o timeout do harness
  Host corrigido no lote 218. Nenhuma supressão ou alegação de correção.

Cobertura: ownership antes de await; reuso entre projetos sem buffers autorais
compartilhados; migração lazy/recibos cíclicos/rollback na última escrita; conflito
de raw/summary/pixels/presença de original com revision igual; blob ocupado/corrompido
antes e depois de preparar; novos donos opacos antes do commit; GC de compartilhados;
rollback depois de retirar blobs; manifesto real conserva referências omitidas do
índice; tombstone/restore explícitos; quota exata, exclusão acima da quota e disputa
entre criações. Notificações seguem após commit, nenhuma para conflito/abort.

## Pendências deste lote

Integral 8453a2/43be6a: **2.749/0, 8.347.324 asserts, 367 arquivos, 161,26 s**,
com os avisos já descritos. Builds ainda pendentes. A medição abaixo identificou
regressão de desempenho: o lote NÃO está encerrado apesar dos testes verdes.

## Benchmark da integração, antes de otimizar

21bd82/a95e8d: cinco processos isolados, mesmos três warmups/dez samples, fixtures,
goldens, roundtrip e fonte intacta de 215. Nenhum outro validador em paralelo.
Valores p50/p95 em ms; p99 é o mesmo máximo nearest-rank de dez amostras.

| Cenário | Save metadata | Save pixel | Read | List |
| --- | --- | --- | --- | --- |
| Pequeno | 2,630 / 3,466 | 2,395 / 3,569 | 0,964 / 1,092 | 0,178 / 0,203 |
| 8 MiB repetidos | 136,616 / 169,278 | 135,001 / 161,595 | 4,811 / 7,443 | 0,258 / 0,370 |
| 8 MiB distintos | 43,992 / 53,954 | 45,560 / 57,812 | 14,632 / 17,441 | 0,341 / 0,521 |
| Galeria 4 × 8 MiB | 136,507 / 172,836 | 137,909 / 181,645 | 4,700 / 6,411 | 0,421 / 2,137 |
| Teto 32 MiB | 154,965 / 229,496 | 152,903 / 236,730 | 47,917 / 66,749 | 0,383 / 0,823 |

| Cenário | Payload estimado | RSS amostrado | Heap amostrado |
| --- | --- | --- | --- |
| Pequeno | 8.756 | 226.254.848 | 3.272.971 |
| 8 MiB repetidos | 2.107.670 | 706.183.168 | 436.025.643 |
| 8 MiB distintos | 8.400.314 | 1.211.871.232 | 489.851.898 |
| Galeria 4 × 8 MiB | 2.138.420 | 709.718.016 | 408.878.275 |
| Teto 32 MiB | 33.566.138 | 3.991.998.464 | 3.818.431.731 |

Metadata save grava somente manifesto 9.704 B + summary 814/2.002 B nos cenários
grandes, contra 33.562.230 B totais no teto inline. Mas o tempo piorou, em especial
nas camadas iguais. RAM é amostra de Bun/harness/fake-IDB, NÃO memória do navegador.
O cenário pequeno cresce por overhead de referências; não anunciar economia universal.

Perfil separado 7fac8e, `blob-writer-l219-shared-initial.md`: 4,22 s, 433 amostras.
every self 48,5% + callback sceneStorageDocument:131 self 29,6%; inclusive 78,1%
na comparação de camadas repetidas. structuredClone 4,3%, gc do harness 2,3%,
sameSceneStoredValue 1,9%. Digest assíncrono não é o hotspot dominante desse caso.
Perfil separado do teto ae1ff4 em `blob-writer-l219-ceiling-initial.md`; tempos de
execução instrumentada não substituem os da tabela.

### Alavanca 1 — comparação exata sem callback por byte

Impacto 5 × confiança 5 / esforço 2 = **12,5**. Reusar uma comparação binária exata
no codec/comparador, sem substituir igualdade por checksum/hash declarado. Palavra
inteira de 32 bits somente em intervalos alinhados; cauda e views desalinhadas são
comparadas byte a byte. Nenhuma mudança de layout, captura, CAS, quota ou limites.

Prova planejada: mesmas sequências/primeira referência/tie-break; inteiros exatos,
sem aritmética de floats ou RNG; todos os offsets/caudas/diferenças cobertos contra
oracle byte a byte e vetores de bytes. Goldens 215 preservados antes/depois. Rollback
via patch limitado a esta alavanca se não melhorar, nunca reset de worktree.

Não há homologação de abas reais/disco/GPU/toque/crianças nem rollout público/cloud.

### Resultado da alavanca 1

sameScenePixelBytes compara palavras Uint32 sem conversão/cópia de payload, cauda
e views desalinhadas byte a byte; backing compartilhado recusado, detached não se
torna igualdade vazia. Comparador de registros continua conferindo backing inteiro,
intervalos e aliases; codec compara apenas o intervalo autoral capturado.
8b7688: **33/0, 145.955 asserts, cinco arquivos**, incluindo oracle em cada offset,
cauda e posição alterada de arrays pequenos, palavras com bit alto e camadas de 4 MiB.

786d13: cinco cenários isolados passaram, todos os goldens/payloads/requests iguais
à integração anterior. Uma única alavanca, sem mexer em hash, CAS, quota ou GC.

| Cenário | Save metadata p50/p95 | Save pixel p50/p95 | Read p50/p95 | List p50/p95 |
| --- | --- | --- | --- | --- |
| Pequeno | 2,591 / 3,383 | 2,403 / 4,008 | 1,048 / 1,475 | 0,191 / 0,267 |
| 8 MiB repetidos | 16,373 / 20,919 | 18,502 / 21,508 | 4,858 / 6,472 | 0,291 / 2,499 |
| 8 MiB distintos | 31,666 / 37,506 | 35,100 / 39,598 | 14,644 / 16,788 | 0,297 / 0,349 |
| Galeria 4 × 8 MiB | 16,613 / 19,332 | 16,667 / 22,794 | 4,571 / 5,866 | 0,368 / 2,376 |
| Teto 32 MiB | 105,175 / 122,265 | 103,135 / 115,295 | 44,148 / 51,401 | 0,327 / 3,292 |

RSS/heap amostrados, na mesma ordem: 209.592.320/3.311.324;
693.944.320/481.235.826; 1.217.474.560/651.913.099;
723.226.624/487.802.571; 4.017.623.040/3.680.892.899 bytes.
Throughput de metadata a p50: 385,951 / 61,076 / 31,580 / 60,194 / 9,508 por segundo.

A comparação repetida deixou de custar ~137 ms, mas o teto ainda é mais lento que
o inline 215 (105,175 contra 47,776 ms) e seu RSS amostrado é maior. Não anunciar
ganho geral de desempenho: integridade, cópias e leituras ainda precisam otimização.
3642ca gerou perfil posterior `blob-writer-l219-ceiling-word.md`; não misturar seus
tempos instrumentados com esta tabela.

## Verificação final e review

- Tipos b1d7f6/5bdb96 e Biome 80bda4: 1.132 arquivos, sem correções.
- Integral 7b97d8/1b6f16: **2.751/0, 8.493.063 asserts, 368 arquivos, 159,00 s**.
  Sete logs WebGL e dez avisos act em ModelEditor.paint/TextureEditor. A interação
  histórica segue sem diagnóstico; nenhum aviso foi suprimido.
- Vite a3d9c5: 1,14 s, ScenePlayground 210,87 kB (antes 204,70), index 363,90 kB,
  CSS 53,64 kB e workers inalterados. Three permanece acima de 500 kB.
- Kids 80f0c4/922709: compilação 4,2 s, tipos 9,9 s, 59 páginas em 746 ms, exit 0.
- git diff --check 63365e: exit 0; três avisos CRLF preexistentes, sem erro.
- Perfil posterior 3642ca: 381 amostras/4,18 s; structuredClone 47,9% self,
  Uint8Array 13,9%, digest 13,6%, comparação exata 9,7%.

Review: dependências reais conferidas novamente no commit, quota final atômica,
GC restrito às referências comprovadas, migração/recovery e versões futuras
preservados. A comparação otimizada mantém igualdade exata e goldens. O lote fecha
a integração funcional e essa alavanca medida, NÃO a fase 2 nem a meta geral de
desempenho. Próximo lote: evitar hidratação repetida no save somente de metadata,
mediante prova de equivalência com a captura privada já validada do writer.
