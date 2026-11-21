# Revisão do host e preparação do ensaio B6

O host agora tem sete exemplos adicionais: o backend responde HTTP 200, mas
confirma capacidade ausente, nula, antiga ou com tipo incorreto. O host precisa
recusar com `UPSTREAM_INCOMPATIBLE`, sem assinar PUT. O caso positivo confirma
formato 6, revisão, quantidade de bytes, chave, tipo e validade de 600 segundos.
Essa duração é a constante vigente do produto; uma primeira expectativa de
300 segundos no teste foi corrigida, sem alteração funcional.

Verificação final: 59 testes, 229 asserções, zero falhas; tipos completos do
member-shell e Biome do arquivo aprovados. Não mudou código funcional.

O verificador canônico confirmou a jornada publicada, versão 3, sem deploy de
backends. A CI da revisão a486 falhou no runtime gerado do Molda desatualizado;
esse arquivo foi preservado. A fonte 5d tem CI própria aprovada e contém o
gravador 6; as fontes funcionais do Pinta e Estúdio são iguais ao leitor 85.

Antes de solicitar qualquer deploy, o inventário detectou uma publicação
concorrente do Community na fonte 61ef. O operador encerrou com zero solicitações
de mutação. A fonte concorrente já contém o gravador 6 e tem CI aprovada; será
verificada quando estiver ativa, sem substituí-la ou alterar Members/Auth.
Isso ainda não conclui o ensaio autenticado B6 nem o rollback B → A → B.
