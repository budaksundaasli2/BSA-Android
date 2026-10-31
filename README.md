# Budak Sunda Asli – Android v1.2

Source project Android Studio untuk aplikasi BSA.

## Pembaruan v1.2
- Ikon aplikasi menggunakan logo Budak Sunda Asli putih pada latar hitam sesuai gambar yang diberikan.
- Menyediakan ikon launcher normal, round, adaptive, dan monochrome (Android 13+).
- Mempertahankan perbaikan tombol Unduh PNG dari versi 1.1.
- Pada Android 10+, gambar disimpan melalui MediaStore ke `Pictures/Budak Sunda Asli`.

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


## Ikon launcher BSA v1.4

Ikon launcher memakai logo kubus BSA hitam-putih dari aset yang disediakan.
File adaptive icon berada di `app/src/main/res/drawable-nodpi/` dan
`app/src/main/res/mipmap-anydpi-v26/`; ikon legacy berada di folder `mipmap-*`.
Latar adaptive icon berwarna putih agar sesuai dengan gambar sumber.
