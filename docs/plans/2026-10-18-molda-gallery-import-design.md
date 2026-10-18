# Importar modelos pela galeria do Molda

Desenho aprovado: adicionar **Importar modelo** ao lado de **Criar novo**, usando os tokens e componentes da plataforma. Abrir a mesma preparação e prévia da oficina, com os formatos permitidos pelo nível da criança. Após a confirmação, salvar uma criação independente e abrir a oficina.

A preparação usa um documento temporário em memória. Cancelar não grava uma criação vazia. A confirmação passa pela fila de importação da galeria, que atribui identidade e nome únicos, valida e salva o documento nativo. Uma falha de armazenamento mantém o resultado em memória e oferece nova tentativa. O acesso respeita `files.import`; os formatos adicionais respeitam `files.interop`. A restauração de backups continua no rodapé.

Plano de implementação (a skill writing-plans não está instalada):

1. Acrescentar o botão secundário e um diálogo carregado sob demanda.
2. Reutilizar os painéis de importação com textos próprios para uma nova criação.
3. Retornar os IDs importados pela operação serializada para abrir o documento salvo sem releitura global.
4. Verificar importação real, cancelamento, falha e nova tentativa, permissões e preservação de modelos existentes; executar tipos, lint e fluxo no navegador.
