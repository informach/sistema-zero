# Aula responsiva e espaço de criação — 23/10/2026

## Comportamento

- O Estúdio e as experiências ficam abaixo da orientação quando não há largura
  para duas colunas. A separação entre o último bloco da esquerda e a ferramenta
  é de 24 px. A divisória continua disponível nas telas largas.
- As abas externas “Ver exemplo”/“Criar” e o diálogo simplificado duplicado saíram.
  O diálogo original, inclusive seu botão de ouvir, permanece no fluxo.
- Os objetivos têm uma faixa com progresso, botão de verificar e controle de
  detalhes. A lista começa recolhida e abre quando a verificação retorna pendências.
  Obrigatórios, extras, resultados guardados, dicas e aviso de edição continuam separados.
- A altura normal do editor não encolhe ao abrir os objetivos. Expandido, o editor
  tem piso de altura e o contêiner permite rolar em janelas baixas.

## Evidências locais

- Teste causal do layout estreito falhou com as abas antigas; passou após a remoção.
- Teste causal dos detalhes recolhíveis falhou no componente anterior; após a mudança
  também exercita progresso e abertura dos detalhes quando há objetivos pendentes.
- Kids: 72 testes, 291 asserções, sem falhas — partes da aula, vídeo, divisória,
  persistência da instância e sala ao vivo.
- Member-shell: 45 testes, 89 asserções, sem falhas no runner dos objetivos e da
  régua das colunas; os cenários de DOM dos objetivos rodam em processos isolados.
- TypeScript: checagem focada dos componentes alterados, seus imports transitivos
  e os arquivos do ensaio, sem emissão, terminou com código 0. Quatro erros na
  configuração inicial do ensaio foram corrigidos usando os contratos reais.
- Navegador: três cenários com Chrome, componentes reais e CSS do Kids, sem login,
  dados pessoais ou serviços remotos. Larguras 1440, 958, 768 e 390 px; tela expandida
  também em 844 × 390. Estúdio JavaScript e experiência de coordenadas da Nave.
- Os cenários medem a separação entre painéis, ausência de rolagem horizontal,
  um único diálogo/controle de ouvir, preservação do nome editado ao redimensionar,
  altura do editor, recolhimento dos detalhes e acesso ao botão com rolagem.
- Capturas em telas estreitas e expandidas foram inspecionadas. O servidor de teste
  usa somente loopback e é encerrado pelo Playwright.
- A suíte tem diretório/configuração próprios e é executada em sequência no job E2E
  do Kids. Ela não depende do servidor das demais experiências. Planos, provas e
  fixtures ficam no Git e continuam excluídos do Docker por `.dockerignore`.

As primeiras tentativas do navegador foram preservadas: o primeiro observador
marcava o SVG interno do Blockly, que pode ser recriado ao mudar seus próprios painéis;
o teste passou a observar o contêiner da aula e um projeto realmente editado. Também
foram corrigidos no ensaio o encerramento da edição do nome por Tab e o fornecimento
dos MP3 reais dos controles, sem filtrar erros de página.

Os cenários usam a prévia autoral sem vínculo de aluno. Eles validam layout e edição,
não substituem a autorização, a avaliação no servidor ou a homologação de Python/Pro.
Nenhum roteiro, manifesto, projeto de aluno ou critério pedagógico foi alterado.

## Execução

Na pasta `packages/community-kids`, executar `bun run e2e:lesson-layout`.
Resultados e capturas ficam em `.cache/lesson-layout-results`.

O lote ainda depende de integração e deploy para aparecer na plataforma publicada.

## Complemento após o CI

O job de navegador passou, mas dois casos de atualização da aula usavam a busca
genérica por um único botão no cartão. O novo controle de detalhes tornou essa
busca ambígua. A reprodução local confirmou 13 testes passando e dois falhando;
o seletor passou a usar o nome “Verificar esta parte”, com asserção de que a
requisição realmente aconteceu. As regras de atualização da aula foram mantidas.
