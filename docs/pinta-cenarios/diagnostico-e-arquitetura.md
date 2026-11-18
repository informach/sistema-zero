# Diagnóstico e arquitetura

O editor anterior achatava o mapa na entrega ao JavaScript e descartava objetos e folhas
adicionais. O trabalho estende o documento existente, mantendo o estilo visual e os caminhos
legados. A origem do trabalho é a sequência de incrementos do [plano](README.md).

## Documento e compatibilidade

`TilemapAsset` conserva o tipo publicado. Os campos novos são opcionais; valores padrão são
omitidos. Grupos usam uma lista plana com `parentId`; o saneamento corrige pais inválidos e
impede ciclos. `effectiveLayer` resolve visibilidade, bloqueio, opacidade, deslocamento e
parallax herdados. Peça e oito combinações de transformação compartilham o `Int16Array`:
12 bits de índice, três de transformação, `-1` vazio.

Há três versões independentes: versão declarada à nuvem por tipo, envelope `.pinta.json` e
`schema` do desenho. Mapas, peças e conjuntos declaram versão de nuvem 3; o documento rico
usa schema 3. A versão 3 da nuvem supera também o cliente intermediário (versão 2), que só entendia camadas. Um número não deve ser copiado para outro eixo. O leitor recusa versões futuras
antes de sanear. As travas da reconciliação, conflito e remoção antecedem as ferramentas.

Objetos têm geometria, transformação, papel e propriedades primitivas ou tipadas. Referências
de objeto são religadas ao copiar/importar; referências de desenho fazem parte do fechamento
de dependências do backup, biblioteca, persistência e exportação. `map-set` guarda um recorte
de mapa; suas instâncias continuam vinculadas até serem soltas. Conjuntos não são recursivos.

## Renderização e edição

O canvas do editor mede a área visível, dentro do papel lógico completo. O cache LRU de
32 MiB contém blocos de 32 × 32 células. Só os blocos visíveis são desenhados. O histórico
contabiliza buffers compartilhados uma vez. Painéis de camadas, objetos, terrenos, biblioteca,
conjuntos, animação e minimapa são módulos; o controlador de seleção fica em `mapTools/`.

Os componentes continuam usando `pin-*`, `Panel`, `Button`, a tipografia e as barras do Pinta.
No celular, a barra de ferramentas passa para a horizontal e o painel de peças/camadas pode
ser recolhido. O mapa ocupa a largura disponível. Os níveis de ferramenta respeitam o
`allowTools` recebido do host.

## Uma conversão, vários consumidores

`core/src/studio/pinta-scene.ts` valida `PintaScene`. Só `pinta/src/export/scene.ts` converte
o documento para esse contrato. Ele resolve folhas, arte e conjuntos. O compositor é usado
na imagem completa, miniatura, teste com personagem e nos dados portáteis.

No Studio, `ProjectAsset.scene` acompanha o asset em saneamento, persistência, metadados do
preview, biblioteca pessoal e sincronização. A revisão acompanha mudanças de cena mesmo
quando o PNG permanece igual. `tilemap`/`tilemapFront` permanecem nos desenhos elegíveis para
os blocos antigos; estes não recebem o contrato novo implicitamente.

`official-extensions/map-2d/` compõe os dois motores. O host fornece canvas, câmera e a
colisão já existente. As camadas sólidas são fundidas em uma grade. A variante
`cenario-pinta-v1` acrescenta até 32 KiB ao teto do motor; projetos sem os novos métodos
continuam com o bootstrap anterior. O teste compara os bytes dos dois caminhos antigos.

O Python lê PNG com dados 1 e 2. O compositor completo de `pinta.py` é gerado da mesma fonte
do pacote Pygame; `gen-pinta-scene-python.ts` e `gen-python-text-sources.ts` mantêm a cópia
embutida. PyDew Valley usa uma fazenda única de 16 camadas.

## Orçamentos

| Destino | Limite |
|---|---|
| Documento/editor | 256 × 256, 32 camadas, 256 peças por folha, 2.097.152 células |
| Histórico/cache | buffers únicos; cache de blocos até 32 MiB |
| Cena no Studio JS | 2.097.152 caracteres serializados; recusa explícita acima |
| PNG completo | 16.777.216 pixels |
| Pacotes externos/importação ZIP | 128 MiB; até 16 mapas ligados |
| Dependências visuais capturadas | 224 |
| Aula | envelope antigo, até 1,8 M caracteres; mapas fora dos tipos oferecidos |

Os tetos do editor só foram elevados após medir gravação e leitura no IndexedDB. A medição
e as limitações do ambiente estão no [relatório](homologacao.md). Mapas infinitos e projeções
isométrica/hexagonal permanecem fora do escopo aprovado.

## Publicação

Os incrementos de proteção já estavam incorporados à `staging` remota quando esta continuação
começou. Esta entrega não realiza merge nem deploy. Em publicação, conferir Members/Admin
com leitor e catálogo atualizados antes de publicar o gravador e sincronizar a base de blocos.
Uma aba antiga no mesmo aparelho não pode ser corrigida pelo código novo; a nuvem protege a
cópia íntegra. Mapas continuam excluídos dos envios de aula.
