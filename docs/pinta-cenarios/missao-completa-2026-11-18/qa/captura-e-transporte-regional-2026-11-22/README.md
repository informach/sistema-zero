# Captura e transporte regional — 22/11/2026

Base `72d0ad34f`. O mesmo capturador transacional do Pinta aceita agora a
política privada nativa 8/físico 3. O leitor público continua em 0–7; a seleção
do host, cena 4/PNG 5 e nuvem 7 não foram ativados.

## Implementação e revisão

A captura usa o codec, autoridade e namespace da persistência, registra a
revisão causal e reúne o mundo na mesma transação. O grafo existente de portas,
recursos tipados e conjuntos foi parametrizado, sem criar outra travessia.
Conjuntos usados como raiz também incluem suas portas ocultas e os lugares
ligados. O transporte reutiliza esse coletor e o backup regional orçado de
32 MiB. IDs, objetos, propriedades, camadas, peças e animações são dados nativos;
nenhum PNG achatado substitui o documento.

Duas reproduções negativas do novo caminho regional foram corrigidas:

1. O capturador visual legado podia omitir uma folha secundária indisponível.
   A captura estruturada regional agora recusa esse resultado incompleto,
   inclusive quando a inclusão dos outros lugares é explicitamente desligada.
2. Um lugar futuro opaco podia ficar de fora de um mundo anunciado como completo.
   A política regional agora recusa dentro da transação, orientando atualizar a
   página. Não requisita os chunks desconhecidos nem regrava o registro opaco.

Essa regra estrita pertence ao opt-in regional. O comportamento dos formatos
legados e da captura visual pública foi conservado. O orçamento do jogo ainda
é de 16 mapas ligados; o contêiner portátil conserva seu limite independente.
Não há leitura de mundo vazio, mas a abertura continua buscando os chunks
armazenados: não é carregamento sob demanda ou qualificação de heap/latência.

## Evidências já executadas

- Suíte completa: **2.728 aprovados, zero falhas/omissões**, 35.345 asserções,
  252 arquivos, 186,97 s; três controles Pygame reais com vídeo `dummy`.
- Focados: **50 aprovados**, 195 asserções, sete arquivos.
- Quatro ensaios novos de Chromium passaram em desktop/CPU 4×. Incluem
  persistir, capturar, gerar o arquivo nativo 8, fechar a página, decodificar
  em outro contexto, importar em outro banco e capturar novamente.
- A Vila real conserva seis recursos, 16 camadas de peças e 18 camadas no total,
  dois tilesets, conjunto, portas de ida/volta e origem negativa. Cada mapa tem
  extensão lógica de 100 milhões de casas, sem alocar suas lacunas. O arquivo
  reexportado foi exatamente igual ao recebido em cada ensaio.
- O caso futuro usa uma única transação, faz zero leituras do chunk desconhecido
  e conserva o registro opaco. Há recibo negativo anterior à correção.
- Matriz final: **51 ensaios de persistência e 12 Pinta–Estúdio aprovados**, sem
  retry, além da execução focada dos quatro novos. Os 12 percorrem os formatos
  públicos anteriores, incluindo atualização que conserva a programação.
- Tipos completos Pinta/Estúdio, lint dos 13 arquivos e whitespace aprovados.
  Origem causal e leitor de versões de recursos emitem JavaScript idêntico ao
  pai; a ampliação desses dois helpers é somente de tipos. Hashes em `emission.json.gz`.

As primeiras fixtures confundiam a camada de grupo com a de peças, contavam
16 camadas totais em vez de 16 de peças e usavam um ID exato onde se pretendia
simular ambiguidade de nome. Os logs dessas falhas são separados das duas
reproduções de produto. Houve também correções de tipos de implementação/fixture
e, depois da suíte, somente formatação de teste e inclusão do anexo do navegador.

Os arquivos `vila-regional-*.pinta.json.gz` são os pacotes efetivamente gerados
nos dois perfis; descompactá-los permite conferir o contêiner com o decoder
privado 8 deste código. A interface pública ainda não importa esse formato.
Recibos e hashes ficam em `index.json`.

Sem alteração visual ou funcional 3D, implantação, login, motor externo novo
ou teste em outro aparelho físico. CPU 4× é emulação nesta máquina. A prova é
do transporte nativo interno; não atesta execução de cena 4 no Estúdio ou
exportação regional em Tiled/Phaser/Pygame/Godot. Inventário parcial da nuvem e
rollout continuam pendentes, assim como o restante da missão.
