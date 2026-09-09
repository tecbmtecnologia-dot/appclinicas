// true quando o app está rodando "instalado" (ícone na tela inicial, sem barra
// do navegador).
export function estaInstaladoComoApp(): boolean {
  if (typeof window === 'undefined') return false
  const modoStandalone = window.matchMedia?.('(display-mode: standalone)').matches
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return Boolean(modoStandalone || iosStandalone)
}

const CHAVE_PERFIL_INSTALADO = 'perfil_instalado'
const CHAVE_CLINICA_INSTALADA = 'clinica_instalada'

// O manifest de cada link de instalação (/instalar/:clinica/:perfil) usa
// start_url com "?perfil=<slug>&clinica=<slug>" — capturamos isso uma vez na
// abertura do app e guardamos, já que depois de instalado o ícone sempre abre
// nessa URL mas a navegação dentro do app perde a query string. A clínica
// guardada é usada pra mandar de volta pro login com a marca certa quando a
// sessão expira (ver RequireAuth.tsx), em vez do /login genérico.
export function capturarPerfilInstalado(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const perfil = params.get('perfil')
  const clinica = params.get('clinica')
  try {
    if (perfil) localStorage.setItem(CHAVE_PERFIL_INSTALADO, perfil)
    if (clinica) localStorage.setItem(CHAVE_CLINICA_INSTALADA, clinica)
  } catch {
    // localStorage indisponível (modo privado etc.) — ignora
  }
}

export function getPerfilInstalado(): string | null {
  try {
    return localStorage.getItem(CHAVE_PERFIL_INSTALADO)
  } catch {
    return null
  }
}

export function getClinicaInstalada(): string | null {
  try {
    return localStorage.getItem(CHAVE_CLINICA_INSTALADA)
  } catch {
    return null
  }
}

// Além da captura via start_url, guarda também sempre que a pessoa visita a
// tela de login de uma clínica específica (/entrar/:slug) — cobre quem já
// tinha o app instalado antes desse parâmetro existir no manifest.
export function guardarClinicaAcessada(clinicaSlug: string): void {
  try {
    localStorage.setItem(CHAVE_CLINICA_INSTALADA, clinicaSlug)
  } catch {
    // localStorage indisponível (modo privado etc.) — ignora
  }
}

// Único perfil de instalação pensado como "kiosk" (só bater ponto, sem o
// resto do app) — os demais (Médicos, Consultoras, Fisioterapeuta...) abrem
// com a navegação normal do perfil do usuário, igual ao acesso pelo desktop.
export function estaEmModoKiosk(): boolean {
  return estaInstaladoComoApp() && getPerfilInstalado() === 'meu-ponto-rh'
}
