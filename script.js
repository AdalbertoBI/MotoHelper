const GRAPHHOPPER_API_KEY = '55b67cde-e051-409f-9440-171f4d6f52e0'; // Chave válida fornecida
let mapaPronto = false;
let localizacaoAtual = null;
let cidadeAtual = 'São José dos Campos';
let paradasCount = 1;
let timeoutBusca = null;
let cacheBusca = {};
let rotaCoordenadas = [];
const COORDENADAS_PADRAO = { endereco: 'Parque Industrial, São José dos Campos, São Paulo', lat: -23.2582, lon: -45.8875 };
const MAX_CACHE_ENTRIES = 1000;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[script.js] DOM carregado. Iniciando aplicação...');
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.add(savedTheme + '-mode');
    document.getElementById('themeToggle').textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    
    await esperarLeaflet();
    inicializarMapa();
    if (typeof map !== 'undefined' && map) {
        mapaPronto = true;
        console.log('[script.js] Mapa inicializado com sucesso.');
    } else {
        console.error('[script.js] Falha ao inicializar o mapa.');
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            mapDiv.innerHTML = '<p style="color:red; font-weight:bold;">Erro ao carregar o mapa. Tente recarregar a página.</p>';
        }
    }

    configurarListeners();
    obterLocalizacaoAtual();
    limparCacheAntigo();
    console.log('[script.js] Inicialização concluída.');
});

function esperarLeaflet() {
    return new Promise((resolve, reject) => {
        const maxTentativas = 20;
        let tentativas = 0;
        const checkLeaflet = () => {
            if (typeof L !== 'undefined' && L.map) {
                console.log('[script.js] Leaflet carregado.');
                resolve();
            } else if (tentativas >= maxTentativas) {
                console.error('[script.js] Tempo esgotado para carregar Leaflet.');
                reject(new Error('Biblioteca Leaflet não carregada após timeout.'));
            } else {
                tentativas++;
                console.log(`[script.js] Aguardando Leaflet... (tentativa ${tentativas}/${maxTentativas})`);
                setTimeout(checkLeaflet, 150);
            }
        };
        checkLeaflet();
    });
}

function configurarListeners() {
    console.log('[script.js] Configurando listeners...');
    const btnAdicionarParada = document.getElementById('btnAdicionarParada');
    if (btnAdicionarParada) btnAdicionarParada.addEventListener('click', adicionarParada);
    else console.warn('[script.js] Botão #btnAdicionarParada não encontrado.');

    const btnCalcularRota = document.getElementById('btnCalcularRota');
    if (btnCalcularRota) btnCalcularRota.addEventListener('click', calcularRota);
    else console.warn('[script.js] Botão #btnCalcularRota não encontrado.');

    const btnGo = document.getElementById('btnGo');
    if (btnGo) btnGo.addEventListener('click', iniciarRota);
    else console.warn('[script.js] Botão #btnGo não encontrado.');

    const btnLimparCampos = document.getElementById('btnLimparCampos');
    if (btnLimparCampos) btnLimparCampos.addEventListener('click', limparCampos);
    else console.warn('[script.js] Botão #btnLimparCampos não encontrado.');

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDarkMode = !document.body.classList.contains('dark-mode');
            document.body.classList.remove('dark-mode', 'light-mode');
            document.body.classList.add(isDarkMode ? 'dark-mode' : 'light-mode');
            themeToggle.textContent = isDarkMode ? '🌙' : '☀️';
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            atualizarTilesMapa(isDarkMode);
            console.log('[script.js] Tema alternado para:', isDarkMode ? 'escuro' : 'claro');
        });
    } else {
        console.warn('[script.js] Botão #themeToggle não encontrado.');
    }

    configurarEventosBusca();
    console.log('[script.js] Listeners da aba Rotas configurados.');
}

function limparCampos() {
    document.getElementById('origem').value = '';
    document.getElementById('destino').value = '';
    document.getElementById('paradas').innerHTML = '';
    paradasCount = 1;
    limparCamadasDoMapa('tudo');
    document.getElementById('resultadoRota').innerHTML = '';
    rotaCoordenadas = [];
    console.log('[script.js] Campos limpos.');
}

function obterLocalizacaoAtual() {
    if (!navigator.geolocation) {
        console.warn('[script.js] Geolocalização não suportada.');
        usarLocalizacaoPadrao();
        return;
    }
    const carregandoDiv = document.getElementById('carregandoLocalizacao');
    if (carregandoDiv) carregandoDiv.style.display = 'block';
    console.log('[script.js] Tentando obter localização atual...');

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            localizacaoAtual = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            console.log('[script.js] Localização obtida:', localizacaoAtual);
            if (carregandoDiv) carregandoDiv.style.display = 'none';
            if (mapaPronto) {
                centralizarMapa(localizacaoAtual.lat, localizacaoAtual.lon);
            } else {
                inicializarMapa([localizacaoAtual.lat, localizacaoAtual.lon]);
                if (map) mapaPronto = true;
            }
            try {
                const enderecoFormatado = await obterEnderecoReverso(localizacaoAtual.lat, localizacaoAtual.lon);
                const origemInput = document.getElementById('origem');
                if (enderecoFormatado) {
                    const enderecoData = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${localizacaoAtual.lat}&lon=${localizacaoAtual.lon}&addressdetails=1&accept-language=pt-BR`).then(res => res.json());
                    cidadeAtual = enderecoData.address.city || enderecoData.address.town || enderecoData.address.village || 'São José dos Campos';
                    console.log('[script.js] Cidade atual definida:', cidadeAtual);
                    if (origemInput && !origemInput.value) {
                        origemInput.value = enderecoFormatado;
                    }
                } else {
                    if (origemInput && !origemInput.value) {
                        origemInput.value = 'Localização Atual';
                    }
                }
            } catch (error) {
                console.error('[script.js] Erro ao obter endereço reverso:', error);
                usarLocalizacaoPadrao();
            }
        },
        (error) => {
            console.error('[script.js] Erro na geolocalização:', error.message);
            if (carregandoDiv) carregandoDiv.style.display = 'none';
            alert(`Não foi possível obter sua localização: ${error.message}. Usando localização padrão.`);
            usarLocalizacaoPadrao();
        },
        { timeout: 15000, enableHighAccuracy: true, maximumAge: 60000 }
    );
}

function usarLocalizacaoPadrao() {
    localizacaoAtual = { lat: COORDENADAS_PADRAO.lat, lon: COORDENADAS_PADRAO.lon };
    cidadeAtual = 'São José dos Campos';
    console.log('[script.js] Usando localização padrão:', localizacaoAtual, 'Cidade:', cidadeAtual);
    if (mapaPronto) {
        centralizarMapa(localizacaoAtual.lat, localizacaoAtual.lon);
    } else {
        inicializarMapa([localizacaoAtual.lat, localizacaoAtual.lon]);
        if (map) mapaPronto = true;
    }
    const origemInput = document.getElementById('origem');
    if (origemInput && !origemInput.value) {
        origemInput.value = 'São José dos Campos, SP';
    }
}

async function obterEnderecoReverso(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=pt-BR`;
    console.log('[script.js] Obtendo endereço reverso para:', lat, lon);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Nominatim reverse API error! status: ${res.status}`);
        const data = await res.json();
        console.log('[script.js] Endereço reverso data:', data);
        return formatarEndereco(data.address);
    } catch (error) {
        console.error('[script.js] Falha na requisição de endereço reverso:', error);
        return null;
    }
}

function formatarEndereco(address) {
    if (!address) return '';
    const partes = [
        address.road,
        address.house_number,
        address.suburb,
        address.neighbourhood,
        address.city || address.town || address.village,
        address.state
    ];
    return partes.filter(p => p).join(', ');
}

function adicionarParada() {
    paradasCount++;
    const paradasDiv = document.getElementById('paradas');
    if (!paradasDiv) {
        console.error('[script.js] Div #paradas não encontrado.');
        return;
    }

    const novaParadaContainer = document.createElement('div');
    novaParadaContainer.className = 'form-group parada-container mb-2';

    const novaParadaInput = document.createElement('input');
    novaParadaInput.type = 'text';
    novaParadaInput.id = `parada${paradasCount}`;
    novaParadaInput.setAttribute('data-id', `parada${paradasCount}`);
    novaParadaInput.placeholder = `Parada ${paradasCount}`;
    novaParadaInput.className = 'form-control parada-input';
    novaParadaInput.setAttribute('list', `sugestoesParada${paradasCount}`);

    const novaParadaDatalist = document.createElement('datalist');
    novaParadaDatalist.id = `sugestoesParada${paradasCount}`;

    const btnRemover = document.createElement('button');
    btnRemover.type = 'button';
    btnRemover.textContent = '×';
    btnRemover.className = 'btn btn-danger btn-sm';
    btnRemover.style.marginLeft = '5px';
    btnRemover.onclick = () => paradasDiv.removeChild(novaParadaContainer);

    novaParadaContainer.appendChild(novaParadaInput);
    novaParadaContainer.appendChild(novaParadaDatalist);
    novaParadaContainer.appendChild(btnRemover);
    paradasDiv.appendChild(novaParadaContainer);
    configurarEventosBusca();
}

function configurarEventosBusca() {
    const inputs = document.querySelectorAll('input[data-id][list]');
    inputs.forEach(input => {
        const inputId = input.getAttribute('data-id');
        const datalistId = input.getAttribute('list');
        input.addEventListener('input', () => {
            clearTimeout(timeoutBusca);
            timeoutBusca = setTimeout(() => buscarSugestoes(inputId, datalistId), 400);
        });
    });
}

async function buscarSugestoes(inputId, datalistId) {
    const inputElement = document.getElementById(inputId);
    const datalistElement = document.getElementById(datalistId);
    const buscandoDiv = document.getElementById('buscandoSugestoes');
    if (!inputElement || !datalistElement) return;

    const entrada = inputElement.value.trim();
    if (entrada.length < 3 && !isCoordenada(entrada)) {
        datalistElement.innerHTML = '';
        return;
    }

    if (isCoordenada(entrada)) {
        const [lat, lon] = entrada.split(',').map(v => parseFloat(v.trim()));
        datalistElement.innerHTML = `<option value="${entrada}">Coordenadas: ${lat}, ${lon}</option>`;
        return;
    }

    const cacheKey = `sug_${entrada.toLowerCase()}_${cidadeAtual.toLowerCase()}`;
    if (cacheBusca[cacheKey]) {
        preencherDatalist(datalistId, cacheBusca[cacheKey]);
        return;
    }

    if (buscandoDiv) buscandoDiv.style.display = 'inline';
    try {
        let query = encodeURIComponent(entrada);
        if (cidadeAtual) query += `,${encodeURIComponent(cidadeAtual)}`;
        const viewboxParam = localizacaoAtual
            ? `&viewbox=${localizacaoAtual.lon - 0.5},${localizacaoAtual.lat + 0.5},${localizacaoAtual.lon + 0.5},${localizacaoAtual.lat - 0.5}&bounded=1`
            : '';
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=10&addressdetails=1&countrycodes=BR${viewboxParam}&namedetails=1&accept-language=pt-BR`;
        console.log('[script.js] Buscando sugestões:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Nominatim suggestions API error! status: ${res.status}`);
        const data = await res.json();
        const sugestoes = data.map(item => ({
            display_name: item.display_name,
            type: item.type,
            category: item.category
        }));
        cacheBusca[cacheKey] = sugestoes;
        salvarCache();
        preencherDatalist(datalistId, sugestoes);
    } catch (error) {
        console.error('[script.js] Erro ao buscar sugestões:', error);
        datalistElement.innerHTML = `<option value="">Erro ao buscar sugestões</option>`;
    } finally {
        if (buscandoDiv) buscandoDiv.style.display = 'none';
    }
}

function preencherDatalist(datalistId, sugestoes) {
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;
    datalist.innerHTML = '';
    sugestoes.forEach(sugestao => {
        const option = document.createElement('option');
        const label = typeof sugestao === 'string' ? sugestao : `${sugestao.display_name} (${sugestao.category}/${sugestao.type})`;
        option.value = typeof sugestao === 'string' ? sugestao : sugestao.display_name;
        option.textContent = label;
        datalist.appendChild(option);
    });
}

function isCoordenada(entrada) {
    const regex = /^-?\d+\.\d+,-?\d+\.\d+$/;
    if (!regex.test(entrada)) return false;
    const [lat, lon] = entrada.split(',').map(v => parseFloat(v));
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

async function geocodificar(endereco) {
    if (!endereco || typeof endereco !== 'string') {
        throw new Error('Endereço inválido ou vazio.');
    }
    
    if (isCoordenada(endereco)) {
        const [lat, lon] = endereco.split(',').map(v => parseFloat(v));
        return [lat, lon];
    }

    let enderecoLimpo = endereco.trim().replace(/\s*\([^)]*\)$/, '').replace(/,\s*\d{5}-\d{3},\s*Brasil$/, '');
    if (cidadeAtual) enderecoLimpo += `, ${cidadeAtual}`;
    if (!enderecoLimpo) {
        throw new Error('Endereço vazio após limpeza.');
    }
    const cacheKey = `geo_${enderecoLimpo.toLowerCase()}`;
    if (cacheBusca[cacheKey]) {
        console.log('[script.js] Usando cache para:', enderecoLimpo);
        return cacheBusca[cacheKey];
    }

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoLimpo)}&limit=1&countrycodes=BR&addressdetails=1&accept-language=pt-BR`;
        console.log('[script.js] Geocoding URL:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Nominatim geocoding API error! status: ${res.status}`);
        const data = await res.json();
        if (data.length === 0) throw new Error(`Endereço não encontrado: "${enderecoLimpo}"`);
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (isNaN(lat) || isNaN(lon)) throw new Error(`Coordenadas inválidas para "${enderecoLimpo}"`);
        const coordenadas = [lat, lon];
        cacheBusca[cacheKey] = coordenadas;
        salvarCache();
        return coordenadas;
    } catch (error) {
        console.error(`[script.js] Erro na geocodificação de "${enderecoLimpo}":`, error);
        throw error;
    }
}

function limparCacheAntigo() {
    const entries = Object.keys(cacheBusca);
    if (entries.length > MAX_CACHE_ENTRIES) {
        const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
        toRemove.forEach(key => delete cacheBusca[key]);
        salvarCache();
        console.log('[script.js] Cache limpo, removidas', toRemove.length, 'entradas.');
    }
}

function salvarCache() {
    try {
        localStorage.setItem('cacheBusca', JSON.stringify(cacheBusca));
    } catch (e) {
        console.warn('[script.js] Não foi possível salvar cache:', e);
        if (e.name === 'QuotaExceededError') {
            cacheBusca = {};
            localStorage.removeItem('cacheBusca');
        }
    }
}

async function calcularRota() {
    console.log('[script.js] Iniciando cálculo de rota...');
    if (!mapaPronto || !map) {
        alert('O mapa não está pronto. Tente recarregar a página.');
        return;
    }

    const origemInput = document.getElementById('origem');
    const destinoInput = document.getElementById('destino');
    const resultadoRotaDiv = document.getElementById('resultadoRota');

    if (!origemInput || !destinoInput || !resultadoRotaDiv) {
        console.error('[script.js] Elementos do DOM ausentes!');
        alert('Erro interno: Elementos da página ausentes. Recarregue.');
        return;
    }

    const origem = origemInput.value.trim();
    const destino = destinoInput.value.trim();
    const paradas = Array.from(document.querySelectorAll('.parada-input'))
        .map(input => input.value.trim())
        .filter(val => val);

    if (!origem || !destino) {
        alert('Preencha os campos de Origem e Destino!');
        return;
    }

    resultadoRotaDiv.innerHTML = '<div class="loading">Calculando... Geocodificando endereços...</div>';
    limparCamadasDoMapa('tudo');

    try {
        const promessasGeocodificacao = [
            origem.toLowerCase() === 'localização atual' && localizacaoAtual
                ? Promise.resolve([localizacaoAtual.lat, localizacaoAtual.lon])
                : geocodificar(origem),
            ...paradas.map(p => geocodificar(p)),
            geocodificar(destino)
        ];

        const todosResultadosCoords = await Promise.allSettled(promessasGeocodificacao);
        const coordsParaApi = [];
        const falhasGeocodificacao = [];

        if (todosResultadosCoords[0].status === 'fulfilled' && todosResultadosCoords[0].value) {
            coordsParaApi.push(todosResultadosCoords[0].value);
        } else {
            falhasGeocodificacao.push(`Origem (${origem}): ${todosResultadosCoords[0].reason?.message || 'Falha'}`);
        }

        todosResultadosCoords.slice(1, -1).forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                coordsParaApi.push(result.value);
            } else {
                falhasGeocodificacao.push(`Parada ${index + 1} (${paradas[index]}): ${result.reason?.message || 'Falha'}`);
            }
        });

        const indiceDestino = todosResultadosCoords.length - 1;
        if (todosResultadosCoords[indiceDestino].status === 'fulfilled' && todosResultadosCoords[indiceDestino].value) {
            coordsParaApi.push(todosResultadosCoords[indiceDestino].value);
        } else {
            falhasGeocodificacao.push(`Destino (${destino}): ${todosResultadosCoords[indiceDestino].reason?.message || 'Falha'}`);
        }

        if (todosResultadosCoords[0].status === 'rejected' || todosResultadosCoords[indiceDestino].status === 'rejected') {
            throw new Error(`Não foi possível encontrar coordenadas:\n- ${falhasGeocodificacao.join('\n- ')}`);
        }

        if (falhasGeocodificacao.length > 0) {
            alert(`Atenção: Ignorando pontos não encontrados:\n- ${falhasGeocodificacao.join('\n- ')}`);
        }

        if (coordsParaApi.length < 2) {
            throw new Error('Coordenadas insuficientes para calcular a rota.');
        }

        rotaCoordenadas = coordsParaApi;
        console.log('[script.js] Coordenadas válidas para API:', coordsParaApi);
        resultadoRotaDiv.innerHTML = '<div class="loading">Calculando rota via GraphHopper...</div>';

        const pointsQuery = coordsParaApi.map(coord => `point=${coord[0]},${coord[1]}`).join('&');
        const url = `https://graphhopper.com/api/1/route?${pointsQuery}&vehicle=car&locale=pt-BR&points_encoded=false&instructions=true&key=${GRAPHHOPPER_API_KEY}`;
        console.log('[script.js] URL GraphHopper:', url);

        const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
        console.log('[script.js] Resposta GraphHopper, status:', response.status);

        if (!response.ok) {
            let errorMsg = `Erro na API GraphHopper: ${response.status}`;
            if (response.status === 401) {
                errorMsg = 'Chave da API GraphHopper inválida. Obtenha uma nova chave em https://graphhopper.com/dashboard/api-keys.';
            } else {
                try {
                    const errorData = await response.json();
                    errorMsg += ` - ${errorData.message || JSON.stringify(errorData)}`;
                } catch (e) {
                    errorMsg += ` - ${response.statusText}`;
                }
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log('[script.js] Dados GraphHopper:', data);
        processarRespostaRota(data, coordsParaApi);
    } catch (error) {
        console.error('[script.js] Erro no cálculo da rota:', error);
        resultadoRotaDiv.innerHTML = `<div class="error"><b>Erro ao calcular a rota:</b><br>${error.message}.<br>Verifique os endereços e conexão.</div>`;
        limparCamadasDoMapa('tudo');
    }
}

function processarRespostaRota(data, coordsUtilizadas) {
    if (data.paths && data.paths.length > 0) {
        const path = data.paths[0];
        if (typeof path.distance !== 'number') {
            throw new Error('Rota inválida (sem distância).');
        }
        if (!path.points || !path.points.coordinates || path.points.coordinates.length === 0) {
            console.warn('[script.js] Sem geometria na rota.');
        }

        const distancia = path.distance / 1000;
        const tempoSegundos = path.time / 1000;
        const tempoFormatado = formatarTempo(tempoSegundos);
        const geometry = path.points?.coordinates;

        console.log(`[script.js] Rota encontrada! Distância: ${distancia.toFixed(2)} km, Tempo: ${tempoFormatado}`);
        const coordsOrigem = coordsUtilizadas[0];
        const coordsDestino = coordsUtilizadas[coordsUtilizadas.length - 1];
        const coordsParadas = coordsUtilizadas.slice(1, -1);
        adicionarMarcadores(coordsOrigem, coordsParadas, coordsDestino);
        if (geometry) desenharRota(geometry);

        const kmPorLitro = parseFloat(localStorage.getItem('kmPorLitro')) || 0;
        const precoPorLitro = parseFloat(localStorage.getItem('precoPorLitro')) || 0;
        let infoCombustivelHTML = '<p class="text-muted"><small>Configure Km/Litro e Preço/Litro na aba "Financeiro".</small></p>';
        if (kmPorLitro > 0) {
            const litros = distancia / kmPorLitro;
            infoCombustivelHTML = `<p><strong>Combustível estimado:</strong> ${litros.toFixed(2)} litros</p>`;
            if (precoPorLitro > 0) {
                const custoCombustivel = litros * precoPorLitro;
                infoCombustivelHTML += `<p><strong>Custo estimado:</strong> R$ ${custoCombustivel.toFixed(2)}</p>`;
            } else {
                infoCombustivelHTML += `<p class="text-muted"><small>Configure Preço/Litro para custo total.</small></p>`;
            }
        }

        let resultadoHTML = `<h3>Resultados da Rota</h3>
                            <p><strong>Distância Total:</strong> ${distancia.toFixed(2)} km</p>
                            <p><strong>Tempo Estimado:</strong> ${tempoFormatado}</p>
                            ${infoCombustivelHTML}`;
        if (path.instructions && path.instructions.length > 0) {
            resultadoHTML += `<h4 class="mt-3">Instruções de Rota:</h4><ol class="list-group list-group-flush">`;
            path.instructions.forEach(step => {
                const distanciaInstrucaoKm = (step.distance / 1000).toFixed(2);
                resultadoHTML += `<li class="list-group-item" style="font-size: 0.9em;">${step.text} <span class="text-muted">(${distanciaInstrucaoKm} km)</span></li>`;
            });
            resultadoHTML += `</ol>`;
        } else {
            resultadoHTML += `<p class="text-muted mt-2"><em>Instruções não disponíveis.</em></p>`;
        }

        document.getElementById('resultadoRota').innerHTML = resultadoHTML;
    } else {
        console.warn('[script.js] Nenhuma rota encontrada:', data);
        throw new Error(`Nenhuma rota encontrada. ${data.message || ''}`);
    }
}

function formatarTempo(totalSegundos) {
    if (isNaN(totalSegundos) || totalSegundos < 0) return 'N/A';
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = Math.floor(totalSegundos % 60);
    let resultado = '';
    if (horas > 0) resultado += `${horas}h `;
    if (minutos > 0 || horas > 0) resultado += `${minutos}min `;
    if (horas === 0 && minutos < 5) resultado += `${segundos}s`;
    return resultado.trim() || 'Menos de 1 min';
}

function iniciarRota() {
    if (!rotaCoordenadas || rotaCoordenadas.length < 2) {
        alert('Nenhuma rota calculada. Por favor, calcule uma rota primeiro.');
        return;
    }

    const origemCoord = rotaCoordenadas[0];
    const destinoCoord = rotaCoordenadas[rotaCoordenadas.length - 1];
    const waypointsCoord = rotaCoordenadas.slice(1, -1);
    const origemParam = `${origemCoord[0]},${origemCoord[1]}`;
    const destinoParam = `${destinoCoord[0]},${destinoCoord[1]}`;
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origemParam}&destination=${destinoParam}&travelmode=driving`;

    if (waypointsCoord.length > 0) {
        const waypointsParam = waypointsCoord.map(coord => `${coord[0]},${coord[1]}`).join('|');
        url += `&waypoints=${waypointsParam}`;
    }

    console.log('[script.js] Google Maps URL:', url);
    window.open(url, '_blank');
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