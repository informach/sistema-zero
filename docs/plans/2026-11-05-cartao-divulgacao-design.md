# Cartão dos links de divulgação

Desenho aprovado pelo operador em 05/11/2026: botão “Cartão de divulgação”, prévia e
download PNG para cada link público de campanha/embaixador. A imagem contém Sistema Zero,
público, convite para o presente de sete dias, QR e endereço. Campanhas incluem título e
prazo de resgate. Links privados de painel, e-mail, comissão e dados de participantes não entram.

Um componente genérico em UI recebe textos e URL; o desenho Canvas e o QR são locais,
sem chamadas a geradores externos. O gerador carrega somente ao abrir a prévia. O PNG
1080×1350 conserva margem branca do QR, contraste e endereço completo. Textos extensos
quebram em linhas; geração inválida exibe erro e permite nova tentativa, sem liberar download.
A prévia respeita foco, Escape e rolagem pelo Dialog compartilhado. Mudança de público ou
campanha invalida imediatamente uma imagem anterior, inclusive se a geração estiver pendente.

Ampliação aprovada: “Minhas campanhas” no painel privado, somente leitura. A consulta pelo
token filtra o beneficiário no servidor antes da paginação (20 por página), exclui rascunhos e
projeta apenas título, público, datas, situação, link e termos de comissão da própria campanha.
Não expõe participantes, auditoria ou notas internas. Paginação pela página SSR existente;
nenhuma rota de escrita nova. Apenas o Admin cria ou altera campanhas. Pausadas/encerradas
ficam identificadas, sem ação de divulgar; agendadas permitem preparar o cartão.

Entradas: detalhe da campanha e do embaixador no Admin, painel do embaixador no funil e
links Kids/Adultos na área dos pais. O QR usa exatamente o link público fornecido pelo serviço.
Copy descreve curso Cadê Todo Mundo e Mural, sem prometer acesso a todo o catálogo.

Laopa: cadastro real somente em produção, Vivianne Lima, comissão habilitada R$30/R$80,
janela de 45 dias, resgate Kids de 06/11/2026 00:00 até 09/11/2026 00:00 (fim de 08/11),
Brasília. Envio do acesso por e-mail autorizado. Dados pessoais e link privado ficam fora do Git.
