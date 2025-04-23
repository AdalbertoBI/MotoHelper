let mapa;
let mapaPostos;
let rotaLayer;
let paradasCount = 1;

document.addEventListener('DOMContentLoaded', () => {
    mapa = L.map('mapa').setView([-23.5505, -46.6333], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    mapaPostos = L.map('mapaPostos');
    carregarGastos();
    carregarKmPorLitro();
    carregarEnderecosSalvos();

    const btnAdicionarParada = document.getElementById('btnAdicionarParada');
    if (btnAdicionarParada) {
        btnAdicionarParada.addEventListener('click', adicionarParada);
    } else {
        console.error('Botão "Adicionar Parada" não encontrado!');
    }
});

function adicionarParada() {
    paradasCount++;
    const paradasDiv = document.getElementById('paradas');
    const novaParada = document.createElement('input');
    novaParada.type = 'text';
    novaParada.id = `parada${paradasCount}`;
    novaParada.placeholder = `Parada ${paradasCount} (opcional)`;
    novaParada.className = 'form-control mb-2';
    novaParada.setAttribute('list', 'enderecosSalvos');
    paradasDiv.appendChild(novaParada);
}

async function geocodificar(endereco) {
    if (!endereco) return null;
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
        return null;
    } catch (error) {
        console.error('Erro na geocodificação:', error);
        return null;
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

    salvarEndereco(origem);
    paradas.forEach(salvarEndereco);
    salvarEndereco(destino);
    carregarEnderecosSalvos();

    const coordsOrigem = await geocodificar(origem);
    const coordsDestino = await geocodificar(destino);
    const coordsParadas = await Promise.all(paradas.map(geocodificar));
    if (!coordsOrigem || !coordsDestino || coordsParadas.includes(null)) {
        alert("Não foi possível encontrar algum endereço. Verifique os dados e tente novamente.");
        return;
    }

    const coords = [coordsOrigem, ...coordsParadas, coordsDestino];

    const apiKey = '5b3ce3597851110001cf62488d59f67c5c15452c92c89eb27e1004c6';
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}`;
    const body = {
        coordinates: coords,
        units: 'km',
        instructions: true, // Adiciona instruções de navegação
        extra_info: ['waytype'], // Adiciona informações sobre o tipo de estrada
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            throw new Error(`Erro na API: ${res.status} - ${res.statusText}`);
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

            // Adiciona informações sobre o tipo de estrada
            const waytypes = data.features[0].properties.extras.waytype;
            if (waytypes) {
                resultado += '<b>Tipos de estrada:</b><br>';
                waytypes.values.forEach(val => {
                    const [start, end, type] = val;
                    resultado += `- Segmento ${start}-${end}: ${type}<br>`;
                });
            }

            document.getElementById('resultadoRota').innerHTML = resultado;

            // Adiciona instruções de navegação
            const instrucoesDiv = document.getElementById('instrucoesRota');
            instrucoesDiv.innerHTML = '<b>Instruções de Navegação:</b><br>';
            const instrucoes = data.features[0].properties.segments[0].steps || [];
            instrucoes.forEach(step => {
                const li = document.createElement('div');
                li.textContent = `${step.instruction} (${step.distance} km)`;
                instrucoesDiv.appendChild(li);
            });
        } else {
            alert("Não foi possível calcular a rota. Verifique sua conexão ou tente outros endereços.");
        }
    } catch (error) {
        console.error('Erro ao calcular a rota:', error);
        alert("Erro ao calcular a rota: " + error.message + ". Verifique sua conexão ou a chave API.");
    }
}

function salvarEndereco(endereco) {
    if (!endereco) return;
    const enderecos = JSON.parse(localStorage.getItem('enderecos') || '[]');
    if (!enderecos.includes(endereco)) {
        enderecos.push(endereco);
        localStorage.setItem('enderecos', JSON.stringify(enderecos));
    }
}

function carregarEnderecosSalvos() {
    const enderecos = JSON.parse(localStorage.getItem('enderecos') || '[]');
    const datalist = document.getElementById('enderecosSalvos');
    datalist.innerHTML = '';
    enderecos.forEach(end => {
        const option = document.createElement('option');
        option.value = end;
        datalist.appendChild(option);
    });
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