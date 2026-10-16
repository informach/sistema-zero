# Bancada compartilhada — decisões de interface

Complementa a proposta aprovada; não reabre Electron, assinaturas individuais ou edição por IA. A execução consecutiva e as decisões de interface dentro desse escopo já foram autorizadas.

## Intenção

A pessoa responsável pelo marketing retoma uma pauta do calendário, confere a direção e pede uma alteração específica. Precisa distinguir rascunho local, revisão confirmada, alternativa e edição aprovada sem administrar arquivos ou comandos. A bancada deve favorecer leitura e comparação, com o pedido sempre próximo da peça selecionada.

Vocabulário do domínio: pauta, série, calendário, posicionamento, copy, slide, gravação, corte, referência, alternativa e aprovação. A assinatura da interface é o encadeamento visível **peça → versão/formato → componente → pedido → revisão**, com a seleção mantida ao abrir no desktop.

## Sistema visual e composição

Reutilizar os tokens do console do Sistema Zero e seus componentes compartilhados: fundo azul acinzentado, superfície branca de leitura, texto azul escuro, azul de ação, verde de confirmação e vermelho de erro. Não criar outra paleta. Tipografia sans do console para leitura, mono apenas para dados que precisem de alinhamento. Espaçamento em múltiplos de quatro, separação por bordas discretas, foco visível.

O planejamento é uma lista editorial com data, estado e formato; o calendário é outra projeção dos mesmos itens. A produção usa uma coluna de seleção de peças/componentes e uma área principal com prévia, contexto e pedido. Contadores aparecem junto do trabalho a que se referem. Não usar um painel de métricas como abertura da produção nem confundir um chat sem peça selecionada com histórico editorial.

Direção/fontes mostram origem, validade e distinção entre fato, interpretação e hipótese. O histórico relaciona autor, revisão e resultado; conflitos mostram as versões preservadas. As ações principais são Ajustar, Gerar alternativas e Adaptar formato. A seleção de uma alternativa e a aprovação final são decisões explícitas.

## Componentes e estados

- Navegação do projeto: contexto atual e permissões; não muda a seleção durante uma atualização de dados.
- Lista/calendário: leitura rápida de pauta e pendências; busca por título, texto, semana, formato e estado.
- Detalhe da peça: prévia legível e componentes identificados, sem exigir canvas ou timeline manual.
- Pedido: linguagem natural, provedor conectado e indicação de execução; na web abre o mesmo contexto no Electron.
- Feedback: carregamento, ausência de conteúdo, erro recuperável, pendência local, envio, conflito e confirmação são estados distintos. Falha não apaga o texto do pedido.
- Formulários: labels explícitos e componentes `@sistemazero/ui`; diálogos preservam foco e navegação por teclado. Campos de briefing e metadados não substituem a edição por IA das peças.

Web e Electron consomem o mesmo pacote de componentes. Adaptadores separam transporte BFF e cache/IPC, sem importar Electron ou código de servidor no pacote visual. Prévias pesadas, incluindo Remotion, carregam sob demanda.
