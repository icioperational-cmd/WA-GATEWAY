// index.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Konfigurasi WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});

// Tampilkan QR di terminal
client.on('qr', qr => {
  console.log('\n🔹 Scan QR di bawah ini pakai WhatsApp kamu:\n');
  qrcode.generate(qr, { small: true });
});

// Jika berhasil login
client.on('ready', () => {
  console.log('\n✅ WhatsApp Gateway aktif dan siap digunakan!');
});

client.initialize();

// Middleware Express
app.use(bodyParser.json());

// Endpoint tes kirim pesan
app.post('/send', async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({ status: false, message: 'Nomor dan pesan wajib diisi!' });
  }

  const formattedNumber = number.replace(/\D/g, '');
  const chatId = formattedNumber.startsWith('62')
    ? formattedNumber + '@c.us'
    : '62' + formattedNumber.slice(1) + '@c.us';

  try {
    await client.sendMessage(chatId, message);
    console.log(`✅ Pesan terkirim ke ${formattedNumber}: ${message}`);
    res.json({ status: true, message: 'Pesan berhasil dikirim!' });
  } catch (err) {
    console.error('❌ Gagal kirim pesan:', err);
    res.status(500).json({ status: false, message: 'Gagal mengirim pesan' });
  }
});

app.listen(port, () => {
  console.log(`\n🚀 Server berjalan di http://localhost:${port}`);
});
