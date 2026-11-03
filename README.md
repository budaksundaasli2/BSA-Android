# Budak Sunda Asli – Android v1.2

Source project Android Studio untuk aplikasi BSA.

## Pembaruan v1.2
- Ikon aplikasi menggunakan logo Budak Sunda Asli putih pada latar hitam sesuai gambar yang diberikan.
- Menyediakan ikon launcher normal, round, adaptive, dan monochrome (Android 13+).
- Mempertahankan perbaikan tombol Unduh PNG dari versi 1.1.
- Pada Android 10+, gambar disimpan melalui MediaStore ke `Pictures/BSA`.

## Build APK dengan GitHub Actions
1. Unggah seluruh isi folder proyek ini ke root repository GitHub (bukan folder induknya).
2. Pastikan `.github/workflows/build-apk.yml` berada di root repository.
3. Push ke branch `main` atau jalankan workflow `Build BSA Android APK` dari tab Actions.
4. Jika workflow berhasil, unduh artifact `BSA-Android-APK`, ekstrak, lalu pasang `app-debug.apk`.

## Build lokal
Buka folder proyek ini di Android Studio, tunggu Gradle Sync, lalu pilih Build > Build Bundle(s) / APK(s) > Build APK(s).

## Catatan
Source ini sudah diperbarui dan diperiksa secara statis. APK v1.2 belum dikompilasi maupun diuji pada perangkat fisik dalam sesi ini. Fitur web yang memakai CropperJS dan Google Fonts masih memerlukan internet karena pustakanya dimuat dari CDN.


## Pembaruan v1.3
- Label aplikasi launcher diubah menjadi `BSA`.
- Version code dinaikkan menjadi 4 dan version name menjadi 1.3.
- Ikon launcher dan fitur aplikasi lainnya dipertahankan.


## Versi 1.6 — Navigasi Preview / Home / Unduh

- Tombol Home dipindahkan ke tengah, di antara Preview dan Unduh.
- Navigasi Home lama di bagian bawah halaman dihapus agar tidak muncul dua kali.
- Tombol Home tetap memakai fungsi kembali ke halaman utama yang sudah ada di `script.js`.
- Cache JavaScript diperbarui agar browser memuat skrip terbaru.
- Versi Android dinaikkan menjadi 1.6 (versionCode 7).
- Workflow Android SDK diperbarui ke `android-actions/setup-android@v4` agar tidak meminta paket SDK `tools` yang sudah tidak tersedia.


## Versi 1.7 — ikon latar hitam

- Ikon launcher diganti menjadi logo kubus putih dengan latar hitam sesuai referensi terbaru.
- Varian legacy, round, adaptive foreground, dan monochrome diperbarui.
- Label aplikasi tetap `BSA`.
- Versi aplikasi: `1.7` (versionCode `8`).
- Workflow build menggunakan `android-actions/setup-android@v4`.

Setelah source diunggah ke branch `main`, GitHub Actions akan membangun APK debug dan mengunggahnya sebagai artifact `BSA-Android-APK`.


## Versi 1.8 — Kamera bawaan Android

- Tombol **Ambil Foto** membuka aplikasi kamera bawaan Android melalui `MediaStore.ACTION_IMAGE_CAPTURE`.
- Foto disimpan sementara melalui AndroidX `FileProvider`, lalu dikirim kembali ke WebView sebagai file untuk proses crop.
- Tombol **Pilih Gambar Latar Belakang** tetap membuka galeri/pemilih file.
- Build APK melalui GitHub Actions seperti biasa.


## Pengaturan BSA
- Dark mode dan watermark BSA dapat diaktifkan/dinonaktifkan dari panel Pengaturan.
- Lokasi penyimpanan hasil PNG: **Internal** atau **SD Card**.
- Untuk SD Card, pilih **SD Card** pada pengaturan, tekan **Pilih folder SD Card**, lalu pilih folder pada kartu microSD melalui pemilih folder Android. Izin folder disimpan agar dapat digunakan kembali.
- Versi aplikasi: 1.8.
