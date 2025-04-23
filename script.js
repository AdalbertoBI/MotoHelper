let paradasCount = 1;
let ultimaBusca = 0;
let localizacaoAtual = null;
let cacheBusca = JSON.parse(localStorage.getItem('cacheBusca')) || {};
let rotaCoordenadas = [];

document.addEventListener('DOMContentLoaded', () => {
    carregarGastos();
    carregarKmPorLitro();
    carregarPrecoPorLitro();

    const btnAdicionarParada = document.getElementById('btnAdicionarParada');
    if (btnAdicionarParada) {
        btnAdicionarParada.addEventListener('click', adicionarParada);
    } else {
        console.error('Botão "Adicionar Parada" não encontrado!');
    }

    configurarEventosBusca();
    obterLocalizacaoAtual();
});

function configurarEventosBusca() {
    const inputs = document.querySelectorAll('input[data-id]');
    inputs.forEach(input => {
        const inputId = input.getAttribute('data-id');
        const datalistId = `sugestoes${inputId.charAt(0).toUpperCase() + inputId.slice(1)}`;
        input.addEventListener('input', () => buscarSugestoes(inputId, datalistId));
    });
}

function adicionarParada() {
    paradasCount++;
    const paradasDiv = document.getElementById('paradas');
    const novaParada = document.createElement('input');
    novaParada.type = 'text';
    novaParada.id = `parada${paradasCount}`;
    novaParada.setAttribute('data-id', `parada${paradasCount}`);
    novaParada.placeholder = `Parada ${paradasCount} (opcional)`;
    novaParada.className = 'form-control mb-2';
    novaParada.setAttribute('list', `sugestoesParada${paradasCount}`);
    const novaDatalist = document.createElement('datalist');
    novaDatalist.id = `sugestoesParada${paradasCount}`;
    paradasDiv.appendChild(novaParada);
    paradasDiv.appendChild(novaDatalist);

    configurarEventosBusca();
}

function obterLocalizacaoAtual() {
    if (!navigator.geolocation) {
        console.error('Geolocalização não suportada pelo navegador.');
        inicializarMapa(null); // Usa fallback
        return;
    }

    document.getElementById('carregandoLocalizacao').style.display = 'block';
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            localizacaoAtual = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
            };
            console.log('Localização atual:', localizacaoAtual);

            // Inicializa o mapa com a localização atual
            inicializarMapa([localizacaoAtual.lat, localizacaoAtual.lon]);

            try {
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${localizacaoAtual.lat}&lon=${localizacaoAtual.lon}&addressdetails=1`;
                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error(`Erro na geocodificação reversa: ${res.status} - ${res.statusText}`);
                }
                const data = await res.json();
                const enderecoFormatado = formatarEndereco(data.address);
                document.getElementById('origem').value = enderecoFormatado;
            } catch (error) {
                console.error('Erro ao obter endereço da localização atual:', error);
                document.getElementById('origem').value = '';
            } finally {
                document.getElementById('carregandoLocalizacao').style.display = 'none';
            }
        },
        (error) => {
            console.error('Erro ao obter localização atual:', error);
            inicializarMapa(null); // Usa fallback
            document.getElementById('carregandoLocalizacao').style.display = 'none';
        }
    );
}

function formatarEndereco(address, numero = '') {
    const rua = address.road || '';
    const numeroFinal = numero || address.house_number || '';
    const bairro = address.suburb || address.neighbourhood || '';
    const cidade = address.city || address.town || address.village || '';
    const estado = address.state || '';

    const partes = [];
    if (rua) partes.push(rua);
    if (numeroFinal) partes.push(numeroFinal);
    if (bairro) partes.push(bairro);
    if (cidade) partes.push(cidade);
    if (estado) partes.push(estado);

    return partes.join(', ');
}

async function buscarSugestoes(inputId, datalistId) {
    const agora = Date.now();
    if (agora - ultimaBusca < 500) return;
    ultimaBusca = agora;

    const endereco = document.getElementById(inputId).value.trim();
    if (!endereco || endereco.length < 3) {
        document.getElementById(datalistId).innerHTML = '';
        return;
    }

    console.log(`Buscando sugestões para: ${endereco}`);

    if (cacheBusca[endereco]) {
        console.log('Resultado encontrado no cache:', cacheBusca[endereco]);
        const datalist = document.getElementById(datalistId);
        datalist.innerHTML = '';
        cacheBusca[endereco].forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            datalist.appendChild(option);
        });
        return;
    }

    try {
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=5&addressdetails=1&countrycodes=BR&accept-language=pt`;
        
        if (localizacaoAtual) {
            const { lat, lon } = localizacaoAtual;
            const viewbox = `${lon - 0.1},${lat + 0.1},${lon + 0.1},${lat - 0.1}`;
            url += `&viewbox=${viewbox}&bounded=1`;
        }

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Erro na busca de sugestões: ${res.status} - ${res.statusText}`);
        }
        const data = await res.json();

        console.log('Resultados brutos do Nominatim:', data);

        const sugestoesMap = new Map();
        const numeroMatch = endereco.match(/\b\d+\b/);
        const numero = numeroMatch ? numeroMatch[0] : '';
        const isPar = numero ? parseInt(numero) % 2 === 0 : null;

        for (const item of data) {
            if (item.address && (item.address.road || item.type === 'highway')) {
                let sugestaoBase = formatarEndereco(item.address);
                const ruaNumeroKey = `${item.address.road}, ${numero || item.address.house_number || ''}`.trim();

                if (!sugestoesMap.has(ruaNumeroKey) || parseFloat(item.importance) > parseFloat(sugestoesMap.get(ruaNumeroKey).importance)) {
                    sugestoesMap.set(ruaNumeroKey, { sugestao: sugestaoBase, importance: item.importance });
                }

                if (numero && !item.address.house_number) {
                    const numerosProximos = [];
                    for (let i = 0; i <= 2; i += 2) {
                        const numMenor = parseInt(numero) - i;
                        const numMaior = parseInt(numero) + i;
                        if (numMenor > 0 && (numMenor % 2 === (isPar ? 0 : 1))) {
                            numerosProximos.push(numMenor.toString());
                        }
                        if (numMaior % 2 === (isPar ? 0 : 1)) {
                            numerosProximos.push(numMaior.toString());
                        }
                    }

                    numerosProximos.forEach(num => {
                        const sugestaoComNumero = formatarEndereco(item.address, num);
                        const keyComNumero = `${item.address.road}, ${num}`.trim();
                        if (!sugestoesMap.has(keyComNumero) || parseFloat(item.importance) > parseFloat(sugestoesMap.get(keyComNumero).importance)) {
                            sugestoesMap.set(keyComNumero, { sugestao: sugestaoComNumero, importance: item.importance });
                        }
                    });
                }
            }
        }

        const sugestoes = Array.from(sugestoesMap.values()).map(entry => entry.sugestao);

        cacheBusca[endereco] = sugestoes;
        localStorage.setItem('cacheBusca', JSON.stringify(cacheBusca));

        const datalist = document.getElementById(datalistId);
        datalist.innerHTML = '';
        sugestoes.forEach(sugestao => {
            const option = document.createElement('option');
            option.value = sugestao;
            datalist.appendChild(option);
        });

        console.log('Sugestões exibidas:', sugestoes);
    } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        alert("Não foi possível buscar sugestões de endereço. Verifique sua conexão e tente novamente.");
    }
}

async function geocodificar(endereco) {
    if (!endereco) return null;
    try {
        const numeroMatch = endereco.match(/\b\d+\b/);
        const numeroOriginal = numeroMatch ? parseInt(numeroMatch[0]) : null;
        const isPar = numeroOriginal ? numeroOriginal % 2 === 0 : null;
        let enderecoBase = endereco;

        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoBase)}&limit=5&addressdetails=1&countrycodes=BR`;
        let res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Erro na geocodificação: ${res.status} - ${res.statusText}`);
        }
        let data = await res.json();

        console.log(`Resultados do Nominatim para geocodificação de "${enderecoBase}":`, data);

        let bestResult = null;
        let highestImportance = -1;

        for (const item of data) {
            if (item.address && (item.address.road || item.type === 'highway')) {
                const coords = [parseFloat(item.lat), parseFloat(item.lon)];
                const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}&addressdetails=1`;
                const reverseRes = await fetch(reverseUrl);
                if (!reverseRes.ok) {
                    continue;
                }
                const reverseData = await reverseRes.json();
                if (reverseData.address && (reverseData.address.road || reverseData.address.highway)) {
                    const importance = parseFloat(item.importance) || 0;
                    if (importance > highestImportance) {
                        bestResult = coords;
                        highestImportance = importance;
                    }
                }
            }
        }

        if (bestResult) {
            console.log(`Geocodificação bem-sucedida para "${enderecoBase}": ${bestResult}`);
            return bestResult;
        }

        if (numeroOriginal && isPar !== null) {
            const numerosProximos = [];
            for (let i = 2; i <= 10; i += 2) {
                const numMenor = numeroOriginal - i;
                const numMaior = numeroOriginal + i;
                if (numMenor > 0 && (numMenor % 2 === (isPar ? 0 : 1))) {
                    numerosProximos.push(numMenor.toString());
                }
                if (numMaior % 2 === (isPar ? 0 : 1)) {
                    numerosProximos.push(numMaior.toString());
                }
            }

            for (const num of numerosProximos) {
                enderecoBase = endereco.replace(/\b\d+\b/, num);
                url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoBase)}&limit=5&addressdetails=1&countrycodes=BR`;
                res = await fetch(url);
                if (!res.ok) {
                    continue;
                }
                data = await res.json();

                highestImportance = -1;
                for (const item of data) {
                    if (item.address && (item.address.road || item.type === 'highway')) {
                        const coords = [parseFloat(item.lat), parseFloat(item.lon)];
                        const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}&addressdetails=1`;
                        const reverseRes = await fetch(reverseUrl);
                        if (!reverseRes.ok) {
                            continue;
                        }
                        const reverseData = await reverseRes.json();
                        if (reverseData.address && (reverseData.address.road || reverseData.address.highway)) {
                            const importance = parseFloat(item.importance) || 0;
                            if (importance > highestImportance) {
                                bestResult = coords;
                                highestImportance = importance;
                            }
                        }
                    }
                }
                if (bestResult) {
                    console.log(`Geocodificação bem-sucedida para "${enderecoBase}": ${bestResult}`);
                    break;
                }
            }
        }

        if (bestResult) return bestResult;

        const enderecoSemNumero = endereco.replace(/\b\d+\b,?\s*/, '').trim();
        url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoSemNumero)}&limit=5&addressdetails=1&countrycodes=BR`;
        res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Erro na geocodificação (sem número): ${res.status} - ${res.statusText}`);
        }
        data = await res.json();

        highestImportance = -1;
        for (const item of data) {
            if (item.address && (item.address.road || item.type === 'highway')) {
                const coords = [parseFloat(item.lat), parseFloat(item.lon)];
                const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}&addressdetails=1`;
                const reverseRes = await fetch(reverseUrl);
                if (!reverseRes.ok) {
                    continue;
                }
                const reverseData = await reverseRes.json();
                if (reverseData.address && (reverseData.address.road || reverseData.address.highway)) {
                    const importance = parseFloat(item.importance) || 0;
                    if (importance > highestImportance) {
                        bestResult = coords;
                        highestImportance = importance;
                    }
                }
            }
        }

        if (bestResult) {
            console.log(`Geocodificação bem-sucedida para "${enderecoSemNumero}": ${bestResult}`);
            return bestResult;
        }

        const partes = endereco.split(',');
        const ruaCidadeEstado = partes.filter(part => !part.match(/\b\d+\b/)).slice(0, 3).join(', ').trim();
        url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ruaCidadeEstado)}&limit=5&addressdetails=1&countrycodes=BR`;
        res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Erro na geocodificação (rua, cidade, estado): ${res.status} - ${res.statusText}`);
        }
        data = await res.json();

        highestImportance = -1;
        for (const item of data) {
            if (item.address && (item.address.road || item.type === 'highway')) {
                const coords = [parseFloat(item.lat), parseFloat(item.lon)];
                const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}&addressdetails=1`;
                const reverseRes = await fetch(reverseUrl);
                if (!reverseRes.ok) {
                    continue;
                }
                const reverseData = await reverseRes.json();
                if (reverseData.address && (reverseData.address.road || reverseData.address.highway)) {
                    const importance = parseFloat(item.importance) || 0;
                    if (importance > highestImportance) {
                        bestResult = coords;
                        highestImportance = importance;
                    }
                }
            }
        }

        if (bestResult) {
            console.log(`Geocodificação bem-sucedida para "${ruaCidadeEstado}": ${bestResult}`);
            return bestResult;
        }

        throw new Error(`O endereço "${endereco}" não está próximo de uma rua roteável. Tente um endereço mais genérico, como apenas a rua e a cidade (ex.: "Rua Bacabal, São José dos Campos, São Paulo"), ou use as sugestões da lista de autocompletar.`);
    } catch (error) {
        console.error('Erro na geocodificação:', error);
        throw new Error(error.message || "Não foi possível geocodificar o endereço. Tente usar uma sugestão da lista ou verifique sua conexão.");
    }
}

async function calcularRota() {
    document.getElementById('botaoIniciarRota').style.display = 'none';

    const origem = document.getElementById('origem').value;
    const destino = document.getElementById('destino').value;
    const paradas = [];
    for (let i = 1; i <= paradasCount; i++) {
        const parada = document.getElementById(`parada${i}`).value;
        if (parada) paradas.push(parada);
    }

    if (!origem || !destino) {
        alert("Preencha a origem e o destino!");
        return;
    }

    try {
        const coordsOrigem = await geocodificar(origem);
        const coordsDestino = await geocodificar(destino);
        const coordsParadas = await Promise.all(paradas.map(async (parada, index) => {
            const coords = await geocodificar(parada);
            if (!coords) throw new Error(`Endereço inválido: ${parada} (Parada ${index + 1})`);
            return coords;
        }));

        if (!coordsOrigem || !coordsDestino || coordsParadas.includes(null)) {
            throw new Error("Um ou mais endereços não foram encontrados. Use as sugestões da lista de autocompletar.");
        }

        const coords = [coordsOrigem, ...coordsParadas, coordsDestino];
        console.log('Coordenadas enviadas ao OpenRouteService:', coords);

        rotaCoordenadas = coords;

        const apiKey = '5b3ce3597851110001cf62488d59f67c5c15452c92c89eb27e1004c6';
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}`;
        const body = {
            coordinates: coords,
            units: 'km',
            instructions: true,
            extra_info: ['waytype']
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            const errorData = JSON.parse(errorText);
            if (errorData.error && errorData.error.code === 2010) {
                const coordIndex = parseInt(errorData.error.message.match(/coordinate (\d+)/)?.[1] || 0);
                const enderecoProblema = coordIndex === 0 ? origem : (coordIndex <= paradas.length ? paradas[coordIndex - 1] : destino);
                throw new Error(`Não foi possível encontrar uma rota para o endereço "${enderecoProblema}". Ele pode estar em uma área sem ruas próximas. Tente um endereço mais genérico, como apenas a rua e a cidade (ex.: "Rua Bacabal, São José dos Campos, São Paulo"), ou use as sugestões da lista de autocompletar.`);
            }
            throw new Error(`Erro na API OpenRouteService: ${res.status} - ${errorText}. Tente novamente ou verifique os endereços.`);
        }

        const data = await res.json();

        if (data.features && data.features.length > 0) {
            const distancia = data.features[0].properties.segments.reduce((sum, seg) => sum + seg.distance, 0);
            const geometry = data.features[0].geometry.coordinates;

            // Adiciona marcadores e desenha a rota
            adicionarMarcadores(coordsOrigem, coordsParadas, coordsDestino);
            desenharRota(geometry);

            const kmPorLitro = parseFloat(localStorage.getItem('kmPorLitro')) || 0;
            const precoPorLitro = parseFloat(localStorage.getItem('precoPorLitro')) || 0;
            const litros = kmPorLitro > 0 ? distancia / kmPorLitro : 0;
            const custoCombustivel = litros * precoPorLitro;

            let resultado = `Distância: ${distancia.toFixed(2)} km<br>`;
            if (kmPorLitro > 0) {
                resultado += `Combustível estimado: ${litros.toFixed(2)} litros<br>`;
                if (precoPorLitro > 0) {
                    resultado += `Custo do combustível: R$${custoCombustivel.toFixed(2)}<br>`;
                } else {
                    resultado += 'Defina o preço por litro na aba Gastos.<br>';
                }
            } else {
                resultado += 'Defina o km/litro na aba Gastos.<br>';
            }

            const waytypes = data.features[0].properties.extras.waytype;
            if (waytypes) {
                resultado += '<b>Tipos de estrada:</b><br>';
                waytypes.values.forEach(val => {
                    const [start, end, type] = val;
                    resultado += `- Segmento ${start}-${end}: ${type}<br>`;
                });
            }

            document.getElementById('resultadoRota').innerHTML = resultado;
            document.getElementById('botaoIniciarRota').style.display = 'block';

            const instrucoesDiv = document.getElementById('instrucoesRota');
            instrucoesDiv.innerHTML = '<b>Instruções de Navegação:</b><br>';
            const instrucoes = data.features[0].properties.segments[0].steps || [];
            instrucoes.forEach(step => {
                const li = document.createElement('div');
                li.textContent = `${step.instruction} (${step.distance} km)`;
                instrucoesDiv.appendChild(li);
            });
        } else {
            throw new Error("Nenhuma rota encontrada. Verifique os endereços ou tente outro trajeto.");
        }
    } catch (error) {
        console.error('Erro ao calcular a rota:', error);
        alert(`Erro: ${error.message}\nSugestão: Use os endereços sugeridos pela lista de autocompletar ou simplifique o endereço (ex.: apenas rua, cidade e estado).`);
    }
}

function iniciarRota() {
    if (!rotaCoordenadas || rotaCoordenadas.length < 2) {
        alert("Nenhuma rota disponível para iniciar. Calcule a rota primeiro.");
        return;
    }

    let googleMapsUrl = 'https://www.google.com/maps/dir/';
    rotaCoordenadas.forEach((coord, index) => {
        googleMapsUrl += `${coord[0]},${coord[1]}/`;
    });

    let wazeUrl = 'https://waze.com/ul?';
    if (rotaCoordenadas.length === 2) {
        wazeUrl += `ll=${rotaCoordenadas[1][0]},${rotaCoordenadas[1][1]}&from=${rotaCoordenadas[0][0]},${rotaCoordenadas[0][1]}&navigate=yes`;
    } else {
        wazeUrl += `ll=${rotaCoordenadas[rotaCoordenadas.length - 1][0]},${rotaCoordenadas[rotaCoordenadas.length - 1][1]}&from=${rotaCoordenadas[0][0]},${rotaCoordenadas[0][1]}&navigate=yes`;
    }

    window.location.href = googleMapsUrl;
    setTimeout(() => {
        window.location.href = wazeUrl;
    }, 1000);
}

function calcularFrete() {
    const km = parseFloat(document.getElementById('km').value);
    const peso = parseFloat(document.getElementById('peso').value);
    const valorFrete = (km * 1.5) + (peso * 0.5);
    document.getElementById('resultadoFrete').innerText = `Valor do Frete: R$${valorFrete.toFixed(2)}`;
}

function buscarPostos() {
    if (!navigator.geolocation) {
        alert("GPS não suportado.");
        return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        inicializarMapaPostos(lat, lng);

        fetch(`https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="fuel"](around:5000,${lat},${lng});out;`)
            .then(res => res.json())
            .then(data => {
                const postos = data.elements;
                const listaPostos = document.getElementById('listaPostos');
                listaPostos.innerHTML = "";

                postos.forEach(posto => {
                    adicionarMarcadorPosto(posto.lat, posto.lon, posto.tags?.name);

                    const li = document.createElement('li');
                    li.textContent = posto.tags?.name || "Posto sem nome";
                    listaPostos.appendChild(li);
                });
            });
    });
}

function salvarGasto() {
    const tipo = document.getElementById('tipoGasto').value;
    const valor = parseFloat(document.getElementById('valorGasto').value);

    if (!tipo || isNaN(valor)) {
        alert("Preencha todos os campos!");
        return;
    }

    const gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    gastos.push({ tipo, valor, data: new Date().toLocaleDateString() });
    localStorage.setItem('gastos', JSON.stringify(gastos));

    carregarGastos();
    document.getElementById('tipoGasto').value = "";
    document.getElementById('valorGasto').value = "";
}

function carregarGastos() {
    const gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    const listaGastos = document.getElementById('listaGastos');
    listaGastos.innerHTML = "";

    let total = 0;
    gastos.forEach(gasto => {
        total += gasto.valor;
        const li = document.createElement('li');
        li.textContent = `${gasto.data}: ${gasto.tipo} - R$${gasto.valor.toFixed(2)}`;
        listaGastos.appendChild(li);
    });

    document.getElementById('totalGastos').textContent = total.toFixed(2);
}

function salvarKmPorLitro() {
    const kmPorLitro = parseFloat(document.getElementById('kmPorLitro').value);
    if (isNaN(kmPorLitro) || kmPorLitro <= 0) {
        alert("Digite um valor válido para km/litro!");
        return;
    }
    localStorage.setItem('kmPorLitro', kmPorLitro);
    carregarKmPorLitro();
}

function carregarKmPorLitro() {
    const kmPorLitro = localStorage.getItem('kmPorLitro') || '';
    document.getElementById('kmPorLitro').value = kmPorLitro;
}

function salvarPrecoPorLitro() {
    const precoPorLitro = parseFloat(document.getElementById('precoPorLitro').value);
    if (isNaN(precoPorLitro) || precoPorLitro <= 0) {
        alert("Digite um valor válido para o preço por litro!");
        return;
    }
    localStorage.setItem('precoPorLitro', precoPorLitro);
    carregarPrecoPorLitro();
}

function carregarPrecoPorLitro() {
    const precoPorLitro = localStorage.getItem('precoPorLitro') || '';
    document.getElementById('precoPorLitro').value = precoPorLitro;
}

function enviarSOS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            alert(`SOS ENVIADO! Localização: ${lat}, ${lng}`);
        });
    } else {
        alert("Seu navegador não suporta GPS.");
    }
}