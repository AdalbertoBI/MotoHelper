document.addEventListener('DOMContentLoaded', () => {
    console.log('[pesquisa.js] Configurando listener para Pesquisa...');
    const btnBuscar = document.getElementById('btnBuscar');
    if (btnBuscar) btnBuscar.addEventListener('click', buscarLocais);
    else console.warn('[pesquisa.js] Botão #btnBuscar não encontrado.');
});

async function buscarLocais() {
    const listaResultadosUl = document.getElementById('listaResultados');
    const tipoPesquisaSelect = document.getElementById('tipoPesquisa');
    if (!listaResultadosUl || !tipoPesquisaSelect) {
        console.error('[pesquisa.js] Elementos #listaResultados ou #tipoPesquisa não encontrados.');
        return;
    }

    const tipoPesquisa = tipoPesquisaSelect.value.trim().toLowerCase();
    if (!tipoPesquisa) {
        alert('Por favor, selecione um tipo de estabelecimento para pesquisar.');
        return;
    }

    if (!navigator.geolocation) {
        alert('Geolocalização não suportada ou desativada.');
        listaResultadosUl.innerHTML = '<li>Geolocalização não disponível.</li>';
        return;
    }

    if (!mapaPronto || !map) {
        console.warn('[pesquisa.js] Mapa não inicializado. Tentando inicializar...');
        inicializarMapaPesquisa();
        if (!map) {
            listaResultadosUl.innerHTML = '<li class="list-group-item list-group-item-danger">Erro: Mapa não pôde ser carregado.</li>';
            return;
        }
        mapaPronto = true;
    }

    listaResultadosUl.innerHTML = '<li>Obtendo localização...</li>';
    limparCamadasDoMapa('tudo');

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            console.log(`[pesquisa.js] Localização para pesquisa: ${lat}, ${lng}`);
            centralizarMapa(lat, lng, 14);

            listaResultadosUl.innerHTML = `<li>Buscando ${tipoPesquisa} próximos (até 5km)...</li>`;
            const raioBuscaMetros = 5000;
            const tipoMapeado = mapearTipoPesquisa(tipoPesquisa);
            if (!tipoMapeado) {
                listaResultadosUl.innerHTML = `<li class="list-group-item list-group-item-warning">Tipo de pesquisa "${tipoPesquisa}" não reconhecido.</li>`;
                return;
            }
            const overpassQuery = `[out:json][timeout:25];node["${tipoMapeado.key}"="${tipoMapeado.value}"](around:${raioBuscaMetros},${lat},${lng});out body 50;`;
            const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

            try {
                console.log('[pesquisa.js] Consultando Overpass API:', overpassUrl);
                const res = await fetch(overpassUrl);
                if (!res.ok) throw new Error(`Erro ${res.status} na API Overpass`);
                const data = await res.json();
                console.log('[pesquisa.js] Resposta Overpass:', data);

                let locais = data.elements;
                listaResultadosUl.innerHTML = '';
                if (!locais || locais.length === 0) {
                    listaResultadosUl.innerHTML = `<li class="list-group-item">Nenhum ${tipoPesquisa} encontrado em ${raioBuscaMetros/1000} km.</li>`;
                    return;
                }

                locais = locais.map(local => {
                    if (local.lat && local.lon) {
                        local.distancia = calcularDistancia(lat, lng, local.lat, local.lon);
                    }
                    return local;
                }).filter(local => local.distancia !== undefined)
                  .sort((a, b) => a.distancia - b.distancia);

                adicionarMarcadorUsuario(lat, lng);
                const boundsCoords = [[lat, lng]];
                locais.forEach(local => {
                    if (local.lat && local.lon) {
                        const nomeLocal = local.tags?.name || `${tipoPesquisa} sem nome`;
                        const endereco = local.tags?.['addr:street'] || 'Endereço não disponível';
                        adicionarMarcadorLocal(local.lat, local.lon, nomeLocal);
                        boundsCoords.push([local.lat, local.lon]);
                        const li = document.createElement('li');
                        li.className = 'list-group-item';
                        li.style.cursor = 'pointer';
                        li.innerHTML = `<strong>${nomeLocal}</strong> (${local.distancia.toFixed(2)} km)<br>${endereco}`;
                        li.addEventListener('click', () => {
                            const origem = `${lat},${lng}`;
                            const destino = `${local.lat},${local.lon}`;
                            const url = `https://www.google.com/maps/dir/?api=1&origin=${origem}&destination=${destino}&travelmode=driving`;
                            window.open(url, '_blank');
                        });
                        listaResultadosUl.appendChild(li);
                    }
                });

                ajustarZoomParaMarcadores(boundsCoords);
            } catch (error) {
                console.error('[pesquisa.js] Erro ao buscar locais:', error);
                listaResultadosUl.innerHTML = `<li class="list-group-item list-group-item-danger">Erro ao buscar ${tipoPesquisa}: ${error.message}</li>`;
            }
        },
        (error) => {
            console.error('[pesquisa.js] Erro na geolocalização:', error.message);
            listaResultadosUl.innerHTML = `<li class="list-group-item list-group-item-danger">Não foi possível obter sua localização: ${error.message}</li>`;
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
    );
}

function mapearTipoPesquisa(tipo) {
    const mapeamento = {
        'farmácia': { key: 'amenity', value: 'pharmacy' },
        'farmacia': { key: 'amenity', value: 'pharmacy' },
        'posto': { key: 'amenity', value: 'fuel' },
        'restaurante': { key: 'amenity', value: 'restaurant' },
        'oficina': { key: 'shop', value: 'car_repair' },
        'hospital': { key: 'amenity', value: 'hospital' },
        'banco': { key: 'amenity', value: 'bank' },
        'supermercado': { key: 'shop', value: 'supermercado' }
    };
    return mapeamento[tipo.toLowerCase()];
}

function inicializarMapaPesquisa(coordenadas = [-23.2237, -45.9009]) {
    console.log('[pesquisa.js] Inicializando mapa com coordenadas:', coordenadas);
    if (map) {
        console.log('[pesquisa.js] Mapa já inicializado, atualizando visualização.');
        map.setView(coordenadas, 13);
        return;
    }

    try {
        map = L.map('mapPesquisa', {
            zoomControl: true,
            attributionControl: true
        }).setView(coordenadas, 13);
        console.log('[pesquisa.js] Mapa criado com sucesso.');

        const isDarkMode = document.body.classList.contains('dark-mode');
        const tileUrl = isDarkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        L.tileLayer(tileUrl, {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            tileSize: 512,
            zoomOffset: -1
        }).addTo(map);

        map.attributionControl.setPrefix('');
    } catch (error) {
        console.error('[pesquisa.js] Erro ao inicializar o mapa:', error);
        const mapDiv = document.getElementById('mapPesquisa');
        if (mapDiv) {
            mapDiv.innerHTML = '<p style="color:red; font-weight:bold;">Erro ao carregar o mapa. Tente recarregar a página.</p>';
        }
    }
}

function adicionarMarcadorUsuario(lat, lng) {
    if (!map) return;
    const userIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        shadowSize: [41, 41]
    });
    const marcador = L.marker([lat, lng], { icon: userIcon }).addTo(map);
    marcador.bindPopup('Você está aqui!').openPopup();
}

function adicionarMarcadorLocal(lat, lng, nome) {
    if (!map) return;
    const localIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        shadowSize: [41, 41]
    });
    const marcador = L.marker([lat, lng], { icon: localIcon }).addTo(map);
    marcador.bindPopup(nome);
}

function ajustarZoomParaMarcadores(coords) {
    if (!map || coords.length === 0) return;
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
}

function limparCamadasDoMapa(tipo) {
    if (!map) return;
    map.eachLayer(layer => {
        if (tipo === 'tudo') {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        } else if (tipo === 'marcadores' && layer instanceof L.Marker) {
            map.removeLayer(layer);
        } else if (tipo === 'rotas' && layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
}

function centralizarMapa(lat, lng, zoom = 13) {
    if (!map) return;
    map.setView([lat, lng], zoom);
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}