import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // O painel é um BFF: nunca exponha segredos ao bundle do cliente.
  // Variáveis sem prefixo NEXT_PUBLIC_ ficam só no servidor.
  // sharp é binário nativo (upload de avatar) — não deixar o bundler tocar nele.
  serverExternalPackages: ['sharp'],
}

export default nextConfig
