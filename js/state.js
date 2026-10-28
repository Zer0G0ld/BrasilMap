// js/state.js

export const state = {
    dados: null, // Será preenchido com o JSON
    nivel: 'brasil', // 'brasil' ou 'estado'
    ufAtual: null,
    camadaAtual: null, 
    coresEstados: {},  
    coresMunicipios: {}, 
    viewAtual: 'home',
    estadoSelecionado: null 
};

export const CORES = {
    brasil:      { fill: '#CFD8DC', stroke: '#37474F', weight: 0.5 },
    municipio:   { fill: '#CFD8DC', stroke: '#37474F', weight: 0.5 },
    hover:       { fill: '#B0BEC5', stroke: '#263238', weight: 1 },
    selecionado: { fill: '#D32F2F', stroke: '#B71C1C', weight: 2 },
    destaqueUF:  { fill: '#f4d03f', stroke: '#B71C1C', weight: 2.5 }
};

// Helpers para pegar cores
export function getCorEstado(f) {
    return state.coresEstados[f.properties.uf] || CORES.brasil.fill;
}

export function getCorMunicipio(f) {
    return state.coresMunicipios[f.properties.geocodigo] || CORES.municipio.fill;
}