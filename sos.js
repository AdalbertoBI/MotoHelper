document.addEventListener('DOMContentLoaded', () => {
    console.log('[sos.js] DOM carregado. Configurando aba SOS...');
    carregarContatos();
    configurarListenersSOS();
});

function configurarListenersSOS() {
    console.log('[sos.js] Configurando listeners da aba SOS...');
    const btnSalvarContatos = document.getElementById('btnSalvarContatos');
    if (btnSalvarContatos) {
        btnSalvarContatos.addEventListener('click', salvarContatos);
    } else {
        console.warn('[sos.js] Botão #btnSalvarContatos não encontrado.');
    }

    const btnSOS = document.getElementById('btnSOS');
    if (btnSOS) {
        btnSOS.addEventListener('click', enviarSOS);
    } else {
        console.warn('[sos.js] Botão #btnSOS não encontrado.');
    }
}

function carregarContatos() {
    console.log('[sos.js] Carregando contatos salvos...');
    const contato1Nome = localStorage.getItem('contato1Nome');
    const contato1Telefone = localStorage.getItem('contato1Telefone');
    const contato2Nome = localStorage.getItem('contato2Nome');
    const contato2Telefone = localStorage.getItem('contato2Telefone');

    if (contato1Nome) document.getElementById('contato1Nome').value = contato1Nome;
    if (contato1Telefone) document.getElementById('contato1Telefone').value = contato1Telefone;
    if (contato2Nome) document.getElementById('contato2Nome').value = contato2Nome;
    if (contato2Telefone) document.getElementById('contato2Telefone').value = contato2Telefone;
}

function salvarContatos() {
    const contato1Nome = document.getElementById('contato1Nome').value.trim();
    const contato1Telefone = document.getElementById('contato1Telefone').value.trim();
    const contato2Nome = document.getElementById('contato2Nome').value.trim();
    const contato2Telefone = document.getElementById('contato2Telefone').value.trim();
    const feedback = document.getElementById('contatosFeedback');

    localStorage.setItem('contato1Nome', contato1Nome);
    localStorage.setItem('contato1Telefone', contato1Telefone);
    localStorage.setItem('contato2Nome', contato2Nome);
    localStorage.setItem('contato2Telefone', contato2Telefone);

    feedback.className = 'form-text text-success';
    feedback.textContent = 'Contatos salvos com sucesso!';
    feedback.style.display = 'block';
    setTimeout(() => feedback.style.display = 'none', 3000);
    console.log('[sos.js] Contatos salvos:', { contato1Nome, contato1Telefone, contato2Nome, contato2Telefone });
}

function enviarSOS() {
    console.log('[sos.js] Iniciando envio de SOS...');
    if (!navigator.geolocation) {
        alert('Geolocalização não suportada pelo seu navegador.');
        console.warn('[sos.js] Geolocalização não suportada.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            console.log('[sos.js] Localização para SOS:', { lat, lon });
            const mensagem = `🚨 Alerta SOS enviado! Localização: ${lat}, ${lon}.`;
            alert(mensagem);
            console.log('[sos.js] Alerta SOS simulado enviado:', mensagem);
        },
        (error) => {
            console.error('[sos.js] Erro na geolocalização:', error.message);
            alert(`Erro ao obter localização: ${error.message}`);
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}