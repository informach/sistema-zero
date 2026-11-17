# Lote 2 — Conversão da Faísca e recursos de relevo

17/11/2026 · branch `staging` · lote 2 implementado, testado e revisado localmente.

Esta etapa completa a importação da Faísca prevista no lote 2. Os formatos, o acervo, os metadados e os chãos estão registrados nos relatórios anteriores, em especial [chãos e texturas](revisao-lote2-texturas.md). A revisão, a regressão e as verificações de compilação abaixo passaram. A implantação e a validação remota permanecem no encerramento global, conforme a orientação da usuária.

## O que foi implementado

- Base genérica de terreno com origem, passo, extensão, fundo e referências por SHA-256. Cada peça contém 65 × 65 amostras Uint16, cabeçalho versionado e tamanho fixo de 8.474 bytes. O documento não incorpora os arquivos nem usa um registro global de alturas.
- Fonte explícita de alturas, malha em coordenadas locais, normais contínuas entre peças, recortes geométricos e seleção com o BVH já existente. Consulta, desenho e posicionamento usam os mesmos triângulos. Não há plano sobreposto ao relevo, e um arquivo ausente ou inválido não vira um terreno plano.
- Carregamento cancelável, até quatro arquivos por vez, conferência de hash e cabeçalho, proteção contra respostas atrasadas e descarte idempotente. A oficina mostra espera ou erro e só oferece os ajustes que dependem do chão quando o recurso estiver pronto.
- Identidade da base independente da ordem das chaves do JSONB. As notificações do palco carregam a identidade da leitura correspondente, evitando associar uma resposta à base errada.
- Reserva dos recursos pelo cenário autorizado, no mesmo espaço e cota dos outros arquivos. O navegador envia diretamente por PUT condicional. O BFF lê os bytes, confere hash e formato e encaminha uma prova pela rota HMAC; o navegador não fornece a prova.
- Confirmação das peças e gravação do lote na mesma transação, sob a trava do espaço e depois da conferência de revisão e idempotência. Falha de referência, intervalo ou modelo provoca rollback. O cabeçalho confirmado fica associado ao arquivo.
- Histórico, fotografias, cópias e remoção conservam as referências. Apagar um cenário ou mundo solta somente arquivos sem uso, incluindo os antes usados pelo histórico removido; uma cópia ou outra conta continua protegida. O BFF usa a limpeza de armazenamento já existente, depois da resposta.
- DDL `0157_tiresome_shen`, gerada pelo comando do repositório. Acrescenta o papel `terreno`, MIME binário e metadados de cabeçalho, com restrições no banco. Um terreno não é considerado imagem de capa ou miniatura.

O suporte mínimo de leitura foi necessário para importar a Faísca corretamente. Pincéis, pintura por camadas, resolução editável, receitas e importação de mapas de altura continuam no lote 4. Este relatório não os declara implementados.

## Conversor e preservação

O comando `scripts/molda-cenarios-converter-faisca.ts` recebe `--fonte`, `--catalogo`, `--publicacao` e `--saida`. Ele lê um documento v1 ou o invólucro de uma revisão preservada, valida o catálogo e resolve cada peça por **origem, caminho e digest** na publicação real. A ponte arqueada possui duas variantes com o mesmo caminho; elas não são intercambiadas.

A fonte de geografia é `46b0ed92f`. O comando confere os quatro arquivos relevantes contra esse commit antes de produzir a saída. O contexto é o do editor v1; a variante de ensaio do `/macro`, dependente da URL, não é inferida nem ativada. O adaptador recusa esse contexto alternativo. As saídas são imutáveis: reexecutar com o mesmo conteúdo é permitido, mas uma versão diferente exige outra pasta.

O assentamento usa o mesmo cálculo e os recortes do editor anterior. O adaptador conserva a posição visível calculada e registra a intenção de apoio anterior nas propriedades de cada objeto. O algoritmo de recorte ficou no núcleo puro; os adaptadores de buffers Three no jogo e no Molda não criam uma dependência do jogo na plataforma. Os testes de fronteira permanecem obrigatórios.

Foram gerados, em área privada de `output`, o original e os dez projetos preservados:

| Fonte | Instâncias | Modelos usados | Carimbos autorais |
| --- | ---: | ---: | ---: |
| Composição original | 523 | 42 | 0 |
| Projeto de base completa | 524 | 43 | 0 |
| Estudo das referências com relevo | 554 | 47 | 1 |
| Outros seis projetos de 554 instâncias | 554 cada | 46 cada | 0 |
| Dois projetos de 523 instâncias | 523 cada | 42 cada | 0 |

Cada resultado tem 54 peças de altura, sete caminhos, um lago e 26 marcos. A resolução de importação é de 4 m, com erro máximo de quantização de aproximadamente **0,771 mm**. Os contornos de recorte do lago e da escada foram preservados.

Nenhum projeto da API antiga foi alterado ou apagado. Os invólucros privados, os GLBs licenciados e as credenciais permanecem fora do Git. O backup dos dez cabeçalhos está em `output/cenarios-reforma/conversao-faisca/fontes/1794905362478`; as revisões anteriores continuam no banco antigo e precisam permanecer preservadas até a limpeza do lote 10. A conversão dos cabeçalhos não é uma alegação de migração de todo o histórico antigo.

## Falhas encontradas e corrigidas na revisão

1. **Lago e poço interrompiam o desenho.** Esses GLBs possuem morph targets; o palco usava suas geometrias diretamente em instâncias que não tinham os pesos correspondentes. A vista de edição agora materializa a pose inicial em geometrias próprias e conserva a raiz e o arquivo animáveis. O guindaste também conserva sua pose com esqueleto. Não se trata de implementação de animações do modo Testar.
2. **Atributos inteiros normalizados não comportavam a pose materializada.** O teste reproduziu erro de aproximadamente 4,9 m ao gravar a deformação no atributo quantizado. O resultado passa a usar Float32; o teste compara posições e normais com o próprio Three e passou após a correção.
3. **Compartilhamento inicialmente violava a fronteira do jogo.** A regressão recusou uma importação de `molda/palco` no Arquipélago. O cálculo foi colocado no núcleo puro e a dependência foi removida, sem alterar a lista de permissões do teste.
4. **Remoção poderia deixar alturas confirmadas sem uso.** A coleta agora considera a cabeça, as fotografias e os comandos/inversos, protegendo os arquivos ainda referidos por outra cópia ou outro espaço. O host local segue a mesma regra para seus recursos de relevo.

## Evidências locais

Verificações direcionadas já executadas nesta revisão:

| Recorte | Resultado registrado |
| --- | --- |
| Núcleo | 63 testes, 202 asserções |
| Motor | 19 testes, 88 asserções; pose, seleção, bordas, cancelamento e descarte |
| Oficina e hosts | 35 testes, 228 asserções; envio de 51 peças em duas reservas e isolamento de espaço |
| Members, serviço e HTTP | 34 testes, 130 asserções |
| BFF e conteúdo | 31 testes, 147 asserções |
| Gateway | 5 testes, 221 asserções |
| Postgres descartável | 17 testes, 126 asserções |
| Fronteira, recorte e conversor do jogo | 16 testes, 3.271 asserções |
| Suíte completa do Arquipélago | 2.147 aprovados, um teste opcional de Postgres pulado; zero falhas, 273.690 asserções |
| Tipagem | Núcleo, motor, oficina, Molda, Members, member-shell e Arquipélago passaram |
| Compilação do jogo | 188 arquivos, 49,14 MB; saída local aprovada |
| Lint geral | Exit 0, 15.067 arquivos; avisos existentes de tamanho/estilo fora deste recorte |

O Chrome abriu o original e o projeto com carimbo autoral nos temas claro e escuro, em 1.440 e 390 px, colocou um modelo sobre a altura real, alterou sua altura e reabriu a edição sem perder o relevo. Também foi exercitada a reentrada com resposta antiga atrasada, o descarte e o erro explícito de arquivo adulterado. Nenhuma passagem apresentou erro de página ou rolagem horizontal. A largura de 390 px é emulação, não um ensaio em aparelho físico.

Os dez projetos foram convertidos novamente pelo comando definitivo: hashes das fontes e das saídas permaneceram iguais. A verificação inclui os sete caminhos, o lago e os 26 marcos de cada cabeçalho.

Evidências versionadas: [original claro](evidencias/lote2-conversao/original-claro.png), [original escuro](evidencias/lote2-conversao/original-escuro.png), [original em 390 px](evidencias/lote2-conversao/original-390.png), [estudo autoral](evidencias/lote2-conversao/estudo-claro.png), [estudo em 390 px](evidencias/lote2-conversao/estudo-390.png). Os resultados sem dados privados estão em [conversões](evidencias/lote2-conversao/conversoes.json), [original](evidencias/lote2-conversao/original.json), [estudo](evidencias/lote2-conversao/estudo.json) e [ciclo de vida](evidencias/lote2-conversao/ciclo-vida.json).

Os scripts reproduzíveis são `verificar-terreno.mjs` e `verificar-terreno-vida.mjs` em `packages/molda-cenarios/playground/oficina`. Resultados privados ficam em `output/cenarios-reforma/terreno-browser`, `terreno-autoral-browser` e `terreno-vida`. As miniaturas da carga local deste ensaio são imagens de referência; não substituem os retratos reais já publicados no acervo.

## Limites e encerramento global

- A conversão conserva os dados de caminhos, água, marcos e propriedades. Suas ferramentas completas e a composição visual correspondente continuam nos lotes 5, 6 e 7; esta vista de leitura do relevo não aprova a direção de arte da Faísca.
- A edição mostrada usa o palco genérico e o host local. Não houve concessão de progresso à conta do jogo nem substituição do `/macro` publicado.
- A integração com armazenamento foi testada no Postgres descartável e nas bordas locais. A prova completa do protocolo novo nos dois apps implantados permanece obrigatória no encerramento global.
- Não há declaração de desempenho aprovado em aparelhos físicos. LOD, carregamento de terreno em produção, ensaio com cápsula e orçamentos completos continuam nos lotes correspondentes.
- Com este recorte e os anteriores, o lote 2 está concluído no critério local definido pela usuária. A próxima etapa é retomar o lote 3 e seu trecho preservado. A validação de implantação não impede esse avanço.
