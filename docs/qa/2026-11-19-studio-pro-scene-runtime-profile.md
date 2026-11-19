# Perfil da imagem após a integração de cenas Pro

O commit `4b26a3e69` integrou novos contratos em `core/src/studio` para
consumir cenas Molda no Pro. Esses contratos pertencem ao fingerprint da
imagem hospedada. A conferência oficial reprovou localmente: perfil
desatualizado. Não se tratava de elevar cotas ou trocar a versão do Three.

O perfil foi regenerado com Bun 1.3.11 pelo comando do pacote. A única
saída alterada foi `runtime/validation-profile.json`: fingerprint
`f11aa057992edd156158a56a51b1b0f76969ab90cc8099b828315b26d9b64eb1`.
Os três módulos de contratos gerados, dependências, lockfile, limites e
permissões não mudaram. Não houve construção ou implantação de imagem
de produção nesta sessão.

`check:validation-profile` passou após a geração. Os dez testes de
`contracts.test.ts` passaram, com 51 asserções. O recorte combinado também
detectou uma instalação local antiga do runtime (Three 0.180.0, diante do
pin 0.184.0): o teste de confiança bloqueou corretamente esses bytes.
Essa instalação precisa ser reconciliada com `npm ci --prefix runtime`
antes de usar o resultado local do resolvedor como evidência positiva.
Não foi removida nem afrouxada a verificação do pacote instalado.

```powershell
cd packages/studio-runtime
bun run gen:validation-profile
bun run check:validation-profile
npm ci --ignore-scripts --no-audit --no-fund --prefix runtime
bun test tests/contracts.test.ts tests/check-javascript-modules.test.mjs
```
