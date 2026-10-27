import json
import os
from pathlib import Path

# Configurações de pastas
REPO_ROOT = Path(__file__).resolve().parent
MINIFIED_DIR = REPO_ROOT / "minified"
OUTPUT_FILE = REPO_ROOT / "brasil_completo.json"

# Lista de todos os estados
UFS = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS",
    "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC",
    "SE", "SP", "TO"
]

def processar():
    todas_as_features = []

    print("Iniciando processamento dos estados...")

    for uf in UFS:
        file_path = MINIFIED_DIR / f"{uf}.min.json"
        
        if not file_path.exists():
            print(f"⚠️ Arquivo não encontrado: {file_path}")
            continue

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for feature in data['features']:
            props = feature['properties']
            
            # Padroniza as propriedades para garantir que o JS encontre fácil
            # Usamos .get() para evitar erros se a chave não existir
            nome = props.get('NOME') or props.get('nome') or 'Desconhecido'
            geocodigo = props.get('GEOCODIGO') or props.get('geocodigo') or ''
            uf_sigla = props.get('UF') or props.get('uf') or uf

            # Cria um novo objeto de propriedades limpo e padronizado
            feature['properties'] = {
                "nome": nome,
                "uf": uf_sigla,
                "geocodigo": geocodigo
            }
            
            todas_as_features.append(feature)
        
        print(f"✅ {uf}: {len(data['features'])} municípios processados.")

    # Monta o GeoJSON final
    geojson_final = {
        "type": "FeatureCollection",
        "features": todas_as_features
    }

    # Salva o arquivo final
    print(f"\nSalvando arquivo final com {len(todas_as_features)} municípios...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        # separators=(',', ':') remove espaços para deixar o arquivo menor
        json.dump(geojson_final, f, ensure_ascii=False, separators=(',', ':'))

    print(f"🚀 Sucesso! Arquivo criado: {OUTPUT_FILE.name}")
    print(f"📦 Tamanho do arquivo: {OUTPUT_FILE.stat().st_size / (1024*1024):.2f} MB")

if __name__ == "__main__":
    processar()