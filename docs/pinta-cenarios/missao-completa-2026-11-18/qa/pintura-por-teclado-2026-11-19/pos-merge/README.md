# Integração local com o remoto

A fonte foi integrada até `874b23afd`. Os 474 arquivos do snapshot da
homologação do teclado continuam idênticos; o merge não modificou o Pinta.

[Tipos Pinta](pinta-types.txt), [14 casos de geração/sincronia do Estúdio](sincronia-estudio.txt)
e [lint global de 16.412 arquivos](biome.txt) passaram.
O [tipo completo do Estúdio](studio-types.txt) passou em `c212149e3`; o
merge posterior `874b23afd` não altera Pinta, Studio, studio-runtime nem
`core/src/studio`. O install congelado posterior não mudou os pacotes já
instalados. O CI completo dos demais pacotes continua sendo evidência separada.

O [merge de staging local](staging-local.json) preservou os 51 arquivos de
trabalho existentes, conferidos por status e SHA-256 antes/depois. O recibo
registra 98 arquivos recebidos, incluindo marcador, teclado e provas.
Esse recibo comprova a integração local; a confirmação do push fica no Git.

O runtime continua em uma homologação separada: não usar estes testes para
declarar encerrado o rollout A/B, a ativação Python ou o ciclo autenticado.
