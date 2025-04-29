let map = null;
let routeLayer = null;
let markersLayer = null;
let tileLayer = null;

function inicializarMapa(localizacaoInicial = null) {
    const fallbackLocalizacao = [-23.1791, -45.8872];
    const centroInicial = Array.isArray(localizacaoInicial) && localizacaoInicial.length === 2
        ? localizacaoInicial
        : fallbackLocalizacao;
    const zoomInicial = 13;
    const isDarkMode = document.body.classList.contains('dark-mode');

    const mapaDiv = document.getElementById('map') || document.getElementById('mapPesquisa');
    if (!mapaDiv) {
        console.error('[mapa.js] Elemento de mapa (#map ou #mapPesquisa) não encontrado no HTML.');
        document.querySelector('.container')?.insertAdjacentHTML('afterbegin', 
            '<div class="error">Erro: O elemento do mapa não foi encontrado.</div>');
        return;
    }
    console.log('[mapa.js] Elemento de mapa encontrado, inicializando...');

    if (map) {
        console.log('[mapa.js] Mapa já inicializado. Ajustando visão para:', centroInicial);
        map.setView(centroInicial, zoomInicial);
        routeLayer?.clearLayers();
        markersLayer?.clearLayers();
        setTimeout(() => map.invalidateSize(), 100);
        return;
    }

    console.log('[mapa.js] Inicializando o mapa em:', centroInicial);
    try {
        if (typeof L === 'undefined' || !L.map) {
            throw new Error('Biblioteca Leaflet não carregada.');
        }

        map = L.map(mapaDiv.id, {
            center: centroInicial,
            zoom: zoomInicial,
            zoomControl: true,
            attributionControl: true
        });

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

        routeLayer = L.layerGroup().addTo(map);
        markersLayer = L.layerGroup().addTo(map);

        console.log('[mapa.js] Mapa inicializado e camadas criadas com sucesso!');
        setTimeout(() => {
            map.invalidateSize();
            console.log('[mapa.js] Mapa redimensionado após inicialização.');
        }, 100);

        map.on('moveend zoomend', () => {
            console.log('[mapa.js] Mapa movido/zoom. Centro:', map.getCenter(), 'Zoom:', map.getZoom());
        });

    } catch (error) {
        console.error('[mapa.js] Erro ao inicializar o mapa Leaflet:', error);
        mapaDiv.innerHTML = '<p class="error">Falha ao carregar o mapa. Verifique a conexão ou recarregue a página.</p>';
    }
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

    markersLayer.clearLayers();
    console.log('[mapa.js] Adicionando marcadores...');

    // Marcador de origem
    if (coordsOrigem && Array.isArray(coordsOrigem) && coordsOrigem.length === 2) {
        L.marker(coordsOrigem, {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '<span style="background-color: green; border-radius: 50%; width: 20px; height: 20px; display: block;"></span>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(markersLayer).bindPopup('Origem');
    } else {
        console.warn('[mapa.js] Coordenadas de origem inválidas:', coordsOrigem);
    }

    // Marcadores de paradas
    coordsParadas.forEach((coord, index) => {
        if (Array.isArray(coord) && coord.length === 2) {
            L.marker(coord, {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: `<span style="background-color: blue; border-radius: 50%; width: 20px; height: 20px; display: block;">${index + 1}</span>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(markersLayer).bindPopup(`Parada ${index + 1}`);
        } else {
            console.warn('[mapa.js] Coordenadas de parada inválidas:', coord);
        }
    });

    // Marcador de destino
    if (coordsDestino && Array.isArray(coordsDestino) && coordsDestino.length === 2) {
        L.marker(coordsDestino, {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '<span style="background-color: red; border-radius: 50%; width: 20px; height: 20px; display: block;"></span>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(markersLayer).bindPopup('Destino');
    } else {
        console.warn('[mapa.js] Coordenadas de destino inválidas:', coordsDestino);
    }

    // Ajustar mapa para mostrar todos os marcadores
    if (coordsOrigem && coordsDestino) {
        const bounds = L.latLngBounds([coordsOrigem, coordsDestino]);
        coordsParadas.forEach(coord => bounds.extend(coord));
        map.fitBounds(bounds, { padding: [50, 50] });
        console.log('[mapa.js] Mapa ajustado para mostrar todos os marcadores.');
    }
}

function desenharRota(coordinates) {
    if (!map || !routeLayer) {
        console.error('[mapa.js] Mapa ou camada de rota não inicializada.');
        return;
    }

    routeLayer.clearLayers();
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
        console.warn('[mapa.js] Nenhuma coordenada fornecida para desenhar a rota.');
        return;
    }

    console.log('[mapa.js] Desenhando rota com', coordinates.length, 'coordenadas.');
    const polyline = L.polyline(coordinates, {
        color: '#007bff',
        weight: 5,
        opacity: 0.7
    }).addTo(routeLayer);

    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    console.log('[mapa.js] Rota desenhada e mapa ajustado.');
}

function limparCamadasDoMapa(tipo = 'tudo') {
    if (!map) {
        console.warn('[mapa.js] Mapa não inicializado.');
        return;
    }

    if (tipo === 'tudo' || tipo === 'rotas') {
        if (routeLayer) {
            routeLayer.clearLayers();
            console.log('[mapa.js] Camada de rotas limpa.');
        }
    }
    if (tipo === 'tudo' || tipo === 'marcadores') {
        if (markersLayer) {
            markersLayer.clearLayers();
            console.log('[mapa.js] Camada de marcadores limpa.');
        }
    }
}