# Lateral direita contínua nas aulas

## Contexto e decisão

Nas aulas Kids e Adulto, a lista de aulas à direita é um cartão afastado das bordas. Ela some imediatamente quando recebe `hidden`, enquanto o menu esquerdo Kids muda de largura suavemente. O aluno percebe movimentos incoerentes e a lista parece um elemento solto.

O desenho aprovado é uma lateral branca, colada à borda direita e com altura da janela inteira no desktop. Ela começa recolhida, abre e fecha em cerca de 300 ms, respeitando a preferência por movimento reduzido. A aula e a barra fixa inferior ajustam sua largura em sincronia; o painel não cobre atividades nem controles. A lista de aulas rola dentro da lateral. O conteúdo, as cores e as ações da lista continuam os mesmos. No celular, a lista permanece uma gaveta sobreposta com botão de fechar e fundo escurecido.

## Abordagens consideradas

1. **Lateral fixa contínua, com espaço reservado na aula (escolhida).** Alinha-se ao menu esquerdo, preserva uma área de aula desobstruída e permite que o rodapé termine exatamente na borda do painel.
2. Cartão flutuante com animação. Corrige o movimento brusco, mas mantém as margens externas e a leitura de um cartão separado.
3. Lateral contínua sobreposta à aula. Poupa largura quando aberta, mas pode esconder a atividade e os botões inferiores.

## Comportamento

- Desktop: o painel direito permanece montado para a transição. Quando recolhido, fica fora da interação, da navegação por teclado e da leitura assistiva. Ao abrir, entra pela direita; ao fechar, sai pelo mesmo caminho.
- O painel branco ocupa de cima a baixo, sem moldura externa arredondada ou margem externa. O cabeçalho com curso, progresso e avaliação permanece no topo; a lista de unidades e aulas usa a altura restante e rolagem própria.
- A área da aula acompanha a abertura sem salto. O rodapé fixo respeita tanto o menu esquerdo Kids quanto o direito, inclusive com ambos abertos. Na comunidade adulta só o menu direito participa.
- Celular e tablet: conservar a gaveta atual, sem reduzir a área da aula nem o rodapé. Manter contraste, foco visível, `aria-hidden` e `inert` corretos nos estados fechado e aberto.
- A faixa cinza percebida sob o menu esquerdo em outra tela fica fora deste lote por pedido do usuário; nenhum ajuste de altura será feito nela.

## Verificação

Testar os estados aberto/fechado nas duas comunidades, o rodapé com os painéis independentes, foco e acessibilidade do painel recolhido, preferência por movimento reduzido e largura de celular, tablet e desktop. Rodar testes e typecheck dos pacotes alterados. Se houver navegador autenticado disponível, conferir visualmente os extremos da transição e a rolagem interna.
