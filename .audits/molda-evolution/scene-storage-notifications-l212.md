# Lote 212 — avisos de revisão da oficina entre abas

Estado: implementado, revisado e verificado em 09/09/2026.

## Desenho dentro do plano aprovado

Alternativas consideradas: recarregar automaticamente (pode apagar gesto/histórico),
reler documento inteiro por aviso (clona pixels sem necessidade) ou aviso separado
com releitura do índice. Escolhida a terceira; a confirmação de gravação permanece
na transação CAS existente. Não inferir autorização para mesclar/sobrescrever dados.

Canal próprio por tupla banco/object store reais, não namespace global mutável.
Mensagem fechada de cinco campos primitivos; só emitida no complete da transação,
incluindo promoção local. Sem mensagem para conflito/aborto. Transmissor efêmero
fechado após envio; cada assinatura possui seu receptor e AbortSignal. Ausência
do recurso não reverte escrita já confirmada nem muda a proteção transacional.

Fontes primárias Context7 /mdn/content: BroadcastChannel API, postMessage e
IDBTransaction complete event; /pmndrs/zustand: vanilla StoreApi, composição e
assinaturas externas. Princípios das skills de estado: documento/histórico não
armazenam observação de disco; sem novo middleware/dependência/persistência duplicada.

Observer lê somente resumo/tombstone e não certifica documento/pixels. Serializa e
aglutina leituras, confere ownership e revisão local antes de publicar; escrita
local suspende decisão para não acusar o próprio commit. Mensagem, mesmo forjada,
nunca fornece token. Assinar antes de conferir cobre janela entre abertura e aviso.
Cleanup de última assinatura encerra canal; remount reabre e confere; foco/retorno
visível/botão conferem sem polling. UI avisa e mantém backup/edição/histórico.

## Verificações exigidas

Commit/aborto/CAS, promoção/restauração/remoção, isolamento de banco/store, protocolo
inválido/duplicado/fora de ordem, ausência de canal, cancelamento pendente/cleanup,
índice sem leitura de documento/originais, leituras em voo/remount/gravação local,
aviso no workshop sem substituição automática. Tipos/Biome/integral/builds após
focais; não alegar homologação em abas reais enquanto browser está indisponível.

## Revisão e regressões

Core inicial 8ed440: 34 testes/197 asserts, zero falhas. Observer inicial b0ee5a
encontrou expectativa nova com apenas uma peça no array, mas fixture possui duas;
substituída por igualdade do documento completo restaurado, mais forte.
UI b14a81: spy de accessor não suportado pelo Bun e nome de botão obsoleto no teste;
usar propriedade temporária restaurada em finally e interação real pelo menu/Caixa.
Tipos 4e3562/457412: opção `exact` não existe em getByRole; string de name já é exata.
Sem alterações de produto para contornar esses erros de teste.

Avisos de act reproduzidos isoladamente em 6e1248; instrumentação 086302 encaminhou
console.error original e capturou stack, com assert de nenhum erro falhando. Causa:
waitFor do Testing Library configura ambiente act=false enquanto um act externo
continua aberto; callback do observer atualiza o React nessa janela. Fonte instalada
pure.js asyncWrapper e react-dom-client isConcurrentActEnvironment conferidas.
Troca da espera aninhada por Promise da assinatura real, sem sleeps/flags globais,
supressões ou alteração de produção. 7ea820 passou; 6e73b6 repetiu 30 vezes, zero
falhas/avisos, 420 asserts/5,10 s. Assert de console vazio permanece com encaminhamento.
Não é a causa/correção da interação de TextureEditor pendente no lote 203.

Focal completo a04342/fedd62: 253 passes, zero falhas, 2.982 asserts/10 arquivos/32,88 s.
Revisão posterior encontrou token CAS associado só à revisão, não ao ID do editor:
troca indevida de ID poderia gravar outra criação com mesma revisão. Regressão
c0ff99 falhou (saved em vez de error) antes da correção. ID original agora é
capturado e conferido antes de chamar persistência; documento de outra identidade
não toca nenhum registro. b8584a: 13 passes/145 asserts/4 arquivos, zero falhas.

Ownership: cada subscribe tem entrada própria mesmo com callback repetido; última
saída chama unsubscribe e abort. Respostas de conexão/leitura antigas não atualizam
remount; no máximo uma leitura do índice em voo, sem pixels/originais. O índice pode
estar consistente com documento futuro/corrompido: teste deixa isso explícito e
prova que o CAS/reader completo ainda recusam escrita. Canal é aviso, não autenticação,
transporte de documento nem certificação de validade. Um erro de postMessage também
fecha transmissor e preserva commit (teste de fronteira do transporte).

## Evidência final

- Tipos 420101/97c359: exit 0. Biome b87373: 1.096 arquivos, sem correções.
- Integral 5ab0ab/833f0d: **2.655 testes, zero falhas**, 8.346.505 asserts,
  352 arquivos, 166,01 s. Sete logs de WebGL indisponível em MoldaApp, não suprimidos;
  nenhum novo aviso act nessa execução. O caso do lote 203 continua separado.
- Vite fabd8f: exit 0, 1,04 s. Chunk interno ScenePlayground 184,90→189,26 kB;
  índice 360,81→361,24 kB (copy compartilhada), CSS 53,20 kB inalterado. Workers
  bbmodel 214,41/glTF 183,09/OBJ 157,62 kB inalterados; Three 579,29 mantém aviso.
- Kids e6f5cc/155477: exit 0; compilação 7,6 s, tipos 12,9 s, 59 páginas/599 ms.
- Diff 6d0110: exit 0; três avisos CRLF preexistentes.

Limites: BroadcastChannel real do runtime de teste + IndexedDB transacional de
fake-indexeddb, viewport contratual sem WebGL e DOM de teste. Não são duas abas de
navegador homologadas, medições de desempenho de dispositivos ou validação com
crianças. Sem ativação de nuvem/formato público v2, merge, recarga automática,
reescrita de originais ou migração de schema. Próxima frente: começo rápido interno.
