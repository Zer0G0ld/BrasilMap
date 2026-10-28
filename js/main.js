// js/main.js
import { state } from './state.js';
import { 
    inicializarMapa, desenharBrasil, setCallbackAbrirView, 
    mudarNivel, aplicarCorEstado, aplicarCorMunicipio, map,
    centralizarMunicipio, limparSelecao, resetarCoresNivel, 
    resetarTudo, aplicarCorTodos
} from './map.js';
import { 
    abrirView, configurarBotaoVoltar, configurarBotaoMenu, 
    injetarDependenciasMapa, mostrarToast 
} from './ui.js';
import { 
    baixarGeojson, baixarCSV, baixarPNG, 
    baixarTodosGeoJSON, baixarGeoJSONPorEstado 
} from './downloads.js';

// ── Expõe funções para o HTML (onclick) ──
window.abrirView = abrirView;
window.baixarGeojson = baixarGeojson;
window.baixarCSV = baixarCSV;
window.baixarPNG = baixarPNG;
window.baixarTodosGeoJSON = baixarTodosGeoJSON;
window.baixarGeoJSONPorEstado = baixarGeoJSONPorEstado;
window.centralizarMunicipio = centralizarMunicipio;
window.limparSelecaoEstado = limparSelecao;
window.resetarCoresNivel = resetarCoresNivel;
window.resetarTudo = resetarTudo;
window.aplicarCorTodos = () => {
    const cor = prompt('Digite a cor (hex, ex: #FF0000):', '#CFD8DC');
    if (cor) {
        aplicarCorTodos(cor);
        mostrarToast('Cor aplicada a todos!', 'sucesso');
    }
};

// ── Quebra ciclo de importação ──
setCallbackAbrirView(abrirView);
injetarDependenciasMapa({
    mudarNivel,
    aplicarCorEstado,
    aplicarCorMunicipio,
    map,
    resetarCores: resetarCoresNivel,
    limparSelecao,
    centralizarMunicipio  // <-- ADICIONAR AQUI
});

async function init() {
    try {
        const response = await fetch('./brasil_completo.json');
        const data = await response.json();
        
        data._porUF = {};
        data.features.forEach(f => {
            (data._porUF[f.properties.uf] ||= []).push(f);
        });
        
        state.dados = data;
        
        inicializarMapa();
        desenharBrasil();
        configurarBotaoVoltar();
        configurarBotaoMenu();
        abrirView('home');
        
        mostrarToast('Mapa do Brasil carregado!', 'sucesso');
    } catch (err) {
        console.error("Erro ao carregar JSON:", err);
        document.getElementById('inspector-content').innerHTML = 
            '<p style="color:red">Erro ao carregar os dados. Verifique o console.</p>';
    }
}

init();