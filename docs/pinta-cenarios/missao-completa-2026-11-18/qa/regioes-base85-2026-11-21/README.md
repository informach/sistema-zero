# Regiões sobre a base do leitor 85

A preparação incorporou a proteção de materiais do leitor 66 e a fixture
corrigida do leitor 85. **Os 16 arquivos próprios de pacote foram preservados
byte a byte**, incluindo contrato/codec Core, modelo, acessores e operações.
A última incorporação conserva a árvore inteira de packages conforme Git.

Passaram os 47 testes externos de armazenamento (com o wrapper dos 91 casos de
sincronia), os 73 casos isolados de persistência corrigida, os tipos completos
do Estúdio, o verificador oficial de perfil e a formatação. Os testes de Core
e Pinta já registrados continuam associados aos mesmos arquivos, que não foram
alterados: não se inventa uma nova execução das suítes completas neste merge.
As evidências de pintura/balde e navegador estão no lote anterior.

O documento de design registra a próxima fronteira de coordenadas assinadas e
recusa integral de metadados que não possam ser conservados. Não há alteração
visual ou ativação de nativo 8, protocolo físico 3, oficina expansível, cena 4
ou novos formatos externos. O perfil aprovado não é prova dessas capacidades
futuras. Este lote não fez deploy nem homologação autenticada em staging.
