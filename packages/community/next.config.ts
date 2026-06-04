import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // O painel é um BFF: nunca exponha segredos ao bundle do cliente.
  // Variáveis sem prefixo NEXT_PUBLIC_ ficam só no servidor.
  // sharp é binário nativo (upload de avatar) — não deixar o bundler tocar nele.
  serverExternalPackages: ['sharp'],
  // Pacote workspace com TS cru (componentes compartilhados) — transpilar junto.
  // three: recomendação oficial do react-three-fiber p/ Next 13.1+ (livro 3D do e-book).
  transpilePackages: ['@sistemazero/ui', 'three'],
}

export default nextConfig
