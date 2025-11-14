import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import express from "express"
import qrcode from "qrcode-terminal"
import pino from "pino"

const app = express()
app.use(express.json())

let sock
let isConnected = false

async function startWA() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')

    sock = makeWASocket({
        printQRInTerminal: true,
        logger: pino({ level: "silent" }),
        auth: state
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", ({ qr, connection, lastDisconnect }) => {
        if (qr) {
            console.clear()
            console.log("SCAN QR WHATSAPP:")
            qrcode.generate(qr, { small: true })
        }

        if (connection === "open") {
            isConnected = true
            console.log("WA Connected!")
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode
            console.log("Connection closed:", reason)

            if (reason !== DisconnectReason.loggedOut) {
                console.log("Reconnecting...")
                startWA()
            }
        }
    })

    sock.ev.on("messages.upsert", ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        const sender = msg.key.remoteJid

        console.log(`[WA] Pesan dari ${sender}: ${text}`)
    })
}

startWA()

// API SEND MESSAGE
app.post("/send", async (req, res) => {
    const { number, message } = req.body

    if (!isConnected) return res.json({ status: false, error: "Device belum terhubung" })

    const jid = number + "@s.whatsapp.net"
    await sock.sendMessage(jid, { text: message })

    res.json({ status: true, message: "Terkirim!" })
})

app.get("/", (req, res) => {
    res.send("WA Gateway Running")
})

app.listen(3000, () => console.log("🚀 Server berjalan di http://localhost:3000"))
