import cv2
import numpy as np
import math
import argparse

CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:/.?=&-_#%@+*()[]{}<>!$"
SECTORS = 36
BITS_PER_CHAR = 7
MIN_DATA_RINGS = 3

def bits_to_text(bits):
    if len(bits) < 13: return None
    
    # Read length (6 bits)
    length = 0
    for i in range(6):
        length = (length << 1) | bits[i]
    
    if length == 0 or length > 63: return None
    
    need = 6 + length * BITS_PER_CHAR + 6
    if len(bits) < need: return None
    
    text = ""
    checksum = 0
    for i in range(length):
        val = 0
        offset = 6 + i * BITS_PER_CHAR
        for j in range(BITS_PER_CHAR):
            val = (val << 1) | bits[offset + j]
        if val >= len(CHARSET): return None
        text += CHARSET[val]
        checksum = (checksum + val) % 64
        
    # Read checksum (6 bits)
    cs_off = 6 + length * BITS_PER_CHAR
    cs_val = 0
    for i in range(6):
        cs_val = (cs_val << 1) | bits[cs_off + i]
        
    if cs_val != checksum: return None
    return text

def find_bullseyes(thresh):
    contours, hierarchy = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None: return []
    
    bulls = []
    hierarchy = hierarchy[0]
    
    for i, cnt in enumerate(contours):
        child = hierarchy[i][2]
        if child < 0: continue
        grandchild = hierarchy[child][2]
        if grandchild < 0: continue
        
        area = cv2.contourArea(cnt)
        if area < 30: continue
        
        peri = cv2.arcLength(cnt, True)
        if peri == 0: continue
        circularity = 4 * math.pi * area / (peri * peri)
        if circularity < 0.5: continue
        
        M = cv2.moments(cnt)
        if M["m00"] == 0: continue
        cx = M["m10"] / M["m00"]
        cy = M["m01"] / M["m00"]
        
        bulls.append({
            "x": cx, "y": cy, "area": area, 
            "radius": math.sqrt(area / math.pi)
        })
        
    return bulls

def decode_circode(image_path):
    img = cv2.imread(image_path)
    if img is None:
        print("Error: Could not read image.")
        return
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    
    # Try both normal and inverted threshold
    for mode in ["normal", "inverted"]:
        if mode == "normal":
            _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        else:
            _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            
        bulls = find_bullseyes(thresh)
        if len(bulls) < 3: continue
        
        # Pick best 3 (equilateral)
        bulls.sort(key=lambda x: x["area"], reverse=True)
        candidates = bulls[:6]
        best_set = None
        best_score = float('inf')
        
        for i in range(len(candidates)-2):
            for j in range(i+1, len(candidates)-1):
                for k in range(j+1, len(candidates)):
                    a, b, c = candidates[i], candidates[j], candidates[k]
                    d0 = math.hypot(a["x"]-b["x"], a["y"]-b["y"])
                    d1 = math.hypot(b["x"]-c["x"], b["y"]-c["y"])
                    d2 = math.hypot(a["x"]-c["x"], a["y"]-c["y"])
                    avg = (d0+d1+d2)/3
                    score = abs(d0-avg) + abs(d1-avg) + abs(d2-avg)
                    if score < best_score:
                        best_score = score
                        best_set = [a, b, c]
        
        if not best_set: continue
        
        # Determine center and rotation
        cx = sum(b["x"] for b in best_set) / 3
        cy = sum(b["y"] for b in best_set) / 3
        
        # The largest bullseye is usually the reference (Top)
        ref = sorted(best_set, key=lambda x: x["area"], reverse=True)[0]
        rotation = math.atan2(ref["y"] - cy, ref["x"] - cx) - (-math.pi / 2)
        finder_dist = math.hypot(ref["x"] - cx, ref["y"] - cy)
        
        data_outer_r = (finder_dist - ref["radius"]) * 0.96
        data_inner_r = (finder_dist * 0.13 / 0.82)
        
        sector_ang = 2 * math.pi / SECTORS
        
        for num_rings in range(MIN_DATA_RINGS, 13):
            ring_w = (data_outer_r - data_inner_r) / num_rings
            if ring_w < 2: break
            
            bits = []
            for ring in range(num_rings):
                sample_r = data_outer_r - ring * ring_w - ring_w / 2
                for sec in range(SECTORS):
                    angle = sec * sector_ang - math.pi / 2 + rotation + sector_ang / 2
                    px = int(cx + sample_r * math.cos(angle))
                    py = int(cy + sample_r * math.sin(angle))
                    
                    if 0 <= py < thresh.shape[0] and 0 <= px < thresh.shape[1]:
                        # Use thresh value (binary)
                        bits.append(1 if thresh[py, px] > 127 else 0)
                    else:
                        bits.append(0)
            
            # Try normal and inverted bits
            res = bits_to_text(bits)
            if res: return res
            
            inv_bits = [1-b for b in bits]
            res = bits_to_text(inv_bits)
            if res: return res
            
    return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CirCode v2 Decoder")
    parser.add_argument("--image", required=True, help="Path to barcode image")
    args = parser.parse_args()
    
    result = decode_circode(args.image)
    if result:
        print(f"Decoded Text: {result}")
    else:
        print("Failed to decode CirCode.")
