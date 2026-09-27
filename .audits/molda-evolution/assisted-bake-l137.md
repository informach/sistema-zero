# Portabilidade de poses assistidas, lote 137

## Prova de integração

Fixture monta um vínculo real, acrescenta a ponta, configura flexão 30–130° e
grava três poses com o solver de dois segmentos. Os dois primeiros destinos são
alcançáveis; o último é limitado. Outro clipe recebe conjuntos espelhados pela
mesma API da oficina. Não usar trilhas escritas à mão como substituto dessa cadeia.

Nos espaços local e local-delta, worker real e encoder síncrono geram o mesmo
resultado. Validador independente não encontra erros; os três avisos esperados
de malha skinned fora da raiz continuam explicitados. GLTFLoader/SkeletonUtils
criam duas instâncias e AnimationMixer reproduz clipes distintos. 121 tempos
por instância, cada canto das três malhas, pai afim e espelhos em X/Z coincidem
com deformação nativa dentro de 0,00002 unidade. Esqueletos/bones são independentes,
geometria é compartilhada; parar uma instância não muda a outra. Descarte de
skeletons, materiais, geometrias e mixers respeita essa propriedade.

O resultado é bake das poses gravadas em canais comuns. Entre as chaves, valem
as curvas nativas: não há restrição IK ativa nem promessa de seguir o alvo
continuamente. `bend-limit-omitted` continua exigindo aceitação explícita, e o
GLB não contém guia/limite editável. Nenhum vínculo/base/arquivo fonte é reescrito.

## Correção encontrada no review

Abrir Exportar GLB chamava cancelamento global mesmo com pose ainda em prévia,
descartando-a sem decisão do usuário. Três testes RED reproduziram disponibilidade
indevida para pose direta, assistida e conjunto. Agora o botão fica indisponível
enquanto há pose pendente/arraste, com motivo visível e aria-describedby. O handler
também verifica o estado vivo antes/depois das interrupções, inclusive quando o
clique chega antes de React desenhar o estado disabled. Não há gravação automática.

O seletor de assinatura observa apenas pending/dragging; não re-renderizar o
cabeçalho a cada matriz de movimento. Gravar libera a exportação e mantém um undo.
Fonte e prévia ficam intactas na tentativa bloqueada.

A primeira suíte integral encontrou um contrato antigo que exigia cancelar a
pose implicitamente ao exportar. O teste foi atualizado para exigir a decisão
explícita, mantendo preparação pelo worker, fonte canônica, ausência de histórico
e pausa da reprodução. Não remover a cobertura nem reintroduzir descarte para
satisfazer o comportamento anterior.

## Evidência

Focais: cinco testes, zero falhas, 8.785 expectativas. Tipos e Biome/719 passaram.
Integral final: 1.654 testes, zero falhas, 242 arquivos, 110,86 s e 8.196.193
expectativas. Tipos, Biome/719, Vite/1,25 s e Kids (22,3 s de compilação,
12,7 s de tipos, 59 páginas/675 ms) passaram. Diff check passou. Os testes não
homologam GPU, desempenho de dispositivos, importação editável ou ativação
pública do formato.
