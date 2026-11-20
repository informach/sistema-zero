# Chunks locais — implementação e provas

O armazenamento autoritativo de mapas com pelo menos 32.768 células passa a
usar blocos de 32 × 32. Cabeçalho, blocos, espelho legado, revisão e remoções
são confirmados na mesma transação IndexedDB. O documento lógico, a captura
para o Estúdio e a exportação continuam completos. O formato nativo permanece
em 7; esta mudança não ativa escrita nova na nuvem.

## Verificação

- Pinta: **2.242 aprovados, zero falhas e omissões**, 27.111 verificações,
  192 arquivos, 241,20 s; Python/Pygame real disponível.
- Codec: **26 aprovados**. A revisão reproduziu falhas com identificadores
  Unicode inválidos e cabeçalho vazio antes das respectivas correções.
- Chromium: **19 aprovados**, sem repetição automática, falhas ou omissões,
  45,4 s. Sete regressões anteriores da autoridade local em desktop e seis
  casos novos em desktop e CPU 4×: fechamento/reabertura, captura completa,
  rollback após quota, leitor anterior real, divergência legada offline,
  conflito entre abas, coleta isolada, edição/undo/redo e exportação importada.
- Tipos do Pinta, Estúdio e harness: saída 0. O arquivo do harness final
  vazio representa sucesso silencioso do compilador.
- Biome final: saída 0, 16.466 arquivos conferidos em 29 s.

O leitor real `ec4e58066` recusa o envelope físico 2. O cliente legado
`567b93f95` pode alterar seu espelho; o leitor atual preserva a autoridade e
recupera uma cópia independente da edição antiga. O ensaio offline usa um
realm sem dados autorais em RAM, com o módulo previamente carregado. Isso
não comprova inicialização HTTP offline ou suporte PWA.

## Custos medidos nesta máquina

Mapa ruidoso de 256 × 256, 32 camadas e 2.097.152 células; três perfis,
sem omissões. Toque e CPU são emulações, não aparelhos físicos adicionais.

| Perfil | Salvar | Ler | Editar e salvar | Três frames |
| --- | ---: | ---: | ---: | --- |
| Desktop | 366,6 ms | 404,3 ms | 540,5 ms | 612,2 / 594,6 / 603,2 ms |
| Toque emulado | 392 ms | 420 ms | 534 ms | 600,1 / 623,6 / 589,4 ms |
| CPU 4× | 1.594,4 ms | 1.919,6 ms | 2.327,7 ms | 2.907,1 / 2.776,9 / 2.965 ms |

Primeira gravação: 2.048 blocos, 4.194.304 bytes de células. Uma edição:
**um bloco, 2.048 bytes**. Ambas também gravam um cabeçalho (204.920 bytes
estimados por JSON neste caso) e o espelho legado completo (4.194.304 bytes
de índices). Artes e metadados fazem parte do cabeçalho. Portanto a escrita
total de uma edição não custa somente 2 KiB.

Cache retido de render: 28.311.552 bytes, dentro do teto de 32 MiB.
As medições de heap antes/depois e após GC estão nos JSONs; não são pico
de memória nem memória total do processo. Os tempos incluem observação do IO
e não constituem comparação causal com execuções anteriores.

## Limites e continuação

Esta entrega fecha o lote **8a1**, persistência física incremental finita.
A abertura ainda reconstrói o documento denso inteiro. Streaming sob demanda,
mapas expansíveis e redução do custo de renderização seguem no restante da
etapa 8a. O pior caso acima ainda exige otimização. Automapping em várias
camadas e projeções continuam nos lotes 8b e 8c. O ciclo autenticado de
staging e a ativação dos novos escritores permanecem nas etapas 0b/9.

`origem.json` identifica a base e hashes dos logs locais. `fontes.json`
registra os arquivos de código exercitados. `checksums.json` permite conferir
os artefatos normalizados deste diretório; os logs brutos ficam no cache.
