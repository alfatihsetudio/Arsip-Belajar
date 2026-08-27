const { makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config({ path: '../.env.local' }); // Load env from Next.js root
console.log("Status API Key Gemini:", process.env.GEMINI_API_KEY ? "✅ Terbaca" : "❌ KOSONG");

const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Setup S3 Client for Cloudflare R2
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'arsipbelajar';

const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We'll print it manually using qrcode-terminal
        logger: pino({ level: 'silent' }), // Silence logs for clean terminal
        browser: ['Arsip Belajar Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('Scan QR Code ini untuk menghubungkan bot:');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus. Alasan:', lastDisconnect.error?.message);
            if (shouldReconnect) {
                console.log('Menghubungkan kembali...');
                connectToWhatsApp();
            } else {
                console.log('Sesi log out. Silakan hapus folder auth_info_baileys dan scan QR ulang.');
            }
        } else if (connection === 'open') {
            console.log('✅ Bot WhatsApp berhasil terhubung!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        
        // HANYA merespons pesan masuk dari user lain (!fromMe)
        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        
        // Abaikan pesan dari grup (@g.us)
        if (remoteJid.endsWith('@g.us')) return;

        // Ambil isi teks atau caption
        const textMessage = msg.message.conversation || 
                            msg.message.extendedTextMessage?.text || 
                            msg.message.imageMessage?.caption || 
                            msg.message.videoMessage?.caption;
                            
        // Deteksi Media (Gambar / Audio)
        const getMediaMsg = (m) => {
            if (!m) return null;
            if (m.imageMessage) return { type: 'image', msg: m.imageMessage };
            if (m.audioMessage) return { type: 'audio', msg: m.audioMessage };
            if (m.ephemeralMessage?.message) return getMediaMsg(m.ephemeralMessage.message);
            if (m.viewOnceMessage?.message) return getMediaMsg(m.viewOnceMessage.message);
            if (m.viewOnceMessageV2?.message) return getMediaMsg(m.viewOnceMessageV2.message);
            return null;
        };
        
        const mediaData = getMediaMsg(msg.message);

        // Jika tidak ada teks dan tidak ada media, abaikan
        if (!textMessage && !mediaData) return;
        
        console.log(`[Pesan Masuk dari ${remoteJid}]: ${textMessage || '(Media)'}`);

        // PROSEDUR WA RESMI:
        // 1. Tandai pesan sebagai telah dibaca (centang biru)
        sock.readMessages([msg.key]).catch(() => {});
        // 2. Berlangganan status kehadiran user
        sock.presenceSubscribe(remoteJid).catch(() => {});
        // 3. Tampilkan status 'sedang mengetik...' (Composing)
        sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});

        // Hapus '@s.whatsapp.net' tapi biarkan '@lid' jika ada (karena WA terkadang menggunakan LID)
        const senderId = remoteJid.replace('@s.whatsapp.net', '');

        // LOGIKA 1: VERIFIKASI (JIKA BELUM TERVERIFIKASI)
        if (textMessage && textMessage.includes('Aktivasi Akun Arsip Belajar saya:')) {
            const tokenMatch = textMessage.match(/Aktivasi Akun Arsip Belajar saya:\s*([A-Z0-9-]+)/i);
            if (tokenMatch && tokenMatch[1]) {
                const token = tokenMatch[1].trim();
                try {
                    const res = await dbPool.query('SELECT id, whatsapp_number FROM public.profiles WHERE wa_verify_token = $1', [token]);
                    if (res.rows.length > 0) {
                        const row = res.rows[0];
                        await dbPool.query(`UPDATE public.profiles SET wa_status = 'verified', wa_verify_token = NULL, whatsapp_number = $1 WHERE id = $2`, [senderId, row.id]);
                        await sock.sendMessage(remoteJid, { text: '✅ Verifikasi berhasil! Nomor Anda sudah terhubung. Silakan tanyakan materi belajar Anda, atau kirim foto/suara untuk menyimpan catatan baru.' });
                    } else {
                        await sock.sendMessage(remoteJid, { text: '❌ Verifikasi gagal. Token tidak ditemukan atau sudah kadaluarsa.' });
                    }
                } catch (err) {
                    console.error(err);
                    await sock.sendMessage(remoteJid, { text: '❌ Terjadi kesalahan sistem saat verifikasi.' });
                }
            } else {
                await sock.sendMessage(remoteJid, { text: '❌ Format pesan aktivasi tidak valid.' });
            }
            sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
            return;
        }

        // --- AUTHENTICATION UNTUK FITUR LAINNYA ---
        try {
            console.log("Mencari profile untuk senderId:", senderId);
            const profileRes = await dbPool.query(`SELECT id FROM public.profiles WHERE whatsapp_number = $1 AND wa_status = 'verified'`, [senderId]);
            
            if (profileRes.rows.length === 0) {
                console.log("Profile tidak ditemukan/belum verified.");
                await sock.sendMessage(remoteJid, { text: 'Nomor belum terdaftar. Silakan tautkan nomor di menu Pengaturan Web.' });
                sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
                return;
            }
            const userId = profileRes.rows[0].id;

            // LOGIKA 3: BUAT CATATAN BARU (JIKA MENGIRIM MEDIA)
            if (mediaData) {
                console.log(`Menerima media jenis: ${mediaData.type}`);
                await sock.sendMessage(remoteJid, { text: '⏳ Sedang menyalin dan menstrukturkan catatan dari media Anda...' });
                
                // Cek opsi user
                const textLower = (textMessage || '').toLowerCase();
                const skipUpload = textLower.includes('jangan simpan') || textLower.includes('no media');

                // Download media
                const buffer = await downloadMediaMessage(msg, 'buffer', { }, { logger: pino({ level: 'silent' }) });
                const base64Data = buffer.toString('base64');
                const rawMime = mediaData.msg.mimetype || (mediaData.type === 'image' ? 'image/jpeg' : 'audio/ogg');
                const mimeType = rawMime.split(';')[0]; // Hapus parameter tambahan seperti ; codecs=opus
                
                // Upload ke Cloudflare R2 jika user tidak melarang
                let mediaUrl = null;
                if (!skipUpload) {
                    try {
                        console.log("Mengunggah media ke R2...");
                        const ext = mimeType.split('/')[1] || 'bin';
                        const key = `${userId}/${Date.now()}-wa.${ext}`;
                        await s3.send(new PutObjectCommand({
                            Bucket: R2_BUCKET,
                            Key: key,
                            Body: buffer,
                            ContentType: mimeType,
                        }));
                        // Hasilkan Presigned URL untuk akses
                        const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
                        mediaUrl = await getSignedUrl(s3, getCmd, { expiresIn: 7 * 24 * 3600 });
                        console.log("Upload selesai:", key);
                    } catch (uploadErr) {
                        console.error("Gagal upload ke R2:", uploadErr);
                    }
                }

                const captionContext = textMessage ? `\n\nKonteks tambahan dari user: ${textMessage}` : '';
                const promptMedia = `Analisis media ini secara mendalam. 
Tugasmu: Ekstrak semua informasi pendidikan, rangkum dan strukturkan menjadi catatan materi yang rapi. ${captionContext}

ATURAN STRUKTUR & FORMAT (WAJIB DIIKUTI):
- Tulis dalam bentuk TEKS BIASA (PLAIN TEXT).
- DILARANG KERAS menggunakan simbol Markdown (JANGAN gunakan #, ##, ###, **, *, _, atau tabel markdown).
- Untuk Judul/Sub-judul, gunakan HURUF KAPITAL (UPPERCASE) di baris tersendiri.
- Untuk poin-poin (bullet points), gunakan tanda strip biasa (- teks) tanpa ditebalkan.
- Jangan sampai ada informasi penting, konsep, atau persamaan yang terlewat.

PENTING: Di baris paling pertama, berikan judul singkat (1-4 kata) dengan format persis seperti ini:
JUDUL: [Judul Singkat]

Lalu di baris berikutnya, tuliskan isi catatan secara lengkap sesuai aturan di atas.`;

                const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
                const result = await model.generateContent([
                    promptMedia,
                    { inlineData: { data: base64Data, mimeType: mimeType } }
                ]);
                
                let responseText = result.response.text();
                
                // Parsing Title
                let title = "Catatan Baru";
                const titleMatch = responseText.match(/^JUDUL:\s*(.*)/i);
                if (titleMatch) {
                    title = titleMatch[1].trim();
                    responseText = responseText.replace(/^JUDUL:\s*(.*)\n*/i, '').trim();
                }

                // Simpan ke database
                let imageUrl = mediaData.type === 'image' ? mediaUrl : null;
                const insertRes = await dbPool.query(
                    `INSERT INTO public.notes (user_id, title, transcribed_text, image_url) VALUES ($1, $2, $3, $4) RETURNING id`,
                    [userId, title, responseText, imageUrl]
                );
                
                // Simpan SEMUA media (gambar & audio) ke note_media agar thumbnail muncul di web
                if (mediaUrl) {
                    const noteId = insertRes.rows[0].id;
                    await dbPool.query(
                        `INSERT INTO public.note_media (note_id, media_url, media_type, order_index) VALUES ($1, $2, $3, $4)`,
                        [noteId, mediaUrl, mediaData.type, 0]
                    );
                }
                
                console.log("Catatan berhasil disimpan:", title);
                let replyMsg = `✅ Catatan baru berhasil disimpan!\n\n*Judul:* ${title}\n(Cek selengkapnya di web Arsip Belajar)`;
                if (!skipUpload && mediaUrl) {
                    replyMsg += `\n_Media berhasil dilampirkan._`;
                } else if (skipUpload) {
                    replyMsg += `\n_Media tidak disimpan (mode privasi)._`;
                }
                await sock.sendMessage(remoteJid, { text: replyMsg });
                
                sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
                return;
            }

            // LOGIKA 2: TANYA JAWAB MATERI RAG (Chat Biasa)
            // Hanya dieksekusi jika pesan HANYA berisi teks (tanpa media)
            console.log("Mencari catatan di database untuk RAG...");
            const notesRes = await dbPool.query(`SELECT title, transcribed_text FROM public.notes WHERE user_id = $1`, [userId]);
            console.log(`Ditemukan ${notesRes.rows.length} catatan.`);

            let context = '';
            if (notesRes.rows.length > 0) {
                context = notesRes.rows.map(n => `Judul: ${n.title}\nIsi:\n${n.transcribed_text || ''}`).join('\n\n');
            } else {
                context = 'Tidak ada catatan materi yang tersimpan.';
            }
            
            const prompt = `Kamu adalah AI asisten Arsip Belajar. Jawab pertanyaan berikut HANYA berdasarkan materi ini: \n\n[KONTEKS MATERI]\n${context}\n\n[AKHIR KONTEKS]\n\nPENTING - ATURAN FORMAT BALASAN (WAJIB DIIKUTI):
1. Gunakan gaya bahasa chat WhatsApp yang singkat, natural, dan ramah.
2. DILARANG menggunakan format Markdown standar (seperti **tebal** atau # heading).
3. Untuk tulisan tebal (bold), gunakan HANYA SATU asterisk di awal dan akhir kata: *tebal* (contoh: *IELTS Speaking*).
4. Untuk tulisan miring (italic), gunakan underscore: _miring_ (contoh: _Well, You know_).
5. Gunakan list dengan tanda strip (-) atau angka biasa.

Pertanyaan: ${textMessage}`;
            
            const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
            
            console.log("Meminta respons dari Gemini...");
            const result = await model.generateContent(prompt);
            let responseText = result.response.text();
            
            responseText = responseText
                .replace(/\*\*(.*?)\*\*/g, '*$1*') 
                .replace(/### (.*?)\n/g, '*$1*\n') 
                .replace(/## (.*?)\n/g, '*$1*\n')  
                .replace(/# (.*?)\n/g, '*$1*\n');  

            console.log("Respons Gemini sukses, mengirim balasan...");
            
            if (responseText.trim()) {
                await sock.sendMessage(remoteJid, { text: responseText.trim() });
                console.log("Balasan berhasil dikirim.");
            } else {
                console.log("Respons Gemini kosong!");
            }
            
        } catch (err) {
            console.error('Error Memproses Pesan:', err);
            await sock.sendMessage(remoteJid, { text: 'Maaf, terjadi kesalahan saat memproses permintaan Anda.' });
        } finally {
            sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
        }
    });
}

connectToWhatsApp();
