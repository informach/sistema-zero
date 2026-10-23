export const executionStateLabels = {
  queued: 'Aguardando desktop',
  running: 'Em produção',
  waiting: 'Aguardando ação',
  succeeded: 'Resultado confirmado',
  failed: 'Falhou',
  canceled: 'Cancelado',
} as const
export const capabilityLabels = {
  copy: 'Texto',
  research: 'Pesquisa',
  image: 'Geração de imagem',
  'image-edit': 'Edição de imagem',
  layout: 'Montagem da arte',
  'video-edit': 'Edição de vídeo',
  composition: 'Animação com IA',
  render: 'Renderização',
  transcribe: 'Transcrição',
  'prepare-media': 'Preparação de mídia',
  'video-adapt': 'Adaptação para vídeo',
  capture: 'Captura do Studio',
} as const
