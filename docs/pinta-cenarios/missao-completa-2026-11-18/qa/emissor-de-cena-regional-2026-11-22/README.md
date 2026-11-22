# Emissor de cena regional — 22/11/2026

Base `f3466d1b6`. O conversor privado `exportPintaRegionScene` produz JSON de
cena 4 pelo codec nativo compartilhado, sem materializar os espaços vazios.
Reutiliza o preparo de folhas, arte, animações e versões do exportador anterior.
A API pública mantém cenas 1–3; host, PNG e runtimes não selecionam 4 neste lote.

## Contrato e revisão

Cada documento conserva 32 camadas e 2.048 chunks/4 MiB de índices. Cabeçalhos
de todos os documentos regionais são conferidos antes de ler payloads. A soma
de índices respeita o teto derivado de 8 MiB de JSON. Conjuntos densos anteriores
podem ser convertidos na fronteira, sem alterar o documento original. Metadados
são medidos na estrutura exata da cena antes de clonar objetos/codificar células;
o arquivo final inclui imagens e strings base64 repetidas no orçamento UTF-8.
Não são novos tetos de memória total ou metas de latência.

O retorno separa `scene` (memória decodificada) de `json` (transporte), com a
contagem exata de bytes. Serializar diretamente a memória não é o protocolo.
Referências ausentes e campos nativos futuros recusam a cena completa. IDs,
camadas, propriedades, conjuntos, versões privadas e animações são conservados.
O mapa admitido é capturado antes das operações assíncronas de imagem.

A revisão encontrou uma distinção necessária: mudar armazenamento não pode
ativar física precisa em mapas legados. O emissor declara `physics` como
`legacy` ou `precise`, conforme os mapas autorais. O leitor mantém compatibilidade
com as primeiras cenas 4 privadas sem esse campo e recusa a combinação explícita
de física legada com colisões personalizadas. Os futuros motores devem honrar
essa escolha; ainda não há prova de execução de jogo regional neste lote.

## Evidências

- **3.215 testes do Core**, 160.357 asserções e 200 arquivos; **2.738 testes
  do Pinta**, 35.374 asserções e 253 arquivos, em 208,27 s. Zero falhas/omissões,
  com os três controles Pygame reais (`SDL dummy`). **30 focados**, 140 asserções.
- **69 ensaios Chromium**, sem retry: 57 da matriz de persistência e 12 de
  Pinta–Estúdio. Tipos completos Core/Pinta/Estúdio, lint dos oito arquivos
  alterados de código e whitespace aprovados.

A comparação executa o exportador do commit base e o atual com os mesmos dados:
**98 cenas com JSON idêntico**, cobrindo versões 1/2/3, transformações, opacidade,
frente, propriedades, snapshots e os dois mapas reais da Vila. O script e os hashes
estão nos recibos. Os testes de admissão verificam cabeçalho tardio inválido,
excesso agregado, metadados e imagens, incluindo zero leituras de payload antes
da recusa de cabeçalhos/orçamento. Uma alteração no mapa durante o callback de
imagem não modifica células, objetos ou nome do snapshot exportado.

Os novos ensaios Chromium usam o produtor real e seus encoders de arte, abrem
todos os PNGs e reabrem o JSON em outra página. Arquivos `vila-scene4` anexados
contêm as imagens reais: 18 camadas, duas folhas e um conjunto, com origem
negativa e extensão lógica 10.000². Desktop e CPU 4× são perfis desta máquina.
Não são ensaios em outros dispositivos nem provas gráficas do renderer de cena 4.

Sem alterações visuais ou funcionais 3D, implantação, nova homologação com login
ou ferramentas externas regionais. Permanecem ativos nativo 7, físico 2, cena 3,
PNG 4 e nuvem 6. PNG 5, render/colisões dos motores, integração pública e proteção
do inventário parcial da nuvem continuam necessários antes da promoção.
