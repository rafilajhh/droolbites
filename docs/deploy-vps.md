# Deploy Droolbites ke VPS

Panduan ini buat naruh Droolbites di VPS sendiri dengan domain **droolbites.biz.id** (plus `www.droolbites.biz.id` yang otomatis dialihkan ke domain utama), HTTPS dari Let's Encrypt.

Gambaran singkatnya:

```
Pengunjung ──HTTPS──▶ nginx di host (port 80/443, sudah dipakai situs lain juga)
                         │  proxy_pass http://127.0.0.1:3010
                         ▼
               Docker: app (Next.js) ──▶ db (MySQL 8.4, tanpa port di host)
```

- **nginx di host** pegang port 80/443 dan sertifikat (certbot). Droolbites cuma nambah satu file site: `deploy/nginx/droolbites.conf`.
- **app** cuma bisa diakses dari VPS itu sendiri di `127.0.0.1:3010`.
- **db** (MySQL 8.4 di Docker) sama sekali nggak punya port di host, jadi nggak bentrok dengan MariaDB host yang sudah ada di `127.0.0.1:3306`.

File yang dipakai:

| File | Isinya |
|---|---|
| `compose.yml` + `compose.prod.yml` | Stack Docker (db, migrate, app). `compose.prod.yml` menimpa setelan lokal jadi setelan produksi. |
| `.env.production.example` | Contoh isi `.env` di server (tanpa nilai rahasia). |
| `deploy/nginx/droolbites.conf` | Site nginx: HTTP → HTTPS, `www` → domain utama, proxy ke app. |
| `prisma/seed-production.ts` | Isi awal database: menu, pengaturan toko, dan **satu** akun admin. |
| `scripts/backup-db.sh` | Backup database harian. |

> Semua perintah di bawah dijalankan di VPS lewat SSH, kecuali yang ditandai lain. Perintah `docker compose` selalu dijalankan dari folder repo.

## 1. Kebutuhan

- VPS Ubuntu 22.04/24.04 (punya kita: Ubuntu 24.04 ARM64, RAM 23 GB, aman). Kalau suatu saat pindah ke VPS kecil: minimal RAM 2 GB, atau 1 GB + swap (lihat [Troubleshooting](#build-kehabisan-memori)).
- Docker Engine + plugin Compose v2.24 atau lebih baru (cek: `docker compose version`). Di VPS kita sudah terpasang.
- nginx + certbot di host (sudah ada, dipakai situs lain).
- Akses ke panel DNS domain `.biz.id`.

Kalau suatu saat pakai VPS baru yang belum ada Docker-nya, pasang dengan skrip resmi:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER    # lalu logout-login SSH supaya bisa docker tanpa sudo
```

## 2. Arahkan DNS

Di panel registrar `.biz.id`, bagian DNS, buat dua **A record**:

| Nama / Host | Tipe | Nilai |
|---|---|---|
| `@` (droolbites.biz.id) | A | `140.245.102.131` |
| `www` | A | `140.245.102.131` |

Hapus A/AAAA record lain untuk `@` dan `www` kalau ada (misalnya parkir dari registrar). Tunggu beberapa menit sampai beberapa jam, lalu cek dari laptop:

```bash
nslookup droolbites.biz.id
nslookup www.droolbites.biz.id
```

Dua-duanya harus menjawab `140.245.102.131`. **Sertifikat HTTPS baru bisa dibuat setelah ini benar.**

## 3. Firewall

`ufw` di VPS sudah mengizinkan 80 dan 443 (dipakai situs lain), jadi nggak perlu diubah. Port app (3010) cuma terbuka di `127.0.0.1`, jadi memang nggak perlu dan **jangan** dibuka di firewall. Kalau di VPS baru, cukup:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 4. Ambil kode

```bash
ssh <user>@140.245.102.131
sudo mkdir -p /opt/droolbites && sudo chown $USER: /opt/droolbites
git clone https://github.com/rafilajhh/droolbites.git /opt/droolbites
cd /opt/droolbites
```

## 5. Buat `.env`

```bash
cp .env.production.example .env
chmod 600 .env
```

Bikin nilai rahasia (jalankan satu per satu, salin hasilnya):

```bash
openssl rand -base64 32   # → AUTH_SECRET
openssl rand -hex 24      # → MYSQL_ROOT_PASSWORD
openssl rand -hex 24      # → MYSQL_PASSWORD
```

Lalu `nano .env` dan isi minimal:

- `APP_URL="https://droolbites.biz.id"` (harus `https`, kalau nggak cookie login dan webhook Belibayar nggak jalan)
- `AUTH_SECRET`, `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` dari perintah di atas
- `PAYMENT_PROVIDER="mock"` dulu; ganti ke `belibayar` setelah langkah 10
- `SMTP_HOST` biarkan **kosong**: email memang ditunda. Checkout, pembayaran, dan reset password tetap jalan, cuma emailnya nggak dikirim (di log app muncul satu peringatan `[mail] SMTP_HOST is not set`).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` biarkan kosong di sini (diisi lewat perintah di langkah 7).

Catatan:

- Jangan pakai karakter `$` di nilai mana pun. Password MySQL pakai hasil `openssl rand -hex` (aman untuk URL).
- Password MySQL cuma dipakai saat database **pertama kali** dibuat. Mengubahnya di `.env` nanti nggak mengubah password di database.
- `.env` nggak pernah di-commit (sudah di `.gitignore`).

## 6. Jalankan pertama kali

```bash
docker compose -f compose.yml -f compose.prod.yml up -d --build
```

Ini build image (beberapa menit), menyalakan MySQL, menjalankan **migrasi** otomatis (service `migrate`, sekali jalan lalu berhenti), lalu menyalakan app. Cek:

```bash
docker compose -f compose.yml -f compose.prod.yml ps        # db healthy, app Up, migrate Exited (0)
docker compose -f compose.yml -f compose.prod.yml logs migrate   # "All migrations have been successfully applied."
curl -I http://127.0.0.1:3010                                # HTTP/1.1 200 OK
```

Mailpit (penangkap email lokal) sengaja nggak ikut jalan di produksi.

Biar nggak capek ngetik, boleh bikin alias (opsional, taruh di `~/.bashrc`):

```bash
alias dc='docker compose -f compose.yml -f compose.prod.yml'
```

## 7. Isi data awal (production seed)

**Jangan** pakai `npx prisma db seed` di server: itu seed demo yang menghapus semua data dan bikin akun dengan password yang tertulis di README.

Seed produksi cuma bikin menu (3 kategori, 7 produk, 10 varian, beserta fotonya), pengaturan toko, dan **satu** admin. Tanpa pelanggan, tanpa pesanan. Password admin minimal 12 karakter. Supaya password nggak tersimpan di history shell, ketik lewat `read`:

```bash
read -p "Email admin: " ADMIN_EMAIL
read -s -p "Password admin (min 12 karakter): " ADMIN_PASSWORD; echo
export ADMIN_EMAIL ADMIN_PASSWORD

docker compose -f compose.yml -f compose.prod.yml run --rm \
  -e ADMIN_EMAIL -e ADMIN_PASSWORD \
  migrate npx tsx prisma/seed-production.ts

unset ADMIN_PASSWORD
```

Hasilnya kira-kira:

```
Admin kamu@contoh.com: created.
Production seed done: 3 categories, 7 products, 10 variants, 1 admin(s).
```

Aman dijalankan ulang: data yang sudah ada (harga, foto, pengaturan yang kamu ubah di admin) **nggak** ditimpa, cuma yang hilang yang ditambahkan. Password admin yang sudah ada juga nggak diganti, kecuali ditambah `-e ADMIN_RESET_PASSWORD=1` (cara reset password admin kalau lupa).

## 8. Pasang nginx + sertifikat HTTPS

Sertifikat cuma bisa dibuat **setelah** A record di langkah 2 sudah mengarah ke `140.245.102.131`. Jadi urutannya: pasang bagian HTTP dulu → ambil sertifikat → pasang file lengkap.

**a. Pasang bagian HTTP saja** (semua yang di atas baris `# ---- HTTPS ----`):

```bash
sudo sed '/^# ---- HTTPS ----$/,$d' deploy/nginx/droolbites.conf | sudo tee /etc/nginx/sites-available/droolbites.conf > /dev/null
sudo ln -s /etc/nginx/sites-available/droolbites.conf /etc/nginx/sites-enabled/droolbites.conf
sudo nginx -t && sudo systemctl reload nginx
```

(Kalau situs lain di server ini disimpan di `/etc/nginx/conf.d/` dan bukan `sites-available`, ikuti gaya itu: taruh file di `/etc/nginx/conf.d/droolbites.conf` dan lewati perintah `ln -s`.)

**b. Ambil sertifikat** (webroot yang sama dengan situs lain):

```bash
sudo certbot certonly --webroot -w /var/www/html -d droolbites.biz.id -d www.droolbites.biz.id
```

Berhasil kalau muncul `Successfully received certificate` dan file ada di `/etc/letsencrypt/live/droolbites.biz.id/`. Perpanjangan otomatis sudah diurus timer certbot yang dipakai situs lain (cek: `sudo certbot renew --dry-run`). Supaya nginx memakai sertifikat baru setelah diperpanjang, pastikan ada deploy hook reload (kalau situs lain sudah punya, berarti sudah beres):

```bash
ls /etc/letsencrypt/renewal-hooks/deploy/
# kalau kosong:
printf '#!/bin/sh\nsystemctl reload nginx\n' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

**c. Pasang file lengkap** (HTTP → HTTPS, `www` → domain utama, proxy ke app):

```bash
sudo cp deploy/nginx/droolbites.conf /etc/nginx/sites-available/droolbites.conf
sudo nginx -t && sudo systemctl reload nginx
```

## 9. Cek HTTPS

Dari laptop:

```bash
curl -I https://droolbites.biz.id          # 200, ada header strict-transport-security
curl -I http://droolbites.biz.id           # 301 → https://droolbites.biz.id/
curl -I https://www.droolbites.biz.id      # 301 → https://droolbites.biz.id/
```

Lalu buka https://droolbites.biz.id di browser, dan login admin di https://droolbites.biz.id/admin dengan akun dari langkah 7. Cek juga **Admin › Store settings** (alamat, jam buka, ongkir) sudah sesuai.

## 10. Google sign-in dan Belibayar

**Google sign-in** (boleh nanti):

1. Google Cloud Console › APIs & Services › Credentials › OAuth client (Web application).
2. Di **Authorized redirect URIs** tambahkan `https://droolbites.biz.id/auth/google/callback`.
3. Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di `.env`, lalu `docker compose -f compose.yml -f compose.prod.yml up -d` (tanpa `--build` cukup).

Kalau dua-duanya kosong, tombol "Continue with Google" otomatis disembunyikan.

**Belibayar**:

1. Dashboard Belibayar › Kredensial: salin API key, secret key, dan webhook secret ke `BELIBAYAR_API_KEY`, `BELIBAYAR_SECRET_KEY`, `BELIBAYAR_WEBHOOK_SECRET` di `.env`. Key `byr_test_` = sandbox, `byr_live_` = uang sungguhan.
2. Set **Webhook URL** di dashboard: `https://droolbites.biz.id/api/payments/belibayar/webhook`.
3. Masukkan IP VPS `140.245.102.131` ke IP whitelist Belibayar.
4. Ganti `PAYMENT_PROVIDER="belibayar"` di `.env`, lalu `docker compose -f compose.yml -f compose.prod.yml up -d`.
5. Coba satu pesanan dengan key sandbox dulu sebelum pakai `byr_live_`.

## 11. Update ke versi terbaru

```bash
cd /opt/droolbites
git pull
docker compose -f compose.yml -f compose.prod.yml up -d --build
```

Migrasi baru (kalau ada) otomatis dijalankan sebelum app menyala. Foto produk yang di-upload lewat admin aman di volume `uploads`, database di volume `db_data`; dua-duanya nggak hilang saat update. Bersihkan image lama sesekali dengan `docker image prune -f`.

## 12. Log

```bash
docker compose -f compose.yml -f compose.prod.yml logs -f app     # log app (Ctrl+C untuk keluar)
docker compose -f compose.yml -f compose.prod.yml logs --tail 100 db
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

## 13. Backup database

Backup manual:

```bash
bash scripts/backup-db.sh
# → backups/droolbites-20261101-0230.sql.gz  (14 file terbaru disimpan, yang lebih lama dihapus)
```

Backup otomatis tiap hari jam 02:30: `crontab -e` (sebagai user yang bisa menjalankan `docker` tanpa sudo), tambahkan baris ini:

```
30 2 * * * cd /opt/droolbites && bash scripts/backup-db.sh >> backups/backup.log 2>&1
```

Folder `backups/` ada di VPS yang sama, jadi sesekali salin ke laptop (dari laptop):

```bash
scp <user>@140.245.102.131:/opt/droolbites/backups/droolbites-*.sql.gz .
```

Foto produk hasil upload ada di volume `uploads`. Kalau mau ikut dibackup:

```bash
docker run --rm -v droolbites_uploads:/u -v "$PWD/backups":/b alpine tar czf /b/uploads-$(date +%Y%m%d).tar.gz -C /u .
```

(Nama volume `droolbites_uploads` berasal dari nama folder repo; cek dengan `docker volume ls`.)

## 14. Restore dari backup

Ini **menimpa** isi database sekarang dengan isi backup:

```bash
cd /opt/droolbites
docker compose -f compose.yml -f compose.prod.yml stop app
gunzip -c backups/droolbites-20261101-0230.sql.gz | \
  docker compose -f compose.yml -f compose.prod.yml exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'
docker compose -f compose.yml -f compose.prod.yml start app
```

## 15. Troubleshooting

### certbot gagal / browser bilang sertifikat nggak valid

- Biasanya DNS belum mengarah ke VPS. Cek `nslookup droolbites.biz.id` harus `140.245.102.131`; kalau belum, tunggu propagasi lalu ulangi langkah 8b. Jangan diulang terus-terusan dalam waktu singkat: Let's Encrypt punya batas percobaan gagal (sekitar 5 per jam).
- Pastikan yang terpasang masih versi HTTP-only waktu menjalankan certbot pertama kali (langkah 8a). Kalau file lengkap terpasang sebelum sertifikat ada, `nginx -t` gagal dengan `cannot load certificate`.
- Cek `curl -I http://droolbites.biz.id/.well-known/acme-challenge/tes` dari laptop: harus dijawab nginx VPS ini (404 nggak apa-apa), bukan timeout.

### `nginx -t` gagal

- `duplicate listen options` / `conflicting server name`: ada file lain yang sudah memakai `droolbites.biz.id`. Cari dengan `grep -r droolbites /etc/nginx/`.
- `a duplicate default server`: file ini nggak memakai `default_server`, jadi penyebabnya file lain.

### 502 Bad Gateway

App belum jalan atau lagi restart. Cek `docker compose -f compose.yml -f compose.prod.yml ps` dan `logs app`. Saat start pertama, app baru menyala setelah db healthy dan migrasi selesai (kurang lebih 30–60 detik).

### Port sudah dipakai

`compose.prod.yml` cuma memakai `127.0.0.1:3010` di host. Kalau muncul `port is already allocated`, cek siapa yang pakai: `sudo ss -ltnp | grep 3010`. Kalau perlu pindah port, ganti `3010` di `compose.prod.yml` **dan** di `proxy_pass` pada `deploy/nginx/droolbites.conf` (lalu salin ulang ke `/etc/nginx/...` dan reload). Port 80/443 milik nginx host; jangan jalankan web server lain di sana.

### Build kehabisan memori

Di VPS ini (23 GB) nggak akan terjadi. Di VPS kecil, `npm run build` bisa mati dengan `Killed` atau `JavaScript heap out of memory`. Tambah swap 2 GB:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Login nggak nyangkut / langsung logout

`APP_URL` harus diawali `https://` dan situs dibuka lewat HTTPS (cookie sesi bertanda `Secure`). Setelah mengubah `.env`, jalankan `docker compose -f compose.yml -f compose.prod.yml up -d`.

### Email nggak terkirim

Memang sengaja: `SMTP_HOST` kosong berarti email mati. Kalau sudah punya layanan SMTP, isi `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, dan `MAIL_FROM` di `.env`, lalu `up -d`.

### `required variable ... is missing a value`

Ada variabel wajib yang kosong di `.env` (`MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, atau `APP_URL`). Pastikan perintah dijalankan dari folder repo (tempat `.env` berada).
