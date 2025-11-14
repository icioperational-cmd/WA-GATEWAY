\import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import express from 'express'
import pino from 'pino'
import axios from 'axios'

const app = express()
app.use(express.json())

let sock
let isConnected = false

// 🔄 AUTO-PING (supaya Replit tidak sleep)
// Replit akan ping server sendiri setiap 4 menit
setInterval(() => {
  axios.get("https://YOUR-REPL-URL.repl.co").catch(() => {})
}, 240000) // 4 menit = 240000ms

async function startWA() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    version,
    syncFullHistory: false,
    browser: ["Chrome (Replit)", "Safari", "1.0"]
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.clear()
      console.log("📱 Scan QR berikut untuk login WhatsApp:\n")
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      isConnected = true
      console.log('✅ WhatsApp connected!')
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      console.log('❌ Connection closed:', reason)

      // 🔁 AUTO RESTART
      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnecting...')
        startWA()
      } else {
        console.log('❌ Logged out! Hapus folder auth untuk login ulang.')
      }
    }
  })

  // 🛡 Auto Restart jika terjadi error fatal
  sock.ev.on("error", (err) => {
    console.log("⚠️ Error:", err)
    console.log("🔄 Restarting WhatsApp...")
    startWA()
  })
}

startWA()

// ============================
// 📩 API UNTUK MENGIRIM WA
// ============================
app.post('/send', async (req, res) => {
  const { number, message } = req.body
  if (!isConnected) return res.json({ status: false, error: 'Device belum terhubung' })

  const jid = number.replace(/\D/g, '') + '@s.whatsapp.net'
  await sock.sendMessage(jid, { text: message })

  res.json({ status: true, sent: { number, message } })
})

// ============================
// 🌐 WEB SERVER UNTUK PING
// ============================
app.get("/", (req, res) => {
  res.send("ICI WhatsApp Gateway is running ✓")
})

app.listen(3000, () => console.log('🚀 Server berjalan di http://localhost:3000'))
