let mapa;
let mapaPostos;
let rotaLayer = null;
let marcadores = [];

function inicializarMapa(localizacaoInicial) {
    const fallbackLocalizacao = [-23.1791, -45.8872];
    const centroInicial = localizacaoInicial || fallbackLocalizacao;

    if (mapa) {
        console.log('Mapa já inicializado, apenas ajustando a visualização.');
        mapa.setView(centroInicial, 13);
        return;
    }

    const mapaDiv = document.getElementById('mapa');
    if (!mapaDiv) {
        console.error('Elemento com ID "mapa" não encontrado no HTML.');
        return;
    }

    console.log('Inicializando o mapa na posição:', centroInicial);
    try {
        mapa = L.map('mapa').setView(centroInicial, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(mapa);
        console.log('Mapa inicializado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar o mapa:', error);
    }
}

function centralizarMapa(lat, lon) {
    if (mapa) {
        mapa.setView([lat, lon], 13);
        console.log('Mapa centralizado em:', [lat, lon]);
    } else {
        console.error('Mapa não está inicializado para centralizar.');
    }
}

function adicionarMarcadores(coordsOrigem, coordsParadas, coordsDestino) {
    if (!mapa) {
        console.error('Mapa não inicializado ao tentar adicionar marcadores.');
        return;
    }

    console.log('Adicionando marcadores...');
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

    console.log('Marcadores adicionados com sucesso!');
}

function desenharRota(geometry) {
    if (!mapa) {
        console.error('Mapa não inicializado ao tentar desenhar a rota.');
        return;
    }

    console.log('Desenhando rota...');
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
    console.log('Rota desenhada com sucesso!');
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