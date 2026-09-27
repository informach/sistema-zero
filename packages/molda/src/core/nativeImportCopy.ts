/** Format-independent language for staging, review, original files and explicit replacement. */
export const NATIVE_IMPORT_COPY = {
  format: 'Formato do arquivo',
  formatHint:
    'Veja as letras no final do nome do seu arquivo. Trocar de formato descarta a preparação atual, sem mudar sua criação.',
  gltfFormat: 'GLB ou glTF',
  objFormat: 'OBJ e materiais MTL',
  bbmodelFormat: 'Blockbench (.bbmodel)',
  open: 'Trazer arquivo 3D',
  title: 'Trazer um modelo para a oficina',
  choose: 'Escolher modelo e arquivos',
  companions: 'Adicionar arquivos que faltam',
  folder: 'Escolher pasta completa',
  principal: 'Arquivo principal',
  readingFiles: 'Lendo os arquivos escolhidos…',
  validating: 'Conferindo o conjunto…',
  converting: 'Preparando a prévia para editar…',
  prepare: 'Preparar prévia',
  ready: 'Sua prévia está pronta para revisar.',
  cancelled: 'Preparação cancelada. Seus arquivos e sua criação continuam intactos.',
  changed: 'Sua criação mudou. Prepare uma nova prévia antes de confirmar.',
  interrupted:
    'A preparação foi interrompida. Você pode tentar novamente ao voltar para a oficina.',
  failed: 'Não consegui preparar esse modelo. Você pode escolher os arquivos novamente.',
  missing: 'Estes arquivos também fazem parte do modelo:',
  options: 'Opções de compatibilidade',
  optionsHint:
    'Mude apenas o que precisar. Cada mudança pede uma nova prévia; nada é adaptado escondido.',
  original:
    'Os arquivos no seu dispositivo não serão alterados. Guarde o conjunto original: informações extras, créditos e licenças do arquivo não ficam arquivados nesta criação. Respeite a autoria e as regras de uso do modelo.',
  originals: 'Arquivos originais',
  downloadOriginal: (path: string) => `Baixar original: ${path}`,
  downloadReport: 'Baixar relatório completo',
  downloadFailed: 'O download não começou. Tente novamente.',
  changes: 'O que foi adaptado',
  details: 'Detalhes técnicos do relatório',
  noChanges:
    'Nenhuma adaptação foi relatada para o conteúdo escolhido. A limitação de metadados acima ainda se aplica.',
  replace:
    'Ao confirmar, o conteúdo atual desta criação será substituído. Seu nome será mantido e você poderá desfazer.',
  accept: 'Revisei as adaptações e o aviso sobre os arquivos originais.',
  confirm: 'Usar modelo nesta criação',
  imported: 'Modelo trazido para a oficina. Você pode desfazer essa troca.',
  cancel: 'Cancelar preparação',
  close: 'Voltar à oficina',
  pendingPose: 'Guarde ou cancele a pose em andamento antes de trazer outro modelo.',
  preview: 'Prévia do modelo importado',
  previewHint: 'Arraste para olhar por outros lados. Esta prévia não edita sua criação.',
  frame: 'Enquadrar modelo',
  clip: 'Movimento da prévia',
  basePose: 'Forma inicial',
  play: 'Tocar movimento',
  pause: 'Pausar movimento',
  time: 'Tempo do movimento',
  previewUnavailable:
    'A prévia 3D não está disponível neste dispositivo agora. O relatório continua disponível.',
  visibleDetails: (count: number, total: number) =>
    `Mostrando ${count} de ${total} avisos. O download contém o relatório completo.`,
} as const
