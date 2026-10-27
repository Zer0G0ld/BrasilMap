// 1. Inicializa o mapa centralizado no Brasil
const map = L.map('map').setView([-14.2350, -51.9253], 4);

// 2. Fundo do mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    className: 'mapa-cinza'
}).addTo(map);

// 3. URL do arquivo único gerado pelo Python
const urlJSON = './brasil_completo.json';

// 4. Carrega o arquivo único
fetch(urlJSON)
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
    .then(geojsonData => {
        console.log(`✅ Dados carregados: ${geojsonData.features.length} municípios.`);

        // 5. Renderização Otimizada
        const camadaMunicipios = L.geoJson.vt(geojsonData, {
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
                const props = feature.properties;
                const nome = props.nome;
                const uf = props.uf;
                const geocodigo = props.geocodigo;

                // Popup com os dados
                const popupContent = `
                    <div style="text-align: center;">
                        <h4 style="margin: 0 0 5px 0;">${nome}</h4>
                        <p style="margin: 0; font-size: 12px; color: #555;">
                            <strong>UF:</strong> ${uf}<br>
                            <strong>Código IBGE:</strong> ${geocodigo}
                        </p>
                    </div>
                `;

                layer.bindPopup(popupContent);

                layer.bindTooltip(nome, {
                    permanent: false,
                    direction: "center",
                    className: "tooltip-custom"
                });

                layer.on('click', function () {
                    layer.openPopup(); 
                    map.fitBounds(layer.getBounds());
                });
            }
        }).addTo(map);

        map.fitBounds([[-33.75, -73.98], [5.27, -34.79]]);
    })
    .catch(error => console.error('❌ Erro ao carregar:', error));