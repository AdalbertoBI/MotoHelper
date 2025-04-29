let mapPesquisa = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[pesquisa.js] DOM carregado. Configurando aba Pesquisa...');
    const btnBuscar = document.getElementById('btnBuscar');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', buscarEstabelecimentos);
        console.log('[pesquisa.js] Listener do botão Buscar configurado.');
    } else {
        console.error('[pesquisa.js] Botão #btnBuscar não encontrado.');
    }

    await esperarLeaflet();
    inicializarMapaPesquisa();
});

function esperarLeaflet() {
    return new Promise((resolve, reject) => {
        const maxTentativas = 20;
        let tentativas = 0;
        const checkLeaflet = () => {
            if (typeof L !== 'undefined' && L.map) {
                console.log('[pesquisa.js] Leaflet carregado.');
                resolve();
            } else if (tentativas >= maxTentativas) {
                console.error('[pesquisa.js] Tempo esgotado para carregar Leaflet.');
                reject(new Error('Biblioteca Leaflet não carregada.'));
            } else {
                tentativas++;
                setTimeout(checkLeaflet, 150);
            }
        };
        checkLeaflet();
    });
}

function inicializarMapaPesquisa() {
    const mapDiv = document.getElementById('mapPesquisa');
    if (!mapDiv) {
        console.error('[pesquisa.js] Elemento #mapPesquisa não encontrado.');
        return;
    }

    if (mapPesquisa) {
        console.log('[pesquisa.js] Mapa de pesquisa já inicializado.');
        mapPesquisa.invalidateSize();
        return;
    }

    try {
        mapPesquisa = L.map('mapPesquisa', {
            center: [-23.1791, -45.8872],
            zoom: 13,
            zoomControl: true,
            attributionControl: true
        });

        const isDarkMode = document.body.classList.contains('dark-mode');
        L.tileLayer(isDarkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: isDarkMode
                ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'
                : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(mapPesquisa);

        console.log('[pesquisa.js] Mapa de pesquisa inicializado.');
        setTimeout(() => mapPesquisa.invalidateSize(), 100);
    } catch (error) {
        console.error('[pesquisa.js] Erro ao inicializar mapa:', error);
        mapDiv.innerHTML = '<p class="error">Erro ao carregar mapa.</p>';
    }
}

async function buscarEstabelecimentos() {
    console.log('[pesquisa.js] Iniciando busca de estabelecimentos...');
    const tipoPesquisaInput = document.getElementById('tipoPesquisa');
    const feedback = document.getElementById('tipoPesquisaFeedback');
    const listaResultados = document.getElementById('listaResultados');

    if (!tipoPesquisaInput || !feedback || !listaResultados || !mapPesquisa) {
        console.error('[pesquisa.js] Elementos do DOM ou mapa ausentes.');
        alert('Erro interno: Elementos da página ausentes.');
        return;
    }

    const tipo = tipoPesquisaInput.value.trim().toLowerCase();
    feedback.textContent = '';
    feedback.classList.remove('text-danger', 'text-success');

    if (!tipo) {
        feedback.textContent = 'Digite o tipo de estabelecimento!';
        feedback.classList.add('text-danger');
        return;
    }

    // Mapeamento de tipos de pesquisa com sinônimos
    const tiposMapeados = {
        'posto': 'fuel',
        'posto de gasolina': 'fuel',
        'restaurante': 'restaurant',
        'lanchonete': 'fast_food',
        'oficina': 'car_repair',
        'hospital': 'hospital',
        'padaria': 'bakery',
        'supermercado': 'supermarket',
        'mercado': 'supermarket',
        'banco': 'bank',
        'farmacia': 'pharmacy',
        'farmácia': 'pharmacy'
    };

    const tagValor = tiposMapeados[tipo] || tipo;
    const tagChave = ['fuel', 'restaurant', 'fast_food', 'car_repair', 'hospital', 'bakery', 'supermarket', 'bank', 'pharmacy'].includes(tagValor)
        ? 'amenity'
        : 'shop';

    if (!navigator.geolocation) {
        feedback.textContent = 'Geolocalização não suportada.';
        feedback.classList.add('text-danger');
        return;
    }

    feedback.textContent = 'Buscando...';
    feedback.classList.add('text-success');

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            console.log('[pesquisa.js] Localização obtida:', lat, lon);
            mapPesquisa.setView([lat, lon], 14);

            try {
                const query = `
                    [out:json][timeout:25];
                    (
                        node["${tagChave}"="${tagValor}"](around:5000,${lat},${lon});
                        way["${tagChave}"="${tagValor}"](around:5000,${lat},${lon});
                        relation["${tagChave}"="${tagValor}"](around:5000,${lat},${lon});
                    );
                    out center;
                `;
                console.log('[pesquisa.js] Consulta Overpass:', query);
                const response = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    body: query
                });
                const data = await response.json();
                console.log('[pesquisa.js] Dados Overpass:', data);

                listaResultados.innerHTML = '';
                mapPesquisa.eachLayer(layer => {
                    if (layer instanceof L.Marker) mapPesquisa.removeLayer(layer);
                });

                if (data.elements.length === 0) {
                    listaResultados.innerHTML = '<li class="list-group-item">Nenhum resultado encontrado.</li>';
                    feedback.textContent = 'Nenhum resultado encontrado.';
                    feedback.classList.add('text-danger');
                    return;
                }

                data.elements.forEach(element => {
                    const nome = element.tags.name || 'Sem nome';
                    const lat = element.lat || element.center.lat;
                    const lon = element.lon || element.center.lon;
                    const endereco = element.tags['addr:street'] || 'Endereço não disponível';
                    const telefone = element.tags.phone || 'Telefone não disponível';

                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.innerHTML = `
                        <strong>${nome}</strong><br>
                        Endereço: ${endereco}<br>
                        Telefone: ${telefone}<br>
                        <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}" target="_blank">Ver no mapa</a>
                    `;
                    listaResultados.appendChild(li);

                    L.marker([lat, lon])
                        .addTo(mapPesquisa)
                        .bindPopup(`<b>${nome}</b><br>${endereco}`);
                });

                feedback.textContent = `Encontrados ${data.elements.length} resultados!`;
                feedback.classList.add('text-success');
            } catch (error) {
                console.error('[pesquisa.js] Erro na busca:', error);
                feedback.textContent = 'Erro ao buscar. Tente novamente.';
                feedback.classList.add('text-danger');
                listaResultados.innerHTML = '<li class="list-group-item error">Erro ao buscar.</li>';
            }
        },
        (error) => {
            console.error('[pesquisa.js] Erro na geolocalização:', error);
            feedback.textContent = 'Não foi possível obter sua localização.';
            feedback.classList.add('text-danger');
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}