import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Activity, Camera, ClipboardList, Search, Trash2 } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select, Textarea } from '../../components/ui'
import CapturaFoto from '../../components/CapturaFoto'
import { pacientesApi } from '../../api/pacientes'
import { medicosApi } from '../../api/medicos'
import { prontuariosApi } from '../../api/prontuarios'
import { modelosReceitaApi } from '../../api/modelosReceita'
import { fotosPacienteApi } from '../../api/fotosPaciente'
import { sessoesFisioterapiaApi } from '../../api/sessoesFisioterapia'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type {
  FotoPaciente,
  Medico,
  ModeloReceita,
  Paciente,
  Prontuario as ProntuarioType,
  SessaoFisioterapia,
  TipoFotoPaciente,
} from '../../types'

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

const vazio = { medico_id: '', data: hoje(), queixa: '', diagnostico: '', evolucao: '', observacoes: '' }
const vazioFoto: { tipo: TipoFotoPaciente; data: string; observacoes: string } = {
  tipo: 'pre_operatorio',
  data: hoje(),
  observacoes: '',
}

const ROTULOS_TIPO_FOTO: Record<TipoFotoPaciente, string> = {
  pre_operatorio: 'Pré-operatório',
  pos_operatorio: 'Pós-operatório',
}

function formatarDataBr(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

export default function Prontuario() {
  const { usuario } = useAuth()
  const [searchParams] = useSearchParams()
  const ehEnfermagem = usuario?.role === 'enfermagem' || usuario?.role === 'pj'
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [registros, setRegistros] = useState<ProntuarioType[]>([])
  const [carregando, setCarregando] = useState(false)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [modelos, setModelos] = useState<ModeloReceita[]>([])
  const [itensPrescricao, setItensPrescricao] = useState<string[]>([])
  const [modeloParaInserir, setModeloParaInserir] = useState('')
  const [itemPrescricaoLivre, setItemPrescricaoLivre] = useState('')

  useEffect(() => {
    pacientesApi.listar().then(setPacientes).catch(() => {})
    medicosApi.listar().then(setMedicos).catch(() => {})
    if (!ehEnfermagem) modelosReceitaApi.listar().then(setModelos).catch(() => {})
  }, [])

  // Vem do botão "Atender" na Agenda — já abre com o paciente certo e o
  // formulário pronto pra começar a evolução na hora.
  useEffect(() => {
    const pacienteQuery = searchParams.get('paciente')
    if (!pacienteQuery) return
    setPacienteId(pacienteQuery)
    setMostrarForm(true)
    if (usuario?.medico_id) setForm((f) => ({ ...f, medico_id: usuario.medico_id! }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function inserirModeloNaPrescricao() {
    const modelo = modelos.find((m) => m.id === modeloParaInserir)
    if (!modelo) return
    setItensPrescricao((itens) => [...itens, modelo.texto])
    setModeloParaInserir('')
  }

  function inserirItemLivreNaPrescricao() {
    if (!itemPrescricaoLivre.trim()) return
    setItensPrescricao((itens) => [...itens, itemPrescricaoLivre.trim()])
    setItemPrescricaoLivre('')
  }

  function removerItemPrescricao(indice: number) {
    setItensPrescricao((itens) => itens.filter((_, i) => i !== indice))
  }

  const [fotos, setFotos] = useState<FotoPaciente[]>([])
  const [modalFotoAberto, setModalFotoAberto] = useState(false)
  const [formFoto, setFormFoto] = useState(vazioFoto)
  const [fotoBlobNova, setFotoBlobNova] = useState<Blob | null>(null)
  const [salvandoFoto, setSalvandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)

  function carregarFotos(id: string) {
    fotosPacienteApi.listar(id).then(setFotos).catch(() => {})
  }

  function abrirNovaFoto() {
    setFormFoto(vazioFoto)
    setFotoBlobNova(null)
    setErroFoto(null)
    setModalFotoAberto(true)
  }

  async function salvarFoto() {
    if (!pacienteId || !fotoBlobNova) return
    setSalvandoFoto(true)
    setErroFoto(null)
    try {
      await fotosPacienteApi.criar({ paciente_id: pacienteId, foto: fotoBlobNova, ...formFoto })
      setModalFotoAberto(false)
      carregarFotos(pacienteId)
    } catch (err) {
      setErroFoto(err instanceof ApiError ? err.message : 'Erro ao salvar foto.')
    } finally {
      setSalvandoFoto(false)
    }
  }

  async function removerFoto(f: FotoPaciente) {
    if (!confirm('Remover esta foto do histórico?')) return
    await fotosPacienteApi.remover(f.id)
    if (pacienteId) carregarFotos(pacienteId)
  }

  function carregarRegistros(id: string) {
    setCarregando(true)
    prontuariosApi
      .listarPorPaciente(id)
      .then(setRegistros)
      .finally(() => setCarregando(false))
  }

  const [sessoesFisio, setSessoesFisio] = useState<SessaoFisioterapia[]>([])

  function carregarSessoesFisio(id: string) {
    sessoesFisioterapiaApi.listar({ paciente_id: id }).then(setSessoesFisio).catch(() => {})
  }

  useEffect(() => {
    if (pacienteId) {
      carregarRegistros(pacienteId)
      carregarFotos(pacienteId)
      carregarSessoesFisio(pacienteId)
    } else {
      setRegistros([])
      setFotos([])
      setSessoesFisio([])
    }
  }, [pacienteId])

  const pacienteSelecionado = useMemo(() => pacientes.find((p) => p.id === pacienteId), [pacientes, pacienteId])
  const pacientesFiltrados = useMemo(() => {
    const termo = buscaPaciente.trim().toLowerCase()
    if (!termo) return pacientes
    return pacientes.filter((p) => p.nome.toLowerCase().includes(termo))
  }, [pacientes, buscaPaciente])

  async function salvar() {
    if (!pacienteId) return
    setSalvando(true)
    try {
      await prontuariosApi.criar({ ...form, prescricao: itensPrescricao.join('\n\n'), paciente_id: pacienteId })
      setForm(vazio)
      setItensPrescricao([])
      setMostrarForm(false)
      carregarRegistros(pacienteId)
    } catch {
      alert('Erro ao salvar registro do prontuário.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <PageHeader title="Prontuário eletrônico" subtitle="Histórico clínico por paciente" icon={ClipboardList} />

      <Card className="p-4 mb-6 max-w-md">
        <Label>Paciente</Label>
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={buscaPaciente}
            onChange={(e) => setBuscaPaciente(e.target.value)}
            placeholder="Buscar paciente pelo nome..."
            className="pl-9"
          />
        </div>
        <Select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
          <option value="">Selecione um paciente...</option>
          {pacientesFiltrados.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
        {buscaPaciente && pacientesFiltrados.length === 0 && (
          <p className="text-xs text-slate-400 mt-1">Nenhum paciente encontrado com esse nome.</p>
        )}
      </Card>

      {!pacienteId ? (
        <EmptyState text="Selecione um paciente para ver o histórico." />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="font-semibold text-slate-800">Histórico de {pacienteSelecionado?.nome}</h2>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                onClick={() => prontuariosApi.abrirHistoricoPdf(pacienteId).catch(() => alert('Erro ao gerar o histórico.'))}
              >
                Baixar histórico completo
              </Button>
              <Button onClick={() => setMostrarForm((v) => !v)}>
                {mostrarForm ? 'Fechar' : '+ Novo registro'}
              </Button>
            </div>
          </div>

          <Card className="p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-800">Fotos (pré/pós-operatório)</h3>
              </div>
              <Button variant="secondary" onClick={abrirNovaFoto}>
                + Adicionar foto
              </Button>
            </div>
            {fotos.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma foto registrada ainda.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {fotos.map((f) => (
                  <div key={f.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
                    <img src={f.foto_url} alt="" className="w-full aspect-square object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 px-2 py-1">
                      <Badge tone={f.tipo === 'pre_operatorio' ? 'amber' : 'green'}>{ROTULOS_TIPO_FOTO[f.tipo]}</Badge>
                      <p className="text-[10px] text-white mt-0.5">{formatarDataBr(f.data)}</p>
                    </div>
                    {!ehEnfermagem && (
                      <button
                        type="button"
                        onClick={() => removerFoto(f)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {sessoesFisio.length > 0 && (
            <Card className="p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-800">Sessões de fisioterapia</h3>
              </div>
              <div className="space-y-2">
                {sessoesFisio.map((s) => (
                  <div key={s.id} className="text-sm text-slate-600 flex items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span>
                      <span className="font-medium text-slate-700">
                        {formatarDataBr(s.data_hora.slice(0, 10))} às {s.data_hora.slice(11, 16)}
                      </span>
                      {s.observacoes && ` — ${s.observacoes}`}
                    </span>
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{s.usuario_nome}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {mostrarForm && (
            <Card className="p-5 mb-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Médico responsável</Label>
                  <Select value={form.medico_id} onChange={(e) => setForm({ ...form, medico_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    {medicos.map((m) => (
                      <option key={m.id} value={m.id}>
                        Dr(a). {m.nome}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Queixa principal</Label>
                <Textarea rows={2} value={form.queixa} onChange={(e) => setForm({ ...form, queixa: e.target.value })} />
              </div>
              {!ehEnfermagem && (
                <>
                  <div>
                    <Label>Diagnóstico</Label>
                    <Textarea rows={2} value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} />
                  </div>
                  <div>
                    <Label>Prescrição</Label>
                    {modelos.length > 0 && (
                      <div className="flex gap-2 mb-2">
                        <Select value={modeloParaInserir} onChange={(e) => setModeloParaInserir(e.target.value)} className="flex-1">
                          <option value="">Selecione um modelo de receita...</option>
                          {modelos.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nome}
                            </option>
                          ))}
                        </Select>
                        <Button variant="secondary" onClick={inserirModeloNaPrescricao} disabled={!modeloParaInserir}>
                          + Inserir
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Ou digite um item de receita..."
                        value={itemPrescricaoLivre}
                        onChange={(e) => setItemPrescricaoLivre(e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="secondary" onClick={inserirItemLivreNaPrescricao} disabled={!itemPrescricaoLivre.trim()}>
                        + Inserir
                      </Button>
                    </div>
                    {itensPrescricao.length === 0 ? (
                      <p className="text-xs text-slate-400">Nenhum item inserido ainda — selecione um modelo ou digite um item acima.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {itensPrescricao.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                          >
                            <span className="whitespace-pre-wrap">{item}</span>
                            <button
                              type="button"
                              onClick={() => removerItemPrescricao(i)}
                              className="text-slate-400 hover:text-red-600 shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
              <div>
                <Label>Evolução{ehEnfermagem ? ' (obrigatório)' : ''}</Label>
                <Textarea rows={3} value={form.evolucao} onChange={(e) => setForm({ ...form, evolucao: e.target.value })} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={salvar}
                  disabled={salvando || !form.medico_id || !form.data || (ehEnfermagem && !form.evolucao)}
                >
                  {salvando ? 'Salvando...' : 'Salvar registro'}
                </Button>
              </div>
            </Card>
          )}

          {carregando ? (
            <p className="text-sm text-slate-400">Carregando...</p>
          ) : registros.length === 0 ? (
            <EmptyState text="Nenhum registro no prontuário deste paciente ainda." />
          ) : (
            <div className="space-y-3">
              {registros.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-800">{r.data}</p>
                    <p className="text-xs text-slate-400">Dr(a). {r.medico_nome}</p>
                  </div>
                  {r.queixa && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Queixa: </span>
                      {r.queixa}
                    </p>
                  )}
                  {r.diagnostico && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Diagnóstico: </span>
                      {r.diagnostico}
                    </p>
                  )}
                  {r.prescricao && (
                    <p className="text-sm text-slate-600 flex items-start justify-between gap-2">
                      <span>
                        <span className="font-medium text-slate-700">Prescrição: </span>
                        {r.prescricao}
                      </span>
                      <button
                        type="button"
                        onClick={() => prontuariosApi.abrirReceitaPdf(r.id).catch(() => alert('Erro ao gerar a receita.'))}
                        className="text-xs font-medium text-brand-700 hover:text-brand-800 whitespace-nowrap shrink-0"
                      >
                        Baixar receita
                      </button>
                    </p>
                  )}
                  {r.evolucao && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Evolução: </span>
                      {r.evolucao}
                    </p>
                  )}
                  {r.observacoes && <p className="text-sm text-slate-500 italic mt-1">{r.observacoes}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={modalFotoAberto} onClose={() => setModalFotoAberto(false)} title="Adicionar foto ao histórico">
        <div className="space-y-3">
          <CapturaFoto formato="quadrado" onNovaFoto={setFotoBlobNova} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select
                value={formFoto.tipo}
                onChange={(e) => setFormFoto({ ...formFoto, tipo: e.target.value as TipoFotoPaciente })}
              >
                <option value="pre_operatorio">Pré-operatório</option>
                <option value="pos_operatorio">Pós-operatório</option>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={formFoto.data} onChange={(e) => setFormFoto({ ...formFoto, data: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Observações (opcional)</Label>
            <Textarea rows={2} value={formFoto.observacoes} onChange={(e) => setFormFoto({ ...formFoto, observacoes: e.target.value })} />
          </div>
          {erroFoto && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroFoto}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalFotoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarFoto} disabled={salvandoFoto || !fotoBlobNova || !formFoto.data}>
              {salvandoFoto ? 'Salvando...' : 'Salvar foto'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
