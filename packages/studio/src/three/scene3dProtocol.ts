/** Document ABI. Payload types belong to each consumer; no authoring implementation imports. */
export interface Scene3DProtocol<Alvo, Opcoes, Cena, Instalada extends Cena, Inicio> {
  carregar(id: string, sinal: AbortSignal, opcoes?: Opcoes): Promise<Cena>
  inicio(cena: Cena): Inicio
  instalar(id: string, alvo: Alvo, sinal: AbortSignal, opcoes?: Opcoes): Promise<Instalada>
  instalado(alvo: Alvo): Instalada | undefined
}
