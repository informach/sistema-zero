# Lote 2: conversão da Faísca sem achatar o relevo

Estado em 17/11/2026, após `fca1d1cd5`. A execução continua exclusivamente no lote 2. A fonte local antiga foi consultada somente para leitura; os dez projetos foram preservados em um backup privado sob `output/cenarios-reforma/conversao-faisca/fontes/1794905362478`. Nenhum projeto antigo foi modificado ou removido.

## Fontes conferidas

- Composição original: 523 instâncias, sete caminhos, um lago e 26 marcos, em `output/molda-cenarios/faisca-base.json`.
- Dez projetos na API local anterior, incluindo estudos de composição e ensaios; um estudo contém um carimbo de relevo autoral. Preservar todos, inclusive as diferenças de posição e de relevo.
- Todos referenciam a geografia `46b0ed92f`. Os arquivos de geografia, Faísca e Colina não têm diferenças entre essa referência e a staging atual.
- O manifesto privado da publicação registra 3.218 modelos e 18 bibliotecas reais. Resolver por origem/caminho e pelo mapeamento de publicação, com UUID e digest confirmados; não aproximar por nome de exibição.
- O migrador v1→v2 existente já conserva instâncias, caminhos, águas, marcos e propriedades do Arquipélago. Entretanto, `alturaDoChao` e o motor genérico ainda representam a base `perfil` sobre um plano. Esse comportamento não atende ao critério de conversão.

## Execução necessária dentro do lote 2

1. Acrescentar o suporte mínimo de dados para receber alturas amostradas: base genérica de terreno, peças Uint16 por digest e leitor puro das amostras. Esse é o requisito da importação; os pincéis, pintura e demais ferramentas continuam sendo entregas do lote 4.
2. Usar peças com tamanho e cabeçalho limitados, quantização consistente entre vizinhas e validação de digest, dimensões e extensão. Recursos carregados ficam em um contexto explícito do palco, separado do documento serializado. Não criar caches globais de alturas nem fazer o núcleo buscar arquivos.
3. Reutilizar a reserva, o armazenamento por espaço e a confirmação autoritativa existentes. Conferir referências no commit e protegê-las no histórico e na remoção de arquivos. A falta de uma peça deve aparecer como erro de recurso, sem transformar silenciosamente o relevo em zero.
4. O leitor e o palco genérico devem usar as mesmas amostras e os mesmos triângulos para posicionamento e seleção no terreno. Preservar a geometria de referência e os recortes necessários à conversão; os dados de lago e caminhos permanecem no documento para os respectivos lotes.
5. Criar um conversor específico da fonte do Arquipélago fora do núcleo e do motor genéricos. Amostrar `alturaComRelevo`, inclusive os carimbos autorais, usando a versão de origem conferida. Manter registros de origem, hashes e contagens; não sobrescrever a fonte antiga.
6. Exercitar a composição original e os projetos preservados no host local. Conferir alturas em pontos e bordas, posições, referências, relevo autoral e integridade após reabrir. A publicação e a prova completa nos dois apps continuam no encerramento global, conforme a usuária.

## Critério para fechar o lote 2

Formatos e bibliotecas completos dentro do escopo do lote, chãos disponíveis, acervo mapeado e Faísca convertida com alturas reais e autoria preservada; testes e revisão aprovados. Não confundir o suporte mínimo de importação do relevo com a conclusão das ferramentas de terreno. Só depois retomar o lote 3.
