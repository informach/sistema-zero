# Envelope GLB/glTF, lote 138

## Escopo e revisão

Leitor puro identifica pelos bytes, confere contêiner/JSON/versão e devolve dados
próprios. Não é leitor de malha, validação semântica completa nem importador já
disponível à criança. Nenhuma URI é resolvida, extensão executada ou criação escrita.

Revisão contra glTF 2.0 §§2.5–2.8, 3.2 e 4.4: JSON único/primeiro, BIN opcional
e segundo, cabeçalho e chunks little-endian/alinhados, tipos desconhecidos
identificados mas não interpretados. JSON-only não exige BIN. Comprimento exato
do arquivo e cada intervalo são conferidos antes do acesso; versões de contêiner
e asset são verificadas separadamente.

minVersion, quando presente, determina suporte; sem ele, versões menores futuras
da família 2 são aceitas. Comparação decimal por dígitos não usa Number nem arredonda
versões enormes. JSON.parse preserva a regra de última chave; UTF-8 é fatal para
bytes malformados e tolera BOM. Campos desconhecidos continuam dados, inclusive
__proto__ próprio; não há merge para protótipos.

Antes de criar o grafo JSON: máximo 32 MiB, profundidade 128, 1.000.000 aberturas/
separadores fora de strings. Contêiner aceita até 1.024 chunks. Limite do produto
gera budget, não invalid. O preflight não substitui a gramática JSON. Esse trabalho
continua síncrono/puro para futura tarefa cancelável; não se anuncia ausência de
long tasks no thread de UI com arquivo extremo.

BIN é copiado por construtor Uint8Array, não slice que pode ser Buffer.slice.
Offsets do chamador são respeitados; a saída não retém todo o backing do arquivo.
Memória compartilhada e backing não pertencente ao realm de ArrayBuffer são
recusados, sem tentar tirar snapshot concorrente. Padding do BIN e referências
de buffers serão conferidos no próximo leitor, não implicitamente homologados aqui.

## Evidência

Sete testes de domínio: fixtures de bytes independentes, todos os prefixos
truncados, falhas de cabeçalhos/chunks, versões, Unicode, propriedade de buffers,
limites exatos e exportações reais de textura/animação/skin/IK. A primeira execução
encontrou erro no teste de integração: ele passou o resultado inteiro do encoder,
não result.bytes. Corrigido na chamada, sem afrouxar o leitor.

Focais com teste de pureza: 29 passaram, zero falhas, 379 expectativas. Tipos e
Biome/724 passaram. Integral: 1.662 testes, zero falhas, 243 arquivos, 115,56 s e
8.196.509 expectativas. Vite/1,30 s e Kids (6,2 s de compilação, 9,7 s de tipos,
59 páginas/5,8 s) passaram. Diff check passou. Sem homologação de navegador, GPU,
hardware infantil, importação editável ou ativação pública.

Fonte: [especificação Khronos glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
