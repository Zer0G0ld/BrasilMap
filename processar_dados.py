import json
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
MINIFIED_DIR = REPO_ROOT / "minified"
OUTPUT_FILE = REPO_ROOT / "brasil_completo.json"

UFS = [
    "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS",
    "MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC",
    "SE","SP","TO"
]

def bbox_from_coords(coords):
    """Retorna [minLng, minLat, maxLng, maxLat] para Polygon/MultiPolygon."""
    xs, ys = [], []
    def walk(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for item in c: walk(item)
    walk(coords)
    return [min(xs), min(ys), max(xs), max(ys)]

def merge_bbox(a, b):
    return [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]

def processar():
    municipios = []
    estados_agg = {}   # uf -> { nome, uf, bbox, features: [] }
    brasil_bbox = None

    for uf in UFS:
        file_path = MINIFIED_DIR / f"{uf}.min.json"
        if not file_path.exists():
            print(f"⚠️  Falta: {file_path}")
            continue

        with open(file_path, encoding="utf-8") as f:
            data = json.load(f)

        uf_bbox = None
        uf_features = []

        for feature in data["features"]:
            props = feature["properties"]
            nome = props.get("NOME") or props.get("nome") or "Desconhecido"
            geocodigo = props.get("GEOCODIGO") or props.get("geocodigo") or ""
            uf_sigla = props.get("UF") or props.get("uf") or uf

            bbox = bbox_from_coords(feature["geometry"]["coordinates"])

            feature["properties"] = {
                "nome": nome,
                "uf": uf_sigla,
                "geocodigo": geocodigo,
                "bbox": bbox,   # 🎯 pré-calculado
            }

            uf_features.append(feature)
            uf_bbox = bbox if uf_bbox is None else merge_bbox(uf_bbox, bbox)
            brasil_bbox = bbox if brasil_bbox is None else merge_bbox(brasil_bbox, bbox)

        estados_agg[uf] = {
            "nome": uf,       # o nome completo do estado está no Brasil.min.json
            "uf": uf,
            "bbox": uf_bbox,
            "total_municipios": len(uf_features),
        }
        municipios.extend(uf_features)
        print(f"✅ {uf}: {len(uf_features)} municípios")

    # Enriquecer com nomes de estado (lê Brasil.min.json se existir)
    brasil_file = MINIFIED_DIR / "Brasil.min.json"
    if brasil_file.exists():
        with open(brasil_file, encoding="utf-8") as f:
            br = json.load(f)
        for feature in br["features"]:
            p = feature["properties"]
            sigla = p.get("SIGLA") or p.get("UF") or p.get("uf")
            nome_estado = p.get("NOME") or p.get("nome")
            if sigla in estados_agg and nome_estado:
                estados_agg[sigla]["nome"] = nome_estado

    geojson_final = {
        "type": "FeatureCollection",
        "brasil_bbox": brasil_bbox,
        "estados": estados_agg,
        "features": municipios,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(geojson_final, f, ensure_ascii=False, separators=(",", ":"))

    print(f"\n🚀 Gerado: {OUTPUT_FILE.name}")
    print(f"📦 {OUTPUT_FILE.stat().st_size/(1024*1024):.2f} MB")
    print(f"🗺️  Bbox Brasil: {brasil_bbox}")

if __name__ == "__main__":
    processar()