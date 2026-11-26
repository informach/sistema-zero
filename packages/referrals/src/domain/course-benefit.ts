export class CourseBenefitUnavailableError extends Error {
  constructor() {
    super('Este benefício não está disponível para ativação neste curso.')
  }
}

export class CourseBenefitConversionError extends Error {}
