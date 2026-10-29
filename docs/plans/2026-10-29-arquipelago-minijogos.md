# Minijogo aprovado vira brinquedo da ilha (desafios-16)

Especificação e autorização: pedido da dona nesta sessão. Execução contínua em staging.
Arquitetura: cópia JSON serializada em tabela própria por jogador e desafio, porta HTTP pelo
gateway e BFF, player do Estúdio hospedado pela plataforma. O jogo compilado só pede a abertura.
Nada de código do Estúdio ou da plataforma importado pelo pacote do jogo.

- [x] Contrato de lista e cópia aprovada, repositório e migração gerada com Drizzle.
- [x] Aprovação principal guarda cópia, repetição substitui sem duplicar, suporte não grava.
- [x] Rotas próprias e de família com autorização de conta no serviço e portão do Kids.
- [x] Player acessível por cima do jogo, fliperama entregue e capa na tela existente.
- [x] Cartão dos pais esconde falha ou lista vazia; medição agregada com proteção de grupos.
- [x] Testes de serviço e Postgres local descartável, jogo, Kids e fronteiras da plataforma.
- [x] Conferência desktop e 390 px, prints, docs, revisão completa, commit e push em staging.

Limite de projeto: o mesmo `LIMITES_DO_DESAFIO.projetoCaracteres`, inclusive antes de chamar
o executor. Persistir o texto serializado evita que os espaços do JSONB mudem a contagem.
Primeira aprovação mantém a data para medição; substituição mantém somente a última cópia.
Desafios antigos sem cópia não podem ser reconstruídos: uma nova aprovação entrega a atração.
Nenhuma escrita remota de banco, alteração de .env, CI ou arte. Migração aplicada só em banco
local descartável; instalação em ambiente remoto fica para o fluxo de implantação.
