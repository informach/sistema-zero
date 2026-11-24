# Gravador 6 — ensaio autenticado e revisão intermediária

O frontend Community publicado pela outra sessão na fonte 61ef foi usado tal
como disponibilizado. Nosso operador não solicitou deploy: parou ao encontrar
a publicação concorrente. A CI completa dessa fonte falhou em quatro JSONs de
evidência; a correção preserva os valores e está em revisão-ci-formatacao.
As novas qualificações do gravador ab39 e do leitor 1ec estão em andamento.

## Comprovado nesta máquina

1. A galeria real enviou Vila e Cabana antes ausentes: reserva declarando 6,
   PUT real ao R2 e commit HTTP 200. Não foi semeado um blob manualmente.
2. Outro contexto autenticado, com IndexedDB independente, abriu a Vila e
   conservou os seis hashes nativos. Seu observador não registrou as descidas;
   a comparação dos documentos é a evidência, não uma captura desse transporte.
3. Pedidos de transporte simulando escritores 4/5 e leitores 4/5 receberam
   409 CREATION_CLIENT_OUTDATED; B6 com base vencida recebeu CREATION_STALE_BASE.
   Nenhuma URL de PUT foi emitida, nem mudou um resumo da conta.
4. Uma borrachada real do frontend B apagou a célula 3 e confirmou revisão 2.
   Só o documento da Vila mudou entre os seis recursos autorais.
5. O editor B foi fechado. Offline, a aba A carregada antes do rollout apagou
   a célula 4 de seu snapshot anterior. O documento principal conservou a edição
   de B e nasceu uma única cópia com a edição de A. Dois realms novos leram
   o mesmo ID/hash da cópia e o mesmo hash do principal, sem rede.
6. A cópia foi identificada por hash antes de ampliar a permissão HTTP do
   ensaio exclusivamente para esse novo recurso próprio. Depois da reconexão,
   ela apareceu na conta como formato 6/revisão 1. O observador da página nova
   não registrou seu upload: não usamos esse observador como prova do PUT dela.
7. Downloads autenticados reais dos três mapas foram lidos pelo parser nativo
   público do Pinta, sem avisos. Os documentos completos coincidem com os hashes
   locais: principal 22e03586…, Cabana 241e873c…, cópia c68d4756….
8. Arquivos, blocos e estado do programa JavaScript permanecem byte equivalentes
   na comparação canônica (hash conjunto 635ecbae…). O Estúdio não foi aberto
   para atualizar sua cena neste ensaio; essa atualização pertence ao lote seguinte.

## Revisão dos resultados

O primeiro comparador da cópia assumia IDs internos iguais. A investigação do
contrato existente cloneWithNewIds confirmou que uma cópia independente recebe
novo relógio, IDs de camadas/objetos/versões e referências religadas. O comparador
agora verifica uma bijeção de 25 IDs. Todo o restante do documento coincide,
normalizando somente identidade/relógio e as duas células editadas. Nenhuma
fonte funcional foi alterada para fazer o comparador passar.

O booleano de repetição do primeiro coletor já aparece verdadeiro na primeira
leitura; ele não fundamenta o aceite. A prova contra duplicação usa os dois
IDs, hashes e contagens concretos dos registros 024 e 025, que são idênticos.

A tentativa de atestar outro contexto como A falhou e não é considerada prova
de leitor A. O testemunho original continua carregado com seus 26 scripts
atestados; a leitura de nuvem no rollback publicado ainda deve ser executada.

Este lote testa CAS entre snapshots A/B que compreendem nativo 7. A recuperação
de um escritor que corta o schema da issue 026 tem seu ensaio histórico próprio;
não confundimos os dois casos. Não há prova nova de aplicativo HTTP iniciando
do zero offline, de outro aparelho físico ou de uso por crianças.

**Etapa 0 ainda aberta:** falta qualificar e executar o rollback publicado
B → A → B, conservando backend, Worker e distribuições comuns. Também continuam
abertas as regiões públicas, persistência 3, autorregras, projeções e a homologação
final de toda a missão. Nenhum desses itens é declarado concluído por este lote.

O índice guarda hashes dos recibos brutos comprimidos. Nenhuma credencial,
cookie, estado de autenticação ou URL assinada foi arquivada.
