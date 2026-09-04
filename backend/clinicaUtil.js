export function especialidadesParaTexto(valor) {
  if (Array.isArray(valor)) return valor.map((v) => String(v).trim()).filter(Boolean).join(',')
  if (typeof valor === 'string') return valor
  return null
}

export function comEspecialidadesArray(clinica) {
  if (!clinica) return clinica
  return {
    ...clinica,
    especialidades: clinica.especialidades
      ? clinica.especialidades.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  }
}
