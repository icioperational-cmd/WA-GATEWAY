import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import express from 'express'
import pino from 'pino'

const app = express()
app.use(express.json())

let sock
let isConnected = false

async function startWA() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true, // ⛳ gunakan versi lama yang stabil
    auth: state,
    version,
    syncFullHistory: false,
    browser: ["Chrome (No-Browser)", "Safari", "1.0"]
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      isConnected = true
      console.log('✅ WhatsApp connected!')
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      console.log('Connection closed:', reason)

      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnecting...')
        startWA()
      } else {
        console.log('❌ Logged out. Hapus folder auth untuk login ulang.')
      }
    }
  })
}

startWA()

// SEND MESSAGE API
app.post('/send', async (req, res) => {
  const { number, message } = req.body
  if (!isConnected) return res.json({ status: false, error: 'Device belum terhubung' })

  const jid = number.replace(/\D/g, '') + '@s.whatsapp.net'
  await sock.sendMessage(jid, { text: message })

  res.json({ status: true, sent: { number, message } })
})

app.listen(3000, () => console.log('🚀 Server berjalan di http://localhost:3000'))
