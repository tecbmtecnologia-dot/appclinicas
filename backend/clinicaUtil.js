export function especialidadesParaTexto(valor) {
  if (Array.isArray(valor)) return valor.map((v) => String(v).trim()).filter(Boolean).join(',')
  if (typeof valor === 'string') return valor
  return null
}

// Módulos que não fazem sentido pra toda clínica (ex: fotos de pré/pós-operatório
// não interessa a um dentista) — habilitados individualmente por clínica pelo
// super_admin, em vez de mudar o comportamento padrão do sistema pra todo mundo.
export const MODULOS_OPCIONAIS = ['fotos_pre_pos']

export function modulosParaTexto(valor) {
  if (!Array.isArray(valor)) return null
  return valor
    .map((v) => String(v).trim())
    .filter((v) => MODULOS_OPCIONAIS.includes(v))
    .join(',')
}

export function comEspecialidadesArray(clinica) {
  if (!clinica) return clinica
  return {
    ...clinica,
    especialidades: clinica.especialidades
      ? clinica.especialidades.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    modulos_opcionais: clinica.modulos_opcionais
      ? clinica.modulos_opcionais.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  }
}
