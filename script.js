// ──────────────────────────────────────────────────────────
// 1. MAPA + LIMITE DE ZOOM AO BRASIL
// ──────────────────────────────────────────────────────────
const map = L.map('map', {
    minZoom: 4,
    maxZoom: 14,
    maxBoundsViscosity: 1.0,
    worldCopyJump: false,
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    className: 'mapa-cinza',
    noWrap: true,
    bounds: [[-33.75, -73.98], [5.27, -34.79]],
}).addTo(map);

const BRASIL_BOUNDS = L.latLngBounds([[-33.75, -73.98], [5.27, -34.79]]);
map.setMaxBounds(BRASIL_BOUNDS);
map.fitBounds(BRASIL_BOUNDS);

// ──────────────────────────────────────────────────────────
// 2. PALETA / ESTILOS
// ──────────────────────────────────────────────────────────
const CORES = {
    brasil:      { fill: '#e6dfcc', stroke: '#a39e8c' },
    estado:      { fill: '#e6dfcc', stroke: '#a39e8c' },
    municipio:   { fill: '#e6dfcc', stroke: '#a39e8c' },
    hover:       { fill: '#d4cdb8', stroke: '#7a7466' },
    selecionado: { fill: '#f4d03f', stroke: '#b7950b' }, // Amarelo Forte
};

// ──────────────────────────────────────────────────────────
// 3. ESTADO GLOBAL
// ──────────────────────────────────────────────────────────
const state = {
    nivel: 'brasil',
    ufAtual: null,
    geoSelecionado: null,
    camadaMunicipios: null,
    camadaEstados: null,
    _layerSelecionado: null, // Guarda a referência do polígono atual
};

const inspectorEl = document.getElementById('inspector-content');
const btnVoltar   = document.getElementById('btn-voltar');

// ──────────────────────────────────────────────────────────
// 4. CARREGA DADOS
// ──────────────────────────────────────────────────────────
fetch('./brasil_completo.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => inicializar(data))
    .catch(err => {
        inspectorEl.innerHTML = `<h2>❌ Erro</h2><p>${err.message}</p>`;
        console.error(err);
    });

// ──────────────────────────────────────────────────────────
// 5. INICIALIZAÇÃO
// ──────────────────────────────────────────────────────────
let DADOS;

function inicializar(data) {
    DADOS = data;
    console.log(`✅ ${data.features.length} municípios carregados`);

    DADOS._porUF = {};
    DADOS.features.forEach(f => {
        const uf = f.properties.uf;
        (DADOS._porUF[uf] ||= []).push(f);
    });

    renderOverviewBrasil();
    btnVoltar.addEventListener('click', voltar);
}

// ──────────────────────────────────────────────────────────
// 6. HELPERS DE ESTILO
// ──────────────────────────────────────────────────────────
function estiloBase(nivel) {
    const c = CORES[nivel] || CORES.municipio;
    return { fillColor: c.fill, color: c.stroke, weight: 0.6, fillOpacity: 0.85 };
}

function estiloSelecionado() {
    return {
        fillColor: CORES.selecionado.fill,
        color: CORES.selecionado.stroke,
        weight: 2,
        fillOpacity: 1,
    };
}

function estiloHover() {
    return {
        fillColor: CORES.hover.fill,
        color: CORES.hover.stroke,
        weight: 1.2,
        fillOpacity: 0.95,
    };
}

// ──────────────────────────────────────────────────────────
// 7. OVERVIEW BRASIL
// ──────────────────────────────────────────────────────────
function renderOverviewBrasil() {
    state.nivel = 'brasil';
    state.ufAtual = null;
    state.geoSelecionado = null;
    state._layerSelecionado = null;

    if (state.camadaMunicipios) {
        map.removeLayer(state.camadaMunicipios);
        state.camadaMunicipios = null;
    }

    if (state.camadaEstados) {
        map.removeLayer(state.camadaEstados);
        state.camadaEstados = null;
    }

    state.camadaEstados = L.layerGroup().addTo(map);

    DADOS.features.forEach(f => {
        const uf = f.properties.uf;
        const layer = L.geoJSON(f, {
            style: estiloBase('brasil'),
            onEachFeature: (feature, ly) => {
                const nome = feature.properties.nome;

                ly.bindTooltip(nome, { direction: 'center', className: 'tooltip-custom' });

                ly.on('mouseover', () => {
                    if (state.nivel !== 'brasil') return;
                    if (ly === state._layerSelecionado) return;
                    ly.setStyle(estiloHover());
                    ly.bringToFront();
                });
                ly.on('mouseout', () => {
                    if (state.nivel !== 'brasil') return;
                    if (ly === state._layerSelecionado) {
                        ly.setStyle(estiloSelecionado());
                    } else {
                        ly.setStyle(estiloBase('brasil'));
                    }
                });

                ly.on('click', (ev) => {
                    L.DomEvent.stopPropagation(ev);
                    state._layerSelecionado = ly;
                    // Não precisa iterar todos aqui, entrarEstado limpa tudo
                    entrarEstado(uf);
                });
            },
        });
        state.camadaEstados.addLayer(layer);
    });

    map.flyToBounds(BRASIL_BOUNDS, { duration: 0.8, easeLinearity: 0.25 });

    const totalMunicipios = DADOS.features.length;
    const totalEstados    = Object.keys(DADOS.estados || {}).length;

    inspectorEl.innerHTML = `
        <h2>🇧🇷 Brasil</h2>
        <h3>Visão geral</h3>
        <p><strong>Estados:</strong> ${totalEstados}</p>
        <p><strong>Municípios:</strong> ${totalMunicipios}</p>
        <h3>Estados</h3>
        <input type="text" id="busca-estados" class="busca" placeholder="🔍 Pesquisar estado...">
        <ul id="lista-ufs" class="lista-scroll"></ul>
    `;

    popularListaEstados('');
    document.getElementById('busca-estados').addEventListener('input', (e) => {
        popularListaEstados(e.target.value);
    });

    atualizarBotaoVoltar();
}

function popularListaEstados(filtro) {
    const ul = document.getElementById('lista-ufs');
    if (!ul) return;
    const termo = filtro.trim().toLowerCase();

    const itens = Object.entries(DADOS.estados || {})
        .filter(([sigla, e]) => {
            if (!termo) return true;
            return sigla.toLowerCase().includes(termo) ||
                   (e.nome || '').toLowerCase().includes(termo);
        })
        .map(([sigla, e]) => `
            <li data-uf="${sigla}">
                <strong>${sigla}</strong> — ${e.nome || sigla}
                <span class="badge">${e.total_municipios}</span>
            </li>
        `).join('');

    ul.innerHTML = itens || `<li class="vazio">Nenhum resultado</li>`;

    ul.querySelectorAll('li[data-uf]').forEach(li => {
        li.addEventListener('click', () => entrarEstado(li.dataset.uf));
    });
}

// ──────────────────────────────────────────────────────────
// 8. ENTRAR NO ESTADO (AQUI ESTÁ O VOO E A LISTA SELECIONÁVEL)
// ──────────────────────────────────────────────────────────
function entrarEstado(uf) {
    const estadoInfo = DADOS.estados[uf];
    if (!estadoInfo) return;

    state.nivel = 'estado';
    state.ufAtual = uf;
    state.geoSelecionado = null;

    // Limpa tudo antes de voar
    if (state.camadaEstados) {
        map.removeLayer(state.camadaEstados);
        state.camadaEstados = null;
    }
    if (state.camadaMunicipios) {
        map.removeLayer(state.camadaMunicipios);
        state.camadaMunicipios = null;
    }

    const features = DADOS._porUF[uf] || [];

    // Renderiza os municípios
    state.camadaMunicipios = L.geoJson(features, {
        style: estiloBase('municipio'),
        onEachFeature: (feature, layer) => {
            const p = feature.properties;

            layer.bindTooltip(p.nome, { direction: 'center', className: 'tooltip-custom' });

            layer.on('mouseover', () => {
                if (layer === state._layerSelecionado) return;
                layer.setStyle(estiloHover());
                layer.bringToFront();
            });
            layer.on('mouseout', () => {
                if (layer === state._layerSelecionado) {
                    layer.setStyle(estiloSelecionado());
                } else {
                    layer.setStyle(estiloBase('municipio'));
                }
            });

            layer.on('click', (ev) => {
                L.DomEvent.stopPropagation(ev);
                if (state._layerSelecionado && state._layerSelecionado !== layer) {
                    state._layerSelecionado.setStyle(estiloBase('municipio'));
                }
                state._layerSelecionado = layer;
                layer.setStyle(estiloSelecionado());
                layer.bringToFront();
                
                mostrarMunicipio(p, layer);
            });
        },
    }).addTo(map);

    // Painel do estado
    inspectorEl.innerHTML = `
        <h2>${estadoInfo.nome || uf} <span class="sub">(${uf})</span></h2>
        <h3>Visão geral</h3>
        <p><strong>Municípios:</strong> ${estadoInfo.total_municipios}</p>
        <h3>Municípios</h3>
        <input type="text" id="busca-municipios" class="busca" placeholder="🔍 Pesquisar município...">
        <ul id="lista-municipios" class="lista-scroll"></ul>
    `;

    popularListaMunicipios('');
    document.getElementById('busca-municipios').addEventListener('input', (e) => {
        popularListaMunicipios(e.target.value);
    });

    // 🎯 O VOO ACONTECE AQUI COM UM PEQUENO ATRASO
    // O setTimeout impede que o Leaflet "pule" enquanto o DOM do painel é atualizado
    setTimeout(() => {
        map.flyToBounds(estadoInfo.bbox, { 
            duration: 1.5, 
            padding: [20, 20],
            easeLinearity: 0.25 
        });
    }, 150);

    atualizarBotaoVoltar();
}

function popularListaMunicipios(filtro) {
    const ul = document.getElementById('lista-municipios');
    if (!ul || !state.ufAtual) return;
    const termo = filtro.trim().toLowerCase();

    const features = DADOS._porUF[state.ufAtual] || [];
    
    // Ordena e filtra
    const lista = features
        .map(f => f.properties)
        .filter(p => !termo || p.nome.toLowerCase().includes(termo))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(p => {
            const isAtivo = state.geoSelecionado === p.geocodigo;
            return `
                <li data-geo="${p.geocodigo}" class="${isAtivo ? 'ativo' : ''}">
                    ${p.nome}
                </li>
            `;
        }).join('');

    ul.innerHTML = lista || `<li class="vazio">Nenhum resultado</li>`;

    // Adiciona evento de clique na lista
    ul.querySelectorAll('li[data-geo]').forEach(li => {
        li.addEventListener('click', () => {
            const geo = li.dataset.geo;
            const layer = state.camadaMunicipios.getLayers()
                .find(l => l.feature?.properties.geocodigo === geo);
            
            if (!layer) return;
            
            // Simula o clique no mapa
            layer.fire('click');
        });
    });
}

// ──────────────────────────────────────────────────────────
// 9. MOSTRAR MUNICÍPIO (Detalhes)
// ──────────────────────────────────────────────────────────
function mostrarMunicipio(props, layer) {
    state.geoSelecionado = props.geocodigo;

    const bbox = props.bbox;
    if (bbox) {
        map.flyToBounds(
            [[bbox[1], bbox[0]], [bbox[3], bbox[2]]],
            { duration: 1.0, padding: [30, 30], easeLinearity: 0.25 }
        );
    }

    layer.bindPopup(`
        <div style="text-align:center">
            <h4 style="margin:0 0 5px">${props.nome}</h4>
            <p style="margin:0;font-size:12px;color:#555">
                <strong>UF:</strong> ${props.uf}<br>
                <strong>IBGE:</strong> ${props.geocodigo}
            </p>
        </div>
    `).openPopup();

    // Atualiza a lista lateral
    const ul = document.getElementById('lista-municipios');
    if (ul) {
        // Remove "ativo" de todos
        ul.querySelectorAll('li').forEach(li => li.classList.remove('ativo'));
        
        // Adiciona "ativo" no que foi clicado
        const liAtivo = ul.querySelector(`li[data-geo="${props.geocodigo}"]`);
        if (liAtivo) {
            liAtivo.classList.add('ativo');
            // Rola a lista para o item ficar visível
            liAtivo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    atualizarBotaoVoltar();
}

// ──────────────────────────────────────────────────────────
// 10. VOLTAR
// ──────────────────────────────────────────────────────────
function voltar() {
    if (state.nivel === 'estado') {
        renderOverviewBrasil();
    }
}

function atualizarBotaoVoltar() {
    btnVoltar.disabled = (state.nivel === 'brasil');
    btnVoltar.textContent = state.nivel === 'estado'
        ? `← Voltar ao Brasil`
        : `← Voltar`;
}