// 1. Inicializa o mapa centralizado no Brasil
const map = L.map('map').setView([-14.2350, -51.9253], 4);

// 2. Fundo do mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    className: 'mapa-cinza'
}).addTo(map);

// 3. Lista de todos os estados (UFs)
const ufs = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS",
    "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC",
    "SE", "SP", "TO"
];

// 4. Carrega todos os arquivos JSON em paralelo
Promise.all(ufs.map(uf => 
    fetch(`./minified/${uf}.min.json`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} para ${uf}`);
        return r.json();
    })
))
.then(todosEstados => {
    // Junta todos os municípios de todos os estados em uma única lista
    const todasAsFeatures = todosEstados.flatMap(estado => estado.features);
    
    // Cria um único objeto GeoJSON com todos os municípios
    const todosMunicipios = {
        type: "FeatureCollection",
        features: todasAsFeatures
    };

    // 5. Verifica se a função vt está disponível antes de usar
    if (typeof L.geoJson.vt === 'function') {
        const camadaMunicipios = L.geoJson.vt(todosMunicipios, {
            maxZoom: 14,
            tolerance: 3,
            style: function(feature) {
                return {
                    fillColor: '#e6dfcc',
                    color: '#a39e8c',
                    weight: 0.5,
                    fillOpacity: 0.8
                };
            },
            onEachFeature: function (feature, layer) {
                // Extrai os dados do município
                const props = feature.properties;
                const nome = props.NOME || props.nome || 'Município Desconhecido';
                const geocodigo = props.GEOCODIGO || props.geocodigo || 'N/A';
                const uf = props.UF || props.uf || 'N/A';

                // Cria o conteúdo HTML do popup com os dados
                const popupContent = `
                    <div style="text-align: center;">
                        <h4 style="margin: 0 0 5px 0;">${nome}</h4>
                        <p style="margin: 0; font-size: 12px; color: #555;">
                            <strong>UF:</strong> ${uf}<br>
                            <strong>Código IBGE:</strong> ${geocodigo}
                        </p>
                    </div>
                `;

                // Adiciona o popup à camada
                layer.bindPopup(popupContent);

                // Adiciona o tooltip (balãozinho que segue o mouse)
                layer.bindTooltip(nome, {
                    permanent: false,
                    direction: "center",
                    className: "tooltip-custom"
                });

                // Ao clicar, abre o popup e dá zoom
                layer.on('click', function () {
                    layer.openPopup(); 
                    map.fitBounds(layer.getBounds());
                });
            }
        }).addTo(map);

        // Ajusta o zoom inicial para mostrar todo o Brasil
        map.fitBounds([[-33.75, -73.98], [5.27, -34.79]]);
        console.log("✅ Mapa do Brasil carregado. Clique em um município para ver os dados.");
    } else {
        console.error("❌ A função L.geoJson.vt não está disponível.");
    }
})
.catch(error => console.error('❌ Erro ao carregar os dados:', error));