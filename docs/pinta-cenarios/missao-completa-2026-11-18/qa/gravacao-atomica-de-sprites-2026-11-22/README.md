# Guarda atômica do inventário — 22/11/2026

Base: `76717ed637357e9de7bae0d7bfa7ec451c194572`.

## Defeitos reproduzidos

1. O caminho incremental de sprites consultava chaves antes da gravação. Um
   consumidor incompatível criado nesse intervalo escapava da proteção: remover
   uma animação podia sobrescrever a arte viva usada pelo mapa novo. A reprodução
   unitária conservou o resultado antigo das chaves e inseriu o consumidor antes
   do write. A prova de navegador pausa essa resposta e grava o mapa em outra aba.
2. A leitura completa da galeria requisitava linhas de chunks por estarem no
   inventário, inclusive quando o codec não entendia seu cabeçalho. A reprodução
   Chromium registrou duas buscas de chunks futuros, apesar da recusa do mapa.
3. Medições candidatas entravam no cache que o warmup usava como confirmado.
   Falha de disco com timestamp reutilizado podia produzir recusa indevida de
   um backup que realmente cabia. Uma segunda reprodução isolou a causa: antes
   do commit, o warmup já alterava o total confirmado para o tamanho candidato.

Os quatro recibos negativos distinguem a corrida, o restauro após falha, o
warmup especulativo e a leitura de payload futuro. Não são testes de motores
externos ou novos formatos públicos.

## Correção e revisão

O IO existente aceita um observador de chaves executado dentro da mesma
transação `readwrite` que fará os puts. Antes de qualquer payload, o escritor
decide se pode manter a escrita incremental ou precisa resolver a autoridade
completa. Novos IDs desconhecidos do inventário também forçam essa resolução.
Assim, uma aba não consegue introduzir um consumidor entre a classificação e
o commit. Cópias, avisos e origem causal continuam usando o caminho existente.

O inventário inicial exclui as linhas físicas de chunks. Chunks só são requisitados
pelas referências validadas pelo codec; referências repetidas não geram pedidos
duplicados. Protocolos futuros ficam intactos e sem busca de seus chunks. Falha
de inspeção ou escrita aborta a transação, em vez de cair em um write sem guarda.
Os espelhos 0–7 continuam completos; isso não implementa carregamento sob demanda
de todos os dados legados ou elimina o custo de seus buffers inline.

A quota separa resumos candidatos e confirmados. Tickets numéricos por snapshot
são publicados no inventário só depois de uma gravação aceita; não retêm raízes
de artes em mapas fortes. Recusa/abort invalida os candidatos, e um fork semeia
o cache a partir da autoridade efetivamente confirmada. O carimbo de horário
sozinho não transforma uma medição não gravada em conteúdo confirmado.

Essa separação mantém o encoder/RLE real e a régua de 32 MiB. O caso de fronteira
confere o JSON efetivamente exportável. A galeria normal de sprites continua
incremental: a verificação de nomes não exige reler o payload dos demais itens.

Um teste antigo dependia do mock de `setMany` guardar a própria referência do
objeto, algo que o IndexedDB real não oferece. Ele agora verifica diretamente
que o carimbo não copia o desenho e compara os dados clonados no disco. O teste
de 500 itens exige 50 transações e 50 leituras de payload para 50 autosaves;
a régua anterior contra a releitura de toda a galeria foi mantida.

## Evidências

- Suíte final: **2.713 aprovados, zero falhas/omissões**, 35.264 asserções,
  249 arquivos, 180,65 s; três controles Pygame reais com vídeo `dummy`.
- Focados: **90 aprovados**, 382 asserções, seis arquivos. Quatro casos novos
  cobrem consumidores futuros em autoridade/espelho, falha com timestamp igual
  e separação entre projeção e total confirmado durante o warmup.
- Chromium: **43 aprovados sem retry**, em desktop/CPU 4× emulada. A corrida
  envolve duas abas e uma resposta de chaves antiga deliberadamente suspensa.
  O leitor antigo passou de duas buscas de chunks futuros para zero. A galeria
  de 500 sprites faz dez autosaves lendo somente os dez payloads editados.
- Tipos completos do Pinta/Estúdio, lint dos dez arquivos e whitespace aprovados.

A primeira suíte passou 2.712 casos antes da reprodução adicional de warmup;
depois da correção a suíte inteira foi repetida. Quatro falhas de produto têm
recibos negativos. Os primeiros ajustes de fixtures trocaram uma comparação
com símbolo de origem por comparação dos dados e removeram a identidade de
objeto que só existia no mock. Esses logs intermediários não foram conservados.
Os recibos finais, reproduções e hashes estão em `index.json`.

## Alcance

Corrige o caminho público 0–7 deste código e verifica os controles privados 8.
Não modifica JavaScript histórico já carregado. Inventário parcial de nuvem,
fábrica/host regionais, adaptadores e rollout continuam pendentes. Formatos
públicos: nativo 7, físico 2, cena 3/PNG 4 e nuvem 6. Sem alteração visual ou 3D.
CPU 4× é emulação nesta máquina; sem novo teste autenticado ou dispositivo físico.
