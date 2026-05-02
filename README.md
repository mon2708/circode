# Circode: Custom Circular Barcode System

Circode adalah sistem barcode melingkar kustom yang menggabungkan estetika desain futuristik dengan fungsionalitas data encoding berbasis sudut (Angular Encoding). Project ini dikembangkan untuk kebutuhan branding premium yang membutuhkan identitas visual unik.

## 🚀 Fitur Utama

Project ini memiliki dua sistem utama yang bisa dipilih sesuai kebutuhan:

### 1. Minimalist Barcode (Single-Ring + Radar Spokes)
Sistem 1 cincin yang sangat elegan, dirancang untuk estetika premium namun tetap fungsional.
- **Radial Offset Sequence**: Meskipun hanya menggunakan satu cincin, sistem ini tetap bisa menyimpan urutan karakter (sequence) dan menangani karakter ganda dengan cara menempatkan titik data secara menjorok ke dalam (Spiral/Radial).
- **Radar Spoke Design**: Menghubungkan titik data ke cincin utama dengan garis tipis untuk memberikan tampilan terstruktur ala radar militer/Sci-Fi.
- **Orientation Marker**: Dilengkapi dengan segitiga penunjuk arah (0°) agar kode tetap bisa dibaca meskipun posisi stiker miring.
- **Print-Safe**: Garis dan titik telah dioptimalkan ketebalannya untuk kebutuhan cetak fisik pada media kecil.

### 2. Circular Barcode (Multi-Ring)
Sistem multi-cincin konsentris untuk kapasitas data yang lebih besar.
- **Perfect Sequence**: Karakter pertama berada di cincin terluar, karakter terakhir di cincin terdalam.
- **High Data Capacity**: Cocok untuk menyimpan teks panjang atau kode serial yang kompleks.

---

## 🛠️ Cara Penggunaan

### Persyaratan
Pastikan Anda sudah menginstal Python dan library yang dibutuhkan:
```bash
pip install pillow opencv-python numpy
```

### Generator (Membuat Barcode)
Gunakan `minimalist_barcode.py` untuk membuat desain minimalis terbaru:
```bash
python minimalist_barcode.py --text "REMON2026" --out "barcode.png"
```
Argumen:
- `--text`: Teks yang ingin di-encode (Angka 0-9 dan Huruf A-Z).
- `--out`: Nama file output (.png).
- `--no-text`: Tambahkan flag ini jika ingin menyembunyikan teks di bawah logo.

### Scanner / Decoder (Membaca Barcode)
Gunakan `decoder.py` untuk membaca hasil barcode menggunakan teknologi Computer Vision:
```bash
python decoder.py --image "barcode.png"
```

---

## 📐 Logika Encoding
Sistem membagi lingkaran 360° menjadi 36 zona (masing-masing 10°):
- **0 - 9**: Index 0 sampai 9.
- **A - Z**: Index 10 sampai 35.
- **0° (Jam 12)**: Titik awal pembacaan.

---

**Developed by Remon**
