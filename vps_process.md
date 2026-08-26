# Proses Hosting VPS — Catatan Kerja

Catatan berjalan pemindahan katiga.id dari Vercel ke VPS. Diperbarui terakhir setelah
deploy otomatis pertama berhasil (commit `3951a61`).

Runbook lengkap dengan penjelasan tiap langkah ada di artifact:
https://claude.ai/code/artifact/7caea0ef-b57b-4124-8459-7908f83ba549

File ini sengaja dilacak git supaya bisa dilanjutkan dari komputer mana pun.
**Jangan pernah menulis kunci API, password, atau connection string di sini.**

---

## Peta lingkungan

| | Vercel | VPS Rumahweb |
|---|---|---|
| Peran | staging | produksi — **live di https://katiga.id sejak 26 Agustus 2026** |
| Branch | `development` | `main` |
| Mayar | sandbox (`api.mayar.club`) | masih sandbox — belum ditukar |
| Biteship | sandbox (`biteship_test.`) | masih sandbox — belum ditukar |
| Database | `katiga` di Atlas | `katiga` di Atlas — **sengaja berbagi**, lihat keputusan di bawah |

Alur rilis: push ke `development` → Vercel. Merge ke `main` → VPS otomatis.

## Data mesin

- IP: `202.10.38.98`
- User: `rendiero` (punya sudo, login masih pakai password)
- Aplikasi: `/srv/katiga`
- Port Node: `8000`, di belakang Nginx
- Proses: pm2, nama `katiga`, mode **cluster** 2 instance (`-i 2`) — rilis tanpa jeda.
  Penjadwal hanya hidup di instance `0`; jangan kembalikan ke fork tanpa membaca catatan
  soal jendela 502 di bagian temuan.
- Nginx site: `/etc/nginx/sites-available/katiga`
- File env: `/srv/katiga/.env` (chmod 600, tidak dilacak git)
- OS: Ubuntu 24.04, Node 22, swap 2 GB

---

## Sudah selesai

- [x] VPS disiapkan: user `rendiero`, firewall (22/80/443), swap dinaikkan 256 MB → 2 GB
- [x] Node 22, Nginx, git, pm2, rsync terpasang
- [x] Deploy key VPS → GitHub, repo di-clone dari `main` ke `/srv/katiga`
- [x] `/srv/katiga/.env` disusun (masih memakai kunci sandbox)
- [x] IP VPS didaftarkan di Network Access Atlas
- [x] `npm ci` + build frontend, pm2 start, `pm2 startup` untuk autostart
- [x] Nginx reverse proxy ke `127.0.0.1:8000`, `client_max_body_size 55M`
- [x] Situs tampil di `http://202.10.38.98`, admin login jalan, pelanggan login jalan
- [x] Workflow `.github/workflows/deploy.yml` — push ke `main` memicu deploy
- [x] Secret GitHub: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VITE_GOOGLE_CLIENT_ID`
- [x] Deploy otomatis pertama berhasil (`3951a61`)

## Belum dikerjakan

Urutannya penting — DNS dulu, karena certbot butuh domain sudah menunjuk VPS.

- [x] **DNS** — selesai 26 Agustus 2026. Nameserver dipindah dari `ns1/ns2.vercel-dns.com`
      ke `nsid1–4.rumahweb.*`, A `@` dan `www` → `202.10.38.98`. Terverifikasi di Google,
      Cloudflare, dan Quad9.
- [x] **HTTPS** — certbot berhasil, sertifikat mencakup `katiga.id` dan `www.katiga.id`,
      redirect HTTP→HTTPS 301 aktif.
- [x] **Record email dipulihkan** — MX `@` → `mail.katiga.id` (pri 10), A `mail` →
      `203.175.8.176`, TXT SPF. Terverifikasi menjawab lewat Google.
      Kalau dulu ada DKIM, selector-nya tidak terselamatkan dan harus di-generate ulang.
- [x] **Autostart pm2** — unit systemd terpasang, dibuktikan dengan reboot sungguhan:
      situs kembali sendiri tanpa disentuh.
- [x] **`FRONTEND_URL`** — `https://katiga.id`. Sejak ini, akses lewat IP mentah tidak lagi
      lolos CORS; pakai domain untuk semua pengujian.
- [x] **Perpanjangan sertifikat** — `certbot renew --dry-run` lulus.
- [ ] **Verifikasi domain Resend** — tambahkan record-nya di zona Rumahweb
- [x] **Kunci Mayar produksi** — kunci dan `MAYAR_API_URL=https://api.mayar.id/hl/v2`
      terpasang, diuji lewat konfigurasi aplikasi sendiri dan dijawab 404 (kunci diterima).
- [x] **Kunci Biteship produksi** — `biteship_live.`, `GET /v1/couriers` menjawab 200.
      `BITESHIP_API_KEY_SANDBOX` sengaja dikosongkan.
- [x] **Secret produksi diperkuat** — `JWT_SECRET`, `JWT_CUSTOMER_SECRET`, dan `CRON_SECRET`
      diganti nilai acak 64 karakter (sebelumnya `devsecret` dan `prodsecret`), izin `.env`
      diturunkan dari 0664 ke 0600. Semua sesi lama gugur — perlu login ulang.
- [ ] **Ganti password admin** — masih `admin123`, sementara panel admin sudah publik
- [ ] **Hapus data uji** dari `katiga` sebelum transaksi nyata: 14 order, 4 pelanggan,
      41 notifikasi, 4 submission kontak (2 di antaranya berlabel `UJI COBA`).
      Ingat koreksi `stock`/`soldCount` juga.
      Gejala yang sudah muncul: sapuan Biteship mencatat `400` tiap 15 menit untuk order
      uji dengan resi dummy `WYB-`, karena order itu dibuat pakai kunci sandbox sementara
      sekarang ditanyakan memakai kunci live. Tidak berbahaya, hilang setelah dibersihkan.
- [x] **Webhook Mayar** — `https://katiga.id/api/orders/webhook/mayar` terdaftar di dashboard
      produksi, Testing URL menjawab SUCCESS.
- [x] **Webhook Biteship** — terdaftar. Nama event dan bentuk payload diverifikasi dari
      dokumentasi resmi: tiga event (`order.status`, `order.price`, `order.waybill_id`),
      payload **datar**, pengenal ordernya `order_id`. Handler lama mencari
      `order.status_update` dan `data.id` — dua-duanya tidak pernah ada, jadi setiap
      webhook dibuang diam-diam. Sudah diperbaiki.
      Bentuk payload **Mayar** juga terverifikasi, tapi sumbernya tidak di tempat yang
      diduga. Halaman `integration/webhook` hanya memuat tabel field dan tidak menyebut
      `transactionId` sama sekali — yang ada cuma `data.id`, dijelaskan sebagai "Id
      webhook". Bentuk sebenarnya ada di dokumentasi endpoint **riwayat webhook**
      (`api-reference/webhook/history`), yang menampilkan payload terkirim berisi
      `transactionId` berupa UUID. Itu cocok dengan `data.transactionId` yang dipakai
      handler dan dengan catatan verifikasi 14 Agt 2026.
      Pelajarannya: kalau bentuk payload sebuah webhook tidak ada di halaman integrasi,
      cari di dokumentasi endpoint riwayat/log-nya — di situ yang ditampilkan adalah
      kiriman sungguhan, bukan ringkasan.
- [ ] **Matikan satu penjadwal** — di VPS `setInterval` di `server.js` sudah hidup sendiri,
      jadi `.github/workflows/sweep.yml` dan cron di `vercel.json` sekarang rangkap
- [x] **`RESEND_API_KEY` + domain Resend** — domain terverifikasi (DKIM, MX+TXT `send`,
      DMARC), kunci terpasang. Form kontak dan newsletter footer diuji di produksi dan
      menjawab `emailed: true`. Catatan: mengedit `.env` tidak berpengaruh sampai
      `pm2 reload katiga --update-env` — itu sebabnya uji pertama masih `false`.
- [ ] **`GOOGLE_CLIENT_ID`** — masih placeholder di backend, dan `VITE_GOOGLE_CLIENT_ID`
      di secret GitHub juga. Login Google belum aktif.
- [ ] **Uji transaksi nyata bernilai kecil** setelah semua di atas selesai
      Ingat: memicu **dua** transaksi nyata. Pembayaran Mayar, lalu `biteshipCreateOrder`
      otomatis begitu lunas — kurir sungguhan dijadwalkan dan saldo Biteship terpotong.
      Bandingkan ongkir di checkout dengan saldo sebelum membayar.
      Pembatalan lewat `POST /api/orders/my/:id/cancel` ikut membatalkan order Biteship,
      tapi **tidak mengembalikan stok** — `stock` dan `soldCount` harus dikoreksi manual.
      Mayar juga tidak punya endpoint refund; pembatalan hanya menandai `refund_pending`.

### Ditunda — layak dikerjakan, tidak menghalangi go-live

- [ ] **Perkuat keaslian webhook Biteship.** Dokumentasi resminya memastikan tidak ada
      header tanda tangan sama sekali, dan handler mempercayai `status` dari payload
      secara langsung — termasuk untuk menandai pesanan `delivered`
      (`routes/orderRoutes.js`). Siapa pun yang menebak `order_id` Biteship bisa
      memalsukan status pesanan orang lain.
      Jalur Mayar tidak punya masalah ini karena ia menanyakan ulang ke API Mayar sebelum
      bertindak. Perbaikan yang setara: panggil `getOrderTracking(biteshipOrderId)` untuk
      mengonfirmasi status sebelum `markOrderDelivered` / `markOrderShipped`.
- [ ] **`node_modules` terlacak git** — 2594 file. Aturan `node_modules/` di `.gitignore`
      tidak berlaku surut. Tidak merusak deploy karena `npm ci` memasang ulang seluruh
      folder sesudah `git reset --hard`, tapi membengkakkan repo dan menyesatkan.
- [ ] **`nsid3.rumahweb.net` di registry** — seharusnya `.biz`. Server itu tidak melayani
      `katiga.id`, jadi sebagian kueri NS mendarat di tempat yang tidak menjawab. Situs
      tetap jalan lewat tiga nameserver lain.
- [ ] **Kunci SSH laptop → VPS** dan matikan `PasswordAuthentication` (ditunda, opsional)

## Keputusan: satu database saja

**Diputuskan 26 Agustus 2026 — tidak ada pemisahan database.** VPS dan Vercel tetap
memakai `katiga`. Order uji dari staging dihapus manual sebelum go-live.

Konsekuensi yang harus diingat setiap kali menguji di staging:

- **Order uji yang sampai lunas memotong stok produk asli.** `orderRoutes.js:196`
  menjalankan `$inc: { soldCount: +n, stock: -n }` saat pembayaran jadi `paid`, dan
  **menghapus order tidak mengembalikan stok** — tidak ada logika pemulihan di jalur itu.
  Jadi pembersihan harus mencakup koreksi `stock` dan `soldCount`, bukan cuma menghapus
  dokumen order. Paling aman: di staging, berhenti sebelum pembayaran sandbox diselesaikan.
- **Sapuan terjadwal aman.** Order produksi yang ditanyakan ke Mayar/Biteship sandbox
  dijawab 404, dan kode menanganinya tanpa mengubah apa pun (`orderRoutes.js:125`,
  `server.js:232`). Yang muncul cuma baris log.

Isi `katiga` per 26 Agustus 2026: 25 produk, 7 kategori, 5 berita, 7 partner, ~15 dokumen
singleton CMS, 1 admin — plus 14 order, 4 pelanggan, 41 notifikasi, 2 submission kontak
hasil uji yang perlu dihapus sebelum go-live.

---

## Temuan sepanjang proses

Hal-hal yang sudah menyita waktu sekali, supaya tidak terulang.

- **Email admin adalah `admin@kumakuma.com`**, bukan `@katiga.id`. Di database cuma ada
  satu akun admin. Salah alamat dijawab `Invalid credentials`, sama persis dengan gejala
  password salah.
- **`FRONTEND_URL` dipakai dua kali dengan aturan bertabrakan.** CORS di `server.js`
  memecahnya dengan koma, tapi `routes/orderRoutes.js` menempelkannya mentah ke
  `redirectUrl` Mayar. Isi daftar berkoma = redirect rusak untuk semua pembeli.
- **`BITESHIP_API_KEY_SANDBOX` jangan pernah diisi di produksi.** `biteshipService.js`
  memakainya sebagai cadangan, jadi salah ketik di kunci utama menghasilkan resi dummy
  tanpa error apa pun.
- **`NODE_ENV` harus `production`**, kalau tidak Express tidak menyajikan `client/dist`
  sama sekali dan yang muncul cuma JSON.
- **Host key GitHub Actions tidak disimpan sebagai secret.** Dua deploy pertama gagal
  dengan `Host key verification failed` karena kunci RSA terpotong jadi beberapa baris
  saat disalin, sementara `known_hosts` menuntut satu entri satu baris. Runner sekarang
  memindai host sendiri lewat `ssh-keyscan`.
- **Urutan langkah di workflow bukan selera.** `git reset --hard` menghapus `client/dist`
  (folder itu di-gitignore), jadi hasil build harus dikirim sesudahnya. Kebalik sedikit,
  situs menyajikan versi lama tanpa gejala.
- **`rsync` harus ada di VPS**, bukan cuma di runner.
- **Biteship memakai status `in_transit`**, bukan `dropping_off` seperti dugaan awal.
  Sudah diperbaiki di `utils/shipmentStatus.ts` dan `BITESHIP_SHIPPED_STATUSES`.
- **Situs mati diam-diam setelah VPS reboot.** Mesin di-reboot 26 Agustus ~18:00 dan
  aplikasi tidak kembali — Nginx menjawab 502 sementara `pm2 list` kosong. `dump.pm2` utuh,
  jadi `pm2 save` memang pernah jalan; yang tidak pernah ada adalah unit systemd-nya.
  `pm2 startup` hanya **mencetak** perintah `sudo env PATH=...` — kalau baris itu tidak
  disalin dan dijalankan, tidak ada autostart yang terpasang, dan `pm2 startup` terlihat
  seolah sudah selesai. Ketahuan cuma karena kebetulan sedang mengecek DNS.
- **Pindah nameserver memindahkan seluruh zona, bukan cuma A record.** Zona Vercel juga
  memegang MX, A `mail`, dan SPF. Begitu delegasi pindah ke Rumahweb, semuanya hilang dan
  email berhenti — sementara situsnya terlihat baik-baik saja. Periksa MX/TXT zona lama
  sebelum menukar NS domain apa pun.
- **Cara memastikan sebuah kunci Mayar itu sandbox atau produksi.** JWT-nya tidak menyebut
  environment, jadi tidak bisa dibaca dari payload. Panggil `GET /transactions/<uuid-acak>`
  di kedua host: **401** berarti kunci ditolak host itu, **404 Transaction not found**
  berarti kunci diterima. Tidak ada transaksi yang dibuat atau disentuh. Terverifikasi
  26 Agustus 2026: kunci di `.env` lokal menjawab 401 di `api.mayar.id` dan 404 di
  `api.mayar.club` — jadi itu kunci sandbox.
  **Izin tulisnya juga bisa dipastikan tanpa transaksi**, karena payload JWT-nya membawa
  `role` dan `scope`. Kunci produksi di VPS: `role: developer`, `scope: {read, write}`.
  Kunci Read Only akan lolos semua uji `GET` tapi menolak `POST /payments/create` —
  yaitu gagal tepat di langkah pertama checkout.
- **Tiap deploy menghasilkan jendela 502 satu-dua detik.** pm2 berjalan di mode `fork`
  dengan satu instance, jadi `pm2 reload` sebenarnya restart, bukan reload tanpa henti.
  Sudah **empat kali** menyesatkan dalam satu hari: uji form kontak, dua percobaan
  Testing URL Mayar, dan pemeriksaan kesehatan di akhir deploy yang membuat Actions merah
  padahal rilisnya sukses. Kalau ada uji yang gagal tepat setelah deploy, ulangi dulu
  sebelum mendiagnosis.
  **Sudah diselesaikan** 26 Agustus 2026: pm2 dipindah ke mode `cluster` dengan dua
  instance (`pm2 start server.js --name katiga -i 2`), jadi `reload` mengganti instance
  satu per satu dan selalu ada yang melayani. Pemeriksaan di workflow juga diberi
  percobaan ulang sampai 30 detik.
  Prasyaratnya: penjadwal digating ke `NODE_APP_INSTANCE === '0'` (`server.js`), karena
  `checkExpiringPromos` memakai pola cek-lalu-tulis yang menghasilkan notifikasi ganda
  kalau dua instance memeriksanya bersamaan. Terverifikasi lewat log — baris
  `[Biteship Sync]` hanya muncul dari prefix `0|katiga`.
- **Halaman putih dan aset 500 tepat saat deploy.** Penyebabnya `rsync -az --delete`
  yang menulis langsung ke `client/dist` yang sedang dilayani. Dua gejala berbeda:
  berkas separuh jadi selama rsync berjalan (500), dan aset lama yang dihapus `--delete`
  sehingga pengunjung yang sudah memuat `index.html` sebelumnya meminta nama-aset yang
  tidak ada lagi (halaman putih sampai dimuat ulang).
  Diperbaiki dengan `--delay-updates` dan membuang `--delete`. Nama aset Vite berhash,
  jadi berkas lama tidak pernah bentrok — membiarkannya menumpuk jauh lebih murah
  daripada memutus sesi pengunjung.
  Mode cluster pm2 tidak menolong untuk yang ini; itu masalah berkas statis, bukan jeda
  restart proses.
- **`CRON_SECRET` tidak ada di `.env` lokal.** CLAUDE.md menyebutnya wajib dan
  `/api/cron/sweep` menjawab 503 tanpa itu. Nilainya harus sama di `.env` VPS, Environment
  Variables Vercel, dan repository secret GitHub.
- **`client/.env` dan `client/.env.production` ikut terlacak git.** Isinya sekarang cuma
  placeholder, tapi namanya mengundang orang menaruh kunci asli di sana. Sebaiknya
  `git rm --cached` dan masukkan ke `.gitignore` sebelum ada yang salah taruh.

## Perintah yang sering dipakai

```bash
# status aplikasi
pm2 list && pm2 logs katiga --lines 50 --nostream

# cek versi yang sedang jalan di VPS
cd /srv/katiga && git log --oneline -1

# reload setelah mengubah .env
pm2 reload katiga --update-env

# uji backend langsung, melewati Nginx
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/api/products

# rilis: merge development ke main
git checkout main && git merge --ff-only development && git push origin main && git checkout development
```
