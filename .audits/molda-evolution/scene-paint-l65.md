# Lote 65 — regiões de pintura, composição e atualização de textura

Medição local em 07/09/2026, Windows, Bun 1.3.11. Script:

```sh
bun scripts/bench-scene-paint.ts
```

Fixture válida: oito camadas indexadas com opacidade 0,5, pincel 3, segmentos
curtos na camada superior. Três iterações de aquecimento e 20 amostras por tamanho;
p95 por nearest-rank. Cada caso começa com composição completa. No script final,
a textura derivada é comparada byte a byte com a composição completa após cada
mudança, fora da região cronometrada. O script também mede o preparo do patch 2D.

| Lado | Recursos antes p50/p95 (ms) | Recursos depois p50/p95 (ms) | Patch 2D depois p50/p95 (ms) |
| --- | --- | --- | --- |
| 256 | 8,071 / 18,789 | 0,276 / 0,625 | 0,091 / 0,231 |
| 512 | 33,762 / 42,391 | 0,415 / 0,705 | 0,229 / 0,462 |
| 1024 | 138,614 / 144,656 | 0,932 / 1,522 | 0,790 / 0,925 |

No caso 1024², o comando autoral passou de p50/p95 0,386/2,134 ms para
0,401/0,484 ms, sem mudança de algoritmo. Não atribuir essa variação ao patch.
A composição completa permaneceu custosa: 58,890/69,777 ms antes e
59,673/73,056 ms depois. Aquecimento, GC e variação entre execuções afetam os
percentis; especialmente no caso 256², não há demonstração de melhora da
composição completa. O ganho vem de evitar esse trabalho para traços pequenos.

O patch final dos casos mede 60 bytes (15 pixels RGBA), em vez de recompor e
copiar 4 MiB para 1024². Ainda há cópia autoral e comparação da camada alterada
inteira: não declarar custo constante nem ausência de alocação. O comparador
ignora referências iguais e bytes iguais e funciona também com undo, importação
e resultado de worker; não depende de um registro global de dicas de mutação.

O material mantém contagem de pixels transparentes, ajustada pelo patch, em vez
de varrer o RGBA inteiro após cada traço. Atualizações de acabamento/nome não
sobem a textura. A primeira carga, mudanças de paleta/base, dimensões, formato,
ordem/opacidade/visibilidade de camadas continuam exigindo composição completa.

As faixas de upload usam o contrato já existente de `RgbaTexture`: acumulam até
o upload, e uma carga completa pendente inclui qualquer patch recebido antes
dela. O teste chama o callback da fronteira de upload para verificar esse
protocolo. Não simula nem comprova a execução de `texSubImage2D` na GPU.

O canvas 2D compõe o mesmo patch e o escreve na posição UV correta, invertendo
as linhas somente na apresentação. Não mantém outra imagem autoral ou um cache
global de documentos; cada consumidor retém apenas sua fonte atual.

Esta é evidência CPU/contrato, não FPS, INP, latência total de ponteiro, navegador,
Chromebook ou tablet. Os gates de hardware e usabilidade continuam abertos.
