import express from "express";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

let sock;

// ======================
//  START WHATSAPP
// ======================
async function startWhatsapp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  sock = makeWASocket({
    printQRInTerminal: true,
    auth: state
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.clear();
      console.log("Scan QR berikut:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed, reconnecting...", shouldReconnect);
      if (shouldReconnect) startWhatsapp();
    }

    if (connection === "open") {
      console.log("WhatsApp Connected!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

startWhatsapp();

// ======================
//   API SEND MESSAGE
// ======================
app.get("/send", async (req, res) => {
  const number = req.query.number;
  const text = req.query.text;

  if (!number || !text) {
    return res.json({ status: false, message: "number & text wajib diisi" });
  }

  try {
    await sock.sendMessage(number + "@s.whatsapp.net", { text });
    res.json({ status: true, message: "WA terkirim!" });
  } catch (err) {
    res.json({ status: false, error: err.message });
  }
});

// ======================
const PORT = 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
