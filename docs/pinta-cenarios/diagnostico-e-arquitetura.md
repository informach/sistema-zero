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
`schema` do desenho. Mapas, peças e conjuntos declaram versão de nuvem 4; o documento rico
inteiro usa schema/envelope 4; camadas sem recursos ricos continuam em 3. Propriedades
tipadas em camadas/grupos exigem 4. Deslocamentos fracionários exigem **5**, pois o leitor
completo de formato 4 também arredondava frações. A nuvem 4 impede escritas do cliente 3.
Um número não deve ser copiado para outro eixo. O leitor recusa versões futuras
antes de sanear. As travas da reconciliação, conflito e remoção antecedem as ferramentas.

Objetos têm geometria, transformação, papel e propriedades primitivas ou tipadas. Referências
de objeto são religadas ao copiar/importar; referências de desenho fazem parte do fechamento
de dependências do backup, seleção e persistência. O conversor de cena resolve dependências
visuais; referências exclusivamente lógicas a recursos não transportam todo o recurso ao
Estúdio (limitação R04/R05). `map-set` guarda um recorte
de mapa; suas instâncias continuam vinculadas até serem soltas. Conjuntos não são recursivos.

## Renderização e edição

O canvas do editor mede a área visível, dentro do papel lógico completo. O cache LRU de
32 MiB inicial contém blocos de 32 × 32 células e cresce para acomodar os blocos visíveis.
Esse valor não é teto rígido de memória. Só os blocos visíveis são desenhados. O histórico
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
reduzida `sem-cenario-pinta` preserva o motor anterior; a variante padrão carrega o cenário
com teto absoluto de 437.900 caracteres no Jogo 2D e 426.000 no Avançado. O teste compara os
bytes dos dois caminhos antigos. A transformação de objetos de conjuntos tem uma função
canônica TS e uma fonte portátil gerada **antes** da minificação; o CI confere a derivação.

O Python lê PNG com dados 1 e 2. O compositor completo de `pinta.py` é gerado da mesma fonte
do pacote Pygame; `gen-pinta-scene-python.ts` e `gen-python-text-sources.ts` mantêm a cópia
embutida. PyDew Valley usa uma fazenda única de 16 camadas.

## Orçamentos

| Destino | Limite |
|---|---|
| Documento na leitura | 256 × 256, 32 camadas, 256 peças por folha, 2.097.152 células |
| Criação no editor | 128 × 128, oito camadas e 64 peças por folha |
| Histórico/cache | buffers únicos; cache de blocos com orçamento inicial de 32 MiB, ampliável à área visível |
| Cena no Studio JS | 2.097.152 caracteres serializados; recusa explícita acima |
| PNG completo | 16.777.216 pixels |
| Pacotes externos/importação ZIP | 128 MiB; até 16 mapas ligados |
| Dependências nativas capturadas | até 225 recursos incluindo o principal; visuais e referências tipadas |
| Aula | até 1,8 M caracteres; 128 × 128, oito camadas e 64 peças, na autoria e na entrega |

Os tetos de criação não foram elevados: a missão pede essa evolução, mas ela depende de
medição representativa de edição, autosave e memória. O documento ainda é carregado inteiro;
chunks de desenho não equivalem a carregamento incremental. Mapas expansíveis, projeções
isométrica/hexagonal e automapping avançado permanecem pendentes na missão integral.
Veja a [matriz atual](revisao-2026-11-18/cobertura.md) e as [provas](revisao-2026-11-18/qa.md).

## Publicação

Os incrementos de proteção já estavam incorporados à `staging` remota quando esta continuação
começou. Esta entrega não realiza merge nem deploy. Em publicação, conferir Members/Admin
com leitor e catálogo atualizados antes de publicar o gravador e sincronizar a base de blocos.
Uma aba antiga no mesmo aparelho não pode ser corrigida pelo código novo; a nuvem protege a
cópia íntegra. Na aula, autoria e envio seguem os mesmos limites específicos do Members.

### Procedimento para nuvem 4 e documento 5

Esta branch contém leitor e gravador novos; sua implantação conjunta não comprova o rollout
em duas fases. Preparar uma versão A que leia nuvem 4/nativo 5 e mantenha os gravadores
anteriores, sem permitir a autoria de frações enquanto declarar nuvem 3. Publicar e validar
essa versão em todos os hosts, mantendo no backend as recusas em reserva e commit. Só na
versão B habilitar o gravador de nuvem 4 e os documentos 5. O rollback de B deve voltar a A.
Não basta reduzir a constante de escrita nesta branch: ela já permite criar documento 5.

Nunca rebaixar `format_version`, converter o documento para o leitor antigo ou remover a
proteção do servidor para destravar uma aba. Rollback para nuvem 3 deixa os itens 4 protegidos
na conta, com aviso de atualização. Conservar backups nativos antes da migração operacional.
Esse procedimento está documentado, mas não foi executado em staging/produção nesta revisão.

Quando a cota impede guardar a memória de formato, a sessão conserva o floor em memória.
Após reinício com revisão sincronizada e proveniência desconhecida, o produtor consulta o
remoto antes de subir: uma edição nova não legitima um cache cortado. O original é restaurado
e a edição fica em cópia. Falha de rede permite retry sem inserir rede no autosave local.

Floor, assinatura e base de CAS precisam pertencer à mesma origem confirmada. A revisão
encontrou uma aba com mapa 4 já aberto antes da promoção a 5: compartilhar a revisão nova
sem compartilhar a proveniência tornava seu cache cortado elegível para upload. O campo
antigo `writtenAt` também pode ser escrito pelo cliente antigo e não autentica a gravação.
A proteção causal da issue 025 vincula formato, revisão e capacidade do gravador, conserva
a base observada antes de editar e impede retaggar RAM antiga com uma revisão compartilhada.
