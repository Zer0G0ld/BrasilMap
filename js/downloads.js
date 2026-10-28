// js/downloads.js
import { state, CORES } from './state.js';
import { map } from './map.js';

// ══════════════════════════════════════════════════════
// EXPORTAÇÕES BÁSICAS (nível atual)
// ══════════════════════════════════════════════════════

export function baixarGeojson() {
    const exportData = JSON.parse(JSON.stringify(state.dados));
    delete exportData._porUF;
    
    if (state.nivel === 'brasil') {
        exportData.features.forEach(f => {
            if (state.coresEstados[f.properties.uf]) {
                f.properties.cor = state.coresEstados[f.properties.uf];
            }
        });
    } else {
        exportData.features.forEach(f => {
            if (state.coresMunicipios[f.properties.geocodigo]) {
                f.properties.cor = state.coresMunicipios[f.properties.geocodigo];
            }
        });
    }
    
    const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapa_brasil_${state.nivel}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export function baixarCSV() {
    if (state.nivel === 'brasil') return;

    const uf = state.ufAtual;
    const features = state.dados._porUF[uf] || [];
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Codigo_IBGE,Nome_Municipio,UF,Cor\n";

    features
        .sort((a, b) => a.properties.nome.localeCompare(b.properties.nome))
        .forEach(f => {
            const geo = f.properties.geocodigo;
            const nome = f.properties.nome;
            const cor = state.coresMunicipios[geo] || CORES.municipio.fill;
            csvContent += `${geo},${nome},${uf},${cor}\n`;
        });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `municipios_${uf}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function baixarPNG() {
    if (typeof leafletImage === 'function') {
        leafletImage(map, function(err, canvas) {
            if (err) {
                alert("Erro ao capturar o mapa.");
                return;
            }
            const link = document.createElement('a');
            link.download = `mapa_${state.nivel}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    } else {
        alert("A biblioteca de captura de tela (leaflet-image) não está carregada.");
    }
}

// ══════════════════════════════════════════════════════
// EXPORTAÇÕES EM MASSA
// ══════════════════════════════════════════════════════

export async function baixarTodosGeoJSON() {
    // Import dinâmico para evitar ciclo (ui.js importa downloads.js)
    const { mostrarToast } = await import('./ui.js');
    mostrarToast('Preparando download de 27 estados...', 'info');
    
    const estados = Object.keys(state.dados.estados).sort();
    
    for (let i = 0; i < estados.length; i++) {
        const uf = estados[i];
        const features = state.dados._porUF[uf] || [];
        
        const geojson = {
            type: 'FeatureCollection',
            estado: state.dados.estados[uf].nome,
            uf: uf,
            features: features.map(f => ({
                ...f,
                properties: {
                    ...f.properties,
                    cor: state.coresMunicipios[f.properties.geocodigo] || CORES.municipio.fill
                }
            }))
        };
        
        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `municipios_${uf}.geojson`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Delay entre downloads (evita bloqueio do navegador)
        await new Promise(r => setTimeout(r, 300));
    }
    
    mostrarToast('27 estados exportados com sucesso!', 'sucesso');
}

export function baixarGeoJSONPorEstado(uf) {
    const features = state.dados._porUF[uf] || [];
    const geojson = {
        type: 'FeatureCollection',
        estado: state.dados.estados[uf].nome,
        uf: uf,
        features: features.map(f => ({
            ...f,
            properties: {
                ...f.properties,
                cor: state.coresMunicipios[f.properties.geocodigo] || CORES.municipio.fill
            }
        }))
    };
    
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `municipios_${uf}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
}