document.addEventListener('DOMContentLoaded', () => {
    console.log('[sos.js] Configurando listeners para SOS...');
    const btnSalvarContato = document.getElementById('btnSalvarContato');
    if (btnSalvarContato) {
        btnSalvarContato.addEventListener('click', salvarContato);
    } else {
        console.warn('[sos.js] Botão #btnSalvarContato não encontrado.');
    }
    carregarContatos();
});

function salvarContato() {
    const nomeInput = document.getElementById('nomeContato');
    const telefoneInput = document.getElementById('telefoneContato');
    if (!nomeInput || !telefoneInput) {
        console.error('[sos.js] Elementos do DOM ausentes.');
        alert('Erro interno: Elementos da página ausentes.');
        return;
    }

    const nome = nomeInput.value.trim();
    const telefone = telefoneInput.value.trim().replace(/\D/g, ''); // Remove caracteres não numéricos
    const telefoneRegex = /^\d{10,11}$/; // Aceita 10 ou 11 dígitos (DDD + número)

    if (!nome) {
        alert('Digite o nome do contato!');
        nomeInput.focus();
        return;
    }
    if (!telefoneRegex.test(telefone)) {
        alert('Digite um telefone válido (DDD + número, 10 ou 11 dígitos)!');
        telefoneInput.focus();
        return;
    }

    let contatos = [];
    try {
        contatos = JSON.parse(localStorage.getItem('contatos') || '[]');
        if (!Array.isArray(contatos)) throw new Error('Dados de contatos inválidos.');
    } catch (e) {
        console.error('[sos.js] Erro ao carregar contatos:', e);
        contatos = [];
    }

    const novoContato = {
        id: Date.now(),
        nome,
        telefone,
        data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
    contatos.push(novoContato);

    try {
        localStorage.setItem('contatos', JSON.stringify(contatos));
        console.log('[sos.js] Contato salvo:', novoContato);
        carregarContatos();
        nomeInput.value = '';
        telefoneInput.value = '';
        nomeInput.focus();
        mostrarFeedback('Contato salvo com sucesso!');
    } catch (e) {
        console.error('[sos.js] Erro ao salvar contatos:', e);
        alert('Erro ao salvar contato. Verifique o armazenamento do navegador.');
    }
}

function carregarContatos() {
    const listaContatosUl = document.getElementById('listaContatos');
    if (!listaContatosUl) {
        console.error('[sos.js] Elemento #listaContatos não encontrado.');
        return;
    }

    let contatos = [];
    try {
        contatos = JSON.parse(localStorage.getItem('contatos') || '[]');
        if (!Array.isArray(contatos)) throw new Error('Dados de contatos inválidos.');
    } catch (e) {
        console.error('[sos.js] Erro ao carregar contatos:', e);
        localStorage.setItem('contatos', '[]');
        contatos = [];
    }

    listaContatosUl.innerHTML = '';
    if (contatos.length === 0) {
        listaContatosUl.innerHTML = '<li class="list-group-item text-muted">Nenhum contato registrado.</li>';
    } else {
        contatos.sort((a, b) => b.id - a.id);
        contatos.forEach(contato => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <span>${contato.data}: ${contato.nome} - <a href="tel:${contato.telefone}" title="Ligar">${formatarTelefone(contato.telefone)}</a></span>
                <button class="btn btn-outline-danger btn-sm py-0 px-1" onclick="excluirContato(${contato.id})" title="Excluir Contato">×</button>
            `;
            listaContatosUl.appendChild(li);
        });
    }
    console.log('[sos.js] Contatos carregados:', contatos.length);
}

function formatarTelefone(telefone) {
    if (telefone.length === 11) {
        return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`;
    } else if (telefone.length === 10) {
        return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`;
    }
    return telefone;
}

function mostrarFeedback(mensagem) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'form-text text-success';
    feedbackDiv.textContent = mensagem;
    const btnSalvarContato = document.getElementById('btnSalvarContato');
    if (btnSalvarContato) {
        btnSalvarContato.insertAdjacentElement('afterend', feedbackDiv);
        setTimeout(() => feedbackDiv.remove(), 3000);
    }
}

window.excluirContato = function(idContato) {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;
    let contatos = [];
    try {
        contatos = JSON.parse(localStorage.getItem('contatos') || '[]');
        contatos = contatos.filter(contato => contato.id !== idContato);
        localStorage.setItem('contatos', JSON.stringify(contatos));
        console.log('[sos.js] Contato excluído:', idContato);
        carregarContatos();
    } catch (e) {
        console.error('[sos.js] Erro ao excluir contato:', e);
        alert('Erro ao excluir contato. Verifique o armazenamento do navegador.');
    }
};