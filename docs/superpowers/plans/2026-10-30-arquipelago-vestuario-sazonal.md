# L09: vestuário sazonal pela plataforma

Continuação da entrega integral autorizada, com base em `6461f19c0`. O jogo não recebe
uma loja de avatar própria. Reutilizar o configurador existente, a carteira e a posse do Members.

## Desenho

O catálogo editorial sugere peças existentes para cada festa, sem alterar preço, desbloqueio
ou disponibilidade do catálogo normal. Carnaval usa máscara e coroa de flores; Junina usa
camiseta listrada e laço; Lanternas usa presilhas de estrela e vestido longo; fim de ano usa
cachecol e moletom. São sugestões, não um uniforme. Não equipar, comprar nem cobrar ao abrir.
As datas continuam sob `festaAtual`, com as janelas não aprovadas desligadas.

A feira abre a ferramenta `avatar` com propósito `vestir` e molde V1 contendo só a festa.
A plataforma valida o molde e resolve a coleção conhecida; não recebe preço, saldo, usuário
ou lista arbitrária de peças. O configurador conserva suas confirmações e permissões.
O jogo pausa e mantém a mesma montagem. Ao voltar, o host relê o avatar confirmado, devolve
o resultado tipado e o jogo atualiza avatar e saldo. Cancelar não aplica a prévia não salva.

Acrescentar retorno embutido ao configurador, preservando a navegação completa das páginas
normais. Kids mantém sua pele e adulto a sua, com carregamento tardio. Bloquear saída durante
compra ou salvamento para não apresentar uma confirmação que ainda não foi persistida.
Não abrir outra aplicação em iframe nem copiar a lógica de compra para o jogo.

O diálogo mantém foco, devolve o foco ao sair e libera cena/recursos. Unmount do host resolve
o pedido pendente como cancelado. A plataforma falsa mantém o mesmo contrato e recusa quando
o editor não estiver disponível. Não gravar roupas no save do jogo nem mudar V18.

## Etapas

- [x] Catálogo puro e molde estrito, com teste de conformidade às peças existentes.
- [x] Retorno embutido no configurador, com as duas peles e proteção de operações em voo.
- [x] Ferramenta/host/falsa e integração da feira, sem romper exclusão mútua das ferramentas.
- [ ] Testes de contrato, retorno confirmado/cancelado, identidade e desmontagem.
- [ ] Navegador computador/celular, tipagem, lint e revisão.

Nenhum GLB novo é necessário para essas sugestões. Futuras roupas exclusivas precisam de
especificação própria e não são uma dependência oculta desta etapa.

## Checkpoint de implementação

Retorno embutido, sugestões nas duas peles, host e botão da feira implementados. Catálogo:
2 testes/34 asserções; apresentação e regressões dos cosméticos: 22 testes/1116 asserções.
Rotas de acesso conferidas em processos isolados: três casos Kids e dois adultos, incluindo
sessão ausente e suporte. Tipagem do host e do jogo passou antes dos últimos ajustes de teste.
Prova do diálogo no navegador concluída: quatro fluxos, nas duas peles e tamanhos, com
compra/salvamento e cancelamento, sem cobrança na prévia. Evidência, correções e limites em
`docs/qa/2026-10-30-vestuario/README.md`. A revisão da composição com o host autenticado e o
mundo completo permanece em L14. Não representar essa prova local como implantação.
