document.addEventListener('DOMContentLoaded', () => {
    console.log('[sos.js] Configurando listener para SOS...');
    const btnSOS = document.getElementById('btnSOS');
    if (btnSOS) btnSOS.addEventListener('click', enviarSOS);
    else console.warn('[sos.js] Botão #btnSOS não encontrado.');
});

function enviarSOS() {
    if (!navigator.geolocation) {
        alert('Seu navegador não suporta Geolocalização.');
        return;
    }
    alert('Obtendo localização para SOS...');
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = pos.coords.accuracy;
            const mensagem = `🚨 ALERTA SOS 🚨\nLocalização: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${acc.toFixed(0)}m)\nLink: https://www.google.com/maps?q=${lat},${lng}`;
            console.log('[sos.js] SOS:', mensagem);
            alert(mensagem + '\n\n(Simulação. Nenhuma mensagem enviada.)');
        },
        (error) => {
            console.error('[sos.js] Erro na localização para SOS:', error.message);
            alert(`Não foi possível obter localização: ${error.message}`);
        },
        { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
}