let map;
let routeLayer = null;
let markersLayer = null;
let tileLayer = null;

function inicializarMapa(localizacaoInicial = [-23.1791, -45.8872]) {
    const mapaDiv = document.getElementById('map');
    if (!mapaDiv) {
        console.error('[mapa.js] Elemento com ID "map" não encontrado no HTML.');
        return;
    }

    // Verifica se o elemento #map está visível
    if (mapaDiv.offsetWidth === 0 || mapaDiv.offsetHeight === 0) {
        console.warn('[mapa.js] Elemento #map está oculto. Inicialização adiada.');
        return;
    }

    if (!map) {
        map = L.map('map', {
            center: localizacaoInicial,
            zoom: 13,
            zoomControl: true,
            attributionControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // Inicializa as camadas
        markersLayer = L.layerGroup().addTo(map);
        routeLayer = L.layerGroup().addTo(map);

        console.log('[mapa.js] Mapa inicializado com sucesso!');
    } else {
        map.setView(localizacaoInicial, 13);
        setTimeout(() => map.invalidateSize(), 100);
    }
}

// Observa mudanças no DOM para inicializar o mapa quando o #map estiver visível
function observarMapa() {
    const mapaDiv = document.getElementById('map');
    if (!mapaDiv) {
        console.error('[mapa.js] Elemento com ID "map" não encontrado no HTML.');
        return;
    }

    const observer = new MutationObserver(() => {
        if (mapaDiv.offsetWidth > 0 && mapaDiv.offsetHeight > 0) {
            console.log('[mapa.js] Elemento #map agora está visível. Inicializando mapa...');
            inicializarMapa();
            observer.disconnect(); // Para de observar após inicializar o mapa
        }
    });

    observer.observe(mapaDiv, { attributes: true, childList: true, subtree: true });
}

function atualizarTilesMapa(isDarkMode) {
    if (!map || !tileLayer) {
        console.warn('[mapa.js] Mapa ou camada de tiles não inicializada.');
        return;
    }

    console.log('[mapa.js] Atualizando tiles para tema:', isDarkMode ? 'escuro' : 'claro');
    tileLayer.remove();

    const tileUrl = isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileAttribution = isDarkMode
        ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'
        : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    tileLayer = L.tileLayer(tileUrl, {
        attribution: tileAttribution,
        maxZoom: 19,
        minZoom: 5,
        tileSize: 512,
        zoomOffset: -1
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 100);
}

function centralizarMapa(lat, lon, zoom = 15) {
    if (map) {
        map.setView([lat, lon], zoom);
        setTimeout(() => map.invalidateSize(), 100);
        console.log('[mapa.js] Mapa centralizado em:', [lat, lon], 'Zoom:', zoom);
    } else {
        console.warn('[mapa.js] Mapa não inicializado. Tentando inicializar.');
        inicializarMapa([lat, lon]);
    }
}

function adicionarMarcadores(coordsOrigem, coordsParadas, coordsDestino) {
    if (!map || !markersLayer) {
        console.error('[mapa.js] Mapa ou camada de marcadores não inicializada.');
        return;
    }

    console.log('[mapa.js] Adicionando marcadores de rota...');
    markersLayer.clearLayers();

    const iconeOrigem = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    const iconeParada = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    const iconeDestino = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });

    const boundsCoords = [];

    if (coordsOrigem && Array.isArray(coordsOrigem) && coordsOrigem.length === 2) {
        L.marker(coordsOrigem, { icon: iconeOrigem })
            .bindPopup('Origem')
            .addTo(markersLayer);
        boundsCoords.push(coordsOrigem);
        console.log('[mapa.js] Marcador Origem adicionado:', coordsOrigem);
    } else {
        console.warn('[mapa.js] Coordenadas de origem inválidas:', coordsOrigem);
    }

    if (coordsParadas && Array.isArray(coordsParadas)) {
        coordsParadas.forEach((coord, index) => {
            if (coord && Array.isArray(coord) && coord.length === 2) {
                L.marker(coord, { icon: iconeParada })
                    .bindPopup(`Parada ${index + 1}`)
                    .addTo(markersLayer);
                boundsCoords.push(coord);
                console.log(`[mapa.js] Marcador Parada ${index + 1} adicionado:`, coord);
            } else {
                console.warn(`[mapa.js] Coordenadas da parada ${index + 1} inválidas:`, coord);
            }
        });
    }

    if (coordsDestino && Array.isArray(coordsDestino) && coordsDestino.length === 2) {
        L.marker(coordsDestino, { icon: iconeDestino })
            .bindPopup('Destino')
            .addTo(markersLayer);
        boundsCoords.push(coordsDestino);
        console.log('[mapa.js] Marcador Destino adicionado:', coordsDestino);
    } else {
        console.warn('[mapa.js] Coordenadas de destino inválidas:', coordsDestino);
    }

    if (boundsCoords.length > 0) {
        map.fitBounds(boundsCoords, { padding: [50, 50], maxZoom: 15 });
        setTimeout(() => map.invalidateSize(), 100);
        console.log('[mapa.js] Zoom ajustado para mostrar todos os marcadores de rota.');
    } else {
        console.warn('[mapa.js] Nenhum marcador válido para ajustar o zoom.');
    }
}

function desenharRota(geometry) {
    if (!map || !routeLayer) {
        console.error('[mapa.js] Mapa ou camada de rota não inicializada.');
        return;
    }
    if (!geometry || !Array.isArray(geometry) || geometry.length === 0) {
        console.warn('[mapa.js] Geometria da rota inválida ou vazia.');
        return;
    }

    console.log('[mapa.js] Desenhando a linha da rota...');
    routeLayer.clearLayers();

    const latLngs = geometry.map(coord => {
        if (Array.isArray(coord) && coord.length === 2) {
            return [coord[1], coord[0]];
        }
        console.warn('[mapa.js] Coordenada inválida na geometria da rota:', coord);
        return null;
    }).filter(coord => coord !== null);

    if (latLngs.length > 0) {
        const polyline = L.polyline(latLngs, {
            color: '#007bff',
            weight: 6,
            opacity: 0.8,
            lineJoin: 'round',
            lineCap: 'round'
        }).addTo(routeLayer);

        map.fitBounds(polyline.getBounds(), { padding: [50, 50], maxZoom: 15 });
        setTimeout(() => map.invalidateSize(), 100);
        console.log('[mapa.js] Rota desenhada com sucesso.');
    } else {
        console.warn('[mapa.js] Nenhuma coordenada válida para desenhar a rota.');
    }
}

function limparCamadasDoMapa(tipo = 'tudo') {
    if (!map) {
        console.warn('[mapa.js] Mapa não inicializado.');
        return;
    }

    if (tipo === 'tudo' || tipo === 'rota') {
        if (routeLayer) {
            routeLayer.clearLayers();
            console.log('[mapa.js] Camada de rota limpa.');
        }
    }
    if (tipo === 'tudo' || tipo === 'marcadores') {
        if (markersLayer) {
            markersLayer.clearLayers();
            console.log('[mapa.js] Camada de marcadores limpa.');
        }
    }
}