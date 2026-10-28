// js/map.js
import { state, CORES, getCorEstado, getCorMunicipio } from './state.js';

let _abrirView = null; // Callback para evitar importação circular

export function setCallbackAbrirView(fn) {
    _abrirView = fn;
}

export const map = L.map('map', {
    minZoom: 4,
    maxZoom: 14,
    zoomControl: true,       
    dragging: true,          
    scrollWheelZoom: true,   
    doubleClickZoom: true,   
    boxZoom: true,
    touchZoom: true,        
    maxBoundsViscosity: 1.0,
    backgroundColor: '#ffffff' 
});

const BRASIL_BOUNDS = L.latLngBounds([[-33.75, -73.98], [5.27, -34.79]]);
map.setMaxBounds(BRASIL_BOUNDS);

export function inicializarMapa() {
    map.fitBounds(BRASIL_BOUNDS);
}

export function mudarNivel(novoNivel, uf = null) {
    state.nivel = novoNivel;
    state.ufAtual = uf;
    state.geoSelecionado = null; // Reseta seleção de município
    
    if (state.camadaAtual) {
        map.removeLayer(state.camadaAtual);
        state.camadaAtual = null;
    }
    
    const elTitle = document.getElementById('inspector-title');
    
    if (novoNivel === 'brasil') {
        elTitle.textContent = '🇧🇷 Brasil';
        state.estadoSelecionado = null;
        desenharBrasil();
        map.flyToBounds(BRASIL_BOUNDS, { duration: 1 });
    } else if (novoNivel === 'estado') {
        elTitle.textContent = state.dados.estados[uf].nome;
        state.estadoSelecionado = uf;
        desenharEstado(uf); 
        
        // Zoom no estado
        if (state.dados.estados[uf].bbox) {
            const bbox = state.dados.estados[uf].bbox;
            const bounds = L.latLngBounds(
                [bbox[1], bbox[0]], // [minLat, minLng]
                [bbox[3], bbox[2]]  // [maxLat, maxLng]
            );
            map.flyToBounds(bounds, { duration: 1.2, padding: [30, 30] });
        }
    }
    
    // 🔥 FORÇA A RE-RENDERIZAÇÃO DA UI
    if (_abrirView) _abrirView('home');
}

export function desenharBrasil() {
    state.camadaAtual = L.geoJSON(state.dados.features, {
        style: (f) => {
            const isSelected = state.estadoSelecionado === f.properties.uf;
            return {
                fillColor: isSelected ? CORES.destaqueUF.fill : getCorEstado(f),
                color: isSelected ? CORES.destaqueUF.stroke : CORES.brasil.stroke,
                weight: isSelected ? CORES.destaqueUF.weight : CORES.brasil.weight,
                fillOpacity: 1
            };
        },
        onEachFeature: (f, layer) => {
            layer.bindTooltip(f.properties.nome, { sticky: true, className: 'tooltip-custom' });
            
            layer.on('mouseover', () => {
                if (state.estadoSelecionado !== f.properties.uf) layer.setStyle(CORES.hover);
            });
            layer.on('mouseout', () => {
                if (state.estadoSelecionado !== f.properties.uf) {
                    layer.setStyle({ 
                        fillColor: getCorEstado(f), 
                        color: CORES.brasil.stroke, 
                        weight: CORES.brasil.weight, 
                        fillOpacity: 1 
                    });
                }
            });
            
            layer.on('click', () => {
                if (state.estadoSelecionado !== f.properties.uf) {
                    state.estadoSelecionado = f.properties.uf;
                    desenharBrasil(); 
                    if (_abrirView) _abrirView('home'); 
                }
            });
        }
    }).addTo(map);
}

export function desenharEstado(uf) {
    const features = state.dados._porUF[uf] || [];
    state.camadaAtual = L.geoJSON(features, {
        style: (f) => ({ 
            fillColor: getCorMunicipio(f), 
            color: CORES.municipio.stroke, 
            weight: CORES.municipio.weight, 
            fillOpacity: 1 
        }),
        onEachFeature: (f, layer) => {
            layer.bindTooltip(f.properties.nome, { sticky: true, className: 'tooltip-custom' });
            
            layer.on('mouseover', () => layer.setStyle(CORES.hover));
            layer.on('mouseout', () => layer.setStyle({ 
                fillColor: getCorMunicipio(f), 
                color: CORES.municipio.stroke, 
                weight: CORES.municipio.weight, 
                fillOpacity: 1 
            }));
            
            layer.on('click', () => {
                map.flyToBounds(layer.getBounds(), { duration: 1, padding: [50, 50] });
                layer.setStyle(CORES.selecionado);
                setTimeout(() => layer.setStyle({ 
                    fillColor: getCorMunicipio(f), 
                    color: CORES.municipio.stroke, 
                    weight: CORES.municipio.weight 
                }), 2000); 
            });
        }
    }).addTo(map);
}

export function aplicarCorEstado(uf, cor) {
    state.camadaAtual.eachLayer(l => {
        if (l.feature.properties.uf === uf && state.estadoSelecionado !== uf) {
            l.setStyle({ fillColor: cor });
        }
    });
}

export function aplicarCorMunicipio(geo, cor) {
    state.camadaAtual.eachLayer(l => {
        if (l.feature.properties.geocodigo === geo) l.setStyle({ fillColor: cor });
    });
}

// ══════════════════════════════════════════════════════
// NOVAS FUNÇÕES AUXILIARES
// ══════════════════════════════════════════════════════

// Centraliza o mapa num município específico
export function centralizarMunicipio(geocodigo) {
    if (!state.camadaAtual || typeof state.camadaAtual.getLayers !== 'function') {
        console.warn('Não é possível centralizar: camada atual não é um GeoJSON LayerGroup.');
        return;
    }
    const layer = state.camadaAtual.getLayers().find(
        l => l.feature?.properties?.geocodigo === geocodigo
    );
    if (layer) {
        map.flyToBounds(layer.getBounds(), { duration: 1, padding: [50, 50] });
        layer.setStyle(CORES.selecionado);
        setTimeout(() => layer.setStyle({ 
            fillColor: getCorMunicipio(layer.feature), 
            color: CORES.municipio.stroke, 
            weight: CORES.municipio.weight 
        }), 2000);
    }
}

// Limpa a seleção do estado atual (volta ao nível Brasil)
export function limparSelecao() {
    state.estadoSelecionado = null;
    if (state.nivel === 'brasil') {
        desenharBrasil();
    }
}

// Reseta APENAS as cores do nível atual
export function resetarCoresNivel() {
    if (state.nivel === 'brasil') {
        state.coresEstados = {};
        desenharBrasil();
    } else {
        state.coresMunicipios = {};
        desenharEstado(state.ufAtual);
    }
}

// Reseta TUDO (cores + nível)
export function resetarTudo() {
    state.coresEstados = {};
    state.coresMunicipios = {};
    state.estadoSelecionado = null;
    mudarNivel('brasil');
}

// Aplica a mesma cor para todos os polígonos do nível atual
export function aplicarCorTodos(cor) {
    if (state.nivel === 'brasil') {
        Object.keys(state.dados.estados).forEach(uf => {
            state.coresEstados[uf] = cor;
        });
        desenharBrasil();
    } else {
        (state.dados._porUF[state.ufAtual] || []).forEach(f => {
            state.coresMunicipios[f.properties.geocodigo] = cor;
        });
        desenharEstado(state.ufAtual);
    }
}