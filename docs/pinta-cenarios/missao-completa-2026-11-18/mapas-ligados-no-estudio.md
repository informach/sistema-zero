# Mapas ligados em todas as entradas do Estúdio

Complemento da etapa 2a. Executar sequencialmente com `executing-plans`, preservando o programa,
o editor visual e todos os contratos legados.

O caminho **Jogar meu mapa** já percorre as portas e leva até 16 mapas. Os caminhos de envio
individual e “Trazer do Pinta” precisam usar o mesmo fechamento. A cena de cada mapa continua
separada; IDs preservam as ligações mesmo quando o destino precisa de um nome com sufixo.
Não criar outro editor, achatar relações ou embutir código de comportamento no Pinta.

- [x] Extrair de `EditorScreen.tsx` o fechamento de portas para
  `pinta/src/export/studioMapBundle.ts`. Capturar uma vista única; detectar destinos ausentes,
  ambíguos e excesso de 16 mapas antes de enviar. Reutilizar o exportador e seus tetos.
- [x] Usar esse fechamento no jogo pronto, envio individual e exportação da biblioteca. Na
  captura da biblioteca, conservar atomicidade da autoridade local ao descobrir destinos por
  ID ou nome e suas dependências, inclusive portas de conjuntos. Não ampliar a captura de PNGs
  Python que não pediu esse pacote. Criar regressões de ciclos, nomes e mapas autocontidos.
- [x] Transportar os mapas companheiros no adapter tipado do Estúdio; preservar os IDs da cena,
  as revisões individuais e os nomes já usados pelo programa. O host salva somente no perfil
  capturado. Validar todo o lote antes de qualquer gravação da biblioteca pessoal.
- [x] Adicionar uma entrada atômica para o lote no store do Estúdio, aproveitando os sanitizadores
  e a política de atualização existentes. Validar quantidade, bytes e cena inteira antes do
  único commit; preservar arquivos, IR, blocos, nomes e IDs existentes. Python mantém a entrada
  por receita; seu pacote portátil já possui todos os mapas e será conferido separadamente.
- [x] Ensaiar “Trazer do Pinta” com uma cena autocontida nova e com a Vila: as portas devem
  encontrar os destinos no projeto. Recusa por orçamento não pode deixar metade do lote.
  Executar regressões de persistência, importação e atualização, tipos e navegador.
- [x] Rever o projeto jogável gerado: descrição acessível do palco e diagnóstico inicial. Não
  ignorar avisos observados na homologação. Registrar diferenças reais de cada destino e commit.

Leitores antigos do Estúdio precisam conservar a proteção estrutural de
`assertProjectContentPreserved`: se a sanitização não reconhece a cena, a abertura é recusada
antes de gravar qualquer cópia. Verificar esse caminho com a cena nova, além do CAS local.
Não reutilizar o formato 3 do projeto, reservado ao contrato Python, para camuflar campos novos.

## Implementação

`core/sceneMapClosure.ts` percorre portas por ID ou nome, incluindo camadas ocultas e conjuntos,
além das referências tipadas do documento. Ciclos não duplicam mapas; destinos ausentes,
ambíguos e conjuntos acima de 16 mapas são recusados. O fechamento conserva as dependências
nativas, dentro do orçamento existente de recursos.

`export/studioMapBundle.ts` usa os exportadores e validadores existentes para preparar todos os
mapas antes de chamar o host. O envio, o jogo pronto, a biblioteca e a reemissão de um mapa
editado passam por esse caminho. A captura da biblioteca descobre o mundo na mesma transação
da autoridade local da issue 026. Seleções PNG Python mantêm a captura de imagens anterior,
sem exigir o mundo de portas para produzir uma imagem.

O host compartilha `savePintaStudioBundle`, capturando o perfil e respeitando o cancelamento
da importação antes de entrar na persistência. A biblioteca valida o lote inteiro e usa
`writeInOneTransaction`, com commit e abort explícitos. A leitura indisponível do inventário
deixa de parecer uma biblioteca vazia aos escritores. A validação do orçamento considera o
estado final do lote, sem cobrar duas vezes os mapas substituídos.

O Estúdio prepara as cópias pelos sanitizadores existentes e pela política
`mergeDrawingIntoAsset`, preservando nomes e IDs já usados. `importPintaMapBundle` aplica o
resultado em um único commit da store, sem alterar arquivos, IR ou blocos. Quantidade,
espaço, documentos inválidos e modo de observação recusam a operação inteira.

A descrição acessível do Canvas gerado acompanha o projeto, sem alterar o palco. A revisão
também encontrou um efeito colateral do refresh das miniaturas: redesenhar campos cujo visual
continuava igual fazia o Blockly deslocar pilhas vizinhas. Agora só uma miniatura alterada pede
novo desenho. A comparação de arquivos, IR e estado completo dos blocos continuou no ensaio.

## Continuação da etapa 2a

O fechamento do envio e da importação não encerra a integração inteira. O próximo lote precisa
acrescentar novos destinos aos projetos já vinculados quando uma porta é criada depois da
primeira importação, incluindo projetos fechados e recusa atômica por orçamento. A resolução
de destinos também precisa cobrir colisões de nomes com imagens de outros jogos. O consumo
estruturado completo no Estúdio Python e o ciclo autenticado continuam no plano principal.
Essas verificações não foram substituídas pelos cinco ensaios locais deste lote.

Provas, falhas reproduzidas, limites e capturas: [QA deste lote](qa/mapas-ligados/README.md).
