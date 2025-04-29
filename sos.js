document.addEventListener('DOMContentLoaded', () => {
    console.log('[sos.js] DOM carregado. Configurando aba SOS...');
    const btnSalvarContato = document.getElementById('btnSalvarContato');
    if (btnSalvarContato) {
        btnSalvarContato.addEventListener('click', salvarContato);
        console.log('[sos.js] Listener do botão Salvar Contato configurado.');
    } else {
        console.error('[sos.js] Botão #btnSalvarContato não encontrado.');
    }

    carregarContatos();
});

function salvarContato() {
    console.log('[sos.js] Salvando contato...');
    const nomeInput = document.getElementById('nomeContato');
    const telefoneInput = document.getElementById('telefoneContato');
    const feedbackNome = document.getElementById('nomeContatoFeedback');
    const feedbackTelefone = document.getElementById('telefoneContatoFeedback');
    if (!nomeInput || !telefoneInput || !feedbackNome || !feedbackTelefone) return;

    const nome = nomeInput.value.trim();
    const telefone = telefoneInput.value.replace(/[^0-9]/g, '');
    feedbackNome.classList.remove('text-success', 'text-danger');
    feedbackTelefone.classList.remove('text-success', 'text-danger');

    let erros = [];
    if (!nome) erros.push('Digite o nome do contato.');
    if (!telefone || telefone.length < 10 || telefone.length > 11) {
        erros.push('Digite um telefone válido (10 ou 11 dígitos).');
    }

    if (erros.length > 0) {
        feedbackNome.textContent = erros[0] || '';
        feedbackTelefone.textContent = erros[1] || erros[0] || '';
        feedbackNome.classList.add('text-danger');
        feedbackTelefone.classList.add('text-danger');
        return;
    }

    const contato = { nome, telefone };
    try {
        let contatos = JSON.parse(localStorage.getItem('contatos') || '[]');
        contatos.push(contato);
        localStorage.setItem('contatos', JSON.stringify(contatos));
        carregarContatos();
        nomeInput.value = '';
        telefoneInput.value = '';
        feedbackNome.textContent = 'Contato salvo!';
        feedbackNome.classList.add('text-success');
    } catch (e) {
        console.error('[sos.js] Erro ao salvar contato:', e);
        feedbackNome.textContent = 'Erro ao salvar. Limpe o armazenamento.';
        feedbackNome.classList.add('text-danger');
    }
}

function carregarContatos() {
    const listaContatos = document.getElementById('listaContatos');
    if (!listaContatos) return;

    let contatos = JSON.parse(localStorage.getItem('contatos') || '[]');
    listaContatos.innerHTML = '';

    contatos.forEach((contato, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            ${contato.nome}: <a href="tel:${contato.telefone}">${contato.telefone}</a>
            <button class="btn btn-danger btn-sm float-right" onclick="removerContato(${index})" aria-label="Remover contato">×</button>
        `;
        listaContatos.appendChild(li);
    });
}

function removerContato(index) {
    let contatos = JSON.parse(localStorage.getItem('contatos') || '[]');
    contatos.splice(index, 1);
    localStorage.setItem('contatos', JSON.stringify(contatos));
    carregarContatos();
}