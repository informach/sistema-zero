# Destino visível da articulação, lote 133

Prévia inclui `twoBoneGuide` efêmero: IDs dos três apoios e cópia do destino
solicitado em mundo. Transformações continuam vindo apenas de `worldMatrices`.
Pose original, playback de chaves e documento não carregam essa guia; gravar não
serializa metadados visuais. Não há novo canal de viewport ou store de gesto.

## Arquitetura e revisão

- O desenho reutiliza `SceneSupportOverlay` com capacidade explícita de quatro
  pontos. A configuração padrão dos guias existentes é preservada. São 192 bytes
  de atributos de posição, não uma alegação sobre toda a memória do recurso.
- Três pontos/linhas mostram a articulação e um quadrado maior mostra o destino.
  A ligação ponta–destino explica visualmente alcance/flexão insuficiente. Texto
  no inspetor explica tamanho e ligação, sem depender só da cor.
- Destino é o valor pedido, não a ponta já limitada pelo solver. Exceder Float32
  omite apenas o marcador de destino; não recorta o número ou cancela uma pose
  que é desenhável. Os apoios ainda aparecem. Pontos de apresentação são próprios.
- Guias são visuais e não entram no picking de peças/alças; navegação não ganha
  capturas de ponteiro. Só aparecem no modo de animação, para a ponta selecionada,
  quando todos os apoios estão visíveis. Nenhum objeto escondido é revelado.
- Mudança só no destino precisa redesenhar mesmo quando todas as matrizes são
  iguais. Esse caminho atualiza somente a guia. Mesmos atributos/ranges/visibilidade
  não pedem upload nem render extra. Alterações normais de pose continuam no
  caminho de visibilidade existente.
- Reset/pose original, gravar/playback, nova revisão/miniatura, mudança de ponta ou
  modo retiram a guia. Blur e perda de contexto a escondem imediatamente; restaurar
  contexto não ressuscita a prévia antiga. Recursos próprios têm descarte idempotente.

Dois testes novos cobrem destino versus ponta limitada, ownership, ausência no
documento/playback, precisão de desenho, 120 poses, capacidade de buffers, versões
de upload e descarte. Um teste do viewport com Three real verifica destino sem
movimento de malha, ausência de RAF extra, revisões estrangeiras, reset, blur,
contexto, modo e seleção. Testes da oficina também verificam transporte e retirada
da guia ao editar campos.

Integral: **1.616 testes, zero falhas, 238 arquivos, 90,76 s**. Tipos e Biome/711
passaram. Vite/2,16 s: viewport lazy 112,07 kB e inspetor 16,57 kB; Three mantém
aviso >500 kB. Kids: compilação/14,9 s, tipos/26,1 s, 59 páginas/1.096 ms,
exit 0. Diff check passou. Suíte e builds executados sequencialmente.

Ainda sem arraste do destino em 3D ou homologação visual/GPU/toque/crianças. Guias
herdam a apresentação dos apoios existentes; tamanho/contraste real em ambos os
temas permanece parte da homologação pendente. Formato público continua 1.
