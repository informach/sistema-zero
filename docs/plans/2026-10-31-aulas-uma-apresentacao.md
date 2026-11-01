# Uma apresentação para aulas Kids e adultas

## Decisão

A aula adulta usa a apresentação da Kids: os mesmos cartões, chips, quiz, fala e animação do
Zappy, barra de progresso, lista de aulas, avaliação, celebração, retorno e cabeçalho móvel.
A apresentação fica em `member-shell/components/lesson-ui`, com repasses nos nomes públicos
Kids. Os hosts continuam fornecendo identidade, permissões, URLs, rascunhos e dados corretos
de cada comunidade. Não há importação de um app de produção pelo outro.

O chip do jogo pronto se chama **Jogue**, tanto no embed quanto na atividade interativa.
A mudança não altera os roteiros falados dos cursos.

## Tema e recursos

`ui/src/styles/creator-theme.css` é a fonte canônica. O Kids a importa diretamente. O adulto
compila a mesma fonte junto do tema das suas outras páginas, com seletores mutuamente
exclusivos de especificidade zero. A presença da aula no HTML seleciona o tema, inclusive nos
portais dos diálogos. Ao sair, volta o tema adulto. Sem efeito React para trocar a pele do
corpo e sem recarga automática que interrompa um projeto em edição.

O gerador conserva camadas, seletores compostos, media queries e movimento reduzido. Uma
colisão divergente de keyframes reprova a geração. A saída versionada é conferida no build e
nos testes. Nunito e Baloo usam os mesmos parâmetros do Kids, sem preload no adulto fora da
aula. Som e moeda têm fonte compartilhada e sincronização no build de cada host.

O progresso real do servidor tem prioridade. Quando a equipe não recebe esse dado, a barra
mostra posição na aula ou atividades obrigatórias, como já fazia o Kids. Não inventa conclusão.
A lista mantém nomes completos, estado concluído acessível e bloqueio decidido pelo serviço.
O compartilhamento de Estúdio nas oficinas permanece desligado.

## Atualização sem limpar o cache

Artes e reservas possuem hash no próprio nome. Trocar os bytes exige outra URL, conferida em
teste. A cache local do player diferencia URLs e compartilha apenas downloads da mesma versão.
As páginas de aula são dinâmicas e privadas. Os três hosts Next recebem a identificação da
implantação do Railway também no build Docker; o mecanismo do Next evita misturar versões
na navegação. Não se adiciona timestamp a toda requisição nem se apaga a cache do aluno.

## Verificação

- Kids: 1.837 testes e 11.024 asserções passaram na suíte completa da extração.
- Após os últimos ajustes: 50 testes focados e 220 asserções Kids passaram.
- Adulto: 118 testes e 576 asserções passaram.
- Tema: cinco testes e 16 asserções passaram, incluindo saída determinística e keyframes.
- Identificação de implantação: um teste e dez asserções passaram nos três hosts.
- Cache e acervo ediSVG: sete testes Node passaram, incluindo duas versões sem limpar a cache.
- Builds Next dos dois apps passaram, com TypeScript. Os logs locais identificam os negativos
  do ensaio que foram corrigidos, sem suprimir diagnósticos nem desativar checagens.
- Chrome: seis cenários com os players e navegações móveis reais, em 1440, 768 e 390 px.
  Jogo em iframe, lista, narração com animação, recarga com cache ligada e saída da aula.
  Prints e limites em `docs/qa/2026-10-31-aulas-compartilhadas/`.

A conferência local não afirma implantação. Integração, CI e conferência das versões reais
em staging e produção são a etapa operacional seguinte. Telefone físico não foi usado.
