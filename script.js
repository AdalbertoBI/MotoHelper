// Mapa OpenStreetMap
let mapa;
let mapaPostos;

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o mapa principal
    mapa = L.map('mapa').setView([-23.5505, -46.6333], 13); // São Paulo como centro
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);

    // Inicializa o mapa de postos (vazio até clicar em "Buscar Postos")
    mapaPostos = L.map('mapaPostos');
    
    // Carrega gastos salvos
    carregarGastos();
});

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