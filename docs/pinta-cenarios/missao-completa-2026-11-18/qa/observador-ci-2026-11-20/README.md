# Observador perdido durante a CI — 20/11/2026

A CI Linux 44741178796 continuou falhando no teste da marca de segurança da
prévia: nenhuma notificação do MutationObserver chegava. Instalar o observador
antes da montagem corrigiu uma lacuna de observação, mas não eliminou a falha.
Essa primeira tentativa não é apresentada como solução final.

A reprodução mínima observou um elemento vivo, atravessou uma tarefa, forçou
Bun.gc(true) e mudou seu atributo. Com Happy DOM 20.10.2, o controle sem coleta
passou e a variante com coleta falhou: o callback era mantido somente por WeakRef.
O defeito e sua correção constam da [issue oficial 2264](https://github.com/capricorn86/happy-dom/issues/2264)
e da [versão oficial 20.11.2](https://github.com/capricorn86/happy-dom/releases/tag/v20.11.2).

O override de QA fixa somente happy-dom em 20.11.2. O lock conserva todas as
outras versões, inclusive Playwright e tipos; instalação frozen aprovada. Foi
necessário reinstalar as ligações locais do Bun com --force porque o registrador
continuava apontando para a versão anterior. Nenhum timeout foi ampliado,
nenhuma asserção retirada e nenhum componente de produto alterado.

Depois: 43 testes focados aprovados, incluindo a regressão com coleta explícita;
grupo oficial de componentes completo com 591 aprovados, zero falhas, 68 arquivos
e 3.363 asserções; tipos completos do Estúdio com saída 0; Biome da raiz aprovado.
As verificações locais não substituem uma nova execução verde da CI Linux.
