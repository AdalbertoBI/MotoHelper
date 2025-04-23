// Mapa OpenStreetMap
let mapa;
let mapaPostos;
let rotaLayer; // Para armazenar a rota no mapa
let paradasCount = 1; // Contador de paradas

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o mapa principal
    mapa = L.map('mapa').setView([-23.5505, -46.6333], 13); // São Paulo como centro
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);

    // Inicializa o mapa de postos (vazio até clicar em "Buscar Postos")
    mapaPostos = L.map('mapaPostos');

    // Carrega gastos e km/litro salvos
    carregarGastos();
    carregarKmPorLitro();
    carregarEnderecosSalvos();
});

// Função para adicionar mais paradas
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

// Função para converter endereço em coordenadas (usando Nominatim)
async function geocodificar(endereco) {
    if (!endereco) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
}

// Função para calcular a rota
async function calcularRota() {
    // Limpa a rota anterior, se existir
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

    // Salva os endereços pesquisados
    salvarEndereco(origem);
    paradas.forEach(salvarEndereco);
    salvarEndereco(destino);
    carregarEnderecosSalvos();

    // Converte todos os endereços em coordenadas
    const coordsOrigem = await geocodificar(origem);
    const coordsDestino = await geocodificar(destino);
    const coordsParadas = await Promise.all(paradas.map(geocodificar));
    if (!coordsOrigem || !coordsDestino || coordsParadas.includes(null)) {
        alert("Não foi possível encontrar algum endereço. Verifique os dados.");
        return;
    }

    // Monta a lista de coordenadas para a API OpenRouteService
    const coords = [coordsOrigem, ...coordsParadas, coordsDestino];

    // Chave da API OpenRouteService (você precisa se registrar para obter uma chave gratuita)
    const apiKey = '5b3ce3597851110001cf62488d59f67c5c15452c92c89eb27e1004c6'; // Substitua por sua chave gratuita de https://openrouteservice.org/
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}`;
    const body = {
        coordinates: coords,
        units: 'km'
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();

    if (data.features && data.features.length > 0) {
        const distancia = data.features[0].properties.segments.reduce((sum, seg) => sum + seg.distance, 0);
        const geometry = data.features[0].geometry.coordinates;

        // Desenha a rota no mapa
        const polyline = L.polyline(geometry.map(coord => [coord[1], coord[0]]), { color: 'blue' }).addTo(mapa);
        mapa.fitBounds(polyline.getBounds());
        rotaLayer = polyline;

        // Calcula o consumo de combustível
        const kmPorLitro = parseFloat(localStorage.getItem('kmPorLitro')) || 0;
        const litros = kmPorLitro > 0 ? distancia / kmPorLitro : 0;
        const resultado = `Distância: ${distancia.toFixed(2)} km<br>` +
                         (kmPorLitro > 0 ? `Combustível estimado: ${litros.toFixed(2)} litros` : 'Defina o km/litro na aba Gastos.');

        document.getElementById('resultadoRota').innerHTML = resultado;
    } else {
        alert("Não foi possível calcular a rota.");
    }
}

// Função para salvar endereços no localStorage
function salvarEndereco(endereco) {
    if (!endereco) return;
    const enderecos = JSON.parse(localStorage.getItem('enderecos') || '[]');
    if (!enderecos.includes(endereco)) {
        enderecos.push(endereco);
        localStorage.setItem('enderecos', JSON.stringify(enderecos));
    }
}

// Função para carregar endereços salvos na lista
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

// Calculadora de Frete
function calcularFrete() {
    const km = parseFloat(document.getElementById('km').value);
    const peso = parseFloat(document.getElementById('peso').value);
    const valorFrete = (km * 1.5) + (peso * 0.5);
    document.getElementById('resultadoFrete').innerText = `Valor do Frete: R$${valorFrete.toFixed(2)}`;
}

// Busca postos de gasolina (API Overpass Turbo)
function buscarPostos() {
    if (!navigator.geolocation) {
        alert("GPS não suportado.");
        return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Configura o mapa de postos
        mapaPostos.setView([lat, lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapaPostos);

        // Busca postos via Overpass API
        fetch(`https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="fuel"](around:5000,${lat},${lng});out;`)
            .then(res => res.json())
            .then(data => {
                const postos = data.elements;
                const listaPostos = document.getElementById('listaPostos');
                listaPostos.innerHTML = "";

                postos.forEach(posto => {
                    // Adiciona marcador no mapa
                    L.marker([posto.lat, posto.lon]).addTo(mapaPostos)
                        .bindPopup(`<b>${posto.tags?.name || "Posto Desconhecido"}</b>`);

                    // Adiciona na lista
                    const li = document.createElement('li');
                    li.textContent = posto.tags?.name || "Posto sem nome";
                    listaPostos.appendChild(li);
                });
            });
    });
}

// Controle de Gastos (LocalStorage)
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

// Função para salvar o km/litro
function salvarKmPorLitro() {
    const kmPorLitro = parseFloat(document.getElementById('kmPorLitro').value);
    if (isNaN(kmPorLitro) || kmPorLitro <= 0) {
        alert("Digite um valor válido para km/litro!");
        return;
    }
    localStorage.setItem('kmPorLitro', kmPorLitro);
    carregarKmPorLitro();
}

// Função para carregar o km/litro
function carregarKmPorLitro() {
    const kmPorLitro = localStorage.getItem('kmPorLitro') || '';
    document.getElementById('kmPorLitro').value = kmPorLitro;
}

// Botão SOS
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