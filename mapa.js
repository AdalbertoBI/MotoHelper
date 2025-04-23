let mapa;
let mapaPostos;
let rotaLayer = null;
let marcadores = [];

function inicializarMapa(localizacaoInicial) {
    const fallbackLocalizacao = [-23.1791, -45.8872]; // São José dos Campos, SP
    const centroInicial = localizacaoInicial || fallbackLocalizacao;
    mapa = L.map('mapa').setView(centroInicial, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapa);

    mapaPostos = L.map('mapaPostos');
}

function centralizarMapa(lat, lon) {
    mapa.setView([lat, lon], 13);
}

function adicionarMarcadores(coordsOrigem, coordsParadas, coordsDestino) {
    // Limpa marcadores anteriores
    marcadores.forEach(marcador => mapa.removeLayer(marcador));
    marcadores = [];

    // Ícones personalizados
    const iconeOrigem = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    });

    const iconeParada = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    });

    const iconeDestino = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    });

    // Adiciona marcador da origem
    const marcadorOrigem = L.marker(coordsOrigem, { icon: iconeOrigem })
        .bindPopup('Origem')
        .addTo(mapa);
    marcadores.push(marcadorOrigem);

    // Adiciona marcadores das paradas
    coordsParadas.forEach((coord, index) => {
        const marcadorParada = L.marker(coord, { icon: iconeParada })
            .bindPopup(`Parada ${index + 1}`)
            .addTo(mapa);
        marcadores.push(marcadorParada);
    });

    // Adiciona marcador do destino
    const marcadorDestino = L.marker(coordsDestino, { icon: iconeDestino })
        .bindPopup('Destino')
        .addTo(mapa);
    marcadores.push(marcadorDestino);
}

function desenharRota(geometry) {
    if (rotaLayer) {
        mapa.removeLayer(rotaLayer);
    }

    const polyline = L.polyline(geometry.map(coord => [coord[1], coord[0]]), { color: 'blue' }).addTo(mapa);
    mapa.fitBounds(polyline.getBounds());
    rotaLayer = polyline;
}

function inicializarMapaPostos(lat, lng) {
    mapaPostos.setView([lat, lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapaPostos);
}

function adicionarMarcadorPosto(lat, lon, nome) {
    L.marker([lat, lon])
        .addTo(mapaPostos)
        .bindPopup(`<b>${nome || "Posto Desconhecido"}</b>`);
}