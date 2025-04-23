let mapa;
let mapaPostos;
let rotaLayer;
let paradasCount = 1;
let ultimaBusca = 0;
let localizacaoAtual = null;
let cacheBusca = JSON.parse(localStorage.getItem('cacheBusca')) || {}; // Cache de resultados de busca

document.addEventListener('DOMContentLoaded', () => {
    mapa = L.map('mapa').setView([-23.5505, -46.6333], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    mapaPostos = L.map('mapaPostos');
    carregarGastos();
    carregarKmPorLitro();

    const btnAdicionarParada = document.getElementById('btnAdicionarParada');
    if (btnAdicionarParada) {
        btnAdicionarParada.addEventListener('click', adicionarParada);
    } else {
        console.error('Botão "Adicionar Parada" não encontrado!');
    }

    // Configura o evento oninput para os campos de entrada existentes
    configurarEventosBusca();

    // Obtém a localização atual do usuário
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

    // Configura o evento oninput para o novo campo
    configurarEventosBusca();
}

function obterLocalizacaoAtual() {
    if (!navigator.geolocation) {
        console.error('Geolocalização não suportada pelo navegador.');
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
            document.getElementById('carregandoLocalizacao').style.display = 'none';
        }
    );
}

function formatarEndereco(address) {
    const rua = address.road || '';
    const numero = address.house_number || '';
    const bairro = address.suburb || address.neighbourhood || '';
    const cidade = address.city || address.town || address.village || '';
    const estado = address.state || '';

    const partes = [];
    if (rua) partes.push(rua);
    if (numero) partes.push(numero);
    if (bairro) partes.push(bairro);
    if (cidade) partes.push(cidade);
    if (estado) partes.push(estado);

    return partes.join(', ');
}

async function buscarSugestoes(inputId, datalistId) {
    const agora = Date.now();
    if (agora - ultimaBusca < 500) return; // Debounce: espera 500ms entre requisições
    ultimaBusca = agora;

    const endereco = document.getElementById(inputId).value.trim();
    if (!endereco || endereco.length < 3) {
        document.getElementById(datalistId).innerHTML = '';
        return;
    }

    console.log(`Buscando sugestões para: ${endereco}`);

    // Verifica se o resultado está no cache
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

        const sugestoes = data
            .filter(item => item.address && (item.address.road || item.address.city)) // Filtra resultados incompletos
            .map(item => formatarEndereco(item.address));

        // Armazena no cache
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
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1&addressdetails=1&countrycodes=BR`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Erro na geocodificação: ${res.status} - ${res.statusText}`);
        }
        const data = await res.json();
        if (data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
        return null;
    } catch (error) {
        console.error('Erro na geocodificação:', error);
        throw new Error("Não foi possível geocodificar o endereço. Tente usar uma sugestão da lista ou verifique sua conexão.");
    }
}

async function calcularRota() {
    if (rotaLayer) {
        mapa.removeLayer(rotaLayer);
    }

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
        const coordsParadas = await Promise.all(paradas.map(async (parada) => {
            const coords = await geocodificar(parada);
            if (!coords) throw new Error(`Endereço inválido: ${parada}`);
            return coords;
        }));

        if (!coordsOrigem || !coordsDestino || coordsParadas.includes(null)) {
            throw new Error("Um ou mais endereços não foram encontrados. Use as sugestões da lista.");
        }

        const coords = [coordsOrigem, ...coordsParadas, coordsDestino];

        const apiKey = '5b3ce3597851110001cf62488d59f67c5c15452c92c89eb27e1004c6';
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}`;
        const body = {
            coordinates: coords,
            units: 'km',
            instructions: true,
            extra_info: ['waytype'],
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Erro na API OpenRouteService: ${res.status} - ${errorText}`);
        }

        const data = await res.json();

        if (data.features && data.features.length > 0) {
            const distancia = data.features[0].properties.segments.reduce((sum, seg) => sum + seg.distance, 0);
            const geometry = data.features[0].geometry.coordinates;

            const polyline = L.polyline(geometry.map(coord => [coord[1], coord[0]]), { color: 'blue' }).addTo(mapa);
            mapa.fitBounds(polyline.getBounds());
            rotaLayer = polyline;

            const kmPorLitro = parseFloat(localStorage.getItem('kmPorLitro')) || 0;
            const litros = kmPorLitro > 0 ? distancia / kmPorLitro : 0;
            let resultado = `Distância: ${distancia.toFixed(2)} km<br>` +
                           (kmPorLitro > 0 ? `Combustível estimado: ${litros.toFixed(2)} litros<br>` : 'Defina o km/litro na aba Gastos.<br>');

            const waytypes = data.features[0].properties.extras.waytype;
            if (waytypes) {
                resultado += '<b>Tipos de estrada:</b><br>';
                waytypes.values.forEach(val => {
                    const [start, end, type] = val;
                    resultado += `- Segmento ${start}-${end}: ${type}<br>`;
                });
            }

            document.getElementById('resultadoRota').innerHTML = resultado;

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
        alert(`Erro: ${error.message}\nSugestão: Use os endereços sugeridos pela lista de autocompletar.`);
    }
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

        mapaPostos.setView([lat, lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapaPostos);

        fetch(`https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="fuel"](around:5000,${lat},${lng});out;`)
            .then(res => res.json())
            .then(data => {
                const postos = data.elements;
                const listaPostos = document.getElementById('listaPostos');
                listaPostos.innerHTML = "";

                postos.forEach(posto => {
                    L.marker([posto.lat, posto.lon]).addTo(mapaPostos)
                        .bindPopup(`<b>${posto.tags?.name || "Posto Desconhecido"}</b>`);

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