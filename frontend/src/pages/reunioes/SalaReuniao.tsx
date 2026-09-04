import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react'
import { Button } from '../../components/ui'
import { reunioesApi } from '../../api/reunioes'
import { getSocket } from '../../api/socket'
import { useAuth } from '../../contexts/AuthContext'
import type { Reuniao } from '../../types'

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

interface Peer {
  pc: RTCPeerConnection
  nome: string
}

function VideoTile({ stream, nome, local, cameraDesligada }: { stream: MediaStream | null; nome: string; local?: boolean; cameraDesligada?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])
  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-800 aspect-video flex items-center justify-center">
      {!cameraDesligada && (
        <video ref={ref} autoPlay playsInline muted={local} className="w-full h-full object-cover" />
      )}
      {cameraDesligada && (
        <div className="h-16 w-16 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold text-xl">
          {nome.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="absolute bottom-2 left-2 text-xs text-white bg-black/50 rounded-full px-2 py-0.5">
        {nome} {local && '(você)'}
      </span>
    </div>
  )
}

export default function SalaReuniao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [reuniao, setReuniao] = useState<Reuniao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [micAtivo, setMicAtivo] = useState(true)
  const [cameraAtiva, setCameraAtiva] = useState(true)
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
  const [nomes, setNomes] = useState<Record<string, string>>({})

  const peersRef = useRef<Map<string, Peer>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (id) reunioesApi.obter(id).then(setReuniao).catch(() => {})
  }, [id])

  function criarPeerConnection(socketId: string, nome: string, streamLocal: MediaStream) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    streamLocal.getTracks().forEach((track) => pc.addTrack(track, streamLocal))

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket().emit('reuniao:sinal', { destino: socketId, tipo: 'ice-candidate', dados: e.candidate })
      }
    }
    pc.ontrack = (e) => {
      setRemoteStreams((atual) => ({ ...atual, [socketId]: e.streams[0] }))
    }

    peersRef.current.set(socketId, { pc, nome })
    setNomes((atual) => ({ ...atual, [socketId]: nome }))
    return pc
  }

  function encerrarPeer(socketId: string) {
    const peer = peersRef.current.get(socketId)
    peer?.pc.close()
    peersRef.current.delete(socketId)
    setRemoteStreams((atual) => {
      const { [socketId]: _removido, ...resto } = atual
      return resto
    })
    setNomes((atual) => {
      const { [socketId]: _removido, ...resto } = atual
      return resto
    })
  }

  useEffect(() => {
    let cancelado = false

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamRef.current = stream
        setLocalStream(stream)
        entrarNaSala(stream)
      })
      .catch(() => setErro('Não foi possível acessar câmera/microfone. Verifique as permissões do navegador.'))

    function entrarNaSala(streamLocal: MediaStream) {
      const socket = getSocket()

      socket.on('reuniao:participantes-atuais', (existentes: { socketId: string; usuarioId: string; nome: string }[]) => {
        existentes.forEach(async ({ socketId, nome }) => {
          const pc = criarPeerConnection(socketId, nome, streamLocal)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          socket.emit('reuniao:sinal', { destino: socketId, tipo: 'offer', dados: offer })
        })
      })

      socket.on('reuniao:novo-participante', ({ socketId, nome }: { socketId: string; usuarioId: string; nome: string }) => {
        criarPeerConnection(socketId, nome, streamLocal)
      })

      socket.on('reuniao:sinal', async ({ origem, tipo, dados }: { origem: string; tipo: string; dados: unknown }) => {
        let peer = peersRef.current.get(origem)
        if (!peer && tipo === 'offer') {
          const pc = criarPeerConnection(origem, nomes[origem] ?? 'Participante', streamLocal)
          peer = { pc, nome: nomes[origem] ?? 'Participante' }
        }
        if (!peer) return
        if (tipo === 'offer') {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(dados as RTCSessionDescriptionInit))
          const answer = await peer.pc.createAnswer()
          await peer.pc.setLocalDescription(answer)
          getSocket().emit('reuniao:sinal', { destino: origem, tipo: 'answer', dados: answer })
        } else if (tipo === 'answer') {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(dados as RTCSessionDescriptionInit))
        } else if (tipo === 'ice-candidate') {
          try {
            await peer.pc.addIceCandidate(new RTCIceCandidate(dados as RTCIceCandidateInit))
          } catch {
            /* candidato pode chegar antes da remote description em alguns casos — ignorar */
          }
        }
      })

      socket.on('reuniao:participante-saiu', ({ socketId }: { socketId: string }) => {
        encerrarPeer(socketId)
      })

      socket.emit('reuniao:entrar', { reuniaoId: id, usuarioId: usuario?.id, nome: usuario?.nome })
    }

    return () => {
      cancelado = true
      const socket = getSocket()
      socket.emit('reuniao:sair')
      socket.off('reuniao:participantes-atuais')
      socket.off('reuniao:novo-participante')
      socket.off('reuniao:sinal')
      socket.off('reuniao:participante-saiu')
      peersRef.current.forEach((peer) => peer.pc.close())
      peersRef.current.clear()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function alternarMic() {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled))
    setMicAtivo((v) => !v)
  }

  function alternarCamera() {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled))
    setCameraAtiva((v) => !v)
  }

  function sair() {
    navigate('/reunioes')
  }

  const socketIds = Object.keys(nomes)

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-40">
      <div className="px-4 py-3 text-white flex items-center justify-between border-b border-white/10">
        <div>
          <p className="font-semibold">{reuniao?.titulo ?? 'Reunião'}</p>
          <p className="text-xs text-slate-400">{socketIds.length + 1} participante(s) conectado(s)</p>
        </div>
      </div>

      {erro ? (
        <div className="flex-1 flex items-center justify-center text-white text-sm px-6 text-center">{erro}</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <VideoTile stream={localStream} nome={usuario?.nome ?? 'Você'} local cameraDesligada={!cameraAtiva} />
          {socketIds.map((socketId) => (
            <VideoTile key={socketId} stream={remoteStreams[socketId] ?? null} nome={nomes[socketId]} />
          ))}
        </div>
      )}

      <div className="px-4 py-4 flex items-center justify-center gap-3 border-t border-white/10">
        <Button variant="secondary" onClick={alternarMic}>
          {micAtivo ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button variant="secondary" onClick={alternarCamera}>
          {cameraAtiva ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button variant="danger" onClick={sair}>
          <PhoneOff className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  )
}
