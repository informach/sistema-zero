# Correções dos bloqueios encontrados no CI remoto

Base: `7347a7707`. O [run 44528865460](https://github.com/informach/sistema-zero/actions/runs/44528865460)
terminou com quatro jobs reprovados; o deploy de staging não foi executado.
Este lote trata as causas encontradas, sem alterar fontes dos editores ou motores Molda.

## Diagnóstico e correções

- **Pygame:** a fixture de conjuntos tinha cena sem ID, atlas sem `y` e imagem
  `unused.png`. O primeiro exportador de cena 1 (`1eedefd2e`, `export/scene.ts`)
  já produzia ID e imagens autocontidas. A fixture agora usa esse contrato real,
  com PNG RGBA válido. As asserções originais de transformação, escala, identidade,
  vínculos e leitura legada permanecem. Seis casos adicionais comprovam a recusa
  de ID ausente, imagem externa fictícia e atlas fora da imagem. O leitor não foi
  alterado nem teve seu preflight desativado.
- **Imagem Members:** o validador do Studio importa `molda-cenarios-motor/conteudo`,
  cujo inspetor GLB usa `molda/gltf`. Esses workspaces já pertenciam ao grafo de
  dependências declarado, mas seus fontes e links faltavam no estágio final.
  O Dockerfile passa a incluí-los; o smoke exige nove workspaces e importa o
  validador real. A inspeção local do fechamento e o bundle de 2.790 módulos
  passaram. Isso não substitui construir e executar a imagem Linux.
- **Fronteira do Arquipélago:** o compilador de cenários reutiliza o hash canônico
  de `@sistemazero/core/creations`, uma dependência declarada. O teste admite
  somente esse ponto de entrada adicional e também confere que seus módulos
  de produção não introduzem dependências externas. Não libera o restante do
  Core, serviços, React ou Three.
- **Sandbox 3D:** documentos clássicos solicitavam Three `0.184.0`, enquanto
  o resolvedor offline usava somente `0.180.0`, contratado pelos projetos Pro.
  A imagem instala `three-classic: npm:three@0.184.0`, com integridade no lock,
  e o resolvedor clássico usa esse pacote. Os contratos e a biblioteca Pro
  continuam em `0.180.0`. Um teste liga a versão clássica à constante do editor
  e ao lock; falhou antes da correção. Os testes de origem, versão, caminho,
  links e orçamento continuam ativos. A sintaxe de alias segue a
  [documentação do npm](https://docs.npmjs.com/cli/using-npm/package-spec/).

## Evidências locais

- Pygame-ce **2.5.7 e 2.5.8 reais**: `test-pinta-module.py` aprovado nas duas versões.
- Modo de lógica pura: **52 conferências** aprovadas; não é prova de pixels.
- Fronteira arquitetural: **7 testes, 7 asserções**, sem falhas.
- Contratos do executor, resolvedor e empacotamento SDK: **19 testes,
  99 asserções**, sem falhas. Inclui instalação independente por `npm ci`.
- Chrome real com resolvedor da imagem e arquivos do lock instalados:
  engine carregado, um canvas, dois módulos oficiais servidos localmente,
  nenhuma exceção. Toda outra requisição é bloqueada pelo harness.
- Bundle real do Members e inventário dos nove workspaces aprovados.
- CI global local final: **16.105 arquivos**, sem erros; nenhuma regra suprimida.
- Typecheck completo do executor, incluindo seu projeto de testes: exit 0.
- Regressão offline 026 reexecutada: **44 testes/145 asserções** do núcleo,
  **1 teste/2 asserções** da ponte e **7 ensaios Chromium** aprovados. O navegador
  exercita o baseline antigo real, páginas fechadas, cópia recuperada, concorrência,
  lápide, aborto de transação e galeria com 500 sprites. Não substitui o rollout
  autenticado em staging.

Os logs, inventários e hashes dos fontes estão nos arquivos desta pasta.
Os logs textuais têm fins de linha e espaços finais normalizados para o Git.
As provas são de Windows nesta máquina. O daemon Docker local respondeu 500
mesmo com a API compatível; o serviço não pôde ser iniciado nesta sessão.
Não houve reinício forçado nem interrupção de containers alheios.
O smoke da imagem e os objetivos 3D no Linux ainda precisam passar no próximo
CI remoto. Nenhuma conclusão da missão ou ativação de runtime é deduzida deste lote.
