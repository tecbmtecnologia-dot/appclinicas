import { useEffect, useRef, useState } from 'react'
import { Video } from 'lucide-react'
import { Button, Card, EmptyState, Input, PageHeader, Select } from '../../components/ui'
import { agendamentosApi } from '../../api/agendamentos'
import { api } from '../../api/client'
import { getSocket } from '../../api/socket'
import type { Agendamento, Mensagem } from '../../types'

export default function Telemedicina() {
  const [consultas, setConsultas] = useState<Agendamento[]>([])
  const [salaAtiva, setSalaAtiva] = useState<Agendamento | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [remetenteTipo, setRemetenteTipo] = useState<'paciente' | 'medico'>('medico')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    agendamentosApi
      .listar()
      .then((todas) => setConsultas(todas.filter((a) => a.tipo === 'telemedicina' && a.status !== 'cancelado')))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!salaAtiva) return
    const socket = getSocket()

    api.get<Mensagem[]>(`/mensagens?sala=${salaAtiva.id}`).then(setMensagens).catch(() => setMensagens([]))

    const salaId = salaAtiva.id
    socket.emit('entrar-sala', salaId)

    function aoReceber(msg: Mensagem) {
      if (msg.sala === salaId) setMensagens((prev) => [...prev, msg])
    }
    socket.on('nova-mensagem', aoReceber)
    return () => {
      socket.off('nova-mensagem', aoReceber)
    }
  }, [salaAtiva])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [mensagens])

  function enviar() {
    if (!texto.trim() || !salaAtiva) return
    const socket = getSocket()
    const remetente = remetenteTipo === 'medico' ? `Dr(a). ${salaAtiva.medico_nome}` : salaAtiva.paciente_nome ?? 'Paciente'
    socket.emit('enviar-mensagem', { sala: salaAtiva.id, remetente, remetente_tipo: remetenteTipo, texto })
    setTexto('')
  }

  return (
    <div>
      <PageHeader title="Telemedicina" subtitle="Chat em tempo real entre paciente e médico" icon={Video} />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card className="p-3 h-fit">
          <p className="text-xs font-medium text-slate-500 px-2 pb-2">Consultas de telemedicina</p>
          {consultas.length === 0 ? (
            <p className="text-xs text-slate-400 px-2">
              Nenhuma consulta de telemedicina agendada. Crie uma em Agendamento com o tipo "Telemedicina".
            </p>
          ) : (
            <div className="space-y-1">
              {consultas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSalaAtiva(c)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                    salaAtiva?.id === c.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <p className="font-medium">{c.paciente_nome}</p>
                  <p className="text-xs text-slate-400">
                    Dr(a). {c.medico_nome} · {c.data_hora.replace('T', ' ')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Card>

        {!salaAtiva ? (
          <EmptyState text="Selecione uma consulta ao lado para abrir o chat." />
        ) : (
          <Card className="flex flex-col h-[65vh]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">
                  {salaAtiva.paciente_nome} · Dr(a). {salaAtiva.medico_nome}
                </p>
                <p className="text-xs text-slate-400">{salaAtiva.data_hora.replace('T', ' ')}</p>
              </div>
              <div className="w-40">
                <Select value={remetenteTipo} onChange={(e) => setRemetenteTipo(e.target.value as 'paciente' | 'medico')}>
                  <option value="medico">Enviar como médico</option>
                  <option value="paciente">Enviar como paciente</option>
                </Select>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {mensagens.length === 0 && (
                <p className="text-xs text-slate-400 text-center pt-8">Nenhuma mensagem ainda. Diga olá!</p>
              )}
              {mensagens.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.remetente_tipo === 'medico' ? 'bg-brand-700 text-white ml-auto' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <p className="text-[11px] opacity-70 mb-0.5">{m.remetente}</p>
                  {m.texto}
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 flex gap-2">
              <Input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviar()}
                placeholder="Digite uma mensagem..."
              />
              <Button onClick={enviar} disabled={!texto.trim()}>
                Enviar
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
