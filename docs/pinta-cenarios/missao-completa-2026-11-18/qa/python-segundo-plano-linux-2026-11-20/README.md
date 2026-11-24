# Distribuição Linux com foco de segundo plano

A imagem e o guest vêm da qualificação Linux 44842695808, com fonte fixa
fb973c50fbf61fbca2cb955321e8aafca46c459c. O workflow 58cf486a7 preservou
os bytes exatos, incluindo o diretório da distribuição Python. A imagem passou
nos contratos nativos, Python e Three reais sem rede externa. O arquivo
imagem-ci.txt registra a execução; a imagem do registry foi lida novamente
e seu digest e configuração comparados ao arquivo qualificado.

O guest 28da7a969d5648eb590b51a362d3703dd87556388d813e75ae787839cd2f9a81
contém 126 arquivos e 25.972.606 bytes. Todos os tamanhos e SHA-256 foram
recomputados. Seus 110 arquivos lógicos são idênticos ao Windows f30ac696…;
somente 16 representações gzip diferem. As 32 representações dos dois pacotes
foram descompactadas e verificadas contra os originais. Não se trocou o guest
Linux por uma recompilação local.

O servidor local fixou esse diretório e hash. Passaram 22 casos Pygame/Pinta
no Chromium 159 e 88 compartilhados no Chrome do contrato Raylib, sem pulos,
retries, erros ou alteração de referências. Os casos novos executam os três
renderizadores, o piloto Python real, entradas e portas, retendo o foco do host.
As fontes executáveis permaneceram idênticas à qualificação Linux.

A promoção nativa em um serviço temporário de staging armazenou e verificou
128 objetos no R2, incluindo marcador e catálogo. Quatro leituras independentes
revalidaram marcador, catálogo, playtest e standalone. O serviço temporário e
sua chave local foram removidos; sua ausência foi confirmada. Nenhum seletor
de runtime, política ativa ou versão de escrita foi alterado nesta operação.

O promotor permanece igual ao anteriormente qualificado. O payload de
25.973.122 bytes é menor que os 26.007.007 da qualificação anterior. O workerd
local desta máquina havia falhado ao iniciar com spawn UNKNOWN; isso não foi
repetido e não se declara uma nova medição de pico de memória local. A prova
operacional desta rodada ocorreu no Worker e R2 reais de staging.

A primeira tentativa do cliente de promoção parou antes de enviar o request:
um bundle auxiliar antigo no cache ainda aceitava somente cinco capacidades.
O diagnóstico preservado mostra as quatro recusas da sexta capacidade.
O auxiliar foi recompilado das fontes atuais, sem alterar o protocolo,
o plano, o bundle remoto ou o formato; a captura passou e o request completo
recebeu HTTP 200. A tentativa anterior permanece registrada.

A política c6022c06247e4384bb036f80b9b4ddcc8d63135cdf7d0cae6a02fd1b2a8b2b0d
foi empacotada pelo comando oficial e carregada pelo leitor canônico. As duas
releases anteriores foram preservadas. A release nova é
2026-11-20-pinta-cenarios-5. O hash do arquivo empacotado foi conferido antes
do commit. Ela deve existir no leitor que servirá de rollback antes de ativar
o seletor 020d5f9945108dc2d6000c984f5d116cc527bb0909c2f651b63af1561d6b85c1.

Esta é a preparação inativa. Ainda faltam CI geral do commit de leitura com
essa política, implantação dos leitores, ativação coordenada, gravador novo,
repetição autenticada da Vila, publicação e conflitos entre clientes/rollback.
Os ensaios locais usam somente esta máquina. Não há prova de aparelho físico
adicional, criança participante ou conclusão da missão completa.

Os relatórios JSON foram normalizados pelo formatador sem alterar seus dados;
hashes.json identifica as cópias arquivadas. Os recibos de qualificação também
registram hashes dos relatórios brutos preservados no cache da execução.
