import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    // Em dev, sem VITE_SOCKET_URL, conecta na mesma origem (proxy do Vite).
    // Em produção, aponta direto para o backend (o Netlify não sustenta
    // WebSocket via proxy de redirect).
    socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      path: '/socket.io',
      autoConnect: true,
    })
  }
  return socket
}
