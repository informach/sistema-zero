# Migração da aba IA para o Zappy

O Studio oferece um único assistente, configurado pela prop `tutor` com `StudioTutorAdapter`. O host continua responsável por autenticação, orçamento, histórico e transporte ao servidor. Abrir o assistente não envia uma pergunta nem inicia uma geração.

`AIProvider`, `AIRequestOptions`, `AIFreeFormRequest`, `ProjectContext`, `StudioAIConfig` e `features.ai` continuam aceitos/exportados para compatibilidade. `AIProvider`, `StudioAIConfig` e a feature estão depreciados. O resolvedor ainda conserva provider/model/allowUserKey para consumidores existentes, mas esses valores não habilitam uma segunda interface. Migre a interface do host para `StudioTutorAdapter`; não envie segredos como props.

A aba inferior IA e o item correspondente do menu foram removidos em todos os modos. Console, terminal e o botão Zappy conservam suas funções. Comandos internos antigos de abertura (`setBottomTab('ai')`, transição `setShowAI(false)` → `setShowAI(true)`) e `SettingsDrawer.initialSection='ai'` abrem o mesmo tutor autorizado. Sem tutor, a entrada fica indisponível. Não há fallback para mock, chamada OpenRouter direta ou formulário local de chave/modelo.

Valores antigos de configuração/chave não são apagados silenciosamente nem lidos pela nova interface. A configuração de credenciais da plataforma pertence ao host. O código do antigo AIPanel e os providers de biblioteca não fazem parte do caminho de renderização do produto; sua remoção física poderá ocorrer em uma mudança posterior de compatibilidade.
