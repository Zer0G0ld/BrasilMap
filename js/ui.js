// js/ui.js
import { state, CORES, getCorMunicipio } from './state.js';
import { 
    baixarGeojson, baixarCSV, baixarPNG, 
    baixarGeoJSONPorEstado, baixarTodosGeoJSON 
} from './downloads.js';

const elContent = document.getElementById('inspector-content');
const btnVoltar = document.getElementById('btn-voltar');
const btnMenu = document.getElementById('btn-menu');

// ── Dependências do mapa (injetadas pelo main.js) ──
let _mudarNivel = null;
let _aplicarCorEstado = null;
let _aplicarCorMunicipio = null;
let _map = null;
let _centralizarMunicipio = null;

export function injetarDependenciasMapa(deps) {
    _mudarNivel = deps.mudarNivel;
    _aplicarCorEstado = deps.aplicarCorEstado;
    _aplicarCorMunicipio = deps.aplicarCorMunicipio;
    _map = deps.map;
    _centralizarMunicipio = deps.centralizarMunicipio;
}

// ── Toast de notificação ──
export function mostrarToast(mensagem, tipo = 'info') {
    const cores = {
        info: '#3b82f6',
        sucesso: '#10b981',
        erro: '#ef4444',
        aviso: '#f59e0b'
    };
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: ${cores[tipo] || cores.info};
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 9999;
        transition: transform 0.3s ease;
        font-size: 14px;
        pointer-events: none;
    `;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ── Gerenciador de Views ──
export function abrirView(viewName, params = {}) {
    state.viewAtual = viewName;
    elContent.innerHTML = '';
    
    switch (viewName) {
        case 'home': renderHome(); break;
        case 'config-cores': renderConfigCores(); break;
        case 'download': renderDownload(); break;
        case 'detalhes-municipio': renderDetalhesMunicipio(params.geocodigo); break;
        case 'estatisticas': renderEstatisticas(); break;
    }
    
    if (viewName === 'home') {
        btnVoltar.style.visibility = state.nivel === 'brasil' ? 'hidden' : 'visible';
    } else {
        btnVoltar.style.visibility = 'visible';
    }
}

// ══════════════════════════════════════════════════════
// TELA: HOME (REFATORADA)
// ══════════════════════════════════════════════════════
function renderHome() {
    // Sempre começa no nível Brasil com os dois selects
    const estados = Object.entries(state.dados.estados)
        .sort((a, b) => a[1].nome.localeCompare(b[1].nome));
    
    let html = `
        <div class="stats-grid">
            <div class="stat-box"><span>Estados</span><strong>${estados.length}</strong></div>
            <div class="stat-box"><span>Municípios</span><strong>${state.dados.features.length}</strong></div>
        </div>
        
        <h3>Selecionar Estado</h3>
        <select class="styled-select" id="select-estado">
            <option value="">— Escolha um Estado —</option>
            ${estados.map(([uf, e]) => `
                <option value="${uf}" ${state.ufAtual === uf ? 'selected' : ''}>
                    ${e.nome} (${uf})
                </option>
            `).join('')}
        </select>
        
        <h3>Selecionar Município</h3>
        <select class="styled-select" id="select-municipio" ${!state.ufAtual ? 'disabled' : ''}>
            <option value="">${!state.ufAtual ? 'Selecione um Estado primeiro' : '— Escolha um Município —'}</option>
            ${state.ufAtual ? (state.dados._porUF[state.ufAtual] || [])
                .sort((a, b) => a.properties.nome.localeCompare(b.properties.nome))
                .map(f => `<option value="${f.properties.geocodigo}" ${state.geoSelecionado === f.properties.geocodigo ? 'selected' : ''}>
                    ${f.properties.nome}
                </option>`).join('') : ''}
        </select>
        
        ${state.geoSelecionado ? `
            <div style="background:#141a22;border:1px solid #3a4657;border-radius:8px;padding:12px;margin-bottom:15px;font-size:12px;color:#99a5b5;">
                📍 Município selecionado: <strong style="color:#f4d03f;">${state.geoSelecionado}</strong>
            </div>
        ` : ''}
        
        <h3>Ações do Mapa</h3>
        <div class="menu-grid">
            <button class="btn-action" onclick="window.abrirView('config-cores')">
                <span class="icon">🎨</span> Editar Cores
            </button>
            <button class="btn-action" onclick="window.abrirView('download')">
                <span class="icon">⬇️</span> Download
            </button>
            <button class="btn-action" onclick="window.abrirView('estatisticas')">
                <span class="icon">📊</span> Estatísticas
            </button>
            <button class="btn-action" onclick="window.resetarTudo()">
                <span class="icon">🔄</span> Resetar Tudo
            </button>
        </div>
    `;
    
    elContent.innerHTML = html;
    configurarEventosHome();
}

function configurarEventosHome() {
    const selectEstado = document.getElementById('select-estado');
    const selectMunicipio = document.getElementById('select-municipio');
    
    // Selecionar Estado
    selectEstado?.addEventListener('change', (e) => {
        const uf = e.target.value;
        if (!uf) return;
        state.geoSelecionado = null;
        _mudarNivel('estado', uf);
    });
    
    // Selecionar Município
    selectMunicipio?.addEventListener('change', (e) => {
        const geo = e.target.value;
        if (!geo) return;
        state.geoSelecionado = geo;
        
        // Centraliza no mapa e destaca
        if (_centralizarMunicipio) {
            _centralizarMunicipio(geo);
        }
        
        // Mostra detalhes na lateral
        abrirView('detalhes-municipio', { geocodigo: geo });
    });
}

// ══════════════════════════════════════════════════════
// TELA: CONFIGURAÇÃO DE CORES
// ══════════════════════════════════════════════════════
function renderConfigCores() {
    let html = `
        <h3>Personalizar Cores</h3>
        <p style="color:#99a5b5;font-size:12px;margin-bottom:15px">
            Clique na cor para alterar o polígono no mapa.
        </p>
        <div style="display:flex;gap:8px;margin-bottom:15px;">
            <button class="btn-action" style="flex:1;padding:8px;" onclick="window.resetarCoresNivel()">
                <span class="icon">🔄</span> Resetar Cores
            </button>
            <button class="btn-action" style="flex:1;padding:8px;" onclick="window.aplicarCorTodos()">
                <span class="icon">🎨</span> Aplicar a Todos
            </button>
        </div>
        <div style="max-height: 420px; overflow-y: auto; padding-right: 10px;">
    `;
    
    if (state.nivel === 'brasil') {
        Object.entries(state.dados.estados)
            .sort((a, b) => a[1].nome.localeCompare(b[1].nome))
            .forEach(([uf, e]) => {
                const corAtual = state.coresEstados[uf] || CORES.brasil.fill;
                html += `
                    <div class="color-picker-group">
                        <label>${e.nome} (${uf})</label>
                        <input type="color" data-uf="${uf}" value="${corAtual}">
                    </div>
                `;
            });
    } else {
        const municipios = state.dados._porUF[state.ufAtual] || [];
        municipios
            .sort((a, b) => a.properties.nome.localeCompare(b.properties.nome))
            .forEach(f => {
                const geo = f.properties.geocodigo;
                const corAtual = state.coresMunicipios[geo] || CORES.municipio.fill;
                html += `
                    <div class="color-picker-group">
                        <label>${f.properties.nome}</label>
                        <input type="color" data-geo="${geo}" value="${corAtual}">
                    </div>
                `;
            });
    }
    html += `</div>`;
    
    elContent.innerHTML = html;
    
    elContent.querySelectorAll('input[type="color"]').forEach(input => {
        input.addEventListener('input', (e) => {
            const cor = e.target.value;
            if (state.nivel === 'brasil') {
                const uf = e.target.dataset.uf;
                state.coresEstados[uf] = cor;
                _aplicarCorEstado(uf, cor);
            } else {
                const geo = e.target.dataset.geo;
                state.coresMunicipios[geo] = cor;
                _aplicarCorMunicipio(geo, cor);
            }
        });
    });
}

// ══════════════════════════════════════════════════════
// TELA: DOWNLOAD
// ══════════════════════════════════════════════════════
function renderDownload() {
    let titulo = state.nivel === 'brasil' ? 'Brasil Inteiro' : state.dados.estados[state.ufAtual].nome;
    
    elContent.innerHTML = `
        <h3>Exportar Dados</h3>
        <p style="color:#99a5b5;font-size:13px;margin-bottom:15px">
            Baixe os dados do mapa atual (<strong>${titulo}</strong>).
        </p>
        
        <div class="menu-grid" style="grid-template-columns: 1fr; gap: 10px;">
            <button class="btn-action" onclick="window.baixarGeojson()">
                <span class="icon">🗺️</span> 
                <div><strong>Baixar GeoJSON (com cores)</strong><br><span style="font-size:11px;color:#99a5b5">Vetor editável no QGIS/ArcGIS</span></div>
            </button>

            <button class="btn-action" onclick="window.baixarCSV()" ${state.nivel === 'brasil' ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
                <span class="icon">📊</span> 
                <div><strong>Baixar Tabela CSV</strong><br><span style="font-size:11px;color:#99a5b5">${state.nivel === 'brasil' ? 'Selecione um estado primeiro' : 'Código IBGE, nome e cor'}</span></div>
            </button>

            <button class="btn-action" onclick="window.baixarPNG()">
                <span class="icon">🖼️</span> 
                <div><strong>Baixar Imagem PNG</strong><br><span style="font-size:11px;color:#99a5b5">Captura do mapa atual</span></div>
            </button>

            <button class="btn-action" onclick="window.baixarTodosGeoJSON()">
                <span class="icon">📦</span> 
                <div><strong>Baixar Todos os Estados</strong><br><span style="font-size:11px;color:#99a5b5">27 arquivos GeoJSON separados</span></div>
            </button>

            <button class="btn-action" onclick="window.abrirView('home')">
                <span class="icon">↩️</span> 
                <div><strong>Voltar ao Mapa</strong></div>
            </button>
        </div>
    `;
}

// ══════════════════════════════════════════════════════
// TELA: DETALHES DO MUNICÍPIO
// ══════════════════════════════════════════════════════
function renderDetalhesMunicipio(geocodigo) {
    const uf = state.ufAtual;
    const feature = state.dados._porUF[uf]?.find(f => f.properties.geocodigo === geocodigo);
    
    if (!feature) {
        elContent.innerHTML = '<p style="color:#ef4444">Município não encontrado.</p>';
        return;
    }
    
    const p = feature.properties;
    const corAtual = state.coresMunicipios[p.geocodigo] || CORES.municipio.fill;
    
    elContent.innerHTML = `
        <h3>Detalhes do Município</h3>
        
        <div style="background:#141a22;border:1px solid #3a4657;border-radius:8px;padding:16px;margin-bottom:15px;">
            <div style="font-size:20px;font-weight:700;color:#f4d03f;margin-bottom:8px;">${p.nome}</div>
            <div style="font-size:12px;color:#99a5b5;line-height:1.8;">
                <div><strong>Estado:</strong> ${state.dados.estados[uf].nome} (${uf})</div>
                <div><strong>Código IBGE:</strong> ${p.geocodigo}</div>
                <div><strong>Cor atual:</strong> 
                    <span style="display:inline-block;width:16px;height:16px;background:${corAtual};border-radius:3px;vertical-align:middle;margin-left:5px;"></span>
                    ${corAtual}
                </div>
            </div>
        </div>
        
        <h3>Alterar Cor</h3>
        <div class="color-picker-group">
            <label>Nova cor</label>
            <input type="color" id="cor-municipio" value="${corAtual}">
        </div>
        
        <h3>Ações</h3>
        <div class="menu-grid" style="grid-template-columns:1fr;">
            <button class="btn-action" onclick="window.centralizarMunicipio('${p.geocodigo}')">
                <span class="icon">🎯</span> Centralizar no Mapa
            </button>
            <button class="btn-action" onclick="window.abrirView('home')">
                <span class="icon">↩️</span> Voltar
            </button>
        </div>
    `;
    
    document.getElementById('cor-municipio').addEventListener('input', (e) => {
        const cor = e.target.value;
        state.coresMunicipios[p.geocodigo] = cor;
        _aplicarCorMunicipio(p.geocodigo, cor);
    });
}

// ══════════════════════════════════════════════════════
// TELA: ESTATÍSTICAS
// ══════════════════════════════════════════════════════
function renderEstatisticas() {
    const totalEstados = Object.keys(state.dados.estados).length;
    const totalMunicipios = state.dados.features.length;
    const estadosColoridos = Object.keys(state.coresEstados).length;
    const municipiosColoridos = Object.keys(state.coresMunicipios).length;
    
    const topEstados = Object.entries(state.dados.estados)
        .sort((a, b) => b[1].total_municipios - a[1].total_municipios)
        .slice(0, 5);
    
    elContent.innerHTML = `
        <h3>Estatísticas Gerais</h3>
        
        <div class="stats-grid">
            <div class="stat-box"><span>Estados</span><strong>${totalEstados}</strong></div>
            <div class="stat-box"><span>Municípios</span><strong>${totalMunicipios}</strong></div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-box"><span>Estados Coloridos</span><strong>${estadosColoridos}</strong></div>
            <div class="stat-box"><span>Municípios Coloridos</span><strong>${municipiosColoridos}</strong></div>
        </div>
        
        <h3>Top 5 Estados por Municípios</h3>
        <div style="background:#141a22;border:1px solid #3a4657;border-radius:8px;padding:12px;margin-bottom:15px;">
            ${topEstados.map(([uf, e], i) => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #2c3e50;font-size:13px;">
                    <span><strong style="color:#f4d03f;">${i + 1}.</strong> ${e.nome} (${uf})</span>
                    <span style="color:#99a5b5;">${e.total_municipios} mun.</span>
                </div>
            `).join('')}
        </div>
        
        <h3>Progresso de Personalização</h3>
        <div style="background:#141a22;border:1px solid #3a4657;border-radius:8px;padding:12px;">
            <div style="font-size:12px;color:#99a5b5;margin-bottom:6px;">
                Estados: ${estadosColoridos}/${totalEstados} (${Math.round(estadosColoridos/totalEstados*100)}%)
            </div>
            <div style="background:#0d1117;height:8px;border-radius:4px;overflow:hidden;margin-bottom:12px;">
                <div style="background:#f4d03f;height:100%;width:${estadosColoridos/totalEstados*100}%;"></div>
            </div>
            <div style="font-size:12px;color:#99a5b5;margin-bottom:6px;">
                Municípios: ${municipiosColoridos}/${totalMunicipios} (${Math.round(municipiosColoridos/totalMunicipios*100)}%)
            </div>
            <div style="background:#0d1117;height:8px;border-radius:4px;overflow:hidden;">
                <div style="background:#10b981;height:100%;width:${municipiosColoridos/totalMunicipios*100}%;"></div>
            </div>
        </div>
        
        <div class="menu-grid" style="grid-template-columns:1fr;margin-top:15px;">
            <button class="btn-action" onclick="window.abrirView('home')">
                <span class="icon">↩️</span> Voltar
            </button>
        </div>
    `;
}

// ══════════════════════════════════════════════════════
// BOTÕES VOLTAR E MENU
// ══════════════════════════════════════════════════════
export function configurarBotaoVoltar() {
    btnVoltar.addEventListener('click', () => {
        if (state.viewAtual !== 'home') {
            abrirView('home');
        } else if (state.nivel === 'estado') {
            _mudarNivel('brasil');
        }
    });
}

export function configurarBotaoMenu() {
    btnMenu.addEventListener('click', () => {
        abrirView('estatisticas');
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (state.viewAtual !== 'home') {
            abrirView('home');
        } else if (state.nivel === 'estado') {
            _mudarNivel('brasil');
        }
    }
});