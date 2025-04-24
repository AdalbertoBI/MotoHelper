document.addEventListener('DOMContentLoaded', () => {
    console.log('[postos.js] Configurando listener para Postos...');
    const btnBuscarPostos = document.getElementById('btnBuscarPostos');
    if (btnBuscarPostos) btnBuscarPostos.addEventListener('click', buscarPostos);
    else console.warn('[postos.js] Botão #btnBuscarPostos não encontrado.');
});

async function buscarPostos() {
    const listaPostosUl = document.getElementById('listaPostos');
    if (!listaPostosUl) {
        console.error('[postos.js] Elemento #listaPostos não encontrado.');
        return;
    }

    if (!navigator.geolocation) {
        alert('Geolocalização não suportada ou desativada.');
        listaPostosUl.innerHTML = '<li>Geolocalização não disponível.</li>';
        return;
    }

    listaPostosUl.innerHTML = '<li>Obtendo localização...</li>';
    limparCamadasDoMapa('tudo');

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            console.log(`[postos.js] Localização para postos: ${lat}, ${lng}`);
            if (mapaPronto) centralizarMapa(lat, lng, 14);
            else inicializarMapa([lat, lng]);

            listaPostosUl.innerHTML = '<li>Buscando postos próximos (até 5km)...</li>';
            const raioBuscaMetros = 5000;
            const overpassQuery = `[out:json][timeout:25];node["amenity"="fuel"](around:${raioBuscaMetros},${lat},${lng});out geom;`;
            const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

            try {
                console.log('[postos.js] Consultando Overpass API:', overpassUrl);
                const res = await fetch(overpassUrl);
                if (!res.ok) throw new Error(`Erro ${res.status} na API Overpass`);
                const data = await res.json();
                console.log('[postos.js] Resposta Overpass:', data);

                const postos = data.elements;
                listaPostosUl.innerHTML = '';
                if (!postos || postos.length === 0) {
                    listaPostosUl.innerHTML = `<li class="list-group-item">Nenhum posto encontrado em ${raioBuscaMetros/1000} km.</li>`;
                    return;
                }

                adicionarMarcadorUsuario(lat, lng);
                const boundsCoords = [[lat, lng]];
                postos.forEach(posto => {
                    if (posto.lat && posto.lon) {
                        const nomePosto = posto.tags?.name || 'Posto sem nome';
                        adicionarMarcadorPosto(posto.lat, posto.lon, nomePosto);
                        boundsCoords.push([posto.lat, posto.lon]);
                        const li = document.createElement('li');
                        li.className = 'list-group-item';
                        const dist = calcularDistancia(lat, lng, posto.lat, posto.lon);
                        li.textContent = `${nomePosto} (~${dist.toFixed(1)} km)`;
                        listaPostosUl.appendChild(li);
                    }
                });

                if (map && boundsCoords.length > 1) {
                    map.fitBounds(boundsCoords, { padding: [40, 40] });
                }
            } catch (error) {
                console.error('[postos.js] Erro ao buscar postos:', error);
                listaPostosUl.innerHTML = `<li class="list-group-item list-group-item-danger">Erro ao buscar postos (${error.message}).</li>`;
            }
        },
        (error) => {
            console.error('[postos.js] Erro na localização para postos:', error.message);
            listaPostosUl.innerHTML = `<li class="list-group-item list-group-item-warning">Não foi possível obter localização (${error.message}).</li>`;
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}

function adicionarMarcadorUsuario(lat, lon) {
    if (!map || !markersLayer) {
        console.warn('[postos.js] Mapa ou camada de marcadores não disponível.');
        return;
    }
    const iconeUsuario = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    L.marker([lat, lon], { icon: iconeUsuario })
        .bindPopup('Sua Localização Atual')
        .addTo(markersLayer)
        .openPopup();
}

function adicionarMarcadorPosto(lat, lon, nome) {
    if (!map || !markersLayer) {
        console.warn('[postos.js] Mapa ou camada de marcadores não disponível.');
        return;
    }
    L.marker([lat, lon])
        .bindPopup(nome)
        .addTo(markersLayer);
}