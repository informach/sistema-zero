# Admissão de cenas regionais no Python — 22/11/2026

Base `75fd6db9d`. `pythonSceneDocument.ts` prepara cenas estruturadas privadas 4
sem importar motores gráficos. A tabela estrutural vem do esquema Core pelo
gerador oficial Python, com refinamentos explícitos de propriedades tipadas,
limite de propriedades e flags de regex. Palavras-chave/tipos não suportados e
padrões não registrados interrompem a geração. Não é um avaliador geral de JSON Schema.

O texto UTF-8 tem teto de 8 MiB antes de JSON. A leitura usa números binary64,
como `JSON.parse`, e mede strings em unidades UTF-16, como o Zod. A validação
semântica comum aos três futuros adaptadores confere referências, animações,
recursos, árvore de camadas e conjuntos. Os planos de todos os mapas/definições
e seu orçamento são admitidos antes do primeiro base64. A tentativa única só
entrega o cenário completo; as células continuam em arrays compactos por região.

A revisão acrescentou conversão para inteiros nativos depois da admissão,
somente nos campos declarados inteiros. Isso permite dimensões em `range` e
preserva a distinção entre propriedades int/float sem alterar o arredondamento
binary64. O recibo anterior reproduz a falha de tipo; a regressão passa depois
da correção, incluindo o inteiro lexical 9.007.199.254.740.993.

Os tetos e regex de propriedades foram nomeados no Core sem alterar seus valores
ou comportamento. O esquema exportado de cabeçalho continua sendo apenas
estrutura: chamar esse esquema sozinho não equivale a admitir uma cena. A
conversão segue a [API oficial do Zod 4](https://zod.dev/json-schema); refinamentos
sem representação estrutural não são presumidos como convertidos automaticamente.
O gerador mantém o compositor Pygame entregue e agora confere também a tabela.

## Provas e revisão

A Vila regional, com artes reais, camadas e conjunto, é admitida/decodificada no
CPython e comparada integralmente com metadados e células ocupadas do Core.
Isso compara dados; não carrega pixels nem executa o jogo nos motores Python.

A matriz de 81 variações cobre propriedades, referências, hierarquia, versões,
animações, recursos, Unicode e chaves numéricas dos metadados; 27 são controles
válidos. Cinco casos numéricos adicionais conferem arredondamento binary64,
expoentes, estouro e subfluxo. O teto JSON exato é aceito e o byte seguinte
recusado. O controle de orçamento agregado admite raiz e definição com o teto
completo e recusa com saldo reduzido antes de decodificar.

Uma peça inválida na última definição recusa o resultado inteiro e conserva
outro snapshot já carregado. A captura não expõe o documento privado durante a
admissão; sucesso e falha consomem a tentativa. Os processos de teste recusam
imports de Pygame, Pygame Zero e Raylib, sem substituir esses motores por mocks.

O transporte do ensaio usa UTF-8 explicitamente: no Windows, a entrada padrão
do CPython isolado pode usar outra codificação. Arquivos temporários próprios
evitam o teto de argumentos do Windows e são removidos após conferir o destino.
As fixtures de conjuntos incluem seus grupos-pai para não confundir recusa por
hierarquia com a falha de payload/orçamento que cada ensaio pretende exercitar.

- Core completo: 3.252 testes, 211.093 asserções, 205 arquivos e 16,97 s,
  sem falhas/omissões. Inclui a regressão da tabela e os leitores anteriores.
- Pinta completo: 2.783 testes, 37.403 asserções, 260 arquivos e 206,10 s,
  sem falhas/omissões, incluindo os quatro controles Pygame reais existentes.
  Rodou sem outro job de testes desta sessão. Depois do ajuste final de criação
  da pasta temporária no ensaio, 29 focados/6.814 asserções foram repetidos,
  junto dos tipos e lint; o código do leitor não mudou nessa última revisão.
- 16 ensaios Chromium sem retry/omissão/falha: quatro de PNGs/mundos privados,
  desktop e CPU 4×, e 12 Pinta–Estúdio. Reabertura e pixels da Vila conferem;
  atualização conserva programas nos contratos anteriores. Não exercitam jogos
  regionais Python. A matriz de 79 pertence ao lote anterior, não é somada aqui.
- Tipos completos Core/Pinta e verificação focada do gerador do Estúdio
  aprovados. O tsconfig desse script não inclui tipos de navegador. Tipos
  completos do Estúdio pertencem a `75fd6db9d`; nenhum `studio/src` foi alterado.
- Lint dos oito fontes, whitespace e verificadores oficiais Python/JavaScript
  aprovados. Uma adulteração real da tabela gerada reprova `--check` com saída 1;
  restauração exata dos bytes volta à saída 0.
- Compositor entregue preservado: SHA-256
  `a1fef3ae8aa4c6c608c95887ffee7e0e8cbcddd5494e4115547b61fb637dcd05`.

O índice registra os recibos comprimidos e hashes dos oito fontes. Não houve
novo teste em motor externo, outro aparelho físico ou sessão com crianças.

## Alcance

É admissão de cenas, não parser PNG, carga de mundos conectados, compositor,
colisão do cenário ou integração concluída nas três extensões Python. A física
não é escolhida pela versão de armazenamento. Referências de imagens aceitas
pelo contrato de cena ainda precisam da admissão de arquivos/pixels dos loaders.

Pygame-ce, Pygame Zero e Raylib 2D usarão essa base na fronteira de dados, com
adaptadores gráficos próprios. Nenhum catálogo, área, recibo de jogo ou versão
do motor foi alterado. A qualificação e a versão única continuam coordenadas com
as outras frentes, conforme o plano. Sem mudança de visual, alteração funcional
3D, promoção pública de formatos, implantação ou merge em staging.
