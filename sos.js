document.addEventListener('DOMContentLoaded', () => {
    console.log('[sos.js] Configurando listeners para SOS...');
    const btnPolicia = document.getElementById('btnPolicia');
    const btnSamu = document.getElementById('btnSamu');
    const btnBombeiros = document.getElementById('btnBombeiros');
    const btnSalvarContatos = document.getElementById('btnSalvarContatos');

    if (btnPolicia) btnPolicia.addEventListener('click', () => ligarEmergencia('190'));
    else console.warn('[sos.js] Botão #btnPolicia não encontrado.');

    if (btnSamu) btnSamu.addEventListener('click', () => ligarEmergencia('192'));
    else console.warn('[sos.js] Botão #btnSamu não encontrado.');

    if (btnBombeiros) btnBombeiros.addEventListener('click', () => ligarEmergencia('193'));
    else console.warn('[sos.js] Botão #btnBombeiros não encontrado.');

    if (btnSalvarContatos) btnSalvarContatos.addEventListener('click', salvarContatos);
    else console.warn('[sos.js] Botão #btnSalvarContatos não encontrado.');

    const btnSOS = document.getElementById('btnSOS');
    if (btnSOS) btnSOS.addEventListener('click', enviarAlertaSOS);
    else console.warn('[sos.js] Botão #btnSOS não encontrado.');

    carregarContatos();
});

function ligarEmergencia(numero) {
    const url = `tel:${numero}`;
    console.log('[sos.js] Iniciando ligação para:', numero);
    window.location.href = url;
}

function salvarContatos() {
    const contato1Nome = document.getElementById('contato1Nome').value.trim();
    const contato1Telefone = document.getElementById('contato1Telefone').value.trim();
    const contato2Nome = document.getElementById('contato2Nome').value.trim();
    const contato2Telefone = document.getElementById('contato2Telefone').value.trim();
    const feedbackDiv = document.getElementById('contatosFeedback');

    const contatos = {
        contato1: { nome: contato1Nome, telefone: contato1Telefone },
        contato2: { nome: contato2Nome, telefone: contato2Telefone }
    };

    localStorage.setItem('contatos', JSON.stringify(contatos));
    console.log('[sos.js] Contatos salvos:', contatos);

    if (feedbackDiv) {
        feedbackDiv.style.display = 'block';
        setTimeout(() => feedbackDiv.style.display = 'none', 3000);
    }
}

function carregarContatos() {
    const contatos = JSON.parse(localStorage.getItem('contatos') || '{}');
    document.getElementById('contato1Nome').value = contatos.contato1?.nome || '';
    document.getElementById('contato1Telefone').value = contatos.contato1?.telefone || '';
    document.getElementById('contato2Nome').value = contatos.contato2?.nome || '';
    document.getElementById('contato2Telefone').value = contatos.contato2?.telefone || '';
    console.log('[sos.js] Contatos carregados:', contatos);
}

function enviarAlertaSOS() {
    if (!navigator.geolocation) {
        alert('Geolocalização não suportada ou desativada.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const contatos = JSON.parse(localStorage.getItem('contatos') || '{}');
            let mensagem = `🚨 Alerta SOS - Motoca BR 🚨\nMinha localização: https://www.google.com/maps?q=${lat},${lng}\n`;
            if (contatos.contato1?.telefone) mensagem += `Contato 1: ${contatos.contato1.nome || 'Sem nome'} (${contatos.contato1.telefone})\n`;
            if (contatos.contato2?.telefone) mensagem += `Contato 2: ${contatos.contato2.nome || 'Sem nome'} (${contatos.contato2.telefone})\n`;
            alert(mensagem); // Simulação: em uma aplicação real, enviar via SMS ou WhatsApp
            console.log('[sos.js] Alerta SOS simulado:', mensagem);
        },
        (error) => {
            console.error('[sos.js] Erro na geolocalização:', error.message);
            alert(`Não foi possível obter sua localização: ${error.message}.`);
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}