import { useEffect, useRef, useState } from 'react'
import { Building2, Crosshair, Droplets, MapPin, Phone, Plus, Trash2, Upload } from 'lucide-react'
import { Button, Card, Input, Label, PageHeader, Select, Textarea } from '../../components/ui'
import { minhaClinicaApi } from '../../api/minhaClinica'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type { Clinica, TipoMarcaDagua, Unidade } from '../../types'

export default function MinhaClinica() {
  const { atualizarUsuario } = useAuth()
  const [clinica, setClinica] = useState<Clinica | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [endereco, setEndereco] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [corPrimaria, setCorPrimaria] = useState('#0f766e')
  const [especialidadesTexto, setEspecialidadesTexto] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [raioMetros, setRaioMetros] = useState<number | ''>('')
  const [marcaDaguaTipo, setMarcaDaguaTipo] = useState<TipoMarcaDagua>('nenhuma')
  const [marcaDaguaTexto, setMarcaDaguaTexto] = useState('')
  const [localizando, setLocalizando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [enviandoLogoApp, setEnviandoLogoApp] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const arquivoLogoRef = useRef<HTMLInputElement>(null)
  const arquivoLogoAppRef = useRef<HTMLInputElement>(null)

  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [novaUnidade, setNovaUnidade] = useState<{
    nome: string
    endereco: string
    telefone: string
    latitude: number | null
    longitude: number | null
  }>({ nome: '', endereco: '', telefone: '', latitude: null, longitude: null })
  const [salvandoUnidade, setSalvandoUnidade] = useState(false)
  const [localizandoUnidade, setLocalizandoUnidade] = useState(false)

  function carregar() {
    setCarregando(true)
    Promise.all([minhaClinicaApi.obter(), minhaClinicaApi.unidades.listar()])
      .then(([c, u]) => {
        setClinica(c)
        setNome(c.nome)
        setCnpj(c.cnpj ?? '')
        setEndereco(c.endereco ?? '')
        setTelefone(c.telefone ?? '')
        setEmail(c.email ?? '')
        setCorPrimaria(c.cor_primaria ?? '#0f766e')
        setEspecialidadesTexto((c.especialidades ?? []).join(', '))
        setLatitude(c.latitude ?? null)
        setLongitude(c.longitude ?? null)
        setRaioMetros(c.raio_metros ?? '')
        setMarcaDaguaTipo(c.marca_dagua_tipo ?? 'nenhuma')
        setMarcaDaguaTexto(c.marca_dagua_texto ?? '')
        setUnidades(u)
      })
      .catch(() => setErro('Não foi possível carregar os dados da clínica.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  async function salvar() {
    setSalvando(true)
    setErro(null)
    setMensagem(null)
    try {
      const especialidades = especialidadesTexto
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const atualizada = await minhaClinicaApi.atualizar({
        nome,
        cnpj: cnpj || null,
        endereco: endereco || null,
        telefone: telefone || null,
        email: email || null,
        cor_primaria: corPrimaria,
        especialidades,
        latitude,
        longitude,
        raio_metros: raioMetros === '' ? null : raioMetros,
        marca_dagua_tipo: marcaDaguaTipo,
        marca_dagua_texto: marcaDaguaTexto || null,
      })
      setClinica(atualizada)
      await atualizarUsuario()
      setMensagem('Dados salvos com sucesso.')
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar os dados da clínica.')
    } finally {
      setSalvando(false)
    }
  }

  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) {
      setErro('Seu navegador não suporta geolocalização.')
      return
    }
    setLocalizando(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setLocalizando(false)
      },
      () => {
        setErro('Não foi possível obter sua localização atual.')
        setLocalizando(false)
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  async function enviarLogo(arquivo: File) {
    setEnviandoLogo(true)
    setErro(null)
    try {
      const atualizada = await minhaClinicaApi.uploadLogo(arquivo)
      setClinica(atualizada)
      await atualizarUsuario()
      setMensagem('Logo dos relatórios e receitas atualizado.')
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao enviar o logotipo.')
    } finally {
      setEnviandoLogo(false)
    }
  }

  async function enviarLogoApp(arquivo: File) {
    setEnviandoLogoApp(true)
    setErro(null)
    try {
      const atualizada = await minhaClinicaApi.uploadLogoApp(arquivo)
      setClinica(atualizada)
      await atualizarUsuario()
      setMensagem('Logo do aplicativo e tela de login atualizado.')
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao enviar o logotipo.')
    } finally {
      setEnviandoLogoApp(false)
    }
  }

  function localizarNovaUnidade() {
    if (!navigator.geolocation) return
    setLocalizandoUnidade(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNovaUnidade((n) => ({ ...n, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
        setLocalizandoUnidade(false)
      },
      () => setLocalizandoUnidade(false),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  async function adicionarUnidade() {
    if (!novaUnidade.nome) return
    setSalvandoUnidade(true)
    try {
      await minhaClinicaApi.unidades.criar(novaUnidade)
      setNovaUnidade({ nome: '', endereco: '', telefone: '', latitude: null, longitude: null })
      const u = await minhaClinicaApi.unidades.listar()
      setUnidades(u)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao adicionar unidade.')
    } finally {
      setSalvandoUnidade(false)
    }
  }

  async function removerUnidade(u: Unidade) {
    if (!confirm(`Remover a unidade ${u.nome}?`)) return
    await minhaClinicaApi.unidades.remover(u.id)
    setUnidades(await minhaClinicaApi.unidades.listar())
  }

  if (carregando) return <p className="text-sm text-slate-400">Carregando...</p>
  if (!clinica) return <p className="text-sm text-red-600">{erro}</p>

  return (
    <div>
      <PageHeader title="Minha Clínica" subtitle="Dados, marca e unidades da sua clínica" icon={Building2} />

      <Card className="p-5 max-w-2xl space-y-4">
        <div className="flex items-center gap-4">
          {clinica.logo_url ? (
            <img src={clinica.logo_url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" />
          ) : (
            <div
              className="h-16 w-16 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
              style={{ backgroundColor: corPrimaria || '#0f766e' }}
            >
              {nome.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div>
            <Label>Logo dos relatórios e receitas</Label>
            <input
              ref={arquivoLogoRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0]
                if (arquivo) enviarLogo(arquivo)
                e.target.value = ''
              }}
            />
            <Button type="button" variant="secondary" onClick={() => arquivoLogoRef.current?.click()} disabled={enviandoLogo}>
              <Upload className="h-3.5 w-3.5" />
              {enviandoLogo ? 'Enviando...' : 'Trocar logotipo'}
            </Button>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP ou SVG, até 3MB. Aparece no cabeçalho dos PDFs (relatórios, receitas etc).</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {clinica.logo_app_url ? (
            <img src={clinica.logo_app_url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" />
          ) : (
            <div
              className="h-16 w-16 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
              style={{ backgroundColor: corPrimaria || '#0f766e' }}
            >
              {nome.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div>
            <Label>Logo do aplicativo e tela de login</Label>
            <input
              ref={arquivoLogoAppRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0]
                if (arquivo) enviarLogoApp(arquivo)
                e.target.value = ''
              }}
            />
            <Button type="button" variant="secondary" onClick={() => arquivoLogoAppRef.current?.click()} disabled={enviandoLogoApp}>
              <Upload className="h-3.5 w-3.5" />
              {enviandoLogoApp ? 'Enviando...' : 'Trocar logotipo'}
            </Button>
            <p className="text-xs text-slate-400 mt-1">
              PNG, JPG, WEBP ou SVG, até 3MB. Aparece no menu do sistema, na tela de login e ao instalar como app. Se não for
              enviado, usa o logo dos relatórios acima.
            </p>
          </div>
        </div>

        <div>
          <Label>Nome da clínica</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>CNPJ</Label>
            <Input placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </div>
          <div>
            <Label>Cor principal</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-9 w-12 rounded border border-slate-300"
                value={corPrimaria}
                onChange={(e) => setCorPrimaria(e.target.value)}
              />
              <Input value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} />
            </div>
          </div>
        </div>
        <div>
          <Label>Endereço (sede)</Label>
          <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Telefone de contato</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div>
            <Label>E-mail de contato</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-400 -mt-2">Endereço e contato aparecem no rodapé de documentos gerados, como a receita médica.</p>
        <div className="border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <Label>Localização para o ponto eletrônico</Label>
            <Button type="button" variant="secondary" onClick={usarLocalizacaoAtual} disabled={localizando}>
              <Crosshair className="h-3.5 w-3.5" />
              {localizando ? 'Obtendo...' : 'Usar minha localização atual'}
            </Button>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            Define o ponto de referência para validar se o funcionário está na clínica ao marcar o ponto.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Latitude</Label>
              <Input
                type="number"
                step="any"
                value={latitude ?? ''}
                onChange={(e) => setLatitude(e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input
                type="number"
                step="any"
                value={longitude ?? ''}
                onChange={(e) => setLongitude(e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Raio (metros)</Label>
              <Input
                type="number"
                min={0}
                placeholder="200"
                value={raioMetros}
                onChange={(e) => setRaioMetros(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <div>
          <Label>Especialidades (separadas por vírgula)</Label>
          <Textarea rows={2} value={especialidadesTexto} onChange={(e) => setEspecialidadesTexto(e.target.value)} />
        </div>

        <div className="border border-slate-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-4 w-4 text-slate-500" />
            <Label>Marca d'água nos documentos (PDFs gerados, ex: relatório cirúrgico)</Label>
          </div>
          <Select value={marcaDaguaTipo} onChange={(e) => setMarcaDaguaTipo(e.target.value as TipoMarcaDagua)} className="mb-2">
            <option value="nenhuma">Nenhuma</option>
            <option value="logo">Logo da clínica (desbotado)</option>
            <option value="texto">Texto personalizado</option>
          </Select>
          {marcaDaguaTipo === 'texto' && (
            <Input
              placeholder="Ex: nome da clínica, USO INTERNO, CÓPIA..."
              value={marcaDaguaTexto}
              onChange={(e) => setMarcaDaguaTexto(e.target.value)}
            />
          )}
          {marcaDaguaTipo === 'logo' && !clinica.logo_url && (
            <p className="text-xs text-amber-600">Envie um logotipo acima (PNG ou JPG) pra marca d'água funcionar.</p>
          )}
        </div>

        {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
        {mensagem && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{mensagem}</p>}

        <div className="flex justify-end">
          <Button onClick={salvar} disabled={salvando || !nome}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </Card>

      <Card className="p-5 max-w-2xl mt-6">
        <h2 className="font-semibold text-slate-800 mb-1">Unidades</h2>
        <p className="text-xs text-slate-400 mb-3">Sua clínica pode ter mais de um endereço de atendimento.</p>

        <div className="space-y-2 mb-3">
          {unidades.length === 0 && <p className="text-xs text-slate-400">Nenhuma unidade cadastrada.</p>}
          {unidades.map((u) => (
            <div key={u.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{u.nome}</p>
                {u.endereco && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" /> {u.endereco}
                  </p>
                )}
                {u.telefone && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" /> {u.telefone}
                  </p>
                )}
                <p className="text-[11px] mt-1">
                  {u.latitude != null ? (
                    <span className="text-emerald-600">Localização definida para o ponto eletrônico</span>
                  ) : (
                    <span className="text-amber-600">Sem localização — ponto não será validado nessa unidade</span>
                  )}
                </p>
              </div>
              <button onClick={() => removerUnidade(u)} className="text-slate-400 hover:text-red-600 shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            placeholder="Nome da unidade"
            value={novaUnidade.nome}
            onChange={(e) => setNovaUnidade({ ...novaUnidade, nome: e.target.value })}
          />
          <Input
            placeholder="Endereço"
            value={novaUnidade.endereco}
            onChange={(e) => setNovaUnidade({ ...novaUnidade, endereco: e.target.value })}
          />
          <Input
            placeholder="Telefone"
            value={novaUnidade.telefone}
            onChange={(e) => setNovaUnidade({ ...novaUnidade, telefone: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={adicionarUnidade} disabled={salvandoUnidade || !novaUnidade.nome}>
            <Plus className="h-3.5 w-3.5" /> Adicionar unidade
          </Button>
          <Button type="button" variant="ghost" onClick={localizarNovaUnidade} disabled={localizandoUnidade}>
            <Crosshair className="h-3.5 w-3.5" />
            {localizandoUnidade
              ? 'Obtendo localização...'
              : novaUnidade.latitude != null
                ? 'Localização capturada ✓'
                : 'Usar minha localização atual para esta unidade'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
