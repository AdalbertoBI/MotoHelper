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
        alert('Telefone do Contato 1 inválido! Use o formato internacional, ex.: +5511999999999');
        return;
    }
    if (contato2Telefone && !phoneRegex.test(contato2Telefone)) {
        alert('Telefone do Contato 2 inválido! Use o formato internacional, ex.: +5511999999999');
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
            const mensagem = `🚨 ALERTA SOS 🚨\nEstou precisando de ajuda!\nMinha localização: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${acc.toFixed(0)}m)\nLink: https://www.google.com/maps?q=${lat},${lng}`;
            console.log('[sos.js] SOS:', mensagem);

            const contatos = JSON.parse(localStorage.getItem('contatosEmergencia') || '[]');
            let mensagemCompleta = mensagem;

            if (contatos.length > 0) {
                mensagemCompleta += '\n\nEnviando para:';
                let contatosEnviados = 0;
                contatos.forEach(contato => {
                    mensagemCompleta += `\n- ${contato.nome} (${contato.telefone})`;
                    console.log(`[sos.js] Preparando envio para ${contato.nome}: ${contato.telefone}`);

                    // Gerar link do WhatsApp
                    const telefoneLimpo = contato.telefone.replace(/[^0-9+]/g, '');
                    const mensagemEncoded = encodeURIComponent(mensagem);
                    const whatsappUrl = `https://wa.me/${telefoneLimpo}?text=${mensagemEncoded}`;

                    try {
                        // Tentar abrir o WhatsApp
                        window.open(whatsappUrl, '_blank');
                        contatosEnviados++;
                    } catch (error) {
                        console.error(`[sos.js] Erro ao abrir WhatsApp para ${contato.nome}:`, error);
                        mensagemCompleta += `\n(Falha ao abrir WhatsApp para ${contato.nome})`;
                    }
                });

                if (contatosEnviados === 0) {
                    mensagemCompleta += '\n\nNenhuma mensagem foi enviada. Verifique se o WhatsApp está instalado e se os números estão corretos.';
                } else {
                    mensagemCompleta += `\n\n${contatosEnviados} mensagem(s) preparada(s) para envio via WhatsApp. Confirme o envio no aplicativo.`;
                }
            } else {
                mensagemCompleta += '\n\nNenhum contato de emergência cadastrado.';
            }

            // Exibir alerta com o resultado (incluindo simulação se não houver contatos)
            alert(mensagemCompleta);
        },
        (error) => {
            console.error('[sos.js] Erro na localização para SOS:', error.message);
            alert(`Não foi possível obter localização: ${error.message}`);
        },
        { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
}