# Circode: Minimalist Visual Code System

Circode adalah sistem identifikasi visual melingkar yang menggabungkan estetika desain futuristik dengan fungsionalitas data encoding berbasis sudut (Angular Encoding). Project ini dirancang untuk branding premium, label produk, dan identitas visual unik.

## 🚀 Fitur Utama

Sistem ini menggunakan pendekatan **Minimalist Single-Ring** yang dioptimalkan untuk performa cetak dan pembacaan digital:

- **Radial Offset Sequence**: Meskipun hanya menggunakan satu cincin, sistem ini tetap bisa menyimpan urutan karakter (sequence) dan menangani karakter ganda dengan cara menempatkan titik data secara menjorok ke dalam (Spiral/Radial).
- **Radar Spoke Design**: Menghubungkan titik data ke cincin utama dengan garis tipis ("jari-jari") untuk memberikan tampilan terstruktur ala radar militer/Sci-Fi. Ini memecahkan masalah estetika titik yang terlihat acak.
- **Orientation Marker**: Dilengkapi dengan segitiga penunjuk arah (0°) agar kode tetap bisa dibaca secara akurat meskipun posisi stiker miring atau terbalik.
- **Print-Safe Design**: Ketebalan garis (6px) dan ukuran titik (12px) telah disesuaikan agar tetap tajam saat dicetak pada media fisik seperti stiker kecil atau plat label.

---

## 🛠️ Cara Penggunaan

### Persyaratan
Instalasi library yang dibutuhkan menggunakan pip:
```bash
pip install pillow opencv-python numpy
```

### Generator (Membuat Barcode)
Gunakan `minimalist_barcode.py` untuk menghasilkan gambar barcode:
```bash
python minimalist_barcode.py --text "REMON2026" --out "barcode.png"
```
**Argumen:**
- `--text`: Teks yang ingin di-encode (Angka 0-9 dan Huruf A-Z).
- `--out`: Nama file output (.png).
- `--no-text`: Gunakan flag ini untuk menyembunyikan tulisan teks di bawah logo (untuk hasil yang lebih bersih).

### Scanner / Decoder (Membaca Barcode)
Gunakan `decoder.py` untuk memproses gambar dan mengembalikan teks aslinya:
```bash
python decoder.py --image "barcode.png"
```

---

## 📐 Logika Encoding
Sistem memetakan karakter ke dalam 36 zona angular (10° per zona):
- **0 - 9**: Index 0 sampai 9.
- **A - Z**: Index 10 sampai 35.
- **0° (Arah Jam 12)**: Titik awal pembacaan (ditandai dengan segitiga).

Urutan pembacaan didasarkan pada jarak titik dari pusat (Radial Distance). Titik terluar adalah karakter pertama, dan semakin masuk ke dalam adalah karakter selanjutnya.

---

**Developed by Remon**
