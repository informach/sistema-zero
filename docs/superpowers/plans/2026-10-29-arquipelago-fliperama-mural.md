# Fliperama e publicações do Mural

Parte de L05, autorizada pelo programa de entrega integral. Não muda salvamento, carteira,
publicação nem as permissões familiares dos minijogos aprovados.

## Decisões

- Reutilizar a publicação e o player público do Estúdio. Copiar o projeto para o salvamento
  criaria uma versão sem a moderação e sem a distribuição Python/Pro. Abrir outra janela
  também perderia o retorno ao jogo pausado. A ferramenta abre por cima do jogo.
- O Hub lista as 24 publicações mais recentes do próprio ator, com a comunidade resolvida
  da identidade do gateway. Não aceita id de outro perfil nem comunidade pela URL.
  A interface diz que são publicações recentes, sem prometer o acervo inteiro.
- Só jogos publicados e visíveis entram. Rascunhos, imagens sem jogo, posts reprovados e
  conteúdo da outra comunidade ficam de fora. Cada abertura usa a resolução pública
  existente, que recusa publicação retirada depois da listagem.
- Lista pequena sem capas nem fontes: apenas `playId` e título. Sem cache compartilhado.
- O jogo só conhece contratos e `abrirFerramenta`; o host possui o player. O pedido contém
  UUID, nunca URL. Cancelar ou desmontar libera a ferramenta e devolve o jogo pausado.
- A plataforma falsa devolve a mesma lista vazia por padrão. Fixture local explícita pode
  exercitar a lista, mas nunca se apresenta como publicação real.

## Verificação

- [x] Hub: identidade, comunidade, visibilidade, limite e ausência de sessão.
- [x] Gateway e BFF: autenticação, recusa de resposta malformada e no-store.
- [x] Contrato e jogo: lista, erro recuperável, pedido e recusa, sem gravar o salvamento.
- [ ] Host: UUID estrito, exclusão mútua, fechamento e tema por comunidade.
- [x] Navegador local: abrir, jogar e voltar; publicação removida; computador e celular, dois públicos.
- [ ] Tipagem, lint e revisão integrada.

Família continua usando a rota dos minijogos aprovados. Não se abre o Mural de um irmão
por inferência de parentesco. Visitas adultas opt-in continuam no lote L12.

Evidências e limites em `docs/qa/2026-10-29-fliperama-mural/README.md`. O cenário local monta
o jogo e o player reais com respostas controladas, não a página autenticada completa do host.
