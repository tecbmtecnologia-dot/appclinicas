import { useEffect, useState } from 'react'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select, Textarea } from '../../components/ui'
import { orcamentosApi, type ItemOrcamentoInput, type OrcamentoForm } from '../../api/orcamentos'
import { pagamentosApi, type PagamentoForm } from '../../api/pagamentos'
import { despesasApi, type DespesaForm } from '../../api/despesas'
import { financeiroApi } from '../../api/financeiro'
import { pacientesApi } from '../../api/pacientes'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type {
  DespesaClinica,
  ItemOrcamentoCatalogo,
  Orcamento,
  Paciente,
  Pagamento,
  ResumoFinanceiroClinica,
} from '../../types'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataHoje() {
  return new Date().toISOString().slice(0, 10)
}

const ABAS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'orcamentos', label: 'Orçamentos' },
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'despesas', label: 'Despesas' },
] as const
type Aba = (typeof ABAS)[number]['id']

export default function Financeiro() {
  const { usuario } = useAuth()
  const podeVerDespesas = usuario?.role === 'admin' || usuario?.role === 'financeiro'
  // Médico só entra aqui para montar orçamento (selecionar itens do catálogo) —
  // não tem acesso ao resumo financeiro, pagamentos ou despesas da clínica.
  const apenasOrcamentos = usuario?.role === 'medico'
  const [aba, setAba] = useState<Aba>(apenasOrcamentos ? 'orcamentos' : 'resumo')
  const [pacientes, setPacientes] = useState<Paciente[]>([])

  useEffect(() => {
    pacientesApi.listar().then(setPacientes).catch(() => {})
  }, [])

  const abasVisiveis = apenasOrcamentos
    ? ABAS.filter((a) => a.id === 'orcamentos')
    : ABAS.filter((a) => a.id !== 'despesas' || podeVerDespesas)

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Orçamentos, pagamentos de pacientes e despesas da clínica" icon={Wallet} />

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {abasVisiveis.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === a.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'resumo' && <AbaResumo podeVerClinica={podeVerDespesas} />}
      {aba === 'orcamentos' && (
        <AbaOrcamentos
          pacientes={pacientes}
          podeGerenciarOrcamento={usuario?.role === 'admin' || usuario?.role === 'financeiro' || usuario?.role === 'medico'}
          podeGerenciarCatalogo={usuario?.role === 'admin' || usuario?.role === 'financeiro'}
        />
      )}
      {aba === 'pagamentos' && <AbaPagamentos pacientes={pacientes} />}
      {aba === 'despesas' && podeVerDespesas && <AbaDespesas />}
    </div>
  )
}

function CardResumo({ titulo, valor, tom }: { titulo: string; valor: number; tom?: 'green' | 'red' | 'slate' }) {
  const cor = tom === 'green' ? 'text-emerald-600' : tom === 'red' ? 'text-red-600' : 'text-slate-800'
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-400 mb-1">{titulo}</p>
      <p className={`text-xl font-bold ${cor}`}>{moeda(valor)}</p>
    </Card>
  )
}

function AbaResumo({ podeVerClinica }: { podeVerClinica: boolean }) {
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [dados, setDados] = useState<ResumoFinanceiroClinica | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!podeVerClinica) {
      setCarregando(false)
      return
    }
    setCarregando(true)
    financeiroApi
      .resumo(mes, ano)
      .then(setDados)
      .finally(() => setCarregando(false))
  }, [mes, ano, podeVerClinica])

  if (!podeVerClinica) {
    return <EmptyState text="Apenas administradores e financeiro veem o resumo da clínica. Use as abas de Orçamentos e Pagamentos normalmente." />
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 max-w-xs">
        <Select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
          {MESES.map((nome, i) => (
            <option key={nome} value={i + 1}>
              {nome}
            </option>
          ))}
        </Select>
        <Select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
          {[agora.getFullYear() - 1, agora.getFullYear(), agora.getFullYear() + 1].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>
      {carregando || !dados ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <CardResumo titulo="Recebido de pacientes" valor={dados.recebido} tom="green" />
          <CardResumo titulo="A receber" valor={dados.a_receber} />
          <CardResumo titulo="Gastos da clínica" valor={dados.gasto} tom="red" />
          <CardResumo titulo="A pagar" valor={dados.a_pagar} />
          <CardResumo titulo="Saldo do mês" valor={dados.saldo} tom={dados.saldo >= 0 ? 'green' : 'red'} />
          <CardResumo titulo="Total orçado no mês" valor={dados.total_orcado} />
        </div>
      )}
    </div>
  )
}

const vazioOrcamento: OrcamentoForm = { paciente_id: '', titulo: '', itens: [], observacoes: '' }
const vazioItemCatalogo = { nome: '', valor: 0 }

function AbaOrcamentos({
  pacientes,
  podeGerenciarOrcamento,
  podeGerenciarCatalogo,
}: {
  pacientes: Paciente[]
  podeGerenciarOrcamento: boolean
  podeGerenciarCatalogo: boolean
}) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [catalogoAtivo, setCatalogoAtivo] = useState<ItemOrcamentoCatalogo[]>([])
  const [catalogoTodos, setCatalogoTodos] = useState<ItemOrcamentoCatalogo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<OrcamentoForm>(vazioOrcamento)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [modalCatalogoAberto, setModalCatalogoAberto] = useState(false)
  const [novoItemCatalogo, setNovoItemCatalogo] = useState(vazioItemCatalogo)

  function carregar() {
    setCarregando(true)
    orcamentosApi
      .listar()
      .then(setOrcamentos)
      .finally(() => setCarregando(false))
  }
  function carregarCatalogo() {
    orcamentosApi.catalogo.listar(true).then(setCatalogoAtivo)
    if (podeGerenciarCatalogo) orcamentosApi.catalogo.listar().then(setCatalogoTodos)
  }
  useEffect(carregar, [])
  useEffect(carregarCatalogo, [])

  function abrirNovo() {
    setForm(vazioOrcamento)
    setErroForm(null)
    setModalAberto(true)
  }

  function atualizarItem(i: number, campo: keyof ItemOrcamentoInput, valor: string) {
    const itens = [...form.itens]
    itens[i] = { ...itens[i], [campo]: campo === 'quantidade' ? Number(valor) : valor }
    setForm({ ...form, itens })
  }

  function adicionarItem() {
    setForm({ ...form, itens: [...form.itens, { item_id: '', quantidade: 1 }] })
  }

  function removerItem(i: number) {
    setForm({ ...form, itens: form.itens.filter((_, idx) => idx !== i) })
  }

  function valorItem(item: ItemOrcamentoInput) {
    const catalogItem = catalogoAtivo.find((c) => c.id === item.item_id)
    return catalogItem ? catalogItem.valor * (Number(item.quantidade) || 1) : 0
  }

  const totalForm = form.itens.reduce((s, it) => s + valorItem(it), 0)

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      await orcamentosApi.criar({ ...form, itens: form.itens.filter((it) => it.item_id) })
      setModalAberto(false)
      carregar()
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : 'Erro ao salvar orçamento.')
    } finally {
      setSalvando(false)
    }
  }

  async function alterarStatus(o: Orcamento, status: Orcamento['status']) {
    await orcamentosApi.atualizar(o.id, { status })
    carregar()
  }

  async function remover(o: Orcamento) {
    if (!confirm(`Remover o orçamento "${o.titulo}"?`)) return
    await orcamentosApi.remover(o.id)
    carregar()
  }

  async function salvarItemCatalogo() {
    if (!novoItemCatalogo.nome.trim()) return
    await orcamentosApi.catalogo.criar(novoItemCatalogo)
    setNovoItemCatalogo(vazioItemCatalogo)
    carregarCatalogo()
  }

  async function alternarAtivoCatalogo(item: ItemOrcamentoCatalogo) {
    await orcamentosApi.catalogo.atualizar(item.id, { ativo: !item.ativo })
    carregarCatalogo()
  }

  async function removerItemCatalogo(item: ItemOrcamentoCatalogo) {
    if (!confirm(`Remover o item "${item.nome}" do catálogo?`)) return
    await orcamentosApi.catalogo.remover(item.id)
    carregarCatalogo()
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        {podeGerenciarCatalogo && (
          <Button variant="secondary" onClick={() => setModalCatalogoAberto(true)}>
            Catálogo de itens
          </Button>
        )}
        {podeGerenciarOrcamento && <Button onClick={abrirNovo}>+ Novo orçamento</Button>}
      </div>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : orcamentos.length === 0 ? (
        <EmptyState text="Nenhum orçamento cadastrado ainda." />
      ) : (
        <div className="space-y-3">
          {orcamentos.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800">{o.titulo}</p>
                  <p className="text-sm text-slate-500">Paciente: {o.paciente_nome}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {o.itens.map((it) => it.descricao).join(', ') || `${o.itens.length} item(ns)`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800">{moeda(o.valor_total)}</p>
                  {podeGerenciarOrcamento ? (
                    <>
                      <Select value={o.status} onChange={(e) => alterarStatus(o, e.target.value as Orcamento['status'])} className="!w-auto">
                        <option value="pendente">Pendente</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="recusado">Recusado</option>
                      </Select>
                      <Button variant="danger" onClick={() => remover(o)}>
                        Remover
                      </Button>
                    </>
                  ) : (
                    <Badge>{o.status}</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Novo orçamento">
        <div className="space-y-3">
          <div>
            <Label>Paciente</Label>
            <Select value={form.paciente_id} onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}>
              <option value="">Selecione...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Título</Label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <Label>Itens (selecione do catálogo)</Label>
            {catalogoAtivo.length === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                Nenhum item cadastrado no catálogo ainda. Peça para admin/financeiro cadastrar em "Catálogo de itens".
              </p>
            )}
            <div className="space-y-2">
              {form.itens.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select value={item.item_id} onChange={(e) => atualizarItem(i, 'item_id', e.target.value)}>
                    <option value="">Selecione um item...</option>
                    {catalogoAtivo.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} — {moeda(c.valor)}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    placeholder="Qtd"
                    className="w-20"
                    value={item.quantidade ?? 1}
                    onChange={(e) => atualizarItem(i, 'quantidade', e.target.value)}
                  />
                  <p className="text-sm text-slate-600 w-24 text-right shrink-0">{moeda(valorItem(item))}</p>
                  <button onClick={() => removerItem(i)} className="text-slate-400 hover:text-red-600 shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" className="mt-1" onClick={adicionarItem} disabled={catalogoAtivo.length === 0}>
              <Plus className="h-3.5 w-3.5" /> Adicionar item
            </Button>
            <p className="text-sm font-semibold text-slate-700 mt-1">Total: {moeda(totalForm)}</p>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={form.observacoes ?? ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
          {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroForm}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={salvar}
              disabled={salvando || !form.paciente_id || !form.titulo || form.itens.filter((it) => it.item_id).length === 0}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modalCatalogoAberto} onClose={() => setModalCatalogoAberto(false)} title="Catálogo de itens de orçamento">
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Nome do item</Label>
              <Input value={novoItemCatalogo.nome} onChange={(e) => setNovoItemCatalogo({ ...novoItemCatalogo, nome: e.target.value })} />
            </div>
            <div className="w-32">
              <Label>Valor</Label>
              <Input
                type="number"
                value={novoItemCatalogo.valor || ''}
                onChange={(e) => setNovoItemCatalogo({ ...novoItemCatalogo, valor: Number(e.target.value) })}
              />
            </div>
            <Button onClick={salvarItemCatalogo} disabled={!novoItemCatalogo.nome.trim()}>
              Adicionar
            </Button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {catalogoTodos.length === 0 ? (
              <EmptyState text="Nenhum item cadastrado ainda." />
            ) : (
              catalogoTodos.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.nome}</p>
                    <p className="text-xs text-slate-400">{moeda(item.valor)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => alternarAtivoCatalogo(item)}>
                      {item.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="danger" onClick={() => removerItemCatalogo(item)}>
                      Remover
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

const vazioPagamento: PagamentoForm = {
  paciente_id: '',
  orcamento_id: '',
  descricao: '',
  valor: 0,
  forma_pagamento: 'pix',
  status: 'pendente',
  data_vencimento: dataHoje(),
  data_pagamento: '',
}

function statusTone(status: string) {
  return status === 'pago' ? 'green' : status === 'atrasado' ? 'red' : 'amber'
}

function AbaPagamentos({ pacientes }: { pacientes: Paciente[] }) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<PagamentoForm>(vazioPagamento)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    pagamentosApi
      .listar()
      .then(setPagamentos)
      .finally(() => setCarregando(false))
  }
  useEffect(carregar, [])

  function abrirNovo() {
    setForm(vazioPagamento)
    setErroForm(null)
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      await pagamentosApi.criar({ ...form, orcamento_id: form.orcamento_id || null })
      setModalAberto(false)
      carregar()
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : 'Erro ao salvar pagamento.')
    } finally {
      setSalvando(false)
    }
  }

  async function marcarPago(p: Pagamento) {
    await pagamentosApi.atualizar(p.id, { status: 'pago', data_pagamento: dataHoje() })
    carregar()
  }

  async function remover(p: Pagamento) {
    if (!confirm(`Remover o pagamento "${p.descricao}"?`)) return
    await pagamentosApi.remover(p.id)
    carregar()
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={abrirNovo}>+ Novo pagamento</Button>
      </div>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : pagamentos.length === 0 ? (
        <EmptyState text="Nenhum pagamento registrado ainda." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Paciente</th>
                  <th className="px-4 py-2.5 font-medium">Descrição</th>
                  <th className="px-4 py-2.5 font-medium">Valor</th>
                  <th className="px-4 py-2.5 font-medium">Vencimento</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{p.paciente_nome}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.descricao}</td>
                    <td className="px-4 py-2.5 text-slate-600">{moeda(p.valor)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.data_vencimento ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                      {p.status !== 'pago' && (
                        <Button variant="ghost" onClick={() => marcarPago(p)}>
                          Marcar pago
                        </Button>
                      )}
                      <Button variant="danger" onClick={() => remover(p)}>
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Novo pagamento">
        <div className="space-y-3">
          <div>
            <Label>Paciente</Label>
            <Select value={form.paciente_id} onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}>
              <option value="">Selecione...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor</Label>
              <Input type="number" value={form.valor || ''} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={form.forma_pagamento ?? ''} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}>
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao_credito">Cartão de crédito</option>
                <option value="cartao_debito">Cartão de débito</option>
                <option value="boleto">Boleto</option>
                <option value="convenio">Convênio</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PagamentoForm['status'] })}>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="atrasado">Atrasado</option>
              </Select>
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={form.data_vencimento ?? ''}
                onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
              />
            </div>
          </div>
          {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroForm}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || !form.paciente_id || !form.descricao || !form.valor}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const vazioDespesa: DespesaForm = { descricao: '', categoria: '', valor: 0, data: dataHoje(), forma_pagamento: '', status: 'pago' }

function AbaDespesas() {
  const [despesas, setDespesas] = useState<DespesaClinica[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<DespesaForm>(vazioDespesa)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    despesasApi
      .listar()
      .then(setDespesas)
      .finally(() => setCarregando(false))
  }
  useEffect(carregar, [])

  function abrirNovo() {
    setForm(vazioDespesa)
    setErroForm(null)
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      await despesasApi.criar(form)
      setModalAberto(false)
      carregar()
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : 'Erro ao salvar despesa.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(d: DespesaClinica) {
    if (!confirm(`Remover a despesa "${d.descricao}"?`)) return
    await despesasApi.remover(d.id)
    carregar()
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={abrirNovo}>+ Nova despesa</Button>
      </div>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : despesas.length === 0 ? (
        <EmptyState text="Nenhuma despesa registrada ainda." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Descrição</th>
                  <th className="px-4 py-2.5 font-medium">Categoria</th>
                  <th className="px-4 py-2.5 font-medium">Valor</th>
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {despesas.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{d.descricao}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.categoria ?? '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{moeda(d.valor)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.data}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={d.status === 'pago' ? 'green' : 'amber'}>{d.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="danger" onClick={() => remover(d)}>
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Nova despesa">
        <div className="space-y-3">
          <div>
            <Label>Descrição</Label>
            <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Input
                placeholder="Aluguel, insumos, salários..."
                value={form.categoria ?? ''}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              />
            </div>
            <div>
              <Label>Valor</Label>
              <Input type="number" value={form.valor || ''} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DespesaForm['status'] })}>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
              </Select>
            </div>
          </div>
          {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroForm}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || !form.descricao || !form.valor}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
