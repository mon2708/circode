import math
import argparse
from PIL import Image, ImageDraw, ImageFont

def generate_minimalist_barcode(text_input: str, output_filename: str = "barcode_remon_v3_spiral.png", show_text: bool = True):
    """
    Menghasilkan Single-Ring Visual Code berurutan (Radial/Spiral Offset).
    Sistem 36 zona (0-9, A-Z) dalam satu cincin dengan jejak titik yang menjorok ke dalam 
    untuk merekam urutan waktu dan menangani karakter ganda.
    """
    scale = 4  
    size = 1000
    high_res_size = size * scale
    
    text_input = text_input.upper()
    valid_chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:/.?=&-_#"
    deg_per_zone = 360.0 / len(valid_chars)
    
    filtered_text = "".join([c for c in text_input if c in valid_chars])
    
    if not filtered_text:
        print(f"Input '{text_input}' tidak mengandung karakter valid (0-9, A-Z).")
        return
        
    center = high_res_size // 2
    radius = (high_res_size // 2) * 0.75
    
    layer = Image.new("RGBA", (high_res_size, high_res_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    
    num_chars = len(filtered_text)
    line_width = max(2 * scale, int(6 * scale * min(1.0, 30 / num_chars)))
    
    # Kalkulasi offset jarak untuk merekam urutan
    max_radial_space = radius - (50 * scale)
    radial_step = min(45 * scale, max_radial_space / max(1, num_chars))
    
    # Mathematical sizing to guarantee NO OVERLAP between dots on the same angle
    # The black dot MUST be smaller than radial_step / 2
    black_dot_radius = min(15 * scale, radial_step * 0.45)
    outline_width = max(1, int(black_dot_radius * 0.25))
    white_dot_radius = black_dot_radius - outline_width
    
    letters = set([c for c in filtered_text if c.isalpha()])
    pil_angles_letters = sorted([((valid_chars.index(c) * deg_per_zone) - 90) % 360 for c in letters])
    
    bbox = [center - radius, center - radius, center + radius, center + radius]
    
    # ==========================================
    # 1. RENDER MAIN RING (Garis Lingkaran)
    # ==========================================
    L = len(pil_angles_letters)
    if L == 0:
        draw.ellipse(bbox, outline="black", width=line_width + 2 * outline_width)
        draw.ellipse(bbox, outline="white", width=line_width)
    else:
        desired_arc_length = white_dot_radius + (12 * scale) 
        gap = (desired_arc_length * 360) / (2 * math.pi * radius)
        outline_angle = (outline_width * 360) / (2 * math.pi * radius)
        
        for i in range(L):
            start_angle = pil_angles_letters[i] + gap
            end_angle = pil_angles_letters[(i + 1) % L] - gap
            
            if i == L - 1:
                end_angle += 360 
                
            if end_angle > start_angle:
                black_start = start_angle - outline_angle
                black_end = end_angle + outline_angle
                draw.arc(bbox, start=black_start, end=black_end, fill="black", width=line_width + 2 * outline_width)
                draw.arc(bbox, start=start_angle, end=end_angle, fill="white", width=line_width)

    # ==========================================
    # 2. RENDER SPOKES (Garis Penghubung Radial)
    # Membuat desain tidak terlihat 'acak-acakan' melainkan terstruktur seperti Radar
    # ==========================================
    for i, char in enumerate(filtered_text):
        idx = valid_chars.index(char)
        pil_angle = ((idx * deg_per_zone) - 90) % 360
        rad_angle = math.radians(pil_angle)
        
        current_radius = radius - (i * radial_step)
        
        dot_x = center + current_radius * math.cos(rad_angle)
        dot_y = center + current_radius * math.sin(rad_angle)
        ring_x = center + radius * math.cos(rad_angle)
        ring_y = center + radius * math.sin(rad_angle)
        
        # Gambar garis lurus tipis dari titik ke ring luar
        draw.line([(dot_x, dot_y), (ring_x, ring_y)], fill="white", width=int(1.5 * scale))

    # ==========================================
    # 3. RENDER DATA DOTS (Titik Angka & Huruf)
    # Digambar terakhir agar menimpa garis penghubung (pop-out)
    # ==========================================
    for i, char in enumerate(filtered_text):
        idx = valid_chars.index(char)
        pil_angle = ((idx * deg_per_zone) - 90) % 360
        rad_angle = math.radians(pil_angle)
        
        current_radius = radius - (i * radial_step)
        
        dot_x = center + current_radius * math.cos(rad_angle)
        dot_y = center + current_radius * math.sin(rad_angle)
        
        b_bbox = [dot_x - black_dot_radius, dot_y - black_dot_radius, dot_x + black_dot_radius, dot_y + black_dot_radius]
        w_bbox = [dot_x - white_dot_radius, dot_y - white_dot_radius, dot_x + white_dot_radius, dot_y + white_dot_radius]
        
        draw.ellipse(b_bbox, fill="black")
        draw.ellipse(w_bbox, fill="white")
        
    # ==========================================
    # 4. GEOMETRY START MARKER (Segitiga Atas)
    # ==========================================
    triangle_height = 32 * scale
    triangle_width = 28 * scale
    
    tip_x = center
    tip_y = center - radius - (24 * scale) 
    base_y = tip_y - triangle_height
    left_x = center - (triangle_width / 2)
    right_x = center + (triangle_width / 2)
    
    white_pts = [(tip_x, tip_y), (left_x, base_y), (right_x, base_y)]
    
    black_tip_y = tip_y + outline_width * 1.5
    black_base_y = base_y - outline_width * 1.5
    black_left_x = left_x - outline_width * 1.5
    black_right_x = right_x + outline_width * 1.5
    
    black_pts = [(tip_x, black_tip_y), (black_left_x, black_base_y), (black_right_x, black_base_y)]
    
    draw.polygon(black_pts, fill="black")
    draw.polygon(white_pts, fill="white")
    
    # ==========================================
    # 4. TEXT RENDER
    # ==========================================
    if show_text:
        try:
            font = ImageFont.truetype("arial.ttf", 46 * scale)
        except IOError:
            try:
                font = ImageFont.load_default(size=46 * scale)
            except TypeError:
                font = ImageFont.load_default()
                
        text_bbox = draw.textbbox((0, 0), text_input, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        
        text_x = center - (text_w / 2)
        text_y = center + radius + (40 * scale)
        
        offsets = [(-1,-1), (-1,1), (1,-1), (1,1), (0,-1), (0,1), (-1,0), (1,0)]
        for ox, oy in offsets:
            draw.text((text_x + ox*outline_width, text_y + oy*outline_width), text_input, font=font, fill="black")
            
        draw.text((text_x, text_y), text_input, font=font, fill="white")
        
    background = Image.new("RGBA", (high_res_size, high_res_size), (0, 0, 0, 255))
    background.paste(layer, (0, 0), layer)
    
    final_img = background.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)
    final_img.save(output_filename)
    print(f"Berhasil menyimpan {output_filename} (Text: {filtered_text})")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Minimalist Single-Ring Barcode (Radial Sequence)")
    parser.add_argument("--text", type=str, default="REMON2026", help="Teks untuk di-encode")
    parser.add_argument("--out", type=str, default="barcode_remon_v3_spiral.png", help="Nama file output")
    parser.add_argument("--no-text", action="store_true", help="Sembunyikan teks di bawah logo")
    args = parser.parse_args()
    
    generate_minimalist_barcode(args.text, args.out, not args.no_text)
