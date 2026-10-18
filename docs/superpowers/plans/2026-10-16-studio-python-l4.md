# L4 — Python visual e Turtle portátil

Implementação autorizada em lotes, revisão independente entre fatias. Commit/merge somente ao terminar L0–L8. Os contratos normativos são a proposta JavaScript/Python e o anexo Turtle. Nenhum recurso desta etapa está anunciado no produto ainda.

## Decisão de implementação

O CPython 3.14.2 separa explicitamente `TurtleScreenBase` da geometria e da animação, para portar Turtle a outro toolkit. Aproveitar essa fronteira: preservar a lógica Python licenciada de vetores, navegação, caneta, formas, tartarugas, subclasses, aliases e animação; substituir a interface Tk por um backend Canvas próprio. Não emular/importar um falso módulo global `tkinter`, nem alterar o programa do aluno. A distribuição deve identificar claramente o derivado e carregar a licença original.

Vendor upstream fixado por SHA, receita de derivação determinística e verificável; alterações estruturais restritas/documentadas, falhando se a referência mudar. A interface de desenho é um protocolo de dados limitado, com IDs e operações de cena retida; Python mantém a geometria. O frame valida cada lote, conserva recursos sob quotas e responde à única chamada suspensa. JSPI e scheduler único já qualificados no L0; eventos entram por fila e são despachados no fluxo Python, incluindo atualizações reentrantes. Não há segunda avaliação concorrente.

## Fatias

1. **Contrato e núcleo Turtle:** fixar fonte/licença, gerar manifesto de nomes/proprietários/assinaturas/defaults/aliases contra CPython; derivar engine sem Tk; backend Python com limites e transporte injetável. Conformance desktop para geometria, desenho, clones, erros e scheduler; anotar diferenças de texto/tamanho de viewport. Não usar mocks para afirmar conformance gráfica.
2. **Renderer e integração real:** Canvas retido, eventos/foco/hit testing, PNG/GIF estático, texto, lifecycle e quotas. Montar módulo somente quando extensão aprovada estiver instalada. Protocolos separados de comandos arbitrários; parar cancela recursos antes do ACK. Usar mesmo frame/provider do player/editor. Chrome/Edge e CPython/Tk reais, jogos completos e variantes de áudio explícitas.
3. **Linguagem Python:** IR própria e catálogo de Programação; AST/tokenização CPython em worker de análise, limites/cancelamento/identidade. Preservar comentários, Unicode, aliases, fonte opaca e erros; gerar Python normal e mapas por arquivo. Não traduzir JS nem executar a fonte no parser.
4. **Blocos e Ponte:** codecs de quatro direções, famílias completas de §7.1, classes simples e erros; Turtle extensão irmã opcional. Atualização localizada não destrutiva, curadoria/nível e dependências pedagógicas. Revisão da seleção inicial e exemplos sem Turtle.
5. **Integração documental:** leitor clássico Python, promoção Pro, extensão/remoção explícita, catálogo aprovado e snapshots; ativar writer/store/UI apenas quando todas as variantes e regressão JS estiverem prontas. Completar gates cruzados L1/L2/L3.

## Aceites e limites

### Persistência durante a geração assíncrona da Ponte

O workspace visual em edição é um rascunho ligado ao arquivo e à fonte exata de origem. Cada gesto grava esse rascunho sincronamente na partição visual; a validação/geração CPython acontece em seguida, serializada por instância. A transação só promove a nova fonte quando a geração e a revisão ainda correspondem ao gesto atual. Salvar/sair durante a geração conserva fonte anterior e rascunho, sem inventar código síncrono ou depender de um worker sobreviver ao fechamento.

Um rascunho pendente compatível com a fonte impede executar, publicar, exportar ou promover silenciosamente a versão anterior. Reabrir oferece restaurar as alterações visuais ou descartá-las explicitamente; nunca executa o cache visual, nem substitui a fonte automaticamente por conteúdo importado. Uma edição concorrente da fonte invalida o rascunho anterior. Rascunhos soltos/incompletos permanecem recuperáveis, com diagnóstico, sem gerar valores padrão silenciosamente. A UI precisa registrar os gestos na store antes dos flushes síncronos existentes.

Após a confirmação, a mesma estrutura passa a `pending:false`, vinculada à nova fonte exata. Conserva posições, comentários e conexões; não impede execução/exportação. A reabertura só reutiliza esse cache confirmado se a AST visual inteira corresponder à fonte reanalisada. IDs/ranges Python são reatribuídos fora do histórico Blockly após cada confirmação e copiados apenas no snapshot salvo; Undo/Redo não ressuscita intervalos antigos. Texto incompleto em campos é preservado e validado ao gerar, separadamente da validação estrutural do workspace. Enquanto houver rascunho pendente em um arquivo, um gesto visual em outro arquivo é recusado com indicação do arquivo pendente, preservando ambos os códigos.

- Fonte e recursos idênticos web/desktop; saída/estado/retorno/exceções comparados, não apenas ausência de erro.
- Todos os nomes anunciados no catálogo têm fixture e assinatura; APIs Tk, widgets, PostScript, undo e transformações avançadas permanecem fora do contrato com diagnóstico explícito.
- `turtle.py` autoral é preservado e sombreia o módulo como em CPython; não certificar portabilidade por heurística.
- Limites de cena, imagem, fila e mensagem validados fora do worker não confiável. Registro de shape não aceita URL arbitrária. Todos os efeitos pertencem à geração.
- As provas locais não qualificam o computador de 8 GB, vídeo em aula ou aparelhos físicos. Esse teste externo fica para o final por instrução do usuário.
- L4 não substitui L5–L8: LSP, Pinta, admin/aulas/live, Mural anônimo para quatro variantes, exportação/Zappy e full review continuam obrigatórios.
