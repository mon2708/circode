# CirCode v2: Hybrid Circular-Binary Code System

**CirCode v2** adalah evolusi dari sistem kode visual melingkar yang menjembatani estetika futuristik dengan reliabilitas tinggi setingkat QR Code. Berbeda dengan sistem sirkular tradisional yang bergantung pada posisi sudut tunggal, CirCode v2 menggunakan **Binary Polar Grid** yang jauh lebih tahan terhadap noise dan distorsi kamera.

## 🚀 Fitur Utama

Sistem ini dirancang untuk performa real-world dengan fungsionalitas modern:

- **Hybrid Binary-Polar Grid**: Data disimpan dalam kisi-kisi biner 36 sektor (filled=1, empty=0) yang disusun secara radial (bercincin).
- **3-Bullseye Finder System**: Menggunakan 3 penanda konsentris pada 0°, 120°, dan 240° untuk deteksi posisi, skala, dan rotasi otomatis. Ini memungkinkan pembacaan dari sudut mana pun.
- **Timing Ring Calibration**: Dilengkapi dengan cincin kalibrasi luar untuk memastikan sampling data yang presisi pada setiap sektor.
- **Robust Decoder Engine (OpenCV.js)**:
  - **Aspect Ratio Correction**: Mengoreksi distorsi lensa kamera HP agar lingkaran tetap bulat sempurna saat diproses.
  - **Equilateral Filtering**: Memilih finder yang paling stabil berdasarkan geometri segitiga sama sisi.
  - **Inverted Bit Fallback**: Mampu membaca kode dalam kondisi kontras terbalik (light-on-dark).
- **Smart "Go to Link"**: Deteksi otomatis protokol URL (http/www) dengan tombol akses langsung setelah scan.
- **Designer Friendly**: Opsi download dengan latar belakang transparan (.png) untuk integrasi desain profesional.

---

## 🛠️ Cara Penggunaan

### Versi Web (Rekomendasi)
Buka `index.html` di browser Anda (disarankan melalui Local Server atau HTTPS untuk akses kamera).

1.  **Generator**: Masukkan teks atau URL, lalu klik **Generate**.
2.  **Download**: Pilih **Black BG** untuk cetak standar atau **Transparent** untuk kebutuhan desain.
3.  **Scanner**: Klik **Live Cam** untuk scan real-time menggunakan kamera HP/Laptop, atau **Upload** gambar yang sudah ada.

### Persyaratan Python (Optional)
Untuk integrasi backend, instalasi library berikut:
```bash
pip install pillow opencv-python numpy
```

---

## 📐 Spesifikasi Teknis

### Encoding Logic
- **Charset**: `0-9`, `A-Z`, dan simbol khusus (`:/.?=&-_#`).
- **Data Structure**:
  - **Header**: 6-bit panjang data.
  - **Payload**: 6-bit per karakter (Base64-like).
  - **Checksum**: 6-bit verifikasi integritas data untuk mencegah false-positive.
- **Capacity**: Mendukung hingga 12 ring data (tergantung panjang teks).

### Scanner Pipeline
1.  **Adaptive Thresholding**: Menangani kondisi cahaya yang tidak merata.
2.  **Contour Analysis**: Mencari struktur bullseye (lingkaran dalam lingkaran).
3.  **Coordinate Mapping**: Mentransformasi koordinat polar ke grid biner berdasarkan 3 titik referensi.
4.  **Bit Sampling**: Mengambil rata-rata nilai pixel pada pusat sektor data.

---

**Developed by Remon · 2026**
