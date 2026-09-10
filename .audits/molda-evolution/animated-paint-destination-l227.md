# Lote 227 — destino da cópia na oficina, com pintura animada

Estado: implementado, revisado e verificado, 10/09/2026.
Design: `docs/plans/2026-09-10-molda-animated-paint-bridge.md`. Público/cloud continuam v1.
Terceiro e último incremento da frente: contrato (225), consumidor (226) e oficina (227).

## Escopo

A gravação `animatedPaint` existia no encoder desde o lote 225 e ninguém na oficina
conseguia pedi-la. Este lote dá à criança a escolha, e faz a escolha atravessar o worker
com a mesma validação estrita do resto do protocolo.

## Decisões

- **O destino faz parte da IDENTIDADE do pedido**, não é um parâmetro solto: entrou no
  `SceneGlbToken`, ao lado de documento e revisão. Uma resposta preparada para a outra
  gravação é recusada em `readSceneGlbReply`, como já acontece com outra criação ou revisão.
- **Trocar o destino descarta a cópia preparada.** Consentimento não atravessa gravações:
  a criança leu um relatório de mudanças daquela cópia, não de outra.
- **O padrão continua sendo o arquivo portátil.** Quem só quer baixar o `.glb` não vê
  nada diferente do que via, e a pintura animada segue avisando que fica parada.
- Duas opções com nome do que fazem, não do formato: "Para outros programas" e
  "Para o Estúdio", cada uma com uma linha explicando a consequência real.

## Implementação

- `sceneGlbProtocol.ts`: `animatedPaint` no token, lido com `v.boolean`, presente nas listas
  exatas de chaves de pedido e das três respostas, e conferido na identidade da resposta.
- `sceneGlbRequest.ts`: campo nas listas estritas do empacotador e do leitor de transporte.
- `sceneGlb.worker.ts`: repassa a escolha ao `encodeSceneGlb`.
- `useSceneGlbExport`: `prepare(animatedPaint)`; o dono da exportação carrega o destino.
- `SceneGlbExportPanel`: grupo de rádios com alvo de 44 px, dentro de `fieldset`/`legend`,
  e cancelamento da cópia pendente ao trocar. Copy nova em `core/copy.ts`.

## Revisão

- `sceneGlbReply` montava a resposta campo a campo, não por espalhamento, e por isso
  entregava uma resposta sem o destino: a suíte do worker reprovou em quatro casos antes
  da correção. É exatamente o efeito que a identidade estrita deveria produzir.
- Os tipos apontaram todos os chamadores (sete arquivos de teste) em vez de deixar um
  pedido antigo passar com o destino ausente valendo `false` por omissão.

## Provas

- Painel: preparar no destino de arquivo mostra "a pintura animada fica parada no primeiro
  quadro" e exige consentimento; trocar para o Estúdio some com a cópia e o consentimento;
  preparar de novo não tem nenhuma conversão com aviso e o botão de baixar nasce liberado.
- Protocolo: resposta de progresso e de erro com o destino trocado são recusadas, e a
  resposta com o destino certo passa.
- Focal 27/0 nos quatro arquivos de exportação; integral **2.814/0**, 378 arquivos,
  166,47 s, **zero avisos act nesta execução**; tipos e Biome passaram.
- Vite 1,36 s; Three 579,29 kB mantém o aviso, teto não aumentado.
  Kids: tipos 0, build 7,1 s, 59 páginas.

## Limites

- A oficina ainda entrega a cópia como download. Levar a criação direto para a biblioteca
  do Estúdio depende de rotear o `studio-library` para o documento v2, que é a integração
  pública e vem na frente seguinte.
- Sem browser conectado: os rádios, o foco e o toque não foram vistos em tela real.
  Zero avisos act nesta execução não encerra a pendência histórica dos lotes 203 a 225.
