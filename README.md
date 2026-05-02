# CirCode: Hybrid Circular-Binary Code System

**CirCode** adalah evolusi dari sistem kode visual melingkar yang menjembatani estetika futuristik dengan reliabilitas tinggi setingkat QR Code. Berbeda dengan sistem sirkular tradisional yang bergantung pada posisi sudut tunggal, CirCode menggunakan **Binary Polar Grid** yang jauh lebih tahan terhadap noise dan distorsi kamera.

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
- **Designer Friendly**: Opsi download dengan latar belakang hitam, putih, atau transparan (.png) untuk integrasi desain profesional.

---

## 🛠️ Cara Penggunaan

### Versi Web (Rekomendasi)
Buka `index.html` di browser Anda (disarankan melalui Local Server atau HTTPS untuk akses kamera).

1.  **Generator**: Masukkan teks atau URL, lalu klik **Generate**.
2.  **Download**: Pilih **Black**, **White**, atau **Trans** sesuai kebutuhan desain Anda.
3.  **Scanner**: Klik **Live Cam** untuk scan real-time, atau **Upload** gambar yang sudah ada.

### Integrasi Python
Instalasi library:
```bash
pip install pillow opencv-python numpy`
```
#### Generator
```bash
python minimalist_barcode.py --text "Remon-2026" --bg black --show-text --out "barcode.png"
```
**Argumen:**
- `--text`: Teks yang ingin di-encode (Mendukung Huruf Besar, Kecil, Angka, dan Simbol).
- `--bg`: Mode latar belakang (`black`, `white`, atau `transparent`).
- `--show-text`: Menampilkan label teks di bawah barcode.


**Example**
  Background black
```bash
python minimalist_barcode.py --text "Remon-2026" --bg black --show-text --out "barcode.png"
```
Background white
```bash
python minimalist_barcode.py --text "Remon-2026" --bg white --show-text --out "barcode.png"
```
Background transparent
```bash
python minimalist_barcode.py --text "Remon-2026" --bg transparent --show-text --out "barcode.png"
```

**Example no/show text**

--show-text
<img width="256" height="256" alt="secret" src="https://github.com/user-attachments/assets/c5e0323a-21bd-4ca0-b4f8-2fd580d33d46" />

no text
<img width="256" height="256" alt="secret1" src="https://github.com/user-attachments/assets/52379618-3193-46ad-8d71-01ff394fd8c4" />



#### Scanner
```bash
python decoder.py --image "barcode.png"
```

---

## 📐 Spesifikasi Teknis

### Encoding Logic
- **Charset**: `0-9`, `A-Z`, `a-z`, dan simbol (`:/.?=&-_#%@+*()[]{}<>!$`).
- **Data Structure**:
  - **Header**: 6-bit (Panjang Data).
  - **Payload**: 7-bit per karakter (Case-sensitive).
  - **Checksum**: 6-bit (Sum modulo 64).
- **Grid**: 36 sektor per ring.

---

**Developed by Remon · 2026**
