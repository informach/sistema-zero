# Autoridade local compatível com clientes antigos

O registro `pinta:asset:<id>` é conhecido por gravadores já publicados. Sua recusa de
leitura não impede autosave da RAM antiga. Por isso um guard apenas no gravador novo
não resolve 026.

Decisão: conservar banco/store, usando registros protegidos fora desse prefixo, com
envelope versionado, revisão local e documento nativo completo. O registro antigo é um
espelho. Autoridade, espelho, recuperação e lápide são alterados na mesma transação
readwrite. Migração é por documento; não há troca destrutiva de banco nem rede no autosave.

- Divergência do espelho: conservar a autoridade e recuperar a edição antiga como cópia.
- Duas instâncias atuais: revisão observada impede um snapshot antigo de substituir o novo.
- A origem acompanha a linhagem editada por símbolo em memória, conservado pelos spreads.
  A leitura da galeria não promove uma RAM antiga; somente o commit da própria linhagem
  avança sua revisão. O símbolo não entra no structured clone/JSON. Adaptadores herdam
  a origem do snapshot que estão substituindo, nunca de uma checagem posterior de horário.
- A primeira leitura de um mapa/tileset/conjunto legado estabelece autoridade antes de
  entregar RAM. Não depende de o primeiro autosave acontecer antes da outra aba.
- A nuvem registra a revisão nativa realmente sincronizada junto ao floor existente.
  Relógios iguais não tornam uma revisão nativa diferente intocada no segundo passe.
  Marcas antigas sem essa base são tratadas conservadoramente uma vez; o reconciliador
  oferece um hook opcional, conservando os contratos dos demais consumidores.
- Exclusão: lápide protegida impede ressurreição do ID; escrita antiga pode virar cópia.
  Observar a lápide não autentica RAM que conserva origem anterior. Uma restauração de
  backup sem origem de edição usa a revisão da lápide explicitamente lida; a galeria
  continua importando backups com IDs novos. O delete visual passa sua base para CAS.
- Capacidade futura/corrupção: recusar antes de sanear/gravar e apresentar aviso existente.
- Falha/quota: abortar toda a transação, sem apagar o documento anterior para liberar espaço.
- Retenção: um checkpoint corrente por documento, não histórico ilimitado. Cópias são assets
  reais e contam no orçamento. Leitura, lista, captura e orçamento usam o mesmo resolvedor.
  Exclusão de cópia libera seu payload; fica uma lápide compacta por ID. Não há expiração
  automática de lápides, pois uma aba publicada pode escrever de novo muito depois.

Custos: autoridade e espelho conservam duas cópias estruturadas do payload protegido;
o teto portátil continua32 MiB, sem duplicar entradas no backup. Quota física do navegador
é independente desse teto e toda recusa aborta a transação. Não há aumento dos limites
de células/camadas/peças. Os saves de galerias com documentos protegidos leem a galeria
na transação para orçar recuperações e escritas de clientes que não atualizam um índice.
Esse custo é O(galeria), sem alegação de streaming ou benchmark físico. Leituras/capturas
normais carregam o fecho de dependências; a galeria só de sprites mantém o inventário
incremental existente. A medição com502 assets fica no relatório específico da correção.

Execução: regressão vermelha → núcleo/IO transacional → integração das leituras/escritas e
feedback existente → casos de concorrência/falha/perfil → IndexedDB real e baseline antigo
real → gates e registro da entrega. A instrução posterior do usuário determina
integração em staging sem PR. Nenhuma alteração da identidade visual ou de Molda 3D.
