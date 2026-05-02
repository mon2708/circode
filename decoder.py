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
    length = 0
    for i in range(6): length = (length << 1) | bits[i]
    if length == 0 or length > 63: return None
    
    need = 6 + length * BITS_PER_CHAR + 6
    if len(bits) < need: return None
    
    result = ""
    checksum = 0
    for i in range(length):
        val = 0
        offset = 6 + i * BITS_PER_CHAR
        for j in range(BITS_PER_CHAR): val = (val << 1) | bits[offset + j]
        if val >= len(CHARSET): return None
        result += CHARSET[val]
        checksum = (checksum + val) % 64
        
    cs_off = 6 + length * BITS_PER_CHAR
    cs_val = 0
    for i in range(6):
        if cs_off + i < len(bits): cs_val = (cs_val << 1) | bits[cs_off + i]
        
    if cs_val != checksum: return None
    return result

def find_bullseyes(thresh):
    contours, hierarchy = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None: return []
    bulls = []
    hierarchy = hierarchy[0]
    for i, cnt in enumerate(contours):
        if hierarchy[i][2] < 0: continue
        child = hierarchy[i][2]
        if hierarchy[child][2] < 0: continue
        area = cv2.contourArea(cnt)
        if area < 30: continue
        peri = cv2.arcLength(cnt, True)
        if peri == 0: continue
        if (4 * math.pi * area / (peri * peri)) < 0.5: continue
        M = cv2.moments(cnt)
        if M["m00"] == 0: continue
        bulls.append({"x": M["m10"]/M["m00"], "y": M["m01"]/M["m00"], "area": area, "radius": math.sqrt(area/math.pi)})
    return bulls

def decode_circode(image_path):
    img = cv2.imread(image_path)
    if img is None: return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    for mode in ["normal", "inverted"]:
        flag = cv2.THRESH_BINARY if mode == "normal" else cv2.THRESH_BINARY_INV
        _, thresh = cv2.threshold(blurred, 0, 255, flag + cv2.THRESH_OTSU)
        bulls = find_bullseyes(thresh)
        if len(bulls) < 3: continue
        bulls.sort(key=lambda x: x["area"], reverse=True)
        candidates = bulls[:6]
        best_set, best_score = None, float('inf')
        for i in range(len(candidates)-2):
            for j in range(i+1, len(candidates)-1):
                for k in range(j+1, len(candidates)):
                    a, b, c = candidates[i], candidates[j], candidates[k]
                    d = [math.hypot(a["x"]-b["x"], a["y"]-b["y"]), math.hypot(b["x"]-c["x"], b["y"]-c["y"]), math.hypot(a["x"]-c["x"], a["y"]-c["y"])]
                    avg = sum(d)/3
                    score = sum(abs(x-avg) for x in d)
                    if score < best_score: best_score, best_set = score, [a, b, c]
        if not best_set: continue
        cx, cy = sum(b["x"] for b in best_set)/3, sum(b["y"] for b in best_set)/3
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
                    px, py = int(cx + sample_r * math.cos(angle)), int(cy + sample_r * math.sin(angle))
                    if 0 <= py < thresh.shape[0] and 0 <= px < thresh.shape[1]: bits.append(1 if thresh[py, px] > 127 else 0)
                    else: bits.append(0)
            res = bits_to_text(bits)
            if res: return res
            res = bits_to_text([1-b for b in bits])
            if res: return res
    return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    args = parser.parse_args()
    result = decode_circode(args.image)
    if result: print(f"Decoded Text: {result}")
    else: print("Failed to decode CirCode.")
