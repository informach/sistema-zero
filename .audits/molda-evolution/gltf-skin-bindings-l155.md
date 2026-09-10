# Conversão de vínculos de skin glTF, lote 155

## Escopo e política

`convertGltfSkinBindings` compõe os mapas da geometria e hierarquia da mesma fonte
imutável. Gera bindings nativos próprios; não grava, converte clipes/materiais ou
aprova o relatório completo de importação. IDs por instância, não por skin fonte.
Juntas mantêm ordem e IBM autorado. Ausência de IBM vira identidade, nunca captura
automática de uma pose de repouso inventada. Matrizes excedentes já conferidas
na leitura não são usadas além da quantidade de juntas da skin.

Pesos ficam exatos por padrão, dentro da tolerância nativa existente (1e-8), sem
afrouxá-la. Somente a opção explícita `weights: normalize` permite normalização
quando necessária, pelo normalizador nativo. Relatório por binding conta os
vértices afetados, incluindo primitives e instâncias, e registra maior erro de
soma anterior. Opção normalize não reescreve pesos que já satisfazem o contrato.

Slots zero não têm influência e são removidos da lista nativa; todos os positivos
mantêm ordem de conjuntos/slots. Nada de sorting, pruning para quatro, merge ou
osso inventado para soma zero. Mais de quatro influências positivas e vértices
sem força são unsupported, não arquivo glTF inválido. Influência positiva que
desapareceria em Float32 após normalização também impede conversão. A fonte
continua intacta e disponível para uma decisão posterior.

## Arquitetura e orçamentos

- Planejador conta vínculos/juntas/vértices por instância antes de valores ou
  buffers de pesos: 128 bindings, 256 juntas por binding, 131.072 vértices no total.
  Não contar somente geometria única quando várias partes compartilham a forma.
- Mapas de origem precisam corresponder ao mesh/primitive/count nativos. Uma
  primitive sem POSITION já possui perda no relatório de geometria e não cria
  pesos órfãos; vínculo inteiro sem pontos editáveis não é materializado.
- Hierarquia mantém mundo original. Native palette exige inverse(meshWorld);
  IBM também exige inversa segura pelo leitor nativo. Conferir antes de templates,
  sem desativar skin, mover malha para raiz ou trocar matriz por identidade.
- Compilar cada layout selecionado uma vez; templates compactos possuem índices,
  pesos e contagem. Cache restrito à conversão, sem source/arrays retidos na saída.
  Matrizes preparadas por skin e copiadas por binding. Cada lista de influências
  pertence ao seu vértice, inclusive em geometria compartilhada.
- Erros de pesos apontam para a primitive fonte e identificam o ponto na mensagem,
  não para um índice interno de cache sem relação visível com o arquivo.

Esse limite de trabalho não é medição de pico de memória, GPU ou desempenho em
dispositivo. Matriz de junta animada e orçamento final do documento continuam
sujeitos aos gates de pose/desenho, não garantidos só pela conversão inicial.

## Review e testes

Oito testes cobrem ordem de juntas/IBM, matrizes extras, slots zero, múltiplos
conjuntos, U8/U16 normalizados, ownership entre vértices/primitives/instâncias,
opção de normalização e relatório. 0,2/0,8 em Float32 ultrapassa a tolerância
nativa e exige opção; 1 + 2^-28 permanece exato dentro dela. 2^-149 positivo
permanece quando representável; normalização que o apagaria é recusada.

Cinco influências, soma zero, IBM singular, mundo da malha singular e orçamento
excedido falham sem reparo. Getter sentinela de pesos não é acessado antes de
recusar IBM; limites de 256 juntas e 131.072 vértices, ambos exatos e excedidos,
também são testados. No limite com duas instâncias, os accessors de juntas/pesos
têm uma leitura cada. Mapas ausentes/repetidos/incompatíveis são recusados.

GLBs reais produzidos por IK/poses local e local-delta, com dois espelhos, passam
por exportação, leitura, geometria, hierarquia e conversão de bindings. Documento
nativo montado no teste passa pelo leitor. Deformação dos três bindings é comparada
ao Three/AnimationMixer nos dois clipes e cinco tempos fora de ordem; samplers
glTF já implementados fornecem poses aos nós nativos, sem simular conversão de
clipes ainda inexistente. Matrizes/weights de binding vêm do conversor real,
não de uma montagem manual. Recursos e mixer são descartados.

## Falha encontrada na integral e correção de ownership

A primeira integral deste lote falhou em uma prévia de superfície existente:
o painel não fechava após revisão externa quando o worker já havia terminado.
A sessão só percebia a revisão no próximo resultado/confirmar; por isso repetir
o teste original isoladamente passava, sem resolver o defeito. Nova regressão
aguarda o resultado completo e então altera o documento, tanto no caminho local
quanto no worker real. Falhou antes da correção, sem depender de atraso arbitrário.

O hook agora assina revisões de conteúdo e encerra a entrada antiga imediatamente.
Preserva a seleção para exibir o aviso, descarta os recursos e nunca restaura
sobre a alteração externa. Metadados sem revisão de conteúdo não cancelam.
Callbacks capturam o dono da entrada, não a sessão atual. Uma publicação pode
disparar assinante que cancela ou inicia outra prévia: o resultado antigo não
ressuscita o dono nem limpa ferramenta, erro ou seleção do sucessor.

O coordenador comum expõe ownership vivo e distingue a própria publicação
da escrita reentrante. A revisão só é incorporada se a publicação ainda pertence
ao mesmo dono e documento. Exceções e substituições revogam o dono anterior.
O gesto de malha guarda IDs reproduzíveis por entrada, sem cache de revisão
duplicado. Testes cobrem publicação própria, revisão aninhada, cancelamento,
substituição, exceção e undo do sucessor. Consumidores legados permanecem na
suíte integral. Não foram adicionados timers nem tolerâncias maiores aos testes.

No primeiro teste vermelho, imprimir um HTMLElement nulo esperado fez o runner
expandir o grafo DOM/React. O processo exato desta execução foi identificado e
encerrado; a nova asserção usa comparação booleana equivalente, com diagnóstico
limitado. O teste original não foi alterado. Nenhum processo do usuário foi parado.

## Evidência

Oito testes de bindings: zero falhas, 501 asserts, 1,189 s. A primeira integral
teve 1.891 passes e uma falha, diagnosticada acima. Tipos após a correção passam;
o primeiro typecheck do novo teste encontrou somente um narrowing nullable no
oráculo, corrigido com guarda explícita. Biome: 808 arquivos, sem correções.
Regressões de superfície: 40 passes, zero falhas, 461 asserts, 16,37 s. Ampliação
core/estado/workers/hook/SceneWorkshop: 479 passes, zero falhas, 5.616 asserts,
45 arquivos, 29,30 s. Integral final: 1.900 passes, zero falhas, 266 arquivos,
8.222.308 asserts, 101,76 s. Vite: 1,10 s. Kids: compilação 9,6 s, tipos 25,7 s,
59 páginas em 849 ms. Builds e diff check passaram; aviso de chunk Three >500 kB
permanece. Lote implementado e verificado.
Sem dependências novas ou alteração do formato público. Critérios de homologação
visual/GPU/toque permanecem abertos.
