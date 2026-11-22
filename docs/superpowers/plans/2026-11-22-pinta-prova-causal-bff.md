# Verificação de blobs e dependências do Pinta no BFF

**Objetivo.** Vincular as dependências de cada desenho aos bytes da revisão que a galeria realmente guarda e comprovar as alterações de índices antes do commit causal.

**Arquitetura.** O subpath puro do Pinta decodifica o arquivo portátil e produz os fatos autorais. O Member Shell verifica o gzip de um objeto R2 identificado pelo Members, verifica as transições aplicáveis e comunica os fatos por HMAC. O Members resolve a projeção final e confirma as revisões sob o lock do namespace.

**Contratos.** Plano de [unidade causal da galeria](2026-11-22-pinta-nuvem-causal.md). A versão de nuvem, a versão do envelope e o esquema do desenho são três campos independentes. O leitor privado do esquema 8 depende de admissão explícita.

## 1. Corrigir a referência implícita de arte

- [x] Usar índice zero para arte sem `tile` quando o ID aponta à folha mutável alvo em `packages/pinta/src/tiles/tilesetOps.ts`. O campo continua ausente quando seu valor efetivo não muda. Uma versão privada do mesmo ID vence o recurso de galeria.
- [x] Em `packages/pinta/src/tiles/tilesetMetadata.test.ts`, verificar inserção no zero, remoção, deslocamento dos índices, flags da célula, identidade do sprite e preservação da folha privada. Executar também os controles regionais e de consumidores existentes.

## 2. Extrair o manifesto do arquivo nativo

- [x] Em `packages/pinta/src/export/pintaCausalManifest.ts`, ler um envelope `pinta-gallery` com exatamente um desenho. Cruzar o ID, tipo, esquema autoral real e formato de nuvem reservado. Admitir o tamanho de texto e buffers pelos limites do codec existente. Verificar a equivalência com a codificação canônica, conservando somente normalizações históricas que tenham teste e semântica documentados.
- [x] Reutilizar o grafo de referências de `core/project.ts` e a seleção de destinos de `core/sceneMapClosure.ts`. Emitir fatos determinísticos `PintaCausalManifest` do Core, incluindo papéis, seletores autorais, bitsets de 256 posições por folha e indicação de arte implícita no zero. Visitar a grade regional pelo leitor comum. Um ID privado não cria uma aresta à galeria; propriedades externas na definição privada continuam sendo arestas.
- [x] Testar o escritor atual, Vila/Cabana, conjunto, mapas densos e regionais, versões de recursos, portas ocultas, arte de folha e sprites. Cobrir envelope truncado, futuro, multidesenho, schemas indevidos e sanitização com perda. Manter a fronteira `@sistemazero/pinta/assets` pura.

## 3. Verificar transições explícitas

- [x] Com os dois desenhos validados, comprovar a mudança da folha e o efeito canônico no consumidor por `tryRemapTilemapCells`. A comparação inclui células, flags, arte e identidade do conjunto. A intenção vem do pedido preso à revisão e recebe prova apenas quando o resultado corresponde ao redutor. A leitura do histórico aplica o mesmo contrato.
- [x] Provar apêndice pelo prefixo de posições, metadados e regras de animação existentes. Pintura usa posições declaradas na intenção e conserva a topologia. Verificar que dois arquivos com a mesma cardinalidade ou o mesmo conjunto de índices referenciados não certificam um remapeamento.
- [x] Comparar `[A,B,C] → [B,C]` e um consumidor que desenha B. Exercitar uma transição incorreta com o mesmo bitset e o mesmo tamanho do resultado para a qual a prova deve falhar.

- [x] Aplicar o remapeamento composto aos buffers e à arte com o mesmo redutor. Uma máscara declara quais posições finais sobreviventes receberam pintura. Uma versão privada só comprova a operação quando reproduz a folha-base selada e a troca canônica das referências. O modo de desligamento sem versão ainda requer sua própria prova.
- [x] No desfazer, conferir o recibo histórico da unidade e o SHA exato da base atual. Conferir o gzip anterior ou a impressão autoral v1 do desenho reaberto, com timestamp de atualização raiz e embalagem de transporte fora da comparação.

## 4. Ligar cópia imutável, hash e atestado

- [x] Em `packages/member-shell/src/server/pinta-causal-content.ts`, ler com `r2GetObjectUgc` somente uma chave devolvida pelo Members para a sessão. Conferir o comprimento da reserva, limitar a leitura, calcular SHA-256 do gzip e descomprimir com limite e UTF-8 fatal. Distinguir erro temporário do storage e revisão inválida/opaca.
- [x] Em `packages/member-shell/src/routes/pinta-causal.ts` e na camada de cliente interno, assinar PUT de chave única com `criarUmaVez` e devolver os cabeçalhos obrigatórios. Obter bases e candidatas presas ao ticket. Usar HMAC para o atestado com namespace, opId, intentHash, nonce, revisões, chave, expiração, hash e resultado da extração. Recusar campos de confiança do navegador.
- [x] No backfill, só concluir quando o ponteiro corrente puder ser confirmado contra a cópia imutável da revisão. Para uma chave histórica gravável, selar exatamente o gzip verificado em chave privada e trocar o ponteiro sob CAS, ou comprovar que não restam URLs históricas de PUT válidas. O armazenamento da via causal mantém a reserva viva durante a prova e só recolhe chaves de tentativas descartadas.
- [x] Exercitar S3 compatível com MinIO oficial 2025-09-07 em loopback. O preflight permitiu tipo e condição, o PUT sem a condição não criou objeto, o PUT válido retornou 200 e as duas repetições retornaram 412. A selagem e o download por anexo conservaram o SHA-256 do gzip.
- [ ] Qualificar o CORS e o mesmo fluxo no bucket R2 próprio da homologação antes de ativar a capacidade. Exercitar a reserva revogada e manter o ponteiro anterior nas recusas.

## 5. Recuperar arquivos opacos

- [x] Separar `GET /api/pinta/causal/archive` e `GET /api/pinta/causal/archive/items/:id` da captura normal. O primeiro devolve metadados sem atestar capacidade de leitura. O segundo assina exclusivamente o download do gzip original como anexo, com confirmação de sessão, epoch, item, revisão e chave da própria galeria. A recuperação não altera a revisão nem as marcas de sincronização.
