export const ptBR: Record<string, string> = {
  'app.name': 'Sistema Zero Studio',
  'app.tagline': 'Do bloco ao código. Da ideia ao sistema.',
  'app.loading': 'Carregando…',

  'mode.blocks': 'Blocos',
  'mode.bridge': 'Ponte',
  'mode.code': 'Código',

  'topbar.preview': 'Pré-visualizar',
  'topbar.save': 'Salvar',
  'topbar.saving': 'Salvando…',
  'topbar.extensions': 'Extensões',
  'topbar.export': 'Exportar',
  'topbar.convertPro': 'Virar profissional',
  'topbar.ai': 'IA',
  'topbar.rename': 'Renomear projeto',
  'topbar.projects': 'Meus projetos',
  'topbar.more': 'Mais opções',
  'topbar.theme': 'Mudar tema',
  'topbar.showPreview': 'Mostrar pré-visualização',
  'topbar.hidePreview': 'Ocultar pré-visualização',
  'topbar.group.file': 'Arquivo',
  'topbar.group.view': 'Exibição',
  'topbar.group.account': 'Conta',

  'tab.blocks': 'Blocos',
  'tab.code': 'Código',
  'tab.preview': 'Pré-visualização',
  'tab.files': 'Arquivos',

  'panel.console': 'Console',
  'panel.terminal': 'Terminal',
  'panel.ai': 'IA',
  'panel.preview': 'Pré-visualização',
  'panel.extensions': 'Extensões oficiais',

  'extensions.install': 'Instalar',
  'extensions.remove': 'Remover',
  'extensions.installed': 'Instalada',
  'extensions.available': 'Disponível',
  'extensions.loadExample': 'Carregar exemplo',
  'extensions.permissions': 'Permissões',
  'extensions.removeWarning':
    'Existem {count} blocos desta extensão em uso. Removê-la apagará esses blocos.',
  'extensions.confirmRemove': 'Confirmar remoção',
  'extensions.cancel': 'Cancelar',
  'extensions.empty': 'Nenhuma extensão instalada neste projeto.',
  'extensions.officialOnly':
    'Sistema Zero Studio só carrega extensões oficiais, revisadas manualmente pela equipe do produto.',

  'console.clear': 'Limpar',
  'console.empty': 'Sem mensagens. Use console.log para registrar algo.',
  'console.message': '1 mensagem',
  'console.messages': '{count} mensagens',

  'ai.placeholder':
    'Painel de IA está em modo de demonstração. A integração real chegará em fase futura.',
  'ai.sendDisabled': 'Disponível em fase futura',
  'ai.title': 'Assistente IA (prévia)',

  'project.newName': 'Meu projeto',
  'project.new': 'Novo projeto',
  'project.unsaved': 'Alterações não salvas',
  'project.saved': 'Salvo',

  'projects.title': 'Meus projetos',
  'projects.subtitle': 'Seus projetos do Sistema Zero Studio',
  'projects.new': 'Novo projeto',
  'projects.import': 'Importar',
  'projects.export': 'Exportar',
  'projects.duplicate': 'Duplicar',
  'projects.rename': 'Renomear',
  'projects.delete': 'Excluir',
  'projects.search': 'Buscar projeto…',
  'projects.empty': 'Você ainda não tem projetos. Crie o primeiro!',
  'projects.emptySearch': 'Nenhum projeto encontrado para essa busca.',
  'projects.confirmDelete': "Excluir o projeto '{name}'? Esta ação não pode ser desfeita.",
  'projects.newModal.title': 'Novo projeto',
  'projects.newModal.nameLabel': 'Nome do projeto',
  'projects.newModal.placeholder': 'Meu projeto',
  'projects.newModal.create': 'Criar e abrir',
  'projects.newModal.cancel': 'Cancelar',
  'projects.importError': 'Não foi possível importar: {reason}',
  'projects.importNotJson':
    'Esse arquivo não parece ser um projeto do Studio. Escolha um arquivo .json que você exportou aqui.',

  'editor.fontSize.increase': 'Aumentar fonte do editor',
  'editor.fontSize.decrease': 'Diminuir fonte do editor',
  'editor.fontSize.reset': 'Restaurar tamanho padrão',
  'editor.format': 'Formatar código',

  'bridge.advancedNotice':
    'Este código não é representável em blocos e foi marcado como Código avançado. Você pode continuar editando no editor de código.',

  'code.advancedBlock': 'Código avançado',

  'export.title': 'Exportar para publicação',
  'export.description':
    'Gera um arquivo ZIP pronto para publicar no Railway (o site mais o Dockerfile e o passo a passo).',
  'export.minify': 'Minificar o código (recomendado)',
  'export.proNote':
    'Projeto profissional: o build com a minificação roda no Railway durante o deploy.',
  'export.action': 'Exportar',
  'export.cancel': 'Cancelar',
  'export.working': 'Preparando o pacote…',
  'export.collecting': 'Reunindo os arquivos…',
  'export.minifying': 'Minificando…',
  'export.zipping': 'Compactando…',
  'export.error': 'Não foi possível exportar: {reason}',

  'convert.title': 'Transformar em projeto profissional?',
  'convert.body':
    'O projeto profissional usa um ambiente de verdade (TypeScript + npm + Vite), com vários arquivos e pastas. Você sai dos blocos e passa a editar só no Código. Esta ação não pode ser desfeita.',
  'convert.legacyTitle': 'Este projeto precisa virar profissional',
  'convert.legacyBody':
    'Este projeto tem {count} arquivo(s) além dos três básicos, que o modo Blocos e Ponte não edita. Quer transformá-lo num projeto profissional (Vite) para trabalhar com todos eles? Esta ação não pode ser desfeita.',
  'convert.confirm': 'Transformar',
  'convert.cancel': 'Cancelar',
  'convert.later': 'Agora não',
  'convert.working': 'Transformando…',

  'share.action': 'Compartilhar',
  'share.title': 'Compartilhar no Mural dos Criadores',
  'share.step.confirm.heading': 'Tudo pronto para publicar?',
  'share.step.confirm.intro':
    'Quando você publica, o seu projeto aparece no Mural para a comunidade ver e ganha um link para você mostrar para a família e os amigos jogarem.',
  'share.step.confirm.concluded': 'Meu projeto está pronto e funcionando.',
  'share.step.confirm.kidsLanguage':
    'Os textos do meu projeto estão em português e são adequados para todo mundo.',
  'share.step.confirm.irreversible':
    'A versão publicada fica salva no Mural do jeito que está agora. Se você mudar o projeto aqui depois, a do Mural não muda — são cópias separadas.',
  'share.step.describe.heading': 'Conte o que o seu projeto faz',
  'share.step.describe.help':
    'A gente preparou um rascunho para você. Leia, mude o que quiser e deixe do seu jeito (no máximo um parágrafo).',
  'share.step.describe.label': 'Descrição do projeto',
  'share.step.describe.placeholder':
    'Ex.: Um jogo de nave que desvia dos asteroides para fazer pontos.',
  'share.step.describe.generate': 'Escrever com ajuda da IA',
  'share.step.describe.regenerate': 'Escrever de novo',
  'share.step.describe.generating': 'Escrevendo…',
  'share.step.describe.failed':
    'Não consegui escrever sozinho agora. Sem problema: escreva você mesmo aí em cima.',
  'share.step.cover.heading': 'A foto do seu projeto',
  'share.step.cover.capturing': 'Tirando uma foto do seu projeto…',
  'share.step.cover.none':
    'Não deu para tirar uma foto automática deste projeto. Tudo bem, ele vai usar uma capa padrão no Mural.',
  'share.step.cover.retry': 'Tirar a foto de novo',
  'share.step.title.heading': 'Nome do projeto no Mural',
  'share.step.title.label': 'Título',
  'share.step.review.heading': 'Confira antes de publicar',
  'share.publishing': 'Publicando…',
  'share.success.heading': 'Publicado! 🎉',
  'share.success.body': 'Seu projeto já está no Mural dos Criadores.',
  'share.success.openMural': 'Ver no Mural',
  'share.success.openPlay': 'Abrir o jogo',
  'share.success.copyLink': 'Copiar link',
  'share.success.copied': 'Link copiado!',
  'share.error': 'Não foi possível publicar: {reason}',
  'share.cancel': 'Cancelar',
  'share.back': 'Voltar',
  'share.next': 'Avançar',
  'share.publish': 'Publicar',
  'share.retry': 'Tentar de novo',
  'share.close': 'Fechar',
}
