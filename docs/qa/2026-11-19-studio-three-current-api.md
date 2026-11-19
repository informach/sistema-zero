# Three atual: exemplos e orçamento gráfico

## Decisão

O responsável confirmou em 19/11 que não existem jogos 3D de alunos em produção: há apenas os exemplos. A solução mantém o Three 0.184 no Estúdio e adapta esses exemplos; não cria um perfil legado para eles. A compatibilidade pedagógica dos cursos 2D permanece obrigatória.

## Causa e correção

A qualificação do commit 483a34573 revelou avisos reais de depreciação: `THREE.Clock` nos exemplos e `PCFSoftShadowMap` no orçamento compartilhado. Os avisos continuam sendo capturados pelos testes de navegador.

Os 13 exemplos com relógio agora instanciam `THREE.Timer` e executam `update()` uma vez, no início de cada quadro, antes de obter `getDelta()`. A alteração está na IR nativa, com blocos editáveis; não há transformação em código opaco. O seletor de classes oferece Timer. O Timer é utilizado sem conectar listeners de documento adicionais.

O orçamento compartilhado dos três motores usa PCF, suportado pela versão atual. As resoluções continuam 2048 no nível alto e 1024 no leve; os limites de pixels, efeitos, MSAA e descarte não foram relaxados. Não há escolha de filtro por versão histórica.

## Evidências locais

- Antes da implementação: três falhas reproduzidas nos testes de exemplos e orçamento (85 passaram).
- Depois: 88 testes, 852 asserções, zero falhas.
- Regressão de exemplos, três motores e campos Blockly: 2.552 testes, 45.512 asserções, 115 arquivos, zero falhas (74,36 s).
- Checagem completa de tipos do Estúdio: código de saída 0.
- Documento público 3D no Chromium: preview e exportação passaram, três ciclos de carga/desenho/descarte por caminho (2 testes, 7,8 s).
- Biome: cinco arquivos verificados, sem erros.
- Os testes existentes de validade de IR, ausência de rawJS, geração de código e construção de workspace continuam ativos.

## Qualificação restante

A amostra da galeria Chromium terminou com 3 passes e 3 falhas, sem retries. Passeio 3D e Patrulha Espacial passaram com controles. Os três casos GLB/HDR (um por motor) falharam na exigência de console limpo por avisos `THREE.WebGLProgram` / `X4122` de precisão numérica do compilador de shaders local. Os avisos de Clock e PCFSoft não apareceram nesses casos. Não foi adicionada filtragem de diagnósticos nem redução de qualidade para fazer os testes passarem. Essa ocorrência precisa ser investigada e comparada com a qualificação Linux; não é declarada resolvida. Esses resultados não substituem a homologação completa da missão. Os pins do executor Pro e da imagem hospedada ainda precisam ser unificados com a versão atual: este registro não declara essa integração concluída. Não houve implantação, merge em staging nem medição de FPS em aparelho físico nesta alteração.


## Investigação posterior do aviso Windows

A reprodução mínima com o pacote Three oficial 0.184.0, uma caixa MeshStandardMaterial e o HDR sintético dos testes também produziu X4122. A captura nativa de getProgramInfoLog identificou o programa de convolução PMREM; não usa os motores do Estúdio. A captura devolve o resultado original da API e não filtra o console. O ensaio não é uma medição de desempenho.

O mesmo comportamento e os mesmos valores numéricos estão documentados na [issue oficial Three #32692](https://github.com/mrdoob/three.js/issues/32692). Os mantenedores identificaram o aviso de precisão na cadeia ANGLE/HLSL do Windows e decidiram preservar o cálculo. Isso distingue o aviso X4122 de erros de divisão por zero e de falhas de compilação: não se deve ignorar qualquer aviso genérico de WebGL. Nenhuma biblioteca, shader ou configuração de qualidade do produto foi alterada para ocultar a ocorrência.

A unificação dos pins foi concluída em ec060ad92; consulte `2026-11-19-studio-three-single-version.md`. A qualificação dessa revisão está no run GitHub 44542629949. O registro de pendências acima representa o momento da primeira correção, não uma segunda implementação de Three em paralelo.


## Fontes de referência e prova integral da Ponte

O run ec060ad92 encontrou 13 guardas de drift reprovados: a IR dos exemplos já havia sido migrada, mas as fontes JavaScript embutidas nas fixtures específicas desses exemplos ainda instanciavam Clock. Foram migradas as 13 fontes para Timer com update antes de getDelta, mantendo a comparação integral entre a IR embutida e o parser. Não foram removidas as verificações de fixpoint textual ou IR → Blockly real → IR → código. As fixtures genéricas que exercitam classes históricas continuam intactas.

Após a correção, toda a pasta de parsers passou: **641 testes, 2.725 asserções, 75 arquivos, 14,21 s**. A integração com v4 também encontrou uma fixture de atualização do Vite usando a versão antiga do Three como dependência incidental; agora usa a versão canônica. Um teste adicional exige que um pin Three incompatível seja recusado sem reescrever qualquer arquivo do projeto: **5 testes, 49 asserções, sem falhas**. O produto não ganhou uma migração automática de dependências autorais.
