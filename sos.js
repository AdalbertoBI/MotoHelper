document.addEventListener('DOMContentLoaded', () => {
    console.log('[sos.js] Configurando listeners para SOS...');
    const btnPolicia = document.getElementById('btnPolicia');
    const btnSamu = document.getElementById('btnSamu');
    const btnBombeiros = document.getElementById('btnBombeiros');

    if (btnPolicia) btnPolicia.addEventListener('click', () => ligarEmergencia('190'));
    else console.warn('[sos.js] Botão #btnPolicia não encontrado.');

    if (btnSamu) btnSamu.addEventListener('click', () => ligarEmergencia('192'));
    else console.warn('[sos.js] Botão #btnSamu não encontrado.');

    if (btnBombeiros) btnBombeiros.addEventListener('click', () => ligarEmergencia('193'));
    else console.warn('[sos.js] Botão #btnBombeiros não encontrado.');
});

function ligarEmergencia(numero) {
    const url = `tel:${numero}`;
    console.log('[sos.js] Iniciando ligação para:', numero);
    window.location.href = url;
}