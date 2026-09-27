# Lote 215 — contrato e baseline de persistência por conteúdo

Estado: contrato e baseline implementados, revisados e verificados em 09/09/2026.
Nenhuma mudança de writer, dados de usuário, formato público ou nuvem neste lote.

## Exploração e escopo

Spec: `docs/plans/2026-09-09-molda-blob-persistence.md`. Três explorações paralelas
somente leitura + conferência direta; skill creating-spec aplicada ao stack real
TypeScript/Zustand, sem introduzir Effect. Decisões dentro do plano aprovado e da
autorização de sequência com validação de produto ao final.

O ledger v2 já evita carregar outras cenas no autosave. Documento alvo continua
inline e é lido/validado/regravado completo. Abertura ainda lê originais; promoção
v1 varre toda a galeria. Studio/Pinta não possuem blob-store local reutilizável.
Cloud usa hash de JSON por asset, não de pixels; não mudar protocolo por analogia.

Achado de compatibilidade: guardedWrite v1 ignora prefixos novos na quota. Planejada
correção no writer atual, com gate explícito para abas antigas e banco público.
Manter envelope na chave canônica para clientes antigos recusarem em vez de
interpretarem ausência. GC não pode confiar em refcount ou grafo parcialmente opaco.

## Baseline executável

`packages/molda/scripts/bench-scene-persistence.ts`, Bun 1.3.11, Windows,
AMD Ryzen 5 5600G. Três aquecimentos + dez amostras por cenário/operação, cada
cenário em processo separado. `Bun.gc(true)` fora da região cronometrada. Operações
reais de createScenePersistence sobre fake-indexeddb 6.2.5, sem mock de persistência.
Tempo de fixture, hash de prova, cópia do input de pintura e asserts fica fora dos
tempos das operações. Perfil de processo completo inclui esses custos separados.

Cada ciclo muda só nome/tempo, depois muda um byte real de pintura; leitura final
tem que ser idêntica ao documento esperado. Medida separada instrumenta get/cursor/
getAll/put sem afetar os tempos reportados. Namespace fechado ao terminar.

Comando (sequencial, sem outros validadores):

```powershell
foreach ($moldaScenario in @('small', 'shared-8MiB', 'unique-8MiB', 'gallery-32MiB', 'ceiling-32MiB')) {
  bun scripts/bench-scene-persistence.ts $moldaScenario
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

103d1b exit 0, 5,77 s. Tempos em ms, p50/p95; com dez amostras p99 = p95
(máximo pela regra nearest-rank), não estimativa robusta de cauda de produção.

| Cenário | Save metadata | Save pixel | Read | List |
| --- | --- | --- | --- | --- |
| Pequeno, 492 B pixels | 1,374 / 1,621 | 1,170 / 1,651 | 0,500 / 0,808 | 0,157 / 0,384 |
| 8 MiB repetidos | 13,417 / 18,617 | 13,548 / 16,777 | 6,553 / 9,917 | 0,316 / 0,558 |
| 8 MiB distintos | 12,081 / 14,486 | 12,446 / 18,751 | 6,388 / 7,779 | 0,279 / 0,520 |
| Galeria 4 × 8 MiB | 12,200 / 13,641 | 13,100 / 15,681 | 6,298 / 8,815 | 0,349 / 0,478 |
| Teto 32 MiB distintos | 47,776 / 53,826 | 50,659 / 58,412 | 26,814 / 30,795 | 0,466 / 2,637 |

Throughput de saves de metadata a p50: 727,802 / 74,532 / 82,775 / 81,967 /
20,931 por segundo. Não throughput concorrente, input latency ou FPS.

| Cenário | Payload armazenado estimado | Bytes de pixels únicos iniciais | RSS amostrado | Heap amostrado |
| --- | --- | --- | --- | --- |
| Pequeno | 7.584 | 492 | 208.211.968 | 3.165.129 |
| 8 MiB repetidos | 8.396.406 | 1.048.576 | 880.570.368 | 331.200.791 |
| 8 MiB distintos | 8.396.406 | 8.388.608 | 903.024.640 | 331.201.760 |
| Galeria 4 × 8 MiB | 33.585.420 | 1.048.576 | 918.577.152 | 684.518.489 |
| Teto 32 MiB | 33.562.230 | 33.554.432 | 2.831.986.688 | 2.555.043.343 |

RAM é amostra do PROCESSO/harness/simulador inteiro ao longo das iterações; não
pico do navegador ou memória necessária do editor. Não extrapolar esses valores
para hardware infantil. Payload é structuredBytes, não tamanho físico do IndexedDB.
Contagem de únicos é oportunidade inicial bruta, não economia implementada; o byte
editado introduz variante. Metadados/manifestações/referências também custarão espaço.

Diagnóstico: todas as gravações leem resumos + documento alvo, não documentos dos
outros três projetos. Regravam documento completo (8.396.066 ou 33.561.890 B) +
340 B de resumo. Esse volume, não a varredura de pintura alheia, é a oportunidade.

## Goldens e perfil

e5191c capturou goldens antes de qualquer mudança produtiva. A primeira observação
contava get mas o coletor usa openCursor; corrigido o observador do benchmark e
reexecutado integralmente em 103d1b. Cinco pares SHA-256 fixados no script (dois
cenários usam a mesma fonte). Hash inclui metadata ordenada e pixels crus exatos;
asserts conferem source intacta e roundtrip inteiro em todas as iterações.

Perfil separado b1e6a3 exit 0:

```text
bun --cpu-prof-md --cpu-prof-name=blob-persistence-l215-baseline.md
    --cpu-prof-dir=../../.audits/molda-evolution
    scripts/bench-scene-persistence.ts ceiling-32MiB
```

Artefato `blob-persistence-l215-baseline.md`: 2,33 s, 304 amostras reportadas.

| Top 5 self | Percentual | Interpretação |
| --- | --- | --- |
| structuredClone | 73,6% | Simulador e harness; amostras atribuídas: 119 cursor, 66 put, 33 harness, 4 dump |
| leitura/cópia de camada | 5,9% | readDocument.ts, camada autoral |
| update de hash | 4,0% | Prova do benchmark; não existe digest na persistência inline |
| Uint8Array | 3,4% | Cópia defensiva do leitor |
| gc | 1,9% | GC explícito do harness |

Call tree: cursor fake-IDB 38,2%, put 23,6%, readSceneDocument 10,0%.
Percentuais inclusivos sobrepõem, não somar. Perfil de processo inclui preparação,
aquecer, asserts/digest e dump. Não alegar 73,6% exclusivo de autosave em browser.

## Oportunidades e prova exigida

| Alavanca | Impacto × confiança / esforço | Decisão |
| --- | --- | --- |
| Pixels imutáveis por hash, evitar puts idênticos | 5 × 4 / 5 = 4,0 | Prosseguir com codec isolado e depois integração medida |
| Cache de validação por referência mutável | Não pontuado | Recusado: perde ownership/integridade |
| Mexer no GC do simulador para parecer mais rápido | Não pontuado | Fora: não é otimização do produto |
| Otimizar hash do harness | Não pontuado | Fora dos tempos reportados, sem benefício ao editor |

Prova da futura mudança: ordem preservada por arrays e referências explícitas,
nenhum tie-break novo, floats sem transformação, RNG/tempos não gerados pelo codec,
goldens fixos e igualdade de sceneToJson. Conteúdo físico pode mudar; conteúdo
autoral, CAS, originais e backup portátil não. O lote 215 não anuncia ganho obtido.

## Revisão e verificação final

- Contratos comparados com a spec de compatibilidade de 07/09: capacidades públicas,
  donos dos tipos e originais mantidos. Revisão distinguiu formato de documento,
  layout físico, revisão CAS e domínio do hash; sem unificações artificiais.
- 219611: typecheck estrito explícito do script e dependências passou (o tsconfig
  principal inclui src, não scripts). 8f175c/569ae9: tipos do pacote passaram.
- 4a27ae: **58 testes, zero falhas, 345 asserts, cinco arquivos**, persistência,
  promoção, índice, canal e writer anterior; 1,30 s.
- d538bb: Biome do único arquivo executável novo passou. 103d1b: cinco cenários
  passaram com goldens fixos/roundtrip/fonte intacta. b1e6a3: perfil separado passou.
- Nenhuma fonte produtiva ou teste do produto mudou: integral/builds do lote 214
  não foram reexecutados nem apresentados como resultados novos do lote 215.
- Próximo lote: codec sem IO. Writer, GC, migração e comparação antes/depois ainda
  não implementados; nenhuma fase promovida a concluída por este baseline.
