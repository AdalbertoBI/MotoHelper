let mapa;
let mapaPostos;
let rotaLayer = null;
let marcadores = [];

function inicializarMapa(localizacaoInicial) {
    const fallbackLocalizacao = [-23.1791, -45.8872];
    const centroInicial = localizacaoInicial || fallbackLocalizacao;

    if (mapa) {
        mapa.setView(centroInicial, 13);
        return;
    }

    mapa = L.map('mapa').setView(centroInicial, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(mapa);
}

function centralizarMapa(lat, lon) {
    if (mapa) {
        mapa.setView([lat, lon], 13);
    }
}

function adicionarMarcadores(coordsOrigem, coordsParadas, coordsDestino) {
    // Remove marcadores existentes
    marcadores.forEach(marcador => mapa.removeLayer(marcador));
    marcadores = [];

    // Ícones personalizados
    const iconeOrigem = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const iconeParada = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const iconeDestino = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // Adiciona marcadores
    const marcadorOrigem = L.marker(coordsOrigem, { icon: iconeOrigem })
        .bindPopup('Origem')
        .addTo(mapa);
    marcadores.push(marcadorOrigem);

    coordsParadas.forEach((coord, index) => {
        const marcadorParada = L.marker(coord, { icon: iconeParada })
            .bindPopup(`Parada ${index + 1}`)
            .addTo(mapa);
        marcadores.push(marcadorParada);
    });

    const marcadorDestino = L.marker(coordsDestino, { icon: iconeDestino })
        .bindPopup('Destino')
        .addTo(mapa);
    marcadores.push(marcadorDestino);
}

function desenharRota(geometry) {
    if (rotaLayer) {
        mapa.removeLayer(rotaLayer);
    }

    const polyline = L.polyline(geometry.map(coord => [coord[1], coord[0]]), {
        color: 'blue',
        weight: 5,
        opacity: 0.7,
        lineJoin: 'round'
    }).addTo(mapa);
    
    mapa.fitBounds(polyline.getBounds());
    rotaLayer = polyline;
}

function inicializarMapaPostos(lat, lng) {
    if (mapaPostos) {
        mapaPostos.setView([lat, lng], 14);
        return;
    }

    mapaPostos = L.map('mapaPostos').setView([lat, lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(mapaPostos);
}

function adicionarMarcadorPosto(lat, lon, nome) {
    const iconePosto = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    L.marker([lat, lon], { icon: iconePosto })
        .addTo(mapaPostos)
        .bindPopup(`<b>${nome || "Posto Desconhecido"}</b>`);
}