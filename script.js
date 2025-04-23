let paradasCount = 1;
let localizacaoAtual = null;
let cacheBusca = JSON.parse(localStorage.getItem('cacheBusca')) || {};
let rotaCoordenadas = [];
let timeoutBusca = null;

// Coordenadas padrão para São José dos Campos, SP
const COORDENADAS_PADRAO = {
    lat: -23.2237,
    lon: -45.9009
};

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
        input.addEventListener('input', () => {
            clearTimeout(timeoutBusca);
            timeoutBusca = setTimeout(() => {
                buscarSugestoes(inputId, datalistId);
            }, 500);
        });
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
        console.warn('Geolocalização não suportada pelo navegador.');
        alert('Geolocalização não suportada pelo seu navegador. Usando localização padrão (São José dos Campos, SP).');
        usarLocalizacaoPadrao();
        return;
    }

    document.getElementById('carregandoLocalizacao').style.display = 'block';

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            localizacaoAtual = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
            };
            console.log('Localização atual obtida com sucesso:', localizacaoAtual);

            // Inicializar o mapa mesmo que a geocodificação reversa falhe
            try {
                inicializarMapa([localizacaoAtual.lat, localizacaoAtual.lon]);
            } catch (error) {
                console.error('Erro ao inicializar o mapa:', error);
                alert('Erro ao inicializar o mapa. Verifique o console para mais detalhes.');
                usarLocalizacaoPadrao();
                return;
            }

            // Tentar geocodificação reversa para preencher o campo origem
            try {
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${localizacaoAtual.lat}&lon=${localizacaoAtual.lon}&addressdetails=1`;
                const res = await fetchComRetry(url);
                if (!res.ok) {
                    throw new Error(`Erro na geocodificação reversa: ${res.status} - ${res.statusText}`);
                }
                const data = await res.json();
                const enderecoFormatado = formatarEndereco(data.address, '', false);
                document.getElementById('origem').value = enderecoFormatado || 'Localização Atual';
            } catch (error) {
                console.error('Erro ao obter endereço da localização atual:', error);
                document.getElementById('origem').value = 'Localização Atual'; // Fallback se a geocodificação falhar
            } finally {
                document.getElementById('carregandoLocalizacao').style.display = 'none';
            }
        },
        (error) => {
            console.error('Erro ao obter localização atual:', error);
            let mensagemErro = 'Não foi possível obter sua localização. Usando localização padrão (São José dos Campos, SP).';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    mensagemErro = 'Permissão para geolocalização negada. Por favor, permita o acesso à localização nas configurações do navegador e recarregue a página.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    mensagemErro = 'Informações de localização indisponíveis. Usando localização padrão (São José dos Campos, SP).';
                    break;
                case error.TIMEOUT:
                    mensagemErro = 'A solicitação para obter a localização expirou. Usando localização padrão (São José dos Campos, SP).';
                    break;
            }
            alert(mensagemErro);
            usarLocalizacaoPadrao();
            document.getElementById('carregandoLocalizacao').style.display = 'none';
        },
        {
            timeout: 10000, // Timeout de 10 segundos para evitar travamentos
            enableHighAccuracy: true // Tentar obter a localização mais precisa
        }
    );
}

function usarLocalizacaoPadrao() {
    localizacaoAtual = COORDENADAS_PADRAO;
    try {
        inicializarMapa([localizacaoAtual.lat, localizacaoAtual.lon]);
    } catch (error) {
        console.error('Erro ao inicializar o mapa com localização padrão:', error);
        alert('Erro ao inicializar o mapa com a localização padrão. Verifique o console para mais detalhes.');
    }
    document.getElementById('origem').value = 'São José dos Campos, São Paulo';
}

function formatarEndereco(address, numero = '', numeroNaFrente = false) {
    const rua = address.road || address.highway || '';
    const numeroFinal = numero || address.house_number || '1000'; // Número padrão: 1000
    const bairro = address.suburb || address.neighbourhood || '';
    const cidade = address.city || address.town || address.village || '';
    const estado = address.state || '';

    const partes = [];
    if (rua) {
        if (numeroNaFrente && numeroFinal !== '1000') {
            partes.push(`${numeroFinal} ${rua}`);
        } else {
            partes.push(rua);
            partes.push(numeroFinal);
        }
    }
    if (bairro) partes.push(bairro);
    if (cidade) partes.push(cidade);
    if (estado) partes.push(estado);

    return partes.join(', ').trim();
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distancia = R * c; // Distância em km
    return distancia;
}

async function fetchComRetry(url, retries = 3, delay = 2000, options = {}) {
    for (let i = 0; i < retries; i++) {
        try {
            if (!navigator.onLine) {
                throw new Error('Você está offline. Verifique sua conexão com a internet.');
            }
            const res = await fetch(url, options);
            if (!res.ok) {
                if (res.status === 429) {
                    throw new Error('Muitas solicitações. Aguarde alguns segundos e tente novamente.');
                } else if (res.status >= 500) {
                    throw new Error('Erro temporário no servidor. Tente novamente mais tarde.');
                } else {
                    throw new Error(`Erro na solicitação: ${res.status} - ${res.statusText}`);
                }
            }
            return res;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`Tentativa ${i + 1} falhou: ${error.message}. Tentando novamente em ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function buscarSugestoes(inputId, datalistId) {
    const entrada = document.getElementById(inputId).value.trim();
    if (!entrada || entrada.length < 3) {
        document.getElementById(datalistId).innerHTML = '';
        return;
    }

    // Limpar o cache para evitar resultados inválidos
    cacheBusca[entrada] = null;

    document.getElementById('buscandoSugestoes').style.display = 'block';

    try {
        const tiposLocais = {
            'farmácia': { tag: 'amenity=pharmacy', nome: 'Farmácia' },
            'adega': { tag: 'shop=alcohol', nome: 'Adega' },
            'shopping': { tag: 'shop=mall', nome: 'Shopping' },
            'hospital': { tag: 'amenity=hospital', nome: 'Hospital' },
            'supermercado': { tag: 'shop=supermarket', nome: 'Supermercado' }
        };

        const entradaLower = entrada.toLowerCase();
        const ehTipoLocal = Object.keys(tiposLocais).some(tipo => entradaLower.includes(tipo));
        const sugestoesMap = new Map();

        // Detectar se o número está na frente (ex.: "1000 Rua Bacabal")
        const numeroMatch = entrada.match(/^\d+\b/); // Verifica se começa com número
        const numero = numeroMatch ? numeroMatch[0] : '';
        const numeroNaFrente = !!numeroMatch;
        const enderecoSemNumero = numeroNaFrente ? entrada.replace(/^\d+\b\s*/, '').trim() : entrada.replace(/\b\d+\b,?\s*/, '').trim();
        const isPar = numero ? parseInt(numero) % 2 === 0 : null;
        const apenasRua = (!numeroMatch || numeroNaFrente) && enderecoSemNumero.split(',').length <= 2;

        // Busca por comércios com nomes específicos (ex.: "Farma Conde")
        if (!ehTipoLocal) {
            let urlNome = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(entrada)}&limit=10&addressdetails=1&countrycodes=BR&accept-language=pt`;
            if (localizacaoAtual) {
                const { lat, lon } = localizacaoAtual;
                const viewbox = `${lon - 0.1},${lat + 0.1},${lon + 0.1},${lat - 0.1}`;
                urlNome += `&viewbox=${viewbox}&bounded=1`;
            }

            const resNome = await fetchComRetry(urlNome);
            const dataNome = await resNome.json();

            for (const item of dataNome) {
                if (item.class === 'amenity' || item.class === 'shop' || item.class === 'building') {
                    const nome = item.display_name || item.address?.name || 'Lugar sem nome';
                    const distancia = localizacaoAtual ? calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, parseFloat(item.lat), parseFloat(item.lon)) : Infinity;
                    const sugestao = `${nome} (${distancia.toFixed(2)} km)`;
                    sugestoesMap.set(nome, { sugestao, distancia, hasNumber: false });
                }
            }

            // Busca adicional no Overpass para comércios com tags genéricas
            if (localizacaoAtual) {
                const urlOverpass = `https://overpass-api.de/api/interpreter?data=[out:json];(node["name"~"${entrada}"](around:10000,${localizacaoAtual.lat},${localizacaoAtual.lon});node["shop"](around:10000,${localizacaoAtual.lat},${localizacaoAtual.lon});node["amenity"](around:10000,${localizacaoAtual.lat},${localizacaoAtual.lon}););out body;`;
                const resOverpass = await fetchComRetry(urlOverpass);
                const dataOverpass = await resOverpass.json();

                const locais = dataOverpass.elements;
                if (locais.length > 0) {
                    const locaisComDistancia = locais
                        .filter(local => local.tags?.name && local.tags.name.toLowerCase().includes(entradaLower))
                        .map(local => ({
                            nome: local.tags?.name || 'Lugar sem nome',
                            endereco: local.tags?.address || "Endereço não disponível",
                            lat: local.lat,
                            lon: local.lon,
                            distancia: calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, local.lat, local.lon)
                        }))
                        .sort((a, b) => a.distancia - b.distancia);

                    locaisComDistancia.forEach(local => {
                        const sugestao = `${local.nome} (${local.distancia.toFixed(2)} km) - ${local.endereco}`;
                        sugestoesMap.set(local.nome, { sugestao, distancia: local.distancia, hasNumber: false });
                    });
                }
            }
        }

        // Busca por tipos de locais (ex.: farmácia, shopping)
        if (ehTipoLocal && localizacaoAtual) {
            const tipoLocal = Object.keys(tiposLocais).find(tipo => entradaLower.includes(tipo));
            const { tag, nome } = tiposLocais[tipoLocal];

            const url = `https://overpass-api.de/api/interpreter?data=[out:json];node["${tag}"](around:10000,${localizacaoAtual.lat},${localizacaoAtual.lon});out body;`;
            const res = await fetchComRetry(url);
            const data = await res.json();

            const locais = data.elements;
            if (locais.length === 0) {
                sugestoesMap.set(`Nenhum ${nome} encontrado`, { sugestao: `Nenhum ${nome} encontrado na região`, distancia: Infinity, hasNumber: false });
            } else {
                const locaisComDistancia = locais
                    .map(local => ({
                        nome: local.tags?.name || `${nome} sem nome`,
                        endereco: local.tags?.address || "Endereço não disponível",
                        lat: local.lat,
                        lon: local.lon,
                        distancia: calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, local.lat, local.lon)
                    }))
                    .sort((a, b) => a.distancia - b.distancia);

                locaisComDistancia.forEach(local => {
                    const sugestao = `${local.nome} (${local.distancia.toFixed(2)} km) - ${local.endereco}`;
                    sugestoesMap.set(local.nome, { sugestao, distancia: local.distancia, hasNumber: false });
                });
            }
        }

        // Busca por endereços e números
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(entrada)}&limit=10&addressdetails=1&countrycodes=BR&accept-language=pt`;
        if (localizacaoAtual) {
            const { lat, lon } = localizacaoAtual;
            const viewbox = `${lon - 0.1},${lat + 0.1},${lon + 0.1},${lat - 0.1}`;
            url += `&viewbox=${viewbox}&bounded=1`;
        }

        const res = await fetchComRetry(url);
        const data = await res.json();

        console.log('Resultados brutos do Nominatim:', data);

        if (apenasRua || numero) {
            // Busca específica para encontrar endereços com números na mesma rua
            let urlRua;
            if (numero) {
                // Usar o formato correto para o parâmetro street: <número> <rua>
                const ruaParaBusca = numeroNaFrente ? `${numero} ${enderecoSemNumero}` : `${enderecoSemNumero} ${numero}`;
                urlRua = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(ruaParaBusca)}&limit=20&addressdetails=1&countrycodes=BR`;
            } else {
                urlRua = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(enderecoSemNumero)}&limit=20&addressdetails=1&countrycodes=BR`;
            }

            if (localizacaoAtual) {
                const { lat, lon } = localizacaoAtual;
                const viewbox = `${lon - 0.1},${lat + 0.1},${lon + 0.1},${lat - 0.1}`;
                urlRua += `&viewbox=${viewbox}&bounded=1`;
            }

            const resRua = await fetchComRetry(urlRua);
            const dataRua = await resRua.json();

            if (dataRua.length > 0) {
                const rua = dataRua[0].address.road;
                const cidade = dataRua[0].address.city || dataRua[0].address.town || dataRua[0].address.village || 'São José dos Campos';
                const estado = dataRua[0].address.state || 'São Paulo';

                // Busca detalhada por números na rua
                const queryNumeros = `${rua}, ${cidade}, ${estado}`;
                const urlNumeros = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(rua)}&city=${encodeURIComponent(cidade)}&state=${encodeURIComponent(estado)}&limit=20&addressdetails=1&countrycodes=BR`;
                const resNumeros = await fetchComRetry(urlNumeros);
                const dataNumeros = await resNumeros.json();

                const resultadosComDistancia = dataNumeros
                    .filter(item => item.address && item.address.road === rua)
                    .map(item => ({
                        endereco: formatarEndereco(item.address, '', numeroNaFrente),
                        lat: parseFloat(item.lat),
                        lon: parseFloat(item.lon),
                        distancia: localizacaoAtual ? calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, parseFloat(item.lat), parseFloat(item.lon)) : Infinity,
                        hasNumber: !!item.address.house_number
                    }))
                    .sort((a, b) => a.distancia - b.distancia);

                resultadosComDistancia.forEach(result => {
                    sugestoesMap.set(result.endereco, { sugestao: result.endereco, distancia: result.distancia, hasNumber: result.hasNumber });
                });

                // Se não encontrou números, sugerir alguns números próximos
                if (numero && !resultadosComDistancia.some(result => result.hasNumber)) {
                    const numerosProximos = [];
                    for (let i = 0; i <= 4; i += 2) {
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
                        const enderecoComNumero = formatarEndereco(dataRua[0].address, num, numeroNaFrente);
                        const distancia = localizacaoAtual ? calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, parseFloat(dataRua[0].lat), parseFloat(dataRua[0].lon)) : Infinity;
                        sugestoesMap.set(enderecoComNumero, { sugestao: enderecoComNumero, distancia, hasNumber: true });
                    });
                } else if (!numero && !resultadosComDistancia.some(result => result.hasNumber)) {
                    // Sugerir alguns números genéricos se o usuário não especificou um número
                    const numerosGenericos = ['100', '200', '300'];
                    numerosGenericos.forEach(num => {
                        const enderecoComNumero = formatarEndereco(dataRua[0].address, num, numeroNaFrente);
                        const distancia = localizacaoAtual ? calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, parseFloat(dataRua[0].lat), parseFloat(dataRua[0].lon)) : Infinity;
                        sugestoesMap.set(enderecoComNumero, { sugestao: enderecoComNumero, distancia, hasNumber: true });
                    });
                }

                if (resultadosComDistancia.length === 0) {
                    const sugestaoRuaabad = formatarEndereco(dataRua[0].address, '', numeroNaFrente);
                    sugestoesMap.set(sugestaoRua, { sugestao: sugestaoRua, distancia: localizacaoAtual ? calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, parseFloat(dataRua[0].lat), parseFloat(dataRua[0].lon)) : Infinity, hasNumber: false });
                }
            } else {
                // Fallback: sugerir a rua sem número, com localização padrão
                const enderecoFallback = {
                    road: enderecoSemNumero,
                    city: 'São José dos Campos',
                    state: 'São Paulo'
                };
                const sugestaoRua = formatarEndereco(enderecoFallback, '1000', numeroNaFrente); // Usar 1000 como número padrão
                sugestoesMap.set(sugestaoRua, { sugestao: sugestaoRua, distancia: Infinity, hasNumber: true });
            }
        } else {
            for (const item of data) {
                let sugestaoBase = '';
                let key = '';

                if (item.type === 'amenity' || item.type === 'shop' || item.class === 'amenity' || item.class === 'shop') {
                    const nome = item.display_name || item.address?.name || 'Lugar sem nome';
                    const distancia = localizacaoAtual ? calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, parseFloat(item.lat), parseFloat(item.lon)) : Infinity;
                    sugestaoBase = `${nome} (${distancia.toFixed(2)} km)`;
                    key = nome;
                    sugestoesMap.set(key, { sugestao: sugestaoBase, distancia: distancia, hasNumber: false });
                } else if (item.address && (item.address.road || item.type === 'highway')) {
                    sugestaoBase = formatarEndereco(item.address, '', numeroNaFrente);
                    key = `${item.address.road}, ${item.address.house_number || numero || '1000'}`.trim();

                    const distancia = localizacaoAtual ? calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, parseFloat(item.lat), parseFloat(item.lon)) : Infinity;
                    if (!sugestoesMap.has(key) || distancia < sugestoesMap.get(key).distancia) {
                        sugestoesMap.set(key, { sugestao: sugestaoBase, distancia: distancia, hasNumber: !!item.address.house_number });
                    }

                    if (numero && !item.address.house_number) {
                        const numerosProximos = [];
                        for (let i = 0; i <= 4; i += 2) {
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
                            const sugestaoComNumero = formatarEndereco(item.address, num, numeroNaFrente);
                            const keyComNumero = `${item.address.road}, ${num}`.trim();
                            if (!sugestoesMap.has(keyComNumero) || distancia < sugestoesMap.get(keyComNumero).distancia) {
                                sugestoesMap.set(keyComNumero, { sugestao: sugestaoComNumero, distancia: distancia, hasNumber: true });
                            }
                        });
                    }
                }
            }
        }

        const sugestoes = Array.from(sugestoesMap.values())
            .sort((a, b) => {
                if (a.hasNumber && !b.hasNumber) return -1;
                if (!a.hasNumber && b.hasNumber) return 1;
                return a.distancia - b.distancia;
            })
            .map(entry => entry.sugestao);

        cacheBusca[entrada] = sugestoes;
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
        alert(`Erro ao buscar sugestões: ${error.message}\nVerifique sua conexão ou digite um endereço mais específico.`);

        // Fallback: sugerir a rua com base na entrada do usuário
        const datalist = document.getElementById(datalistId);
        datalist.innerHTML = '';
        const numeroFallback = numeroNaFrente ? `${numero || '1000'} ` : '';
        const sugestaoFallback = numeroNaFrente ? `${numeroFallback}${enderecoSemNumero}, São José dos Campos, São Paulo` : `${enderecoSemNumero}, ${numero || '1000'}, São José dos Campos, São Paulo`;
        const option = document.createElement('option');
        option.value = sugestaoFallback;
        datalist.appendChild(option);
    } finally {
        document.getElementById('buscandoSugestoes').style.display = 'none';
    }
}

async function geocodificar(endereco) {
    if (!endereco) return null;
    try {
        const numeroMatch = endereco.match(/^\d+\b/); // Verifica se começa com número
        const numeroOriginal = numeroMatch ? parseInt(numeroMatch[0]) : null;
        const isPar = numeroOriginal ? numeroOriginal % 2 === 0 : null;
        let enderecoBase = endereco;

        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoBase)}&limit=5&addressdetails=1&countrycodes=BR`;
        let res = await fetchComRetry(url);
        let data = await res.json();

        console.log(`Resultados do Nominatim para geocodificação de "${enderecoBase}":`, data);

        let bestResult = null;
        let minDistancia = Infinity;

        for (const item of data) {
            if (item.address && (item.address.road || item.type === 'highway') || item.class === 'amenity' || item.class === 'shop') {
                const coords = [parseFloat(item.lat), parseFloat(item.lon)];
                const distancia = localizacaoAtual ? calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, coords[0], coords[1]) : Infinity;
                if (distancia < minDistancia) {
                    bestResult = coords;
                    minDistancia = distancia;
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
                res = await fetchComRetry(url);
                data = await res.json();

                for (const item of data) {
                    if (item.address && (item.address.road || item.type === 'highway')) {
                        const coords = [parseFloat(item.lat), parseFloat(item.lon)];
                        const distancia = localizacaoAtual ? calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, coords[0], coords[1]) : Infinity;
                        if (distancia < minDistancia) {
                            bestResult = coords;
                            minDistancia = distancia;
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
        res = await fetchComRetry(url);
        data = await res.json();

        for (const item of data) {
            if (item.address && (item.address.road || item.type === 'highway') || item.class === 'amenity' || item.class === 'shop') {
                const coords = [parseFloat(item.lat), parseFloat(item.lon)];
                const distancia = localizacaoAtual ? calcularDistancia(localizacaoAtual.lat, localizacaoAtual.lon, coords[0], coords[1]) : Infinity;
                if (distancia < minDistancia) {
                    bestResult = coords;
                    minDistancia = distancia;
                }
            }
        }

        if (bestResult) {
            console.log(`Geocodificação bem-sucedida para "${enderecoSemNumero}": ${bestResult}`);
            return bestResult;
        }

        // Fallback: se não encontrar o endereço, tentar geocodificar apenas a cidade
        const partesEndereco = endereco.split(',').map(p => p.trim());
        const cidade = partesEndereco.length > 1 ? partesEndereco[partesEndereco.length - 2] : 'São José dos Campos';
        const estado = partesEndereco.length > 1 ? partesEndereco[partesEndereco.length - 1] : 'São Paulo';
        const enderecoFallback = `${cidade}, ${estado}`;
        url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoFallback)}&limit=1&addressdetails=1&countrycodes=BR`;
        res = await fetchComRetry(url);
        data = await res.json();

        if (data.length > 0) {
            const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            console.log(`Geocodificação de fallback bem-sucedida para "${enderecoFallback}": ${coords}`);
            return coords;
        }

        throw new Error(`O endereço ou lugar "${endereco}" não foi encontrado, nem mesmo a cidade. Tente usar uma sugestão da lista de autocompletar ou simplifique o endereço (ex.: "São José dos Campos, São Paulo").`);
    } catch (error) {
        console.error('Erro na geocodificação:', error);
        throw new Error(error.message || "Não foi possível encontrar o endereço ou lugar. Tente usar uma sugestão da lista ou verifique sua conexão.");
    }
}

async function calcularRota() {
    document.getElementById('botaoIniciarRota').style.display = 'none';

    const origem = document.getElementById('origem').value.trim();
    const destino = document.getElementById('destino').value.trim();
    const paradas = [];
    for (let i = 1; i <= paradasCount; i++) {
        const parada = document.getElementById(`parada${i}`).value;
        if (parada) paradas.push(parada.trim());
    }

    if (!origem || !destino) {
        alert("Por favor, preencha os campos de origem e destino!");
        document.getElementById('botaoIniciarRota').style.display = 'block';
        return;
    }

    try {
        const coordsOrigem = await geocodificar(origem);
        const coordsDestino = await geocodificar(destino);
        const coordsParadas = await Promise.all(paradas.map(async (parada, index) => {
            if (!parada) return null;
            const coords = await geocodificar(parada);
            if (!coords) throw new Error(`Endereço ou lugar inválido: ${parada} (Parada ${index + 1})`);
            return coords;
        }));

        if (!coordsOrigem) throw new Error("Não foi possível geocodificar a origem. Tente usar uma sugestão da lista de autocompletar.");
        if (!coordsDestino) throw new Error("Não foi possível geocodificar o destino. Tente usar uma sugestão da lista de autocompletar.");
        if (coordsParadas.includes(null)) {
            throw new Error("Um ou mais endereços/lugares das paradas não foram encontrados. Use as sugestões da lista de autocompletar.");
        }

        const coords = [coordsOrigem, ...coordsParadas.filter(c => c !== null), coordsDestino];
        console.log('Coordenadas enviadas ao OpenRouteService:', coords);

        rotaCoordenadas = coords;

        const apiKey = '5b3ce3597851110001cf62488d59f67c5c15452c92c89eb27e1004c6';
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}`;
        const body = {
            coordinates: coords,
            units: 'km',
            instructions: true,
            radiuses: Array(coords.length).fill(5000), // Raio de 5000 metros para cada ponto, conforme o site
            extra_info: ['waytype']
        };

        const res = await fetchComRetry(url, 3, 2000, { // Atraso de 2000ms para respeitar limites de requisições
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (data.features && data.features.length > 0) {
            const distancia = data.features[0].properties.segments.reduce((sum, seg) => sum + seg.distance, 0);
            const geometry = data.features[0].geometry.coordinates;

            adicionarMarcadores(coordsOrigem, coordsParadas.filter(c => c !== null), coordsDestino);
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
        let mensagemErro = error.message || 'Erro desconhecido ao calcular a rota.';
        if (error.message.includes('403')) {
            mensagemErro = 'Erro: Chave de API do OpenRouteService inválida ou limite de requisições excedido. Por favor, verifique sua chave de API ou obtenha uma nova em https://openrouteservice.org/.';
        } else if (error.message.includes('429')) {
            mensagemErro = 'Erro: Limite de requisições ao OpenRouteService excedido. Aguarde alguns segundos e tente novamente.';
        }
        alert(`Erro: ${mensagemErro}\nSugestão: Use os endereços ou lugares sugeridos pela lista de autocompletar.`);
        document.getElementById('botaoIniciarRota').style.display = 'block';
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
    if (isNaN(km) || isNaN(peso)) {
        alert("Preencha a distância e o peso!");
        return;
    }
    const valorFrete = (km * 1.5) + (peso * 0.5);
    document.getElementById('resultadoFrete').textContent = `Valor do Frete: R$${valorFrete.toFixed(2)}`;
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

                if (postos.length === 0) {
                    listaPostos.innerHTML = "<li>Nenhum posto encontrado na região.</li>";
                }

                postos.forEach(posto => {
                    adicionarMarcadorPosto(posto.lat, posto.lon, posto.tags?.name);

                    const li = document.createElement('li');
                    li.textContent = posto.tags?.name || "Posto sem nome";
                    listaPostos.appendChild(li);
                });
            })
            .catch(error => {
                console.error('Erro ao buscar postos:', error);
                alert("Erro ao buscar postos. Verifique sua conexão ou tente novamente.");
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
        }, () => {
            alert("Não foi possível obter sua localização para o SOS.");
        });
    } else {
        alert("Seu navegador não suporta GPS.");
    }
}