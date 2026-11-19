# Lote 8.3 — Leitura ZIP limitada e perfil de desempenho

18/11/2026. Continuação do checkpoint `acaf4b1a8`. **Corrigido o gargalo de reabertura; 8.3 permanece aberta.** Próximo recorte: GLB único, depois preparação autorizada e interface de exportação. Não iniciou outro lote.

## Causa demonstrada

O perfil do pacote real mostrou 47,6 s na reabertura. Aproximadamente 95,9% do tempo ficava nas cópias/concatenações do `Inflate` do fflate. A causa estava na entrada: **Bun 1.3.11 entrega bytes além do tamanho de um Blob fatiado quando se usa `stream()`**. Uma fatia de 10 bytes de um arquivo de 1.024 bytes forneceu 1.014 bytes, enquanto `arrayBuffer()` forneceu os 10 corretos.

Assim, cada entrada ZIP alimentava o decoder com a cauda do arquivo, incluindo os outros recursos. O conteúdo final ainda passava por CRC, mas havia releitura e crescimento de buffers. No pacote real foram observadas 32.311 chamadas ao decoder e até 6.149.993 bytes pendentes; isso explica a lentidão sem culpar o terreno ou alterar a compactação.

O happy-dom usado nos testes do Molda possui outra implementação de File e escondia esse comportamento. O teste de regressão usa também o File nativo de `node:buffer` e instrumenta a alimentação do **codec real**, sem substituir seus resultados. Antes da correção, 265.570 bytes de arquivo provocaram **4.410.099 bytes** de entrada no decoder; o teste falhou. Depois, o teste passou, conservando todos os nomes, bytes e a ordem.

## Correção única

`backupFile.ts` agora lê o payload pelo mesmo contrato de **faixas explícitas** que já lia diretório e cabeçalhos. Cada leitura é de no máximo 64 KiB, com conferência do tamanho realmente retornado; o decoder continua recebendo trechos de até 4 KiB. Não há detecção por navegador, nova biblioteca, alteração no ZIP, fallback que ignore erro ou aumento de orçamento.

O leitor mantém CRC, limites, rejeição de entradas inválidas/duplicadas, arquivos criptografados/ZIP64, paths e leitura seletiva do backup da galeria. As entradas não selecionadas continuam fora da descompactação.

## Medições e prova de conteúdo

| Caso local | Antes | Depois |
|---|---:|---:|
| Reabertura do pacote real, com perfil CPU | 47.624,1 ms | 262,5 ms |
| Fixture de 32 arquivos/256 KiB, p50 de 10 execuções após 3 aquecimentos | 42,70 ms | 5,13 ms |
| Mesma fixture, p95/p99 observados nas 10 execuções | 49,32 ms | 8,24 ms |
| Maior buffer pendente no decoder do pacote real | 6.149.993 bytes | 24.801 bytes |
| Chamadas ao decoder do pacote real | 32.311 | 1.562 |

Na nova medição do pacote completo, conferência/distribuição levou 151,7 ms e exportação ZIP, incluindo nova conferência, 931,8 ms. O Chrome reabriu os 36 arquivos em **376,2 ms**, verificou os 28 recursos do manifesto por SHA-256 e recusou tanto CRC adulterado quanto orçamento insuficiente. São ensaios locais; não medem desempenho de aparelho físico ou da Faísca pronta.

[Baseline](evidencias/lote8-zip-faixas/leitura-baseline.json), [depois](evidencias/lote8-zip-faixas/leitura-faixas.json), [decoder](evidencias/lote8-zip-faixas/leitura-decoder.json), [pacote real](evidencias/lote8-zip-faixas/pacote.json), [Chrome](evidencias/lote8-zip-faixas/leitura-browser.json).

Prova por mudança, conforme a skill de otimização:

- Ordenação preservada: mesmas entradas e mesma ordem do diretório central.
- Desempate: não se aplica; não houve ordenação nova.
- Ponto flutuante: não se aplica ao payload binário.
- RNG: fixture com seed fixa `0x12345678`, sem alteração entre medições.
- Golden: SHA-256 `b640ef8d06e11763a7b12c4bfc61fa7be9f6cd109d89cb7d1b91490f1db06133`, conferido em cada execução. Os 36 arquivos do pacote real são comparados byte a byte com o inventário original após reabrir.
- O JavaScript portátil permaneceu **idêntico**, SHA-256 `3d3afa2842b659406c45e2f6b9f18f960214888c58444ba0587f1dbcdba6c447`; a mudança afeta o leitor ZIP da ferramenta, não o runtime já distribuído.
- Oportunidade: impacto 5 × confiança 5 / esforço 2 = **12,5**. Perfil antes/depois confirmou a remoção das cópias predominantes. Uma única estratégia de IO alterada neste commit.
- Rollback: reverter o commit desta correção, mantendo o checkpoint anterior; não há dados autorais/migração modificados.

## Verificação e sequência

**132 testes** dos exportadores do Molda e **112 testes** da oficina aprovados, tipagem do Molda aprovada; Biome/diff conferidos. Build da oficina/workers com Vite 8.3.4 aprovado, com o aviso de chunks anterior. O teste novo foi observado falhando antes e passando depois. `conferir:runtime` passou sem regenerar o módulo. O leitor foi exercitado no Chrome com o ZIP real e falhas de CRC/cota.

O gargalo registrado no checkpoint anterior está resolvido. Continuar somente em 8.3: GLB único, preparação real de revisão/licenças pelo Members, hosts equivalentes e interface nos layouts/temas previstos. 8.4/8.5, lotes 9–10, composição final, full review, CI e validação remota de implantação continuam pendentes.
