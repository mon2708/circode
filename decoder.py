import cv2
import numpy as np
import math
import argparse

def decode_barcode(image_path):
    # Membaca gambar dalam format Grayscale
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        print(f"Gagal membaca gambar: {image_path}")
        return
        
    h, w = img.shape
    # Mengasumsikan barcode berada tepat di tengah kanvas
    cx, cy = w / 2.0, h / 2.0
    
    # Thresholding untuk memisahkan bentuk putih dari latar belakang hitam
    _, thresh = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)
    
    # Mencari contours (garis luar bentuk)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    triangle = None
    triangle_center = None
    dots = []
    
    for c in contours:
        area = cv2.contourArea(c)
        if area < 50: # Abaikan noise kecil
            continue
            
        peri = cv2.arcLength(c, True)
        circ = 4 * math.pi * area / (peri * peri) if peri > 0 else 0
        approx = cv2.approxPolyDP(c, 0.04 * peri, True)
        
        # Menghitung center of mass (titik tengah koordinat bentuk)
        M = cv2.moments(c)
        if M["m00"] == 0:
            continue
        mx = M["m10"] / M["m00"]
        my = M["m01"] / M["m00"]
        
        # Deteksi Segitiga (Marker Orientasi Atas / 0 Derajat)
        if len(approx) == 3 and 0.4 < circ < 0.7:
            triangle = c
            triangle_center = (mx, my)
            
        # Deteksi Titik Putih (Data Karakter) - Berbentuk lingkaran penuh
        elif circ > 0.8:
            dots.append((mx, my))
            
    if triangle_center is None:
        print("Error: Marker Segitiga (penunjuk 0 derajat) tidak ditemukan. Orientasi gagal dikalkulasi.")
        return
        
    # Kalkulasi vector 0 derajat absolut (arah dari pusat ke segitiga)
    angle_0 = math.atan2(triangle_center[1] - cy, triangle_center[0] - cx)
    
    # Kalkulasi radius ideal (jarak cincin). Segitiga selalu berada di luar cincin.
    dist_triangle = math.hypot(triangle_center[0] - cx, triangle_center[1] - cy)
    
    valid_dots = []
    for x, y in dots:
        dist = math.hypot(x - cx, y - cy)
        # Filter: Ambil semua titik yang berada di dalam area batas cincin utama.
        # Teks berada jauh di luar batas cincin (dist > dist_triangle)
        if dist < dist_triangle * 0.95:
            valid_dots.append({"x": x, "y": y, "dist": dist})
            
    if not valid_dots:
        print("Error: Tidak ada titik data yang terdeteksi.")
        return
        
    # Mengurutkan titik berdasarkan jarak dari pusat (Terluar ke Terdalam)
    # Titik terluar adalah huruf ke-1, yang masuk ke dalam adalah huruf ke-2, dst.
    valid_dots.sort(key=lambda d: d["dist"], reverse=True)
    
    # Mapping Data (36 Zona Angular)
    valid_chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    result_string = ""
    
    for d in valid_dots:
        # Menghitung derajat titik
        angle_dot = math.atan2(d["y"] - cy, d["x"] - cx)
        
        # Mengkalkulasi derajat relatif terhadap Segitiga Marker (Searah jarum jam)
        rel_angle = (math.degrees(angle_dot - angle_0) + 360) % 360
        
        # Membulatkan derajat ke kelipatan 10 terdekat (Zona 10 derajat)
        idx = int(round(rel_angle / 10.0)) % 36
        result_string += valid_chars[idx]
        
    print("\n" + "="*50)
    print("  MINIMALIST BARCODE SCANNER RESULT (V2)")
    print("="*50)
    print(f"Karakter Terdeteksi (Urut Asli) : {result_string}")
    print(f"Jumlah Titik Data Terbaca       : {len(result_string)}")
    print("="*50 + "\n")
    print("Info Sistem:")
    print("Scanner menggunakan sistem Radial Offset. Karakter dibaca")
    print("dengan urutan sempurna berdasarkan jejak titik yang menjorok ke dalam.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, default="barcode_remon_v2_print.png", help="Path gambar barcode")
    args = parser.parse_args()
    decode_barcode(args.image)
