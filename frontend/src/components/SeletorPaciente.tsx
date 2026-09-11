import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input, Select } from './ui'
import type { Paciente } from '../types'

interface SeletorPacienteProps {
  pacientes: Paciente[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}

// Campo de busca por nome acima do select — usado em todo formulário/tela que precisa
// escolher um paciente, pra não obrigar a rolar uma lista longa procurando pelo nome.
export function SeletorPaciente({ pacientes, value, onChange, disabled }: SeletorPacienteProps) {
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return pacientes
    return pacientes.filter((p) => p.nome.toLowerCase().includes(termo))
  }, [pacientes, busca])

  return (
    <div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar paciente pelo nome..."
          className="pl-9"
          disabled={disabled}
        />
      </div>
      <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">Selecione um paciente...</option>
        {filtrados.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </Select>
      {busca && filtrados.length === 0 && <p className="text-xs text-slate-400 mt-1">Nenhum paciente encontrado com esse nome.</p>}
    </div>
  )
}
