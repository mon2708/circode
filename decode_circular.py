import cv2
import numpy as np
import math
import argparse

def decode_circular(image_path):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        print(f"Gagal membaca gambar: {image_path}")
        return
        
    _, thresh = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)
    kernel = np.ones((5,5), np.uint8)
    opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    contours, _ = cv2.findContours(opened, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    h, w = img.shape
    cx, cy = w / 2.0, h / 2.0
    
    dots = []
    for c in contours:
        area = cv2.contourArea(c)
        M = cv2.moments(c)
        if M["m00"] != 0 and area > 10:
            dx = M["m10"] / M["m00"]
            dy = M["m01"] / M["m00"]
            dist = math.hypot(dx - cx, dy - cy)
            angle_dot = math.atan2(dy - cy, dx - cx)
            rel_angle = (math.degrees(angle_dot) + 90) % 360
            dots.append({"dist": dist, "angle": rel_angle})

    if not dots:
        print("Error: Tidak ada titik data yang terdeteksi.")
        return

    dots.sort(key=lambda x: x["dist"], reverse=True)
    valid_chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    result_string = ""
    for d in dots:
        idx = int(round(d["angle"] / 10.0)) % 36
        result_string += valid_chars[idx]

    print("\n" + "="*50)
    print("  MULTI-RING CIRCULAR BARCODE SCANNER")
    print("="*50)
    print(f"Hasil Pembacaan (Teks Asli) : {result_string}")
    print(f"Jumlah Karakter/Cincin      : {len(result_string)}")
    print("="*50 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, default="circular_barcode.png")
    args = parser.parse_args()
    decode_circular(args.image)
