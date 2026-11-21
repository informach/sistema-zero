# Preparação do gravador de nuvem 6

Base: leitor A 4db9390c2ec732bbce034b4ffd7bee3be849489b. O único comportamento
de produção alterado é a declaração por tipo de mapas, folhas e conjuntos:
4 passa a 6. O teto de leitura permanece 6. Os codecs nativos, documentos,
imagens, cenas, permissões e interface permanecem os existentes. Os demais
arquivos alterados são testes, comentários e documentação.

O ensaio inicial reprovou a admissão do documento 7 na declaração anterior.
O teste do produtor real de subida, com a autoridade IndexedDB, foi depois
executado temporariamente com declaração 4 e recusado por
PintaClientOutdatedError. A fonte foi restaurada exatamente. Com declaração 6,
o mesmo ensaio preserva o documento inteiro, a colisão e os deslocamentos,
confirma baseRevision 0 e só avança a revisão após o callback de commit. O
produtor não reenvia o documento já confirmado. As regressões de concorrência,
exclusão e cópia confirmada continuam passando.

Passaram os seis gates congelados: Core completo (3.184 casos), tipos do Core,
95 testes do host, tipos completos do member-shell, perfil oficial e Biome.
A fixture isolada contém quatro casos, incluídos pelo wrapper da suíte do host.
As fontes ficaram congeladas durante esses gates.

O Worker tem os mesmos 1.968.118 bytes e SHA-256 91db4e8b7bd88075807e0ffcc61be18833910da2c273f336fafee361c23ac336
do leitor A. O perfil continua 069c2ea9…; recompilar Python produziu os mesmos
126 arquivos e hash Windows f30ac696… já comparados ao Linux qualificado
28da7a969…. Esta declaração não exige trocar a imagem ou o guest.

As tentativas de preparação também ficam registradas: uso incorreto do retorno
de assetFromJson na fixture, filtro Bun sem prefixo de caminho e acesso a schema
antes do estreitamento do tipo. Foram corrigidas apenas as chamadas/expectativas
dos testes; o código de produção não recebeu desvios para fazê-los passar.

Este lote está preparado, sem implantação. O leitor A precisa estar verificado
em staging antes do gravador B. A homologação real deve confirmar nuvem 6,
recusa dos clientes antigos, CAS, recuperação offline e rollback B → A → B.
O alvo A precisa conter a política Python selecionada. A prova local não
substitui esses ensaios nem conclui a missão ou a etapa 0b.

O remoto recebeu posteriormente 39fc593c3, ainda não implantado na última
consulta. Seus novos contratos de publicação/pausa exigem integração própria
antes da integração final; estas provas continuam fixadas na base acima.
