import math
import argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont

CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:/.?=&-_#%@+*()[]{}<>!$"
SECTORS = 36
BITS_PER_CHAR = 7
MIN_DATA_RINGS = 3

def text_to_bits(text):
    filtered = "".join([c for c in text if c in CHARSET])
    if not filtered: return None
    
    bits = []
    # Header: 6 bits length
    length_bin = format(len(filtered), '06b')
    bits.extend([int(b) for b in length_bin])
    
    checksum = 0
    for char in filtered:
        idx = CHARSET.index(char)
        checksum = (checksum + idx) % 64
        char_bin = format(idx, f'0{BITS_PER_CHAR}b')
        bits.extend([int(b) for b in char_bin])
        
    # Checksum: 6 bits
    cs_bin = format(checksum, '06b')
    bits.extend([int(b) for b in cs_bin])
    
    num_rings = max(MIN_DATA_RINGS, math.ceil(len(bits) / SECTORS))
    while len(bits) < num_rings * SECTORS:
        bits.append(0)
        
    return bits, num_rings

def generate_circode(text, output_path, bg_mode="black", show_text=False):
    bits_data = text_to_bits(text)
    if not bits_data:
        print("Error: No valid characters to encode.")
        return
    
    bits, num_rings = bits_data
    size = 1000
    # Add extra height for text if requested
    height = size + 100 if show_text else size
    img = Image.new("RGBA", (size, height), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    
    C = size / 2
    is_white_bg = bg_mode == "white"
    is_transparent = bg_mode == "transparent"
    
    # Background
    if not is_transparent:
        bg_color = (255, 255, 255, 255) if is_white_bg else (0, 0, 0, 255)
        draw.rectangle([0, 0, size, height], fill=bg_color)
        
    color_main = (0, 0, 0, 255) if is_white_bg else (255, 255, 255, 255)
    color_bg = (255, 255, 255, 255) if is_white_bg else (0, 0, 0, 255)

    finder_dist = C * 0.82
    ref_r = C * 0.085
    small_r = C * 0.065
    data_outer_r = finder_dist - ref_r - 12
    data_inner_r = C * 0.13
    ring_w = (data_outer_r - data_inner_r) / num_rings
    sector_ang = 360 / SECTORS

    # DATA CELLS
    for ring in range(num_rings):
        oR = data_outer_r - ring * ring_w
        iR = max(oR - ring_w + 2, data_inner_r + 2) if (ring_w > 2) else data_inner_r
        # Pillow uses bounding box for arcs: [x0, y0, x1, y1]
        for sec in range(SECTORS):
            if bits[ring * SECTORS + sec] == 1:
                start_angle = sec * sector_ang - 90 + 0.5
                end_angle = start_angle + sector_ang - 1.0
                # Draw arc sector
                # Since PIL's pieslice/arc is tricky for rings, we draw a thick arc
                mid_r = (oR + iR) / 2
                w = oR - iR
                draw.arc([C-mid_r, C-mid_r, C+mid_r, C+mid_r], start_angle, end_angle, fill=color_main, width=int(w))

    # TIMING RING
    t_r = data_outer_r + 5
    t_w = 5
    for s in range(SECTORS):
        if s % 2 == 0:
            start_angle = s * sector_ang - 90
            end_angle = start_angle + sector_ang
            draw.arc([C-t_r-t_w/2, C-t_r-t_w/2, C+t_r+t_w/2, C+t_r+t_w/2], start_angle, end_angle, fill=color_main, width=t_w)

    # 3 BULLSEYES
    angles = [-90, -90 + 120, -90 + 240]
    radii = [ref_r, small_r, small_r]
    for i in range(3):
        rad = math.radians(angles[i])
        fx = C + finder_dist * math.cos(rad)
        fy = C + finder_dist * math.sin(rad)
        r = radii[i]
        
        # Outer
        draw.ellipse([fx-r, fy-r, fx+r, fy+r], fill=color_main)
        # Inner hole
        ri = r * 0.62
        draw.ellipse([fx-ri, fy-ri, fx+ri, fy+ri], fill=color_bg if not is_transparent else (0,0,0,0))
        # Center dot
        rc = r * 0.3
        draw.ellipse([fx-rc, fy-rc, fx+rc, fy+rc], fill=color_main)

    # Center dot
    center_dot_r = 5
    draw.ellipse([C-center_dot_r, C-center_dot_r, C+center_dot_r, C+center_dot_r], fill=(255,255,255,128) if not is_white_bg else (0,0,0,80))

    # Label Text
    if show_text:
        try:
            # Try to load a mono font, fallback to default
            font = ImageFont.truetype("arial.ttf", 40)
        except:
            font = ImageFont.load_default()
            
        display_text = text
        if len(display_text) > 40:
            display_text = display_text[:37] + "..."
            
        # Draw text at the bottom center
        bbox = draw.textbbox((0, 0), display_text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((size - tw) / 2, size + 20), display_text, fill=color_main, font=font)

    img.save(output_path)
    print(f"CirCode generated: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CirCode Generator")
    parser.add_argument("--text", required=True, help="Text to encode")
    parser.add_argument("--out", default="barcode_v2.png", help="Output filename")
    parser.add_argument("--bg", choices=["black", "white", "transparent"], default="black", help="Background mode")
    parser.add_argument("--show-text", action="store_true", help="Display text below the code")
    args = parser.parse_args()
    
    generate_circode(args.text, args.out, args.bg, args.show_text)
