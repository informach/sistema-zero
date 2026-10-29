# Proteja os ninhos, fase4-05

**Objetivo:** um Quadro das Cores e três desafios do dia do Vale, sem importar no Admin.
**Arquitetura:** projetos JavaScript em blocos da extensão Jogo 2D, arte SVG embutida,
lista de sprites e regras observadas pelo executor oficial. Sem código do Vale 3D.
**Especificação:** tarefa da dona de 29/10/2026 e pacote do Recife.

## Decisões

- Vale abre em `architect`, posição 6. A lista de ninhos é um grupo do Jogo 2D.
  Preparação, desenho e reinício já usam a lista; a criança completa a proteção ao toque,
  o início da onda e a classificação de cada ninho na passagem da cinza.
- Cada onda começa no botão Próxima onda. A preparação não tem prazo. Durante a passagem,
  novos cliques não mudam coberturas nem lançam outra onda. A cinza não destrói ovos.
  Depois, as coberturas podem ser preparadas de novo. Recomeçar está sempre disponível.
- Proposta de parâmetros: palco 640 × 480, três ninhos e três ondas, 1 ponto por proteção.
  A cinza atravessa o palco em cerca de um segundo. São números da brincadeira.
- Variações: quatro ondas, 2 pontos por proteção, quarto ninho na lista. Só uma regra muda.
  Extra: Enter faz o mesmo reinício do botão, que já vem pronto.
- Quadro 6, ordens 60 a 63. Busca nos manifestos locais não encontrou quadro ocupado no Vale;
  o Admin deve conferir de novo no cadastro ao importar. Nenhum acesso ao banco nesta tarefa.
- Moedas vêm de MOEDAS_PADRAO_POR_TIPO; atração `proteja-os-ninhos`. Sem blocosManuais.
  Conferir perfil até Arquiteto e blocos exigidos além dos que já vêm no inicial contra
  as listas locais. Não afirmar que o novo conceito de lista já foi ensinado em curso publicado.
- Ramo próprio a partir do staging local. Commits locais e merge local. Nunca push nesta sessão.

## Execução

- [x] Fontes, gerador determinístico, manifesto e README com tabela e decisões pedagógicas.
- [x] Schema, IR, blocos, round-trip Blockly, limites e variações com uma mudança.
- [x] Executor real: cada objetivo passa no gabarito e falha no inicial; mutações incorretas reprovam.
- [x] Navegador local, computador e toque emulado, prints e relatório.
- [x] Revisão, testes, tsc, Biome e commit com o resultado das verificações.

## Pedidos de arte

Nenhum modelo ou âncora. Arte 2D embutida no projeto, sem arquivos externos ou Blender.
Nenhum campo de salvamento é necessário. Importar e publicar no Admin fica fora desta entrega.

## Resultado para a página de andamento

Pacote completo: um Quadro das Cores e três desafios do dia. Objetivos comprovados no executor
oficial, com iniciais reprovados e gabaritos aprovados. 133 testes do contrato, 5 da pasta e
16 conferências Blockly; tsc e Biome passaram. Navegador aprovado em computador, compacto e
celular emulado, com prints em docs/qa/2026-10-29-vale-manifesto.md. Nenhum pedido de arte ou
campo de salvamento. Cadastro no Admin e publicação não foram feitos. Commit e merge locais, sem push.
