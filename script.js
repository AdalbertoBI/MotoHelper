// Calculadora de Frete
function calcularFrete() {
    const km = parseFloat(document.getElementById('km').value);
    const peso = parseFloat(document.getElementById('peso').value);
    const valorFrete = (km * 1.5) + (peso * 0.5); // R$1,50 por KM + R$0,50 por KG
    document.getElementById('resultadoFrete').innerText = `Valor do Frete: R$${valorFrete.toFixed(2)}`;
}

// Botão SOS (simulado)
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

// Simulação de Rota (sem Google Maps API)
function calcularRota() {
    const endereco = document.getElementById('endereco').value;
    alert(`Rota calculada para: ${endereco}`);
}