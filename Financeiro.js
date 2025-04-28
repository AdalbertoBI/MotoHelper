document.addEventListener('DOMContentLoaded', () => {
    console.log('[financeiro.js] Configurando listeners para Financeiro...');
    const btnSalvarGasto = document.getElementById('btnSalvarGasto');
    if (btnSalvarGasto) btnSalvarGasto.addEventListener('click', salvarGasto);
    else console.warn('[financeiro.js] Botão #btnSalvarGasto não encontrado.');

    const btnSalvarGanho = document.getElementById('btnSalvarGanho');
    if (btnSalvarGanho) btnSalvarGanho.addEventListener('click', salvarGanho);
    else console.warn('[financeiro.js] Botão #btnSalvarGanho não encontrado.');

    const btnSalvarKm = document.getElementById('btnSalvarKmPorLitro');
    if (btnSalvarKm) btnSalvarKm.addEventListener('click', salvarKmPorLitro);
    else console.warn('[financeiro.js] Botão #btnSalvarKmPorLitro não encontrado.');

    const btnSalvarPreco = document.getElementById('btnSalvarPrecoPorLitro');
    if (btnSalvarPreco) btnSalvarPreco.addEventListener('click', salvarPrecoPorLitro);
    else console.warn('[financeiro.js] Botão #btnSalvarPrecoPorLitro não encontrado.');

    const semanaConsulta = document.getElementById('semanaConsulta');
    if (semanaConsulta) semanaConsulta.addEventListener('change', () => carregarGanhos(semanaConsulta.value));
    else console.warn('[financeiro.js] Elemento #semanaConsulta não encontrado.');

    carregarGastos();
    carregarKmPorLitro();
    carregarPrecoPorLitro();
    carregarSemanas();
    carregarGanhos();
});

function salvarGasto() {
    const tipoInput = document.getElementById('tipoGasto');
    const valorInput = document.getElementById('valorGasto');
    if (!tipoInput || !valorInput) {
        console.error('[financeiro.js] Elementos do DOM ausentes.');
        alert('Erro interno: Elementos da página ausentes.');
        return;
    }

    const tipo = tipoInput.value.trim();
    const valor = parseFloat(valorInput.value);
    if (!tipo || isNaN(valor) || valor <= 0) {
        alert('Preencha tipo e valor positivo!');
        return;
    }

    let gastos = [];
    try {
        gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
        if (!Array.isArray(gastos)) throw new Error('Dados de gastos inválidos.');
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar gastos:', e);
        gastos = [];
    }

    const novoGasto = {
        id: Date.now(),
        tipo,
        valor,
        data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
    gastos.push(novoGasto);

    try {
        localStorage.setItem('gastos', JSON.stringify(gastos));
        console.log('[financeiro.js] Gasto salvo:', novoGasto);
        carregarGastos();
        tipoInput.value = '';
        valorInput.value = '';
        tipoInput.focus();
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar gastos:', e);
        alert('Erro ao salvar gasto. Verifique o armazenamento do navegador.');
    }
}

function carregarGastos(semanaSelecionada = '') {
    const listaGastosUl = document.getElementById('listaGastos');
    const totalGastosSpan = document.getElementById('totalGastos');
    if (!listaGastosUl || !totalGastosSpan) {
        console.error('[financeiro.js] Elementos do DOM ausentes.');
        return 0;
    }

    let gastos = [];
    try {
        gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
        if (!Array.isArray(gastos)) throw new Error('Dados de gastos inválidos.');
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar gastos:', e);
        localStorage.setItem('gastos', '[]');
        gastos = [];
    }

    let gastosFiltrados = gastos;
    if (semanaSelecionada) {
        const inicioSemana = new Date(semanaSelecionada);
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(fimSemana.getDate() + 6);
        fimSemana.setHours(23, 59, 59, 999);
        gastosFiltrados = gastos.filter(g => {
            const dataGasto = parseData(g.data);
            return dataGasto >= inicioSemana && dataGasto <= fimSemana;
        });
    } else {
        const hoje = new Date();
        const inicioSemana = getInicioSemana(hoje);
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(fimSemana.getDate() + 6);
        fimSemana.setHours(23, 59, 59, 999);
        gastosFiltrados = gastos.filter(g => {
            const dataGasto = parseData(g.data);
            return dataGasto >= inicioSemana && dataGasto <= fimSemana;
        });
    }

    listaGastosUl.innerHTML = '';
    let total = 0;

    if (gastosFiltrados.length === 0) {
        listaGastosUl.innerHTML = '<li class="list-group-item text-muted">Nenhum gasto registrado.</li>';
    } else {
        gastosFiltrados.sort((a, b) => b.id - a.id);
        gastosFiltrados.forEach(gasto => {
            if (gasto.valor && typeof gasto.valor === 'number') {
                total += gasto.valor;
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.innerHTML = `
                    <span>${gasto.data}: ${gasto.tipo} - <strong>R$ ${gasto.valor.toFixed(2)}</strong></span>
                    <button class="btn btn-outline-danger btn-sm py-0 px-1" onclick="excluirGasto(${gasto.id})" title="Excluir Gasto">×</button>
                `;
                listaGastosUl.appendChild(li);
            }
        });
    }
    totalGastosSpan.textContent = total.toFixed(2);
    console.log('[financeiro.js] Gastos carregados. Total:', total.toFixed(2));
    return total;
}

function salvarGanho() {
    const plataformaInput = document.getElementById('plataformaGanho');
    const kmRodadoInput = document.getElementById('kmRodadoGanho');
    const valorInput = document.getElementById('valorGanho');
    if (!plataformaInput || !kmRodadoInput || !valorInput) {
        console.error('[financeiro.js] Elementos do DOM ausentes.');
        alert('Erro interno: Elementos da página ausentes.');
        return;
    }

    const plataforma = plataformaInput.value.trim();
    const kmRodado = parseFloat(kmRodadoInput.value);
    const valor = parseFloat(valorInput.value);
    if (!plataforma || isNaN(kmRodado) || kmRodado < 0 || isNaN(valor) || valor <= 0) {
        alert('Preencha plataforma, quilometragem válida e valor positivo!');
        return;
    }

    let ganhos = [];
    try {
        ganhos = JSON.parse(localStorage.getItem('ganhos') || '[]');
        if (!Array.isArray(ganhos)) throw new Error('Dados de ganhos inválidos.');
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar ganhos:', e);
        ganhos = [];
    }

    const novoGanho = {
        id: Date.now(),
        plataforma,
        kmRodado,
        valor,
        data: new Date().toISOString()
    };
    ganhos.push(novoGanho);

    try {
        localStorage.setItem('ganhos', JSON.stringify(ganhos));
        console.log('[financeiro.js] Ganho salvo:', novoGanho);
        carregarSemanas();
        carregarGanhos();
        plataformaInput.value = '';
        kmRodadoInput.value = '';
        valorInput.value = '';
        plataformaInput.focus();
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar ganhos:', e);
        alert('Erro ao salvar ganho. Verifique o armazenamento do navegador.');
    }
}

function carregarSemanas() {
    const semanaConsulta = document.getElementById('semanaConsulta');
    if (!semanaConsulta) {
        console.error('[financeiro.js] Elemento #semanaConsulta não encontrado.');
        return;
    }

    let ganhos = [];
    try {
        ganhos = JSON.parse(localStorage.getItem('ganhos') || '[]');
        if (!Array.isArray(ganhos)) throw new Error('Dados de ganhos inválidos.');
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar ganhos:', e);
        localStorage.setItem('ganhos', '[]');
        ganhos = [];
    }

    const datas = ganhos.map(g => new Date(g.data)).sort((a, b) => a - b);
    const semanas = new Set();

    datas.forEach(data => {
        const inicioSemana = getInicioSemana(data);
        semanas.add(inicioSemana.toISOString());
    });

    semanaConsulta.innerHTML = '<option value="">Semana Atual</option>';
    Array.from(semanas).sort((a, b) => new Date(b) - new Date(a)).forEach(inicio => {
        const dataInicio = new Date(inicio);
        const dataFim = new Date(dataInicio);
        dataFim.setDate(dataFim.getDate() + 6);
        const label = `${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}`;
        const option = document.createElement('option');
        option.value = inicio;
        option.textContent = label;
        semanaConsulta.appendChild(option);
    });
}

function getInicioSemana(data) {
    const dia = new Date(data);
    const diaDaSemana = dia.getDay();
    const diff = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
    dia.setDate(dia.getDate() + diff);
    dia.setHours(0, 0, 0, 0);
    return dia;
}

function parseData(dataStr) {
    const [dia, mes, ano] = dataStr.split('/').map(Number);
    return new Date(ano, mes - 1, dia);
}

function carregarGanhos(semanaSelecionada = '') {
    const listaGanhosUl = document.getElementById('listaGanhos');
    const totalGanhosSpan = document.getElementById('totalGanhos');
    if (!listaGanhosUl || !totalGanhosSpan) {
        console.error('[financeiro.js] Elementos do DOM ausentes.');
        return;
    }

    let ganhos = [];
    try {
        ganhos = JSON.parse(localStorage.getItem('ganhos') || '[]');
        if (!Array.isArray(ganhos)) throw new Error('Dados de ganhos inválidos.');
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar ganhos:', e);
        localStorage.setItem('ganhos', '[]');
        ganhos = [];
    }

    listaGanhosUl.innerHTML = '';
    let totalGanhos = 0;
    let totalKmRodado = 0;
    let ganhosFiltrados = ganhos;

    if (semanaSelecionada) {
        const inicioSemana = new Date(semanaSelecionada);
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(fimSemana.getDate() + 6);
        fimSemana.setHours(23, 59, 59, 999);
        ganhosFiltrados = ganhos.filter(g => {
            const dataGanho = new Date(g.data);
            return dataGanho >= inicioSemana && dataGanho <= fimSemana;
        });
    } else {
        const hoje = new Date();
        const inicioSemana = getInicioSemana(hoje);
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(fimSemana.getDate() + 6);
        fimSemana.setHours(23, 59, 59, 999);
        ganhosFiltrados = ganhos.filter(g => {
            const dataGanho = new Date(g.data);
            return dataGanho >= inicioSemana && dataGanho <= fimSemana;
        });
    }

    if (ganhosFiltrados.length === 0) {
        listaGanhosUl.innerHTML = '<li class="list-group-item text-muted">Nenhum ganho registrado.</li>';
    } else {
        ganhosFiltrados.sort((a, b) => new Date(b.data) - new Date(a.data));
        ganhosFiltrados.forEach(ganho => {
            if (ganho.valor && typeof ganho.valor === 'number' && ganho.kmRodado && typeof ganho.kmRodado === 'number') {
                totalGanhos += ganho.valor;
                totalKmRodado += ganho.kmRodado;
                const dataFormatada = new Date(ganho.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.innerHTML = `
                    <span>${dataFormatada}: ${ganho.plataforma} - ${ganho.kmRodado.toFixed(1)} km - <strong>R$ ${ganho.valor.toFixed(2)}</strong></span>
                    <button class="btn btn-outline-danger btn-sm py-0 px-1" onclick="excluirGanho(${ganho.id})" title="Excluir Ganho">×</button>
                `;
                listaGanhosUl.appendChild(li);
            }
        });
    }

    const totalGastos = carregarGastos(semanaSelecionada);
    const lucro = totalGanhos - totalGastos;

    totalGanhosSpan.textContent = totalGanhos.toFixed(2);
    const resumoDiv = document.getElementById('resumoFinanceiro') || document.createElement('div');
    resumoDiv.id = 'resumoFinanceiro';
    resumoDiv.className = 'mt-2';
    resumoDiv.innerHTML = `
        <p>Total de Km Rodados: <strong>${totalKmRodado.toFixed(1)} km</strong></p>
        <p>Lucro da Semana: <strong>R$ ${lucro.toFixed(2)}</strong></p>
    `;
    listaGanhosUl.insertAdjacentElement('afterend', resumoDiv);

    console.log('[financeiro.js] Ganhos carregados. Total:', totalGanhos.toFixed(2), 'Km:', totalKmRodado.toFixed(1), 'Lucro:', lucro.toFixed(2));
}

window.excluirGasto = function(idGasto) {
    if (!confirm('Tem certeza que deseja excluir este gasto?')) return;
    let gastos = [];
    try {
        gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
        gastos = gastos.filter(gasto => gasto.id !== idGasto);
        localStorage.setItem('gastos', JSON.stringify(gastos));
        console.log('[financeiro.js] Gasto excluído:', idGasto);
        carregarGastos();
        carregarGanhos(document.getElementById('semanaConsulta')?.value || '');
    } catch (e) {
        console.error('[financeiro.js] Erro ao excluir gasto:', e);
        alert('Erro ao excluir gasto. Verifique o armazenamento do navegador.');
    }
};

window.excluirGanho = function(idGanho) {
    if (!confirm('Tem certeza que deseja excluir este ganho?')) return;
    let ganhos = [];
    try {
        ganhos = JSON.parse(localStorage.getItem('ganhos') || '[]');
        ganhos = ganhos.filter(ganho => ganho.id !== idGanho);
        localStorage.setItem('ganhos', JSON.stringify(ganhos));
        console.log('[financeiro.js] Ganho excluído:', idGanho);
        carregarSemanas();
        carregarGanhos(document.getElementById('semanaConsulta')?.value || '');
    } catch (e) {
        console.error('[financeiro.js] Erro ao excluir ganho:', e);
        alert('Erro ao excluir ganho. Verifique o armazenamento do navegador.');
    }
};

function salvarKmPorLitro() {
    const kmPorLitroInput = document.getElementById('kmPorLitro');
    const feedbackDiv = document.getElementById('kmPorLitroFeedback');
    if (!kmPorLitroInput || !feedbackDiv) {
        console.error('[financeiro.js] Elementos do DOM ausentes.');
        alert('Erro interno: Elementos da página ausentes.');
        return;
    }

    const kmPorLitro = parseFloat(kmPorLitroInput.value);
    if (isNaN(kmPorLitro) || kmPorLitro <= 0) {
        alert('Digite um valor numérico positivo para Km/Litro!');
        return;
    }

    try {
        localStorage.setItem('kmPorLitro', kmPorLitro);
        console.log('[financeiro.js] Km/Litro salvo:', kmPorLitro);
        feedbackDiv.style.display = 'block';
        setTimeout(() => feedbackDiv.style.display = 'none', 3000);
        carregarKmPorLitro();
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar Km/Litro:', e);
        alert('Erro ao salvar Km/Litro. Verifique o armazenamento do navegador.');
    }
}

function carregarKmPorLitro() {
    const kmPorLitroInput = document.getElementById('kmPorLitro');
    if (!kmPorLitroInput) {
        console.error('[financeiro.js] Elemento #kmPorLitro não encontrado.');
        return;
    }
    try {
        const kmPorLitro = localStorage.getItem('kmPorLitro') || '';
        kmPorLitroInput.value = kmPorLitro;
        console.log('[financeiro.js] Km/Litro carregado:', kmPorLitro || 'N/A');
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar Km/Litro:', e);
        kmPorLitroInput.value = '';
    }
}

function salvarPrecoPorLitro() {
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    const feedbackDiv = document.getElementById('precoPorLitroFeedback');
    if (!precoPorLitroInput || !feedbackDiv) {
        console.error('[financeiro.js] Elementos do DOM ausentes.');
        alert('Erro interno: Elementos da página ausentes.');
        return;
    }

    const precoPorLitro = parseFloat(precoPorLitroInput.value);
    if (isNaN(precoPorLitro) || precoPorLitro <= 0) {
        alert('Digite um valor numérico positivo para Preço/Litro!');
        return;
    }

    try {
        localStorage.setItem('precoPorLitro', precoPorLitro);
        console.log('[financeiro.js] Preço/Litro salvo:', precoPorLitro);
        feedbackDiv.style.display = 'block';
        setTimeout(() => feedbackDiv.style.display = 'none', 3000);
        carregarPrecoPorLitro();
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar Preço/Litro:', e);
        alert('Erro ao salvar Preço/Litro. Verifique o armazenamento do navegador.');
    }
}

function carregarPrecoPorLitro() {
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    if (!precoPorLitroInput) {
        console.error('[financeiro.js] Elemento #precoPorLitro não encontrado.');
        return;
    }
    try {
        const precoPorLitro = localStorage.getItem('precoPorLitro') || '';
        precoPorLitroInput.value = precoPorLitro;
        console.log('[financeiro.js] Preço/Litro carregado:', precoPorLitro || 'N/A');
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar Preço/Litro:', e);
        precoPorLitroInput.value = '';
    }
}