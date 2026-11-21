# Camadas por regiões — 21/11/2026

Base `ed3b3a24bb8a225ed7aafafc3f7dca232706fc28`. Primeiro sublote do item 3
dos consumidores. Formato 8 e protocolo físico 3 continuam sem ativação pública.

## Implementação e revisão

Criar camadas num mundo regional usa uma coleção vazia de chunks, sem reservar
um vetor da extensão lógica. Grupos, objetos e peças compartilham o teto atual
de 32 camadas. Remover, reparentar, reordenar e alternar frente, visibilidade e
colisão conservam os buffers, IDs e metadados não editados. Trocar folhas mantém
compatibilidade, travas herdadas e o vínculo explícito ao tileset principal em 8.

O cabeçalho é extraído sem enumerar células ou objetos. A edição densa conserva
sua normalização; a comparação deixa de serializar o payload da camada. No ramo
regional, a mesma admissão do leitor estrito conserva defaults explícitos,
offsets assinados/fracionários, parallax e propriedades, ou recusa a mudança
inteira. Destrancar ou remover um campo opcional não remove os demais defaults.
A revisão trocou a construção por `Omit` por uma cópia tipada que remove/reinsere
o vínculo, mantendo a ordem do caminho legado sem suprimir erros do compilador.

Não há painel novo, estilos ou expansão de limites. Os controles existentes
continuam usando os mesmos comandos. Os métodos achatados ainda não foram
promovidos para documentos regionais: seus consumidores e adaptadores seguem
na sequência, sem alocar mapas gigantes como solução intermediária.

## Provas

Oito regressões novas e 45 testes direcionados passaram, com 213 asserções.
As quatro falhas iniciais demonstram perda de defaults, recorte de offsets,
serialização de células ao editar cabeçalhos e recusa de camada regional vazia.
Também são cobertos remoção de campos, hierarquia/ciclos, origem, frente, colisão,
troca de folhas, compatibilidade, travas herdadas e reabertura pelo codec 8.

O laboratório compara os três módulos históricos reais com os atuais. Nos três
perfis Chromium, o ramo antigo reproduz as perdas e deixa somente uma camada no
mundo grande; o atual cria 32 camadas sem preencher o mundo, conserva metadados
e recusa patches inválidos. Treze estados densos por perfil têm os mesmos JSONs,
com apenas os IDs gerados normalizados para a comparação. São 39 comparações de
estados legados; os IDs e vínculos também são conferidos nos testes de operações.

O servidor de QA recebeu uma seleção explícita de laboratório, reutilizando a
compilação dos módulos anteriores. Seu caminho padrão de memória foi repetido
nos três perfis. Mais 33 percursos da oficina exercitaram pixels, teclado,
ponteiro/toque, terrenos, biblioteca, propriedades, grupos, modelos, desfazer e
reabertura. Total: 39 ensaios sem retries. Esses fluxos públicos continuam densos;
o laboratório de regiões não simula um store público 8.

Suíte final: 2.608 aprovados, três controles Pygame omitidos pela configuração
comum, zero falhas e 29.915 asserções em 231 arquivos (177,36 s). Pygame não foi
repetido neste lote. Tipos completos do Pinta/Estúdio, Biome de 11 arquivos e diff
passaram. Os recibos e hashes das fontes estão no índice.

## Alcance

Não há qualificação nova de heap, latência global, motores externos, IO ou
dispositivos físicos adicionais. Os perfis móvel e CPU 4× são emulações na mesma
máquina. O próximo sublote é o remapeamento de peças e seus consumidores,
incluindo a recusa do lote completo quando algum mapa não puder ser atualizado.
O documento regional ainda depende desses consumidores, do store e dos adaptadores.
