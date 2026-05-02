import cv2
import math

img = cv2.imread("barcode.png", cv2.IMREAD_GRAYSCALE)
_, thresh = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)
contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

print(f"Total contours: {len(contours)}")
for i, c in enumerate(contours):
    area = cv2.contourArea(c)
    if area < 5:
        continue
    peri = cv2.arcLength(c, True)
    circ = 4 * math.pi * area / (peri * peri) if peri > 0 else 0
    print(f"Contour {i}: Area={area:.1f}, Circ={circ:.2f}")
