# Presentes e compras dentro da plataforma

Desenho aprovado na conversa de 19/11/2026. As duas etapas foram autorizadas para implementação. A identidade visual existente é obrigatória.

## Resultado

Dois blocos de aula (presente e compra), um componente reutilizável em páginas e cards e uma entrada de assinatura no Início da Área dos pais. A pessoa permanece na plataforma, utiliza a conta autenticada e informa somente os dados necessários ainda ausentes ou inválidos.

## Fronteiras

- Catálogo é a autoridade de oferta, preço, prazo, público e benefícios. O curso que contém o bloco é origem, não o produto entregue.
- Presente referencia uma campanha; a campanha é a autoridade da oferta presenteada. O editor permite escolher a oferta e filtra as campanhas compatíveis. A criação de campanha continua disponível no Admin.
- Referrals continua responsável por disponibilidade, política de repetição, histórico, atribuição e concessão retomável. O caminho autenticado vincula o resgate diretamente ao usuário, sem registrar outra conta.
- Funil continua responsável pelo checkout durável e pela confirmação via webhook. O caminho autenticado reutiliza cobrança, histórico e concessão, mas prende a compra à conta conferida pelo gateway.
- Member-shell fornece BFF e componentes compartilhados pelos apps Kids/adulto. Operações financeiras e resgates exigem conta adulta própria, sem sessão infantil ou impersonação.
- Apresentações na Área dos pais são configuradas no conteúdo comercial da oferta no Admin. Inicialmente o local configurável é o Início; o componente também pode ser montado em outras páginas sem outra implementação de checkout.

## Contratos de apresentação

Bloco `gift`: campanha/código, título, descrição e botão opcionais. Bloco `purchase`: oferta, título, descrição e botão opcionais. Preço, prazo e benefícios são resolvidos no servidor. O servidor valida o bloco publicado e o acesso à aula antes de aceitar sua configuração. Cards usam apresentações publicadas do catálogo, verificadas novamente pelo servidor. Nenhum preço ou usuário recebido do navegador é autoritativo.

## Presente

Consultar estado sem consumir; ativar somente em confirmação explícita. Mostrar sete dias e início imediato quando essa for a política da oferta. Repetições não renovam prazo. Reutilizar perfil de criança existente e apontar para Família quando precisar criar/autorizar aparelho. Falha de e-mail não desfaz acesso já concedido. Preview não tem efeitos.

## Compra

Consultar oferta e cadastro, completar dados, escolher pagamento suportado, acompanhar confirmação e liberação. Pix não deve ser oferecido para assinatura mensal recorrente enquanto o checkout existente só permitir cartão nesse caso. Cartão é tokenizado pelo componente Efí já usado na plataforma, sem persistir PAN/CVV. Condições aceitas e origem ficam registradas junto à compra. Recarga/duplo clique retomam a tentativa persistida. A conta destinatária nunca muda por edição de e-mail de cobrança.

## Cards e elegibilidade

Apresentação no Início é opcional e configurável no catálogo, com título, texto, imagem e botão. Consultar assinatura/acesso reais antes de sugerir compra. Assinatura correspondente ativa ou período pago ainda válido encaminha ao gerenciamento. Compra pendente deve ser retomada. Falha de consulta não significa ausência de assinatura. Direitos preexistentes não são reduzidos.

Também há apresentação manual para componentes em outras páginas. Sem apresentação de compra no Início, a primeira entrada usa a oferta principal de comunidade do próprio ambiente, respeitando a desativação explícita. O editor pode criar uma campanha associada à origem do curso. Presentes de cursos diferentes têm escopos separados; o Cadê conserva a vaga histórica e nenhuma repetição renova prazo. A tentativa de pagamento salva o pedido canônico antes do efeito externo e o reutiliza integralmente em retomadas.

## Aparência e acessibilidade

Usar Button, Input, Dialog, tokens e classes já existentes; cards arredondados, tipografia e cores da Área dos pais; tema adulto herdado no app adulto. Preservar foco/teclado, rótulos, mensagens de processamento e experiência móvel. Não incorporar landing page nem criar identidade visual nova.

## Verificação e escopo

Testar identidade, autorização da origem, oferta forjada, repetição, oferta indisponível, falha de consulta, campos faltantes, pagamento pendente/confirmado e preview sem efeitos. Conferir contratos de importação/autoria/publicação de blocos, typechecks dos consumidores e interface real. Não alterar permissões do Mural, idade ou outros itens do curso nesta entrega. Publicação de conteúdo e deploy são distintos da implementação local.
