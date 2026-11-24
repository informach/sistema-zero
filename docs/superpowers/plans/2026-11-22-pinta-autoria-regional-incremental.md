# Autoria regional por revisão

Base `2bb01745e`. O leitor da janela usa o diretório físico 3 e o Canvas existente. A autoria abre uma base integral no `EditorStore` e mantém seus snapshots imutáveis. O autosave recebe a base confirmada e a edição e lê do disco apenas os chunks que mudaram.

## Sessão e autoridade

- A sessão liga namespace, documento, revisão, espelho e recursos observados. O diretório distingue um chunk ausente de um chunk existente ainda por ler. O documento canônico usa o codec físico 3.
- O pincel e o terreno operam na base confirmada da sessão, com vizinhança e posições assinadas. O EditorStore compartilha os buffers imutáveis e retém o gesto inteiro no histórico dentro do orçamento existente. A projeção parcial existe somente dentro do CAS, que recompõe o diretório autoral e preserva os chunks fora do gesto.
- O save compara revisão, espelho e bases de recursos na transação que grava o novo diretório. Grava apenas chunks alterados, lápides de chunks vazios e o novo espelho. A presença de uma fila causal exige a autoridade que conserva seus bytes duráveis. Uma sessão perde a permissão de editar ao mudar de perfil ou revisão.
- Para quota, medir o mesmo envelope regional usando o comprimento fixo dos chunks no diretório e as regras existentes de metadados. Validar a base inicial pela autoridade completa, depois conferir as revisões do inventário no CAS. Registros legados sem proveniência barata, recuperação de espelho e edições de alcance global mantêm um caminho fiel pela autoridade integral.

## Execução

- [x] Comparar o autosave integral e o incremental numa Vila esparsa, com uma segunda criação pesada fora do mundo. Registrar GETs/PUTs, buffers e duas observações por caminho em Chromium normal e CPU 4×.
- [x] Provar medida exata sem ler os buffers regionais inalterados. Comparar com o encoder real antes e depois de adicionar, mudar e retirar um chunk. Cobrir assets antigos preservados dentro e fora dos cenários.
- [x] Ligar o `TilemapEditor` aos gestos e ao autosave regionais. Conferir pintura atravessando chunks, borda de terreno, objetos, desfazer/refazer e gravação offline seguida de reabertura.
- [x] Conferir o CAS entre abas, a interrupção no último PUT, a versão congelada de arte e a barreira causal em IndexedDB nativo. Conferir também a conservação da autoria nas duas versões com IDs de camada independentes.
- [x] Comparar o RGBA da oficina com o da revisão reaberta, as posições assinadas dos objetos, os valores de terreno, o histórico e a medida do backup.
- [ ] Ligar a abertura focal e a admissão de chunks antes do gesto à sessão da oficina.

Os formatos públicos e a seleção de host permanecem na política vigente. A frente de autorregras nativo 9 tem contrato e arquivos próprios.

## Perfil do autosave

O ensaio carrega a revisão integral no editor antes do cronômetro. A galeria tem dois documentos regionais de 10.000 × 10.000 casas, 2.048 chunks preenchidos em cada documento e um conjunto de peças. O gesto troca uma casa em um chunk preenchido. Cada execução usa um Chromium, uma aba e ordem incremental, integral, integral, incremental.

| Chromium | Mediana integral | Mediana incremental | Leituras de chunk por gesto | Bytes de chunks lidos | Escritas de chunk |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | 953,30 ms | 64,00 ms | 4.096 → 1 | 8.388.608 → 2.048 | 1 → 1 |
| CPU 4× | 2.960,25 ms | 186,45 ms | 4.096 → 1 | 8.388.608 → 2.048 | 1 → 1 |

As quatro amostras de cada projeto estão em `docs/pinta-cenarios/revisao-2026-11-18/qa/autoria-regional-2026-11-22/autosave-abba.json`. As medianas descrevem esta máquina Windows com Ryzen 5 5600G e as condições desta rodada. O teste verifica os contadores de IO. As durações medem esta rodada com duas amostras por caminho.

```powershell
$env:PINTA_AUTHORITY_PORT='5492'
$env:PINTA_PROFILE_REGIONAL_AUTHORING='1'
bun --no-env-file x playwright test --config=playwright.pinta-physical-regions.config.ts --grep='regional authoring reads only'
```

Execute em `packages/studio`. A abertura autoral ainda carrega a base completa do mapa. Galerias com documentos densos ou formatos fora da política rápida, edições globais e recuperações usam o caminho integral. A oficina com sessão vazia e admissão de chunks antes de cada gesto continua como etapa separada.

O ensaio funcional usa o mesmo `TilemapEditor` com os stores que o host fornece. Para repetir pelo IndexedDB do Chromium, retire a variável de perfil e use `--project=desktop --grep='regional map editor paints across chunks|regional autosave rolls back'`. O primeiro caso confirma inclusive a cópia após edição concorrente. O segundo aborta após o sucesso do PUT do chunk e verifica a revisão e bytes antes de retentar.
