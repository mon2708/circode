import math
import argparse
from PIL import Image, ImageDraw, ImageFilter

def generate_circular_code(text_input: str, output_filename: str = "circular_barcode.png"):
    """
    Menghasilkan Circular Barcode berdasarkan Angular Encoding (Multi-Ring).
    0-9 dan A-Z dipetakan ke 360 derajat (10 derajat per karakter).
    Setiap karakter berada pada cincin konsentris yang berbeda.
    """
    scale = 4  
    size = 1000
    high_res_size = size * scale
    
    text_input = text_input.upper()
    valid_chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    filtered_text = "".join([c for c in text_input if c in valid_chars])
    
    if not filtered_text:
        print(f"Input '{text_input}' tidak mengandung karakter valid (0-9, A-Z).")
        return
        
    num_rings = len(filtered_text)
    center = high_res_size // 2
    base_radius = (high_res_size // 2) * 0.85
    ring_spacing = min(40 * scale, base_radius / (num_rings + 1))
    
    layer = Image.new("RGBA", (high_res_size, high_res_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    
    dot_radius = 7 * scale
    line_width = 2 * scale
    
    for i, char in enumerate(filtered_text):
        radius = base_radius - (i * ring_spacing)
        idx = valid_chars.index(char)
        user_angle = idx * 10
        pil_angle = (user_angle - 90) % 360
        
        bbox = [center - radius, center - radius, center + radius, center + radius]
        
        if char.isalpha():
            desired_arc_length = dot_radius + (4 * scale) 
            gap = (desired_arc_length * 360) / (2 * math.pi * radius)
            draw.arc(bbox, start=pil_angle + gap, end=pil_angle + 360 - gap, fill="white", width=line_width)
        else:
            draw.ellipse(bbox, outline="white", width=line_width)
            
        rad_angle = math.radians(pil_angle)
        dot_x = center + radius * math.cos(rad_angle)
        dot_y = center + radius * math.sin(rad_angle)
        dot_bbox = [dot_x - dot_radius, dot_y - dot_radius, dot_x + dot_radius, dot_y + dot_radius]
        draw.ellipse(dot_bbox, fill="white")

    background = Image.new("RGBA", (high_res_size, high_res_size), (5, 5, 5, 255))
    glow = layer.filter(ImageFilter.GaussianBlur(10 * scale))
    background.paste(glow, (0, 0), glow)
    background.paste(layer, (0, 0), layer)
    
    final_img = background.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)
    final_img.save(output_filename)
    print(f"Berhasil: {output_filename} (Text: {filtered_text})")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", type=str, default="REMON27", help="Teks untuk di-encode")
    parser.add_argument("--out", type=str, default="circular_barcode.png", help="Output filename")
    args = parser.parse_args()
    generate_circular_code(args.text, args.out)
