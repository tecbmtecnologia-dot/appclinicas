import { useEffect, useState } from 'react'
import { PiggyBank } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select } from '../../components/ui'
import { financasPessoaisApi, type FinancaPessoalForm } from '../../api/financasPessoais'
import { ApiError } from '../../api/client'
import type { FinancaPessoal, ResumoFinancasPessoais } from '../../types'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataHoje() {
  return new Date().toISOString().slice(0, 10)
}

const vazio: FinancaPessoalForm = { tipo: 'despesa', descricao: '', categoria: '', valor: 0, data: dataHoje() }

export default function MinhasFinancas() {
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [resumo, setResumo] = useState<ResumoFinancasPessoais | null>(null)
  const [lancamentos, setLancamentos] = useState<FinancaPessoal[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<FinancaPessoalForm>(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    Promise.all([financasPessoaisApi.resumo(mes, ano), financasPessoaisApi.listar()])
      .then(([r, l]) => {
        setResumo(r)
        setLancamentos(l)
      })
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [mes, ano])

  function abrirNovo() {
    setForm(vazio)
    setErroForm(null)
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      await financasPessoaisApi.criar(form)
      setModalAberto(false)
      carregar()
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : 'Erro ao salvar lançamento.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(f: FinancaPessoal) {
    if (!confirm(`Remover "${f.descricao}"?`)) return
    await financasPessoaisApi.remover(f.id)
    carregar()
  }

  return (
    <div>
      <PageHeader
        title="Minhas finanças"
        subtitle="Controle pessoal, privado — só você vê estes lançamentos. Compare com o resumo do Financeiro da clínica."
        icon={PiggyBank}
        action={<Button onClick={abrirNovo}>+ Novo lançamento</Button>}
      />

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

      {resumo && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4">
            <p className="text-xs text-slate-400 mb-1">Receitas do mês</p>
            <p className="text-xl font-bold text-emerald-600">{moeda(resumo.receitas)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-400 mb-1">Despesas do mês</p>
            <p className="text-xl font-bold text-red-600">{moeda(resumo.despesas)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-400 mb-1">Saldo do mês</p>
            <p className={`text-xl font-bold ${resumo.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{moeda(resumo.saldo)}</p>
          </Card>
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : lancamentos.length === 0 ? (
        <EmptyState text="Nenhum lançamento pessoal ainda." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Descrição</th>
                  <th className="px-4 py-2.5 font-medium">Categoria</th>
                  <th className="px-4 py-2.5 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 font-medium">Valor</th>
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((f) => (
                  <tr key={f.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{f.descricao}</td>
                    <td className="px-4 py-2.5 text-slate-600">{f.categoria ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={f.tipo === 'receita' ? 'green' : 'red'}>{f.tipo === 'receita' ? 'Receita' : 'Despesa'}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{moeda(f.valor)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{f.data}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="danger" onClick={() => remover(f)}>
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

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Novo lançamento pessoal">
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as FinancaPessoalForm['tipo'] })}>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Input
                placeholder="Moradia, lazer, salário..."
                value={form.categoria ?? ''}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              />
            </div>
            <div>
              <Label>Valor</Label>
              <Input type="number" value={form.valor || ''} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
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
