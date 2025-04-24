let gastos = JSON.parse(localStorage.getItem('gastos')) || [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('[gastos.js] DOM carregado. Configurando aba Gastos...');
    carregarConfiguracoes();
    atualizarListaGastos();
    configurarListenersGastos();
});

function configurarListenersGastos() {
    console.log('[gastos.js] Configurando listeners da aba Gastos...');
    const btnSalvarKmPorLitro = document.getElementById('btnSalvarKmPorLitro');
    if (btnSalvarKmPorLitro) {
        btnSalvarKmPorLitro.addEventListener('click', salvarKmPorLitro);
    } else {
        console.warn('[gastos.js] Botão #btnSalvarKmPorLitro não encontrado.');
    }

    const btnSalvarPrecoPorLitro = document.getElementById('btnSalvarPrecoPorLitro');
    if (btnSalvarPrecoPorLitro) {
        btnSalvarPrecoPorLitro.addEventListener('click', salvarPrecoPorLitro);
    } else {
        console.warn('[gastos.js] Botão #btnSalvarPrecoPorLitro não encontrado.');
    }

    const btnSalvarGasto = document.getElementById('btnSalvarGasto');
    if (btnSalvarGasto) {
        btnSalvarGasto.addEventListener('click', adicionarGasto);
    } else {
        console.warn('[gastos.js] Botão #btnSalvarGasto não encontrado.');
    }
}

function carregarConfiguracoes() {
    console.log('[gastos.js] Carregando configurações salvas...');
    const kmPorLitro = localStorage.getItem('kmPorLitro');
    const precoPorLitro = localStorage.getItem('precoPorLitro');
    if (kmPorLitro) {
        document.getElementById('kmPorLitro').value = kmPorLitro;
        console.log('[gastos.js] Km por litro carregado:', kmPorLitro);
    }
    if (precoPorLitro) {
        document.getElementById('precoPorLitro').value = precoPorLitro;
        console.log('[gastos.js] Preço por litro carregado:', precoPorLitro);
    }
}

function salvarKmPorLitro() {
    const kmPorLitro = parseFloat(document.getElementById('kmPorLitro').value);
    const feedback = document.getElementById('kmPorLitroFeedback');
    if (isNaN(kmPorLitro) || kmPorLitro <= 0) {
        feedback.style.display = 'block';
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Por favor, insira um valor válido.';
        console.warn('[gastos.js] Km por litro inválido:', kmPorLitro);
        return;
    }
    localStorage.setItem('kmPorLitro', kmPorLitro);
    feedback.className = 'form-text text-success';
    feedback.textContent = 'Consumo salvo com sucesso!';
    feedback.style.display = 'block';
    setTimeout(() => feedback.style.display = 'none', 3000);
    console.log('[gastos.js] Km por litro salvo:', kmPorLitro);
}

function salvarPrecoPorLitro() {
    const precoPorLitro = parseFloat(document.getElementById('precoPorLitro').value);
    const feedback = document.getElementById('precoPorLitroFeedback');
    if (isNaN(precoPorLitro) || precoPorLitro <= 0) {
        feedback.style.display = 'block';
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Por favor, insira um valor válido.';
        console.warn('[gastos.js] Preço por litro inválido:', precoPorLitro);
        return;
    }
    localStorage.setItem('precoPorLitro', precoPorLitro);
    feedback.className = 'form-text text-success';
    feedback.textContent = 'Preço salvo com sucesso!';
    feedback.style.display = 'block';
    setTimeout(() => feedback.style.display = 'none', 3000);
    console.log('[gastos.js] Preço por litro salvo:', precoPorLitro);
}

function adicionarGasto() {
    const tipoGasto = document.getElementById('tipoGasto').value.trim();
    const valorGasto = parseFloat(document.getElementById('valorGasto').value);
    if (!tipoGasto || isNaN(valorGasto) || valorGasto <= 0) {
        alert('Por favor, preencha o tipo de gasto e um valor válido.');
        console.warn('[gastos.js] Dados de gasto inválidos:', { tipoGasto, valorGasto });
        return;
    }

    const gasto = {
        id: Date.now(),
        tipo: tipoGasto,
        valor: valorGasto,
        data: new Date().toLocaleString('pt-BR')
    };

    gastos.push(gasto);
    localStorage.setItem('gastos', JSON.stringify(gastos));
    atualizarListaGastos();
    document.getElementById('tipoGasto').value = '';
    document.getElementById('valorGasto').value = '';
    console.log('[gastos.js] Gasto adicionado:', gasto);
}

function atualizarListaGastos() {
    const listaGastos = document.getElementById('listaGastos');
    const totalGastosSpan = document.getElementById('totalGastos');
    if (!listaGastos || !totalGastosSpan) {
        console.error('[gastos.js] Elementos #listaGastos ou #totalGastos não encontrados.');
        return;
    }

    listaGastos.innerHTML = '';
    if (gastos.length === 0) {
        listaGastos.innerHTML = '<li class="list-group-item">Nenhum gasto registrado.</li>';
        totalGastosSpan.textContent = '0.00';
        console.log('[gastos.js] Nenhum gasto para exibir.');
        return;
    }

    gastos.forEach(gasto => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            ${gasto.tipo} - R$ ${gasto.valor.toFixed(2)} <small class="text-muted">${gasto.data}</small>
            <button class="btn btn-danger btn-sm" onclick="removerGasto(${gasto.id})">×</button>
        `;
        listaGastos.appendChild(li);
    });

    const total = gastos.reduce((sum, gasto) => sum + gasto.valor, 0);
    totalGastosSpan.textContent = total.toFixed(2);
    console.log('[gastos.js] Lista de gastos atualizada. Total: R$', total.toFixed(2));
}

function removerGasto(id) {
    gastos = gastos.filter(gasto => gasto.id !== id);
    localStorage.setItem('gastos', JSON.stringify(gastos));
    atualizarListaGastos();
    console.log('[gastos.js] Gasto removido. ID:', id);
}