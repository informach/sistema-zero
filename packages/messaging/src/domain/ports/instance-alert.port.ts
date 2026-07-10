/**
 * Port de ALERTA operacional das instâncias de WhatsApp. O caso de uso
 * (`SetInstanceConnectionService`) dispara quando uma lane CONECTADA cai — o
 * adapter decide o canal (e-mail via SendGrid). Best-effort por natureza: uma
 * falha ao alertar NUNCA pode quebrar o processamento do webhook de conexão.
 */
export interface InstanceAlerter {
  laneDisconnected(input: {
    instanceName: string
    phoneNumber: string
    /** Detalhe cru do estado/motivo reportado pela Evolution (ex.: "close"). */
    detail?: string
  }): Promise<void>
}
