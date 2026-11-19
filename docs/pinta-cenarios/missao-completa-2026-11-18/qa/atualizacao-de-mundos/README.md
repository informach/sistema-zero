# Atualização dos mapas ligados

Verificação local de 18/11/2026. O Pinta e o Estúdio conservam a interface existente.
O harness usa os componentes e adapters reais, com perfil sintético e `/api/` desconectada.
As capturas mostram a homologação sintética, sem dados da conta disponibilizada pelo usuário.

- [Testes do Estúdio](studio-tests.log): 29 testes principais em cinco arquivos, 6.251
  asserções no processo principal; os wrappers executam ainda 83 casos de sincronização e
  23 da biblioteca pessoal em processos isolados. Incluem ciclos, nomes ambíguos, destinos
  ausentes, propriedades tipadas, camadas ocultas, portas em conjuntos, 16/17 mapas,
  cancelamento, troca de perfil e autoria, remoção, quota, falha física do disco e nova tentativa.
- Tipos completos [do Estúdio](studio-typecheck.log) e [do Pinta](pinta-typecheck.log):
  comandos concluídos com código 0. [Perfil do runtime](profile-check.log): verificado.
- [Integração no navegador](browser.log), [relatório](browser.json): seis testes aprovados,
  nenhuma falha ou retry, 94,26 s incluindo build. A porta configurada depois do envio
  acrescenta a cabana ao jogo existente. Arquivos, IR e o estado completo dos blocos conservam
  a programação, inclusive IDs e posições. As regressões cobrem atualização pelas peças,
  importação do mundo, documento 6 autocontido e falha síncrona no segundo `put`.
- [Phaser real](phaser.log), [relatório](phaser.json): três testes aprovados, 8,60 s incluindo
  geração e servidores. O pacote portátil renderiza a Vila de 18 camadas, anima, anda, colide,
  desenha a frente e atravessa portas. Um caso adicional confronta nome do material e ID
  da cena, conservando a escolha por nome e resolvendo a porta tipada por ID.
- [Exportadores](export-tests.log): 12 aprovados, nenhuma falha; uma prova nativa opcional
  de Pygame foi omitida. Compilar o Python nesse comando não equivale a executá-lo no motor.
  Tiled e Godot não foram novamente abertos neste lote; seus adaptadores não mudaram.
- [Tamanho do player](runtime-sizes.json): medido dentro dos tetos absolutos existentes,
  sem ampliar limites ou carregar o cenário em jogos que não o usam.
- [Player e composição no host](player-tests.log): 33 testes aprovados em três arquivos,
  6.284 asserções, incluindo as variantes de carregamento e o limite de 15.500 caracteres
  adicionais. Esse comando repete os casos de runtime presentes no comando focado acima.
- [Biome](biome.log): 22 arquivos conferidos; código, configuração e relatórios formatados.

## Reproduções antes da correção

[Mundo ligado](world-red.log): sobre a base `a168d9c11`, três casos falhavam: o destino
novo não chegava aos jogos e as recusas por destino ausente ou orçamento não eram atômicas.
[Lookup original](runtime-red.log): quatro falhas nos dois motores JavaScript reproduzem a
imagem comum que bloqueia o mapa e a porta tipada que escolhe o nome em vez do ID.

[Compatibilidade de texto](legacy-red.log) e [ordem do fallback](fallback-red.log): duas
falhas em cada reprodução impediram que a correção alterasse destinos antigos. Textos e
blocos antigos conservam sua busca; a precedência de ID é explícita nas referências tipadas.
[Falha física](disk-red.log): uma falha de quota mantinha os bytes, mas ficava sem aviso e
consumia a atualização. A correção conserva o marcador, comunica a recusa e permite tentar
novamente no próximo foco. Todos esses casos estão aprovados no comando final.

O servidor auxiliar do Pinta também reproduziu timeout de 120 s com Bun. Executar o mesmo
script pelo Node 24 iniciou o servidor e permitiu completar os testes. A configuração passou
a usar esse intérprete, já presente na CI; não foram ampliados tempos nem retirados testes.

## Limites da evidência

Essas provas são de Chromium nesta máquina, incluindo Phaser executado no navegador.
Não são homologação autenticada do build novo, outros aparelhos físicos ou testes com crianças.
A CI remota de `a168d9c11` falhou no lint global (156 erros), na fronteira do Arquipélago e
no ensaio de travamento da prévia do Estúdio. A implantação do leitor não foi comprovada;
a escrita de nuvem 5 permanece desativada. O ciclo autenticado e os demais itens da missão
continuam no [plano principal](../../plano.md), incluindo mapas ligados no caminho Python.
