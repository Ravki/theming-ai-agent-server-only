import sys
import cv2
import numpy as np
from sklearn.cluster import KMeans
import json

def extract_colors(image_path, num_colors=1):
    image = cv2.imread(image_path)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image = image.reshape((-1, 3))  # Flatten image to list of pixels

    kmeans = KMeans(n_clusters=num_colors, random_state=42, n_init=10)
    kmeans.fit(image)

    dominant_colors = kmeans.cluster_centers_.astype(int)  # Get RGB values
    hex_colors = [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in dominant_colors]

    return hex_colors

if __name__ == "__main__":
    image_path = sys.argv[1]
    num_colors = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    colors = extract_colors(image_path, num_colors)
    print(json.dumps(colors))  # Return JSON output