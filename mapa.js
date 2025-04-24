// Variáveis globais para o mapa e suas camadas
let map = null; // Instância única do mapa Leaflet
let routeLayer = null; // LayerGroup para a linha da rota
let markersLayer = null; // LayerGroup para marcadores (origem, destino, paradas, postos)

// Função para inicializar o mapa (ou ajustar a visão se já existir)
function inicializarMapa(localizacaoInicial = null) {
    // Coordenadas padrão (São José dos Campos) se nenhuma for fornecida
    const fallbackLocalizacao = [-23.1791, -45.8872];
    // Usa a localização fornecida ou o fallback
    const centroInicial = Array.isArray(localizacaoInicial) && localizacaoInicial.length === 2
                          ? localizacaoInicial
                          : fallbackLocalizacao;
    const zoomInicial = 13;

    // Verifica se o mapa já está inicializado
    if (map) {
        console.log('[mapa.js] Mapa já inicializado. Ajustando visão para:', centroInicial);
        map.setView(centroInicial, zoomInicial);
        // Limpa camadas existentes ao reajustar (opcional, mas bom para nova busca)
        routeLayer?.clearLayers();
        markersLayer?.clearLayers();
        return;
    }

    // Verifica se o elemento HTML do mapa existe
    const mapaDiv = document.getElementById('map'); // Usa o ID 'map' do HTML corrigido
    if (!mapaDiv) {
        console.error('[mapa.js] Elemento com ID "map" não encontrado no HTML.');
        // Tenta exibir um erro no local do mapa
        const container = document.querySelector('.container') || document.body;
        if (container) {
             const errorDiv = document.createElement('div');
             errorDiv.className = 'error'; // Use uma classe CSS para estilizar
             errorDiv.innerHTML = '<b>Erro Crítico:</b> O elemento do mapa (#map) não foi encontrado na página.';
             // container.prepend(errorDiv); // Adiciona no início do container
        }
        return; // Impede a continuação se o div não existe
    }

    console.log('[mapa.js] Inicializando o mapa em:', centroInicial);
    try {
        // Cria a instância do mapa LIGADA ao div 'map'
        map = L.map('map', {
             center: centroInicial,
             zoom: zoomInicial,
             // Pode adicionar outras opções aqui
        });

        // Adiciona a camada de tiles (mapa base) do OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19, // Zoom máximo um pouco maior
            minZoom: 5   // Zoom mínimo para evitar afastar demais
        }).addTo(map);

        // Inicializa os LayerGroups para rota e marcadores e adiciona ao mapa
        routeLayer = L.layerGroup().addTo(map);
        markersLayer = L.layerGroup().addTo(map);

        console.log('[mapa.js] Mapa inicializado e camadas criadas com sucesso!');

        // Adiciona um ouvinte para quando o mapa é movido/zoom (útil para debug)
        map.on('moveend zoomend', () => {
             console.log('[mapa.js] Mapa movido/zoom. Centro:', map.getCenter(), 'Zoom:', map.getZoom());
        });

        // Força a verificação do tamanho após a inicialização (útil se o mapa estava oculto)
         setTimeout(() => map.invalidateSize(), 100);


    } catch (error) {
        console.error('[mapa.js] Erro CRÍTICO ao inicializar o mapa Leaflet:', error);
         mapaDiv.innerHTML = '<p style="color:red; font-weight: bold;">Falha ao carregar o mapa. Verifique o console (F12).</p>';
    }
}

// Função para centralizar o mapa em coordenadas específicas
function centralizarMapa(lat, lon, zoom = 15) { // Zoom padrão maior para centralizar
    if (map) {
        map.setView([lat, lon], zoom);
        console.log('[mapa.js] Mapa centralizado em:', [lat, lon], 'Zoom:', zoom);
    } else {
        console.warn('[mapa.js] Mapa não inicializado. Tentando inicializar antes de centralizar.');
        // Tenta inicializar com as coordenadas fornecidas se o mapa ainda não existe
        inicializarMapa([lat, lon]);
         // Se inicializou, tenta centralizar novamente (pode não ser necessário devido ao setView na inicialização)
         // if (map) {
         //      map.setView([lat, lon], zoom);
         // }
    }
}

// Adiciona marcadores de ORIGEM, PARADAS e DESTINO ao mapa
function adicionarMarcadores(coordsOrigem, coordsParadas, coordsDestino) {
    if (!map) {
        console.error('[mapa.js] Mapa não inicializado. Não é possível adicionar marcadores de rota.');
        return;
    }
    if (!markersLayer) {
         console.error('[mapa.js] Camada de marcadores (markersLayer) não inicializada.');
         return;
    }

    console.log('[mapa.js] Adicionando marcadores de rota...');
    // Limpa APENAS os marcadores da camada de marcadores (preserva outros layers)
    markersLayer.clearLayers();

    // --- Ícones personalizados (mantidos do seu código original) ---
    const iconeOrigem = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    const iconeParada = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    const iconeDestino = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    // --- Fim Ícones ---

    const boundsCoords = []; // Para ajustar o zoom depois

    // Adiciona marcador de Origem
    if (coordsOrigem && Array.isArray(coordsOrigem) && coordsOrigem.length === 2) {
         L.marker(coordsOrigem, { icon: iconeOrigem })
            .bindPopup('Origem')
            .addTo(markersLayer); // Adiciona à CAMADA de marcadores
         boundsCoords.push(coordsOrigem);
         console.log('[mapa.js] Marcador Origem adicionado:', coordsOrigem);
    } else {
         console.warn('[mapa.js] Coordenadas de origem inválidas:', coordsOrigem);
    }


    // Adiciona marcadores das Paradas
    if (coordsParadas && Array.isArray(coordsParadas)) {
        coordsParadas.forEach((coord, index) => {
            if (coord && Array.isArray(coord) && coord.length === 2) {
                 L.marker(coord, { icon: iconeParada })
                    .bindPopup(`Parada ${index + 1}`)
                    .addTo(markersLayer); // Adiciona à CAMADA de marcadores
                 boundsCoords.push(coord);
                 console.log(`[mapa.js] Marcador Parada ${index + 1} adicionado:`, coord);
            } else {
                 console.warn(`[mapa.js] Coordenadas da parada ${index + 1} inválidas:`, coord);
            }
        });
    }

    // Adiciona marcador de Destino
     if (coordsDestino && Array.isArray(coordsDestino) && coordsDestino.length === 2) {
         L.marker(coordsDestino, { icon: iconeDestino })
            .bindPopup('Destino')
            .addTo(markersLayer); // Adiciona à CAMADA de marcadores
          boundsCoords.push(coordsDestino);
          console.log('[mapa.js] Marcador Destino adicionado:', coordsDestino);
    } else {
         console.warn('[mapa.js] Coordenadas de destino inválidas:', coordsDestino);
    }


    // Ajusta o zoom do mapa para mostrar todos os marcadores adicionados, se houver algum
    if (boundsCoords.length > 0) {
        map.fitBounds(boundsCoords, { padding: [50, 50] }); // Adiciona um padding para não cortar os ícones
        console.log('[mapa.js] Zoom ajustado para mostrar todos os marcadores de rota.');
    } else {
         console.warn('[mapa.js] Nenhum marcador válido para ajustar o zoom.');
    }

}

// Desenha a linha da rota no mapa
function desenharRota(geometry) {
    if (!map) {
        console.error('[mapa.js] Mapa não inicializado. Não é possível desenhar a rota.');
        return;
    }
     if (!routeLayer) {
         console.error('[mapa.js] Camada de rota (routeLayer) não inicializada.');
         return;
    }
     if (!geometry || !Array.isArray(geometry) || geometry.length === 0) {
         console.warn('[mapa.js] Geometria da rota inválida ou vazia. Rota não será desenhada.');
         return;
     }

    console.log('[mapa.js] Desenhando a linha da rota...');
    // Limpa APENAS a camada da rota anterior
    routeLayer.clearLayers();

    // A API GraphHopper retorna [lon, lat], Leaflet usa [lat, lon]
    const latLngs = geometry.map(coord => {
        // Verifica se a coordenada é válida antes de inverter
        if (Array.isArray(coord) && coord.length === 2) {
             return [coord[1], coord[0]]; // Inverte para Lat, Lon
        }
        console.warn('[mapa.js] Coordenada inválida na geometria da rota:', coord);
        return null; // Retorna null para coordenadas inválidas
    }).filter(coord => coord !== null); // Remove quaisquer nulos resultantes


    if (latLngs.length > 0) {
         const polyline = L.polyline(latLngs, {
            color: '#007bff', // Azul Bootstrap
            weight: 6,        // Mais grossa
            opacity: 0.8,
            lineJoin: 'round',
            lineCap: 'round'  // Pontas arredondadas
        }).addTo(routeLayer); // Adiciona à CAMADA da rota

        // Ajusta o zoom para a rota (opcional, pode já ter sido ajustado pelos marcadores)
         map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
        console.log('[mapa.js] Linha da rota desenhada com sucesso!');
    } else {
         console.warn('[mapa.js] Nenhuma coordenada válida encontrada na geometria para desenhar a rota.');
    }
}

// Adiciona um marcador de POSTO de combustível ao mapa
function adicionarMarcadorPosto(lat, lon, nome) {
     if (!map) {
        console.error('[mapa.js] Mapa não inicializado. Não é possível adicionar marcador de posto.');
        return;
    }
    if (!markersLayer) {
         console.error('[mapa.js] Camada de marcadores (markersLayer) não inicializada.');
         return;
    }

     // Ícone para postos
     const iconePosto = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', // Ícone azul
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });

    console.log(`[mapa.js] Adicionando marcador de posto: ${nome || 'Desconhecido'} em [${lat}, ${lon}]`);
    L.marker([lat, lon], { icon: iconePosto })
        .bindPopup(`<b>${nome || "Posto de Combustível"}</b>`)
        .addTo(markersLayer); // Adiciona à MESMA camada de marcadores
}

// Função para limpar camadas específicas (útil ao trocar de aba ou iniciar nova busca)
function limparCamadasDoMapa(tipo = 'tudo') {
     if (!map) return;
     console.log(`[mapa.js] Limpando camadas do mapa: ${tipo}`);
     if (tipo === 'tudo' || tipo === 'rota') {
         routeLayer?.clearLayers();
     }
     if (tipo === 'tudo' || tipo === 'marcadores') {
         markersLayer?.clearLayers();
     }
}