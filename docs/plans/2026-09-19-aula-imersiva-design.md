# Aula imersiva nas comunidades Kids e adulta

Design aprovado na conversa de 19/09/2026. Referência visual: `docs/design/aula-imersiva-mock.html` e captura da página Kids atual.

## Intenção

O aluno entra para assistir, experimentar e criar, não para administrar a página. A aula deve parecer uma bancada tranquila: a atividade é dominante e a navegação está disponível sem disputar atenção. Os temas Kids e adulto permanecem distintos, com suas próprias cores, tipografia, cartões e botões.

Domínio: percurso, seção, experimento, cena, criação, conclusão. Cores: o azul de fundo e os acentos de ação do Kids; superfícies e acentos já definidos pela comunidade adulta. Assinatura do produto: a divisão ajustável entre conteúdo e ferramenta continua funcionando quando a seção tem dois lados. Evitamos três padrões atuais: títulos repetidos acima da atividade, índice redundante no meio, e cartões separados para navegar e concluir.

## Estrutura aprovada

- Barra superior centralizada na largura de leitura (até 860 px), sem cartão: voltar ao curso, progresso real da aula, posição da seção e controles para mostrar/esconder as barras que existem em cada app.
- Kids: menu global esquerdo e lista de aulas direita começam escondidos a cada entrada na aula. Adulto: não há menu esquerdo na página; a lista direita começa escondida. Ambos podem abrir a lista pelo controle superior.
- O título da aula, o da seção e o índice deixam de ocupar espaço visual dentro do corpo, mas o cabeçalho acessível segue existindo como alvo de foco ao navegar.
- Conteúdo de uma coluna tem largura de leitura máxima de 860 px. Seções com conteúdo e ferramenta lado a lado usam toda a área disponível e preservam a divisória e suas regras atuais. Nenhum bloco, cópia, cena, áudio ou regra de conclusão muda.
- Rodapé fixo contínuo, de borda a borda: `Anterior` com o nome da seção atual à direita, `Preciso de ajuda` e `Próxima seção`. Na seção final, o botão de avanço dá lugar à ação de concluir, com o mesmo estado e motivo de bloqueio atuais. O curso pode ser aberto pela barra superior ou pela lista; após conclusão, o fluxo atual de cada comunidade permanece.
- No celular Kids, o rodapé da aula fica acima da barra global de abas e reserva espaço para não cobrir o conteúdo. A lista de aulas pode ser aberta e fechada sem atrapalhar o conteúdo principal.
- Pinta, Estúdio, Pensar e Molda também entram com o menu global escondido a cada visita. O controle da própria ferramenta mostra ou esconde o menu; ao voltar para Criar, ele fica aberto. Não se guarda uma preferência de ocultação entre visitas.

## Verificação

Testar a posição inicial dos menus nas aulas e ferramentas, a volta para Criar, o foco e a navegação entre seções, a conclusão bloqueada/liberada, o índice visual ausente apenas no player real, os modos de uma e duas colunas e a convivência com a barra móvel. Revisar Kids e adulto em larguras móvel, tablet e desktop, além de tipos e lint.
