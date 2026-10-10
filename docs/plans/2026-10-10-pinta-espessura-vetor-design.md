# Espessura do contorno no Pinta

Proposta aprovada pelo usuário em 10/10/2026: simplificar a caixa de ferramentas do editor vetorial e concentrar a espessura na aba Aparência.

- Remover os seis botões de espessura da caixa vertical e da barra horizontal.
- Iniciar novas formas com espessura 1. Manter a escolha durante a troca de ferramentas.
- Usar o controle deslizante de Aparência de 0,5 a 10, com passo 0,5 e número atual visível.
- Aplicar o controle à seleção e ao estilo das próximas formas, preservando desfazer/refazer.
- Manter o controle desabilitado quando não houver contorno.
- Preservar desenhos existentes, inclusive espessuras acima de 10. Selecionar uma forma não deve modificar o arquivo; o número exibido informa sua espessura real.
- Não alterar o editor de pixels nem os limites de leitura dos arquivos vetoriais.

O controle numérico direto substitui o índice dos antigos presets. O padrão 1 fica compartilhado pelas fábricas de formas e pelas operações que restauram um contorno. Não há migração de arquivos.

Verificação: criação com o padrão, edição de uma seleção em 0,5 e 10, desfazer/refazer, troca de ferramenta, compatibilidade de arquivos, testes do pacote, tipos e inspeção no navegador.
