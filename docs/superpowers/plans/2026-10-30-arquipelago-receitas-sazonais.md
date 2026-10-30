# L09: receitas que voltam com as festas

Continua a entrega integral autorizada. A pipoca da Junina e a decoração já existem.
Este trecho amplia as receitas usando somente alimentos da horta e o preparo atual.
Não muda datas, modelos, carteira, progressão de cursos nem a versão do salvamento.

## Decisões

Adicionar duas receitas editoriais: Salada do Carnaval (alface, tomate e milho, na bancada)
e Milho da fogueira (milho, na fogueira da Junina). São pratos do inventário, apresentados
com os mesmos ícones de alimentos já usados na mochila. Não são novos objetos 3D.
Os efeitos são modestos: fome 30/diversão 20 na salada, fome 20/diversão 20 no milho.
A pipoca mantém diversão 30, conforme a proposta. Todos os ingredientes têm fonte gratuita.

A receita permanece no Diário o ano inteiro. Só o preparo depende da festa atual, que já
segue São Paulo e pode ser ensaiada exclusivamente no playground. O prato pronto continua
na mochila e pode ser usado depois da festa. Não apagar nada ao trocar de mês ou de ano.
Lanternas e fim de ano continuam dependendo das datas da dona e não recebem novas janelas.

Usar a mesma regra pura na escolha automática da bancada e no painel. A checagem deve ocorrer
novamente ao clicar, pois a época pode mudar com um painel aberto. Não adicionar relógio
oculto às funções puras. A disponibilidade recebe a festa explicitamente.

## Etapas

- [x] Catálogo e itens, preparo sazonal puro e recusa fora da época.
- [x] Bancada/painel com a festa atual, mantendo a receita no Diário.
- [x] Testes de retorno anual, prato preservado e inventário inteiro.
- [x] Navegador, tipagem e revisão do trecho.

Prova local em `docs/qa/2026-10-30-receitas-sazonais/README.md`: Junina e Carnaval nos dois
tamanhos, preparo e preservação fora da época. A revisão integrada de L01 a L14 permanece aberta.

O vestuário sazonal é o próximo trecho de L09 e deve reutilizar o configurador da plataforma,
com posse e preços do Members. Não construir outro guarda-roupa dentro do jogo.
