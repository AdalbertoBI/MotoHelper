document.addEventListener('DOMContentLoaded', () => {
    console.log('[gastos.js] Configurando listeners para Gastos...');
    const btnSalvarGasto = document.getElementById('btnSalvarGasto');
    if (btnSalvarGasto) btnSalvarGasto.addEventListener('click', salvarGasto);
    else console.warn('[gastos.js] Botão #btnSalvarGasto não encontrado.');

    const btnSalvarKm = document.getElementById('btnSalvarKmPorLitro');
    if (btnSalvarKm) btnSalvarKm.addEventListener('click', salvarKmPorLitro);
    else console.warn('[gastos.js] Botão #btnSalvarKmPorLitro não encontrado.');

    const btnSalvarPreco = document.getElementById('btnSalvarPrecoPorLitro');
    if (btnSalvarPreco) btnSalvarPreco.addEventListener('click', salvarPrecoPorLitro);
    else console.warn('[gastos.js] Botão #btnSalvarPrecoPorLitro não encontrado.');

    const btnSalvarAppNavegacao = document.getElementById('btnSalvarAppNavegacao');
    if (btnSalvarAppNavegacao) btnSalvarAppNavegacao.addEventListener('click', salvarAppNavegacao);
    else console.warn('[gastos.js] Botão #btnSalvarAppNavegacao não encontrado.');

    carregarGastos();
    carregarKmPorLitro();
    carregarPrecoPorLitro();
    carregarAppNavegacao();
});

function salvarGasto() {
    const tipoInput = document.getElementById('tipoGasto');
    const valorInput = document.getElementById('valorGasto');
    if (!tipoInput || !valorInput) {
        console.error('[gastos.js] Elementos do DOM ausentes.');
        return;
    }

    const tipo = tipoInput.value.trim();
    const valor = parseFloat(valorInput.value);
    if (!tipo || isNaN(valor) || valor <= 0) {
        alert('Preencha tipo e valor positivo!');
        return;
    }

    const gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    const novoGasto = {
        id: Date.now(),
        tipo,
        valor,
        data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
    gastos.push(novoGasto);
    localStorage.setItem('gastos', JSON.stringify(gastos));
    console.log('[gastos.js] Gasto salvo:', novoGasto);
    carregarGastos();
    tipoInput.value = '';
    valorInput.value = '';
    tipoInput.focus();
}

function carregarGastos() {
    const listaGastosUl = document.getElementById('listaGastos');
    const totalGastosSpan = document.getElementById('totalGastos');
    if (!listaGastosUl || !totalGastosSpan) {
        console.error('[gastos.js] Elementos do DOM ausentes.');
        return;
    }

    const gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    listaGastosUl.innerHTML = '';
    let total = 0;

    if (gastos.length === 0) {
        listaGastosUl.innerHTML = '<li class="list-group-item text-muted">Nenhum gasto registrado.</li>';
    } else {
        gastos.sort((a, b) => b.id - a.id);
        gastos.forEach(gasto => {
            total += gasto.valor;
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <span>${gasto.data}: ${gasto.tipo} - <strong>R$ ${gasto.valor.toFixed(2)}</strong></span>
                <button class="btn btn-outline-danger btn-sm py-0 px-1" onclick="excluirGasto(${gasto.id})" title="Excluir Gasto">×</button>
            `;
            listaGastosUl.appendChild(li);
        });
    }
    totalGastosSpan.textContent = total.toFixed(2);
    console.log('[gastos.js] Gastos carregados. Total:', total.toFixed(2));
}

// Função global para ser acessível pelo botão de exclusão no DOM
window.excluirGasto = function(idGasto) {
    if (!confirm('Tem certeza que deseja excluir este gasto?')) return;
    let gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    gastos = gastos.filter(gasto => gasto.id !== idGasto);
    localStorage.setItem('gastos', JSON.stringify(gastos));
    console.log('[gastos.js] Gasto excluído:', idGasto);
    carregarGastos();
};

function salvarKmPorLitro() {
    const kmPorLitroInput = document.getElementById('kmPorLitro');
    const feedbackDiv = document.getElementById('kmPorLitroFeedback');
    if (!kmPorLitroInput || !feedbackDiv) {
        console.error('[gastos.js] Elementos do DOM ausentes.');
        return;
    }

    const kmPorLitro = parseFloat(kmPorLitroInput.value);
    if (isNaN(kmPorLitro) || kmPorLitro <= 0) {
        alert('Digite um valor numérico positivo para Km/Litro!');
        return;
    }

    localStorage.setItem('kmPorLitro', kmPorLitro);
    console.log('[gastos.js] Km/Litro salvo:', kmPorLitro);
    feedbackDiv.style.display = 'block';
    setTimeout(() => feedbackDiv.style.display = 'none', 3000);
    carregarKmPorLitro();
}

function carregarKmPorLitro() {
    const kmPorLitroInput = document.getElementById('kmPorLitro');
    if (!kmPorLitroInput) {
        console.error('[gastos.js] Elemento #kmPorLitro não encontrado.');
        return;
    }
    const kmPorLitro = localStorage.getItem('kmPorLitro') || '';
    kmPorLitroInput.value = kmPorLitro;
    console.log('[gastos.js] Km/Litro carregado:', kmPorLitro || 'N/A');
}

function salvarPrecoPorLitro() {
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    const feedbackDiv = document.getElementById('precoPorLitroFeedback');
    if (!precoPorLitroInput || !feedbackDiv) {
        console.error('[gastos.js] Elementos do DOM ausentes.');
        return;
    }

    const precoPorLitro = parseFloat(precoPorLitroInput.value);
    if (isNaN(precoPorLitro) || precoPorLitro <= 0) {
        alert('Digite um valor numérico positivo para Preço/Litro!');
        return;
    }

    localStorage.setItem('precoPorLitro', precoPorLitro);
    console.log('[gastos.js] Preço/Litro salvo:', precoPorLitro);
    feedbackDiv.style.display = 'block';
    setTimeout(() => feedbackDiv.style.display = 'none', 3000);
    carregarPrecoPorLitro();
}

function carregarPrecoPorLitro() {
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    if (!precoPorLitroInput) {
        console.error('[gastos.js] Elemento #precoPorLitro não encontrado.');
        return;
    }
    const precoPorLitro = localStorage.getItem('precoPorLitro') || '';
    precoPorLitroInput.value = precoPorLitro;
    console.log('[gastos.js] Preço/Litro carregado:', precoPorLitro || 'N/A');
}

function salvarAppNavegacao() {
    const appNavegacaoSelect = document.getElementById('appNavegacao');
    const feedbackDiv = document.getElementById('appNavegacaoFeedback');
    if (!appNavegacaoSelect || !feedbackDiv) {
        console.error('[gastos.js] Elementos do DOM ausentes.');
        return;
    }

    const appNavegacao = appNavegacaoSelect.value;
    if (!appNavegacao || !['google_maps', 'waze'].includes(appNavegacao)) {
        alert('Selecione um aplicativo de navegação válido!');
        return;
    }

    localStorage.setItem('appNavegacao', appNavegacao);
    console.log('[gastos.js] Aplicativo de navegação salvo:', appNavegacao);
    feedbackDiv.style.display = 'block';
    setTimeout(() => feedbackDiv.style.display = 'none', 3000);
    carregarAppNavegacao();
}

function carregarAppNavegacao() {
    const appNavegacaoSelect = document.getElementById('appNavegacao');
    if (!appNavegacaoSelect) {
        console.error('[gastos.js] Elemento #appNavegacao não encontrado.');
        return;
    }
    const appNavegacao = localStorage.getItem('appNavegacao') || 'google_maps';
    appNavegacaoSelect.value = appNavegacao;
    console.log('[gastos.js] Aplicativo de navegação carregado:', appNavegacao);
}