# Recuperação local diante de formatos futuros — 21/11/2026

Base: `505c0a21a0912368f8d280a3d0238cbb6e7ece96`.

## Problemas reproduzidos

Uma aba com RAM compatível apenas recusava salvar se a autoridade do mesmo ID
passasse a um formato ilegível. Sua edição não ganhava recuperação persistente.
Em outro caso, um mapa futuro sob outro ID permanecia intacto, mas uma aba podia
remover/reindexar peças de sua folha viva, quebrando indiretamente suas referências.
As duas reproduções negativas estão no recibo `future-recovery-red.log.gz`.

## Correção e revisão

A transação existente agora conserva os originais e recupera o lote inteiro
em cópias, usando `planImport` para religar seus elementos. A mesma exceção de
conflito já tratada pela oficina informa a cópia **depois** do commit. Falha de
quota/disco aborta cópias, espelhos e metadados juntos. Exclusão de um possível
consumidor desconhecido é recusada, em vez de apagar a arte e esperar recuperação.

Uma cópia criada sob esse isolamento pode continuar sendo editada sem duplicar
a cada autosave enquanto o inventário ilegível permanecer exatamente igual.
O selo compara IDs e revisões opacas em ordem estável, separado por capacidade
de leitura e banco/perfil. Não usa hash ou horário como permissão. Mudança em
qualquer revisão, inclusão/remoção de documento ou troca de leitor revoga a
exceção. O registro compartilhado evita repetir todo o inventário por cópia.

Sem revisão autoritativa, com metadados excessivos ou registro inválido/futuro,
nenhuma exceção é concedida: a edição volta a ser isolada; o registro desconhecido
é conservado. Campos com getters não são executados pelo leitor do selo.
O envelope físico 2 conserva o selo ao codificar/decodificar chunks. A lápide
também o conserva; uma restauração deliberada continua distinta da RAM antiga.

A revisão identificou dois ajustes nas provas: o mock unitário de IO conserva
envelopes lógicos 1, portanto não prova sozinho a gravação física 2; o teste passou
a exercitar o codec real e o navegador verifica o IndexedDB. Uma restauração por
spread conservava a origem pré-exclusão; foi corrigida para importação deliberada
na instância que observou sua própria lápide, mantendo o guarda contra RAM antiga.

## Alcance

Esta correção protege leitores **que contêm este código** e o inventário completo
da transação local. Não altera JavaScript histórico já carregado em outras abas.
Os testes de formato futuro injetam envelopes opacos: não demonstram publicação
ou edição pública do nativo 8. Inventário parcial de nuvem e rollout dos novos
contratos continuam exigindo suas próprias provas. Os formatos públicos seguem
nativo 7, físico 2, cena 3/PNG 4 e nuvem 6. Sem mudança visual ou funcional 3D.

## Evidências

- Suíte completa: **2.688 aprovados, zero falhas/omissões**, 35.164 asserções,
  247 arquivos, 179,04 s; inclui três controles reais Pygame com vídeo `dummy`.
- Focados: **61 aprovados**, 270 asserções, quatro arquivos. Dez testes novos
  cobrem recuperação, referências, falha/retry, exclusão/restauração, revogação,
  perfis e recusas conservadoras. Os controles anteriores preservam seus originais.
- Chromium: **24 aprovados sem retry**: três provas novas, sete controles de
  autoridade local e 14 percursos de chunks em desktop/CPU 4× emulada. A prova
  nova fecha a aba original, reabre a cópia física e salva novamente; a oficina
  real adota a cópia, permite outro gesto e a reabre com as células esperadas.
- Tipos completos dos dois pacotes, lint dos oito arquivos e whitespace aprovados.

O primeiro ensaio ampliado teve duas falhas das fixtures descritas acima; seu log
intermediário foi sobrescrito. O recibo negativo original com as duas falhas de
produto, a primeira passagem parcial e a passagem final ficam arquivados.

Os recibos e hashes em `index.json` distinguem testes unitários, navegador com
IndexedDB real e controles históricos. Não há nova homologação em staging,
motores externos, aparelhos físicos adicionais ou com crianças neste lote.
