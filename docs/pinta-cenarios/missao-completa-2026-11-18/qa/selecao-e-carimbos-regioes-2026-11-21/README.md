# Seleção e carimbos por regiões — 21/11/2026

A seleção existente e o carimbo compartilham agora o leitor de células e um
escritor de gestos heterogêneos. A oficina densa usa as mesmas funções; o
modelo interno de regiões mantém origem, IDs e snapshots anteriores. Não há
outro editor, alteração de identidade visual ou ativação do formato público 8.

O teste inicial reproduziu cinco falhas: seleção fora da coluna alcançava a
linha seguinte, recorte inválido podia apagar parte do mapa, colagem aceitava
peças fora do formato, carimbo malformado produzia gestos parciais e seleção
não lia a origem negativa. Recortes inválidos agora retornam carimbo vazio e
preservam o mapa; gestos inválidos são recusados antes de escrever.

O orçamento por gesto é de 65.536 células, tanto para a oficina atual quanto
para regiões. Buracos continuam sem apagar peças existentes; peças válidas
de carimbos obsoletos são ignoradas quando excedem a folha atual. A validação
do formato recusa o lote inteiro se houver referência impossível. Giros e
espelhamentos permanecem nas células completas.

Vinte e dois testes focados passaram, incluindo 32 cenários determinísticos
comparando seleção/recorte/colagem densa e por regiões, conservação dos
snapshots e uma extensão lógica de 10.000 × 10.000 com poucos chunks ocupados.
Isso comprova operações internas limitadas, não fluidez, streaming ou uma
interface expansível já disponível.

A primeira integração do leitor usou incorretamente a interface como função;
o ensaio falhou e foi corrigido para o método público `at`. A primeira suíte
completa encontrou somente duas falhas na lista arquitetural: dois módulos
deixaram de ler buffers diretamente e o escritor comum passou a fazê-lo.
Após conferir esse escritor e registrar sua responsabilidade, a lista foi
atualizada mantendo a exigência de ausência de decodificadores pendentes.
Os logs intermediários foram conservados.

Na rodada final passaram 2.334 testes do Pinta, tipos completos do Pinta e do
Estúdio, lint e 12 fluxos locais no navegador. Os três testes dependentes do
Pygame foram reexecutados com o motor real. As provas de navegador abrangem
os caminhos existentes Pinta → Estúdio; não substituem a futura oficina de
regiões, rollout autenticado, aparelhos físicos adicionais ou uso com crianças.
