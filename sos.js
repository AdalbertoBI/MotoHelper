document.addEventListener('DOMContentLoaded', () => {
    console.log('[sos.js] Configurando listener para SOS...');
    const btnSOS = document.getElementById('btnSOS');
    if (btnSOS) btnSOS.addEventListener('click', enviarSOS);
    else console.warn('[sos.js] Botão #btnSOS não encontrado.');

    const btnSalvarContatos = document.getElementById('btnSalvarContatos');
    if (btnSalvarContatos) btnSalvarContatos.addEventListener('click', salvarContatos);
    else console.warn('[sos.js] Botão #btnSalvarContatos não encontrado.');

    carregarContatos();
});

function salvarContatos() {
    const contato1Nome = document.getElementById('contato1Nome').value.trim();
    let contato1Telefone = document.getElementById('contato1Telefone').value.trim();
    const contato2Nome = document.getElementById('contato2Nome').value.trim();
    let contato2Telefone = document.getElementById('contato2Telefone').value.trim();
    const feedbackDiv = document.getElementById('contatosFeedback');

    // Validação dos números de telefone
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // Formato internacional básico (ex.: +5511999999999)
    if (contato1Telefone && !phoneRegex.test(contato1Telefone)) {
        console.warn('[sos.js] Telefone do Contato 1 inválido:', contato1Telefone);
        return;
    }
    if (contato2Telefone && !phoneRegex.test(contato2Telefone)) {
        console.warn('[sos.js] Telefone do Contato 2 inválido:', contato2Telefone);
        return;
    }

    // Remover caracteres desnecessários e garantir o formato
    if (contato1Telefone) {
        contato1Telefone = contato1Telefone.replace(/\s|-/g, '');
        if (!contato1Telefone.startsWith('+')) {
            contato1Telefone = '+' + contato1Telefone;
        }
    }
    if (contato2Telefone) {
        contato2Telefone = contato2Telefone.replace(/\s|-/g, '');
        if (!contato2Telefone.startsWith('+')) {
            contato2Telefone = '+' + contato2Telefone;
        }
    }

    const contatos = [];
    if (contato1Nome && contato1Telefone) {
        contatos.push({ nome: contato1Nome, telefone: contato1Telefone });
    }
    if (contato2Nome && contato2Telefone) {
        contatos.push({ nome: contato2Nome, telefone: contato2Telefone });
    }

    localStorage.setItem('contatosEmergencia', JSON.stringify(contatos));
    console.log('[sos.js] Contatos salvos:', contatos);
    feedbackDiv.style.display = 'block';
    setTimeout(() => feedbackDiv.style.display = 'none', 3000);
    carregarContatos();
}

function carregarContatos() {
    const contatos = JSON.parse(localStorage.getItem('contatosEmergencia') || '[]');
    const contato1Nome = document.getElementById('contato1Nome');
    const contato1Telefone = document.getElementById('contato1Telefone');
    const contato2Nome = document.getElementById('contato2Nome');
    const contato2Telefone = document.getElementById('contato2Telefone');

    if (contatos[0]) {
        contato1Nome.value = contatos[0].nome;
        contato1Telefone.value = contatos[0].telefone;
    } else {
        contato1Nome.value = '';
        contato1Telefone.value = '';
    }
    if (contatos[1]) {
        contato2Nome.value = contatos[1].nome;
        contato2Telefone.value = contatos[1].telefone;
    } else {
        contato2Nome.value = '';
        contato2Telefone.value = '';
    }
    console.log('[sos.js] Contatos carregados:', contatos);
}

// Função para adicionar pausa (delay) entre ações
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function enviarSOS() {
    if (!navigator.geolocation) {
        console.error('[sos.js] Geolocalização não suportada pelo navegador.');
        return;
    }

    console.log('[sos.js] Obtendo localização para SOS...');
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = pos.coords.accuracy;
            const mensagem = `🚨 ALERTA SOS 🚨\nEstou precisando de ajuda!\nMinha localização: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${acc.toFixed(0)}m)\nLink: https://www.google.com/maps?q=${lat},${lng}`;
            console.log('[sos.js] Mensagem SOS gerada:', mensagem);

            const contatos = JSON.parse(localStorage.getItem('contatosEmergencia') || '[]');
            if (contatos.length === 0) {
                console.warn('[sos.js] Nenhum contato de emergência cadastrado.');
                return;
            }

            console.log('[sos.js] Enviando mensagem para', contatos.length, 'contato(s)...');
            for (let i = 0; i < contatos.length; i++) {
                const contato = contatos[i];
                console.log(`[sos.js] Preparando envio para ${contato.nome}: ${contato.telefone}`);

                // Gerar link do WhatsApp usando o esquema whatsapp://
                const telefoneLimpo = contato.telefone.replace(/[^0-9+]/g, '').replace('+', ''); // Remove o "+" para o esquema whatsapp://
                const mensagemEncoded = encodeURIComponent(mensagem);
                const whatsappUrl = `whatsapp://send?phone=${telefoneLimpo}&text=${mensagemEncoded}`;

                try {
                    // Abrir o WhatsApp diretamente no app
                    window.location.href = whatsappUrl;
                    console.log(`[sos.js] Link do WhatsApp aberto para ${contato.nome}: ${whatsappUrl}`);
                    
                    // Adicionar pausa de 10 segundos antes de abrir o próximo link
                    if (i < contatos.length - 1) {
                        console.log('[sos.js] Aguardando 10 segundos antes de abrir o próximo link...');
                        await delay(10000);
                    }
                } catch (error) {
                    console.error(`[sos.js] Erro ao abrir WhatsApp para ${contato.nome}:`, error);
                }
            }

            console.log('[sos.js] Processo de envio concluído.');
        },
        (error) => {
            console.error('[sos.js] Erro na localização para SOS:', error.message);
        },
        { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
}