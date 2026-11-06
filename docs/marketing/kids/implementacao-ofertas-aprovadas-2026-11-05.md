# Implementação das propostas Kids — 05/11/2026

Aplicação das propostas aprovadas para os presentes do Cadê Todo Mundo (campanha e
embaixador) e as ofertas do Desafio do Primeiro Jogo (9 a 17 anos e criar junto).

## Argumentação e apresentação

- Habilidades para a vida abrem a conversa; criação de jogos e programação entram
  como ferramentas para observar, planejar, testar, comunicar e pedir ajuda.
- Exemplos do próprio projeto são ligados à escola e à rotina. A página explica
  como o responsável pode ajudar a fazer essa conexão, sem prometer transferência
  automática, resultado clínico ou mudança de comportamento em prazo determinado.
- A sequência explica o projeto, as atividades, a participação da família,
  os requisitos, os canais de ajuda e as condições antes de pedir o cadastro ou compra.
- A identidade de cada página foi preservada: cores, tipografia, cartões, ondas,
  botões e rodapé compartilhado. André e Débora aparecem junto à história de Helena
  e Júlio; Rafael acompanha a seção sobre compartilhar uma criação.
- O FAQ do presente distingue a proposta de autonomia para 9 a 17 anos da
  participação de menores acompanhados por um responsável.

## Conteúdo e imagens

A fonte de texto é o módulo tipado de cada página, não uma cópia HTML publicada:
`src/content/presente.ts` e `src/funnels/desafio-primeiro-jogo/oferta/pagina-*.ts`,
em `packages/funnel`. Os espelhos editoriais do Desafio são gerados desses módulos.

Os arquivos de origem são as propostas finais aprovadas nas pastas locais
`Proposta Presente Kids` e `Proposta Desafio Kids`. As imagens aprovadas foram
incorporadas em `packages/funnel/public/img/`:

- `cade-todo-mundo/`: cinco capturas reais do Cadê, incluindo placar antes/depois,
  blocos e projeto publicado.
- `desafio-primeiro-jogo/farol-*.webp`: oito novas capturas de A Chave do Farol,
  com estúdio, experiência, objetivos, blocos, estado e comparação de posições.
- `kids-aprender-criando/`: seis ilustrações aprovadas de situações com os mascotes
  e uma captura real da conversa da Área dos Pais.

As vinte imagens ocupam aproximadamente 2,7 MB, contra 15,5 MB das fontes PNG.
As capturas da plataforma usam WebP sem perdas; as ilustrações, qualidade 88.
Não foram desenhados blocos para substituir os blocos reais da plataforma.

## Integrações preservadas

- Presente: nome público, origem, datas em Brasília, estado e formulário reais.
  Convites pessoais exibem só o primeiro nome. Campanhas mantêm o título completo.
- Campanhas agendadas, pausadas e encerradas continuam respeitando o estado do
  servidor; os prazos não foram fixados no exemplo da Laopa.
- Desafio: preço do catálogo, cotação/aviso de cupom, atribuição da URL,
  pré-checkout, checkout e termos existentes.
- Adultos: corpo e copy das ofertas e do presente preservados. O gerador de
  espelhos apenas remove espaços ao final das linhas, inclusive no espelho adulto.

## Revisão e evidências locais

- Corrigidos o posicionamento da ampliação, as referências de imagens do Desafio,
  a âncora de habilidades, o rodapé duplicado e o agrupamento dos depoimentos.
- A revisão do PR detectou links de faixa etária em respostas sem relação com
  idade: a busca por substring também reconhecia “atividades”, “necessidades”
  e “Comunidade”. O link agora é declarado somente no item correto da copy,
  sem depender de palavras da pergunta. A regressão foi reproduzida no navegador.
- Removidos do módulo e do espelho os dados do antigo balão do herói menor de 9,
  que já não eram exibidos no layout aprovado.
- A orientação junto ao formulário do presente reforça o início dos sete dias no
  cadastro aceito e pede que a família considere a disponibilidade antes do envio,
  repetindo a regra já explicada nas condições e no FAQ.
- O complemento do FAQ sobre o prazo da campanha é marcado nos dados, sem
  depender da redação exata da pergunta.
- Ampliação compartilhada com diálogo nativo: centralização, limites da tela,
  Escape, botão de fechar, retorno do foco e link para a imagem sem JavaScript.
- `bun test`: 605 testes aprovados; dois testes de integração com banco ignorados
  conforme a configuração local. Build, tipos e Biome também verificados.
- Presente: 14 cenários e 44 combinações de página/largura, incluindo resgate,
  retomada, campanhas, painel, primeiro nome e imagens. Larguras Kids: 320, 390,
  768 e 1440 px.
- Desafio: três páginas (incluindo regressão adulta), cinco larguras de 320 a
  1440 px e 54 imagens. Catálogo de teste com preço distinto do preço real,
  cupom expirado, ambos os CTAs até o checkout e preservação da atribuição.
- Ampliação de todas as imagens interativas nas páginas Kids, incluindo telefone
  na horizontal. Capturas por seção complementam as capturas de página inteira
  para evitar limites de textura em páginas mobile muito longas.

As evidências locais ficam em `tmp/presente-review`, `tmp/desafio-ofertas-review`
e `.cache/commissions-970/approved-*.log` (arquivos de trabalho não versionados).
O CI e os recibos dos workflows de publicação registram o SHA entregue em cada ambiente.
