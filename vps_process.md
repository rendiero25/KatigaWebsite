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
| Peran | staging | produksi |
| Branch | `development` | `main` |
| Mayar | sandbox (`api.mayar.club`) | masih sandbox — belum ditukar |
| Biteship | sandbox (`biteship_test.`) | masih sandbox — belum ditukar |
| Database | `katiga` di Atlas | `katiga` di Atlas — **masih berbagi** |

Alur rilis: push ke `development` → Vercel. Merge ke `main` → VPS otomatis.

## Data mesin

- IP: `202.10.38.98`
- User: `rendiero` (punya sudo, login masih pakai password)
- Aplikasi: `/srv/katiga`
- Port Node: `8000`, di belakang Nginx
- Proses: pm2, nama `katiga`
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

- [ ] **DNS** — A record `@` dan `www` ke `202.10.38.98`, hapus record lama ke Vercel.
      Pantau: `nslookup katiga.id 8.8.8.8`
- [ ] **HTTPS** — setelah DNS propagasi:
      `sudo apt-get install -y certbot python3-certbot-nginx && sudo certbot --nginx -d katiga.id -d www.katiga.id`
- [ ] **`FRONTEND_URL`** di `/srv/katiga/.env` diganti `https://katiga.id` (satu URL, tanpa koma),
      lalu `pm2 reload katiga --update-env`
- [ ] **Kunci Mayar produksi** — `MAYAR_API_URL=https://api.mayar.id/hl/v2` + kunci akun `katiga`.
      Kuncinya ada di `.env` lokal baris 22 dalam keadaan dikomentari.
- [ ] **Kunci Biteship produksi** — buat baru di dashboard Biteship (prefix `biteship_live.`).
      Yang sekarang `biteship_test.` bernama `katiga-sandbox`.
- [ ] **Webhook dipindahkan** ke `https://katiga.id/api/orders/webhook/mayar`
      dan `https://katiga.id/api/orders/webhook/biteship`
- [ ] **Matikan satu penjadwal** — di VPS `setInterval` di `server.js` sudah hidup sendiri,
      jadi `.github/workflows/sweep.yml` dan cron di `vercel.json` sekarang rangkap
- [ ] **`RESEND_API_KEY`** — masih placeholder, jadi email selamat datang dan notifikasi
      form kontak belum pernah berfungsi. Domain `katiga.id` juga harus diverifikasi di Resend
      karena kode mengirim dari `noreply@katiga.id`.
- [ ] **`GOOGLE_CLIENT_ID`** — masih placeholder di backend, dan `VITE_GOOGLE_CLIENT_ID`
      di secret GitHub juga. Login Google belum aktif.
- [ ] **Uji transaksi nyata bernilai kecil** setelah semua di atas selesai
- [ ] **Kunci SSH laptop → VPS** dan matikan `PasswordAuthentication` (ditunda, opsional)

## Keputusan yang masih menggantung

**Pisah database produksi.** Sekarang VPS dan Vercel sandbox memakai database `katiga`
yang sama, jadi order uji dengan resi `WYB-` dummy akan bercampur dengan transaksi asli
di laporan penjualan dan daftar pesanan admin.

Opsi pisah: ganti ujung `MONGODB_URI` di VPS jadi `/katiga_prod`. Cluster, user, dan
password tetap sama. Konsekuensinya database baru mulai kosong — seluruh konten CMS
(hero, produk, kategori, berita, footer, pengaturan) harus diisi ulang, dan admin baru
dibuat lewat `scripts/createAdmin.js`.

Claude menawarkan membuat script penyalin: menyalin koleksi konten dari `katiga` ke
`katiga_prod`, tanpa membawa pesanan, pelanggan, dan notifikasi sandbox. **Belum dibuat,
menunggu keputusan.**

Paling murah dikerjakan sekarang, sebelum ada uang sungguhan di dalamnya.

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
