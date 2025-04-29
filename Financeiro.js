const MAX_REGISTROS = 1000; // Limite de gastos/ganhos
const STORAGE_EXPIRATION_DAYS = 180; // Expiração de 6 meses

document.addEventListener('DOMContentLoaded', () => {
    console.log('[financeiro.js] DOM carregado. Configurando aba Financeiro...');

    // Configurar listeners
    const btnSalvarKmPorLitro = document.getElementById('btnSalvarKmPorLitro');
    const btnSalvarPrecoPorLitro = document.getElementById('btnSalvarPrecoPorLitro');
    const btnSalvarGasto = document.getElementById('btnSalvarGasto');
    const btnSalvarGanho = document.getElementById('btnSalvarGanho');
    const btnLimparFinanceiro = document.getElementById('btnLimparFinanceiro');

    if (btnSalvarKmPorLitro) {
        btnSalvarKmPorLitro.addEventListener('click', salvarKmPorLitro);
    } else {
        console.error('[financeiro.js] Botão #btnSalvarKmPorLitro não encontrado.');
    }

    if (btnSalvarPrecoPorLitro) {
        btnSalvarPrecoPorLitro.addEventListener('click', salvarPrecoPorLitro);
    } else {
        console.error('[financeiro.js] Botão #btnSalvarPrecoPorLitro não encontrado.');
    }

    if (btnSalvarGasto) {
        btnSalvarGasto.addEventListener('click', salvarGasto);
    } else {
        console.error('[financeiro.js] Botão #btnSalvarGasto não encontrado.');
    }

    if (btnSalvarGanho) {
        btnSalvarGanho.addEventListener('click', salvarGanho);
    } else {
        console.error('[financeiro.js] Botão #btnSalvarGanho não encontrado.');
    }

    if (btnLimparFinanceiro) {
        btnLimparFinanceiro.addEventListener('click', limparFinanceiro);
    } else {
        console.error('[financeiro.js] Botão #btnLimparFinanceiro não encontrado.');
    }

    // Carregar dados iniciais
    carregarKmPorLitro();
    carregarPrecoPorLitro();
    carregarGastos();
    carregarGanhos();
    atualizarSemanasDisponiveis();

    // Sincronizar abas
    window.addEventListener('storage', (event) => {
        if (event.key === 'kmPorLitro') carregarKmPorLitro();
        if (event.key === 'precoPorLitro') carregarPrecoPorLitro();
        if (event.key === 'gastos') carregarGastos();
        if (event.key === 'ganhos') carregarGanhos();
    });

    // Configurar filtro de semana
    const semanaConsulta = document.getElementById('semanaConsulta');
    if (semanaConsulta) {
        semanaConsulta.addEventListener('change', carregarGanhos);
    }

    limparDadosAntigos();
});

function salvarKmPorLitro() {
    const kmPorLitroInput = document.getElementById('kmPorLitro');
    const feedback = document.getElementById('kmPorLitroFeedback');
    if (!kmPorLitroInput || !feedback) return;

    const valor = parseFloat(kmPorLitroInput.value);
    feedback.classList.remove('text-success', 'text-danger');

    if (isNaN(valor) || valor <= 0 || valor > 50) {
        feedback.textContent = 'Digite um valor válido (0 a 50 km/litro).';
        feedback.classList.add('text-danger');
        return;
    }

    try {
        localStorage.setItem('kmPorLitro', valor.toFixed(2));
        feedback.textContent = `Consumo salvo: ${valor.toFixed(2)} km/litro`;
        feedback.classList.add('text-success');
        kmPorLitroInput.classList.add('saved');
        setTimeout(() => kmPorLitroInput.classList.remove('saved'), 1000);
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar kmPorLitro:', e);
        feedback.textContent = 'Erro ao salvar. Limpe o armazenamento.';
        feedback.classList.add('text-danger');
    }
}

function carregarKmPorLitro() {
    const kmPorLitroInput = document.getElementById('kmPorLitro');
    const feedback = document.getElementById('kmPorLitroFeedback');
    if (!kmPorLitroInput || !feedback) return;

    const valor = localStorage.getItem('kmPorLitro');
    if (valor !== null) {
        kmPorLitroInput.value = parseFloat(valor).toFixed(2);
        feedback.textContent = `Consumo atual: ${valor} km/litro`;
        feedback.classList.add('text-success');
    }
}

function salvarPrecoPorLitro() {
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    const feedback = document.getElementById('precoPorLitroFeedback');
    if (!precoPorLitroInput || !feedback) return;

    const valor = parseFloat(precoPorLitroInput.value);
    feedback.classList.remove('text-success', 'text-danger');

    if (isNaN(valor) || valor <= 0 || valor > 20) {
        feedback.textContent = 'Digite um valor válido (0 a 20 R$/litro).';
        feedback.classList.add('text-danger');
        return;
    }

    try {
        localStorage.setItem('precoPorLitro', valor.toFixed(2));
        feedback.textContent = `Preço salvo: R$ ${valor.toFixed(2)}/litro`;
        feedback.classList.add('text-success');
        precoPorLitroInput.classList.add('saved');
        setTimeout(() => precoPorLitroInput.classList.remove('saved'), 1000);
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar precoPorLitro:', e);
        feedback.textContent = 'Erro ao salvar. Limpe o armazenamento.';
        feedback.classList.add('text-danger');
    }
}

function carregarPrecoPorLitro() {
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    const feedback = document.getElementById('precoPorLitroFeedback');
    if (!precoPorLitroInput || !feedback) return;

    const valor = localStorage.getItem('precoPorLitro');
    if (valor !== null) {
        precoPorLitroInput.value = parseFloat(valor).toFixed(2);
        feedback.textContent = `Preço atual: R$ ${valor}/litro`;
        feedback.classList.add('text-success');
    }
}

function salvarGasto() {
    const tipoGastoInput = document.getElementById('tipoGasto');
    const valorGastoInput = document.getElementById('valorGasto');
    const feedbackTipo = document.getElementById('tipoGastoFeedback');
    const feedbackValor = document.getElementById('valorGastoFeedback');
    if (!tipoGastoInput || !valorGastoInput || !feedbackTipo || !feedbackValor) return;

    const tipo = tipoGastoInput.value.trim();
    const valor = parseFloat(valorGastoInput.value);
    feedbackTipo.classList.remove('text-success', 'text-danger');
    feedbackValor.classList.remove('text-success', 'text-danger');

    let erros = [];
    if (!tipo) erros.push('Digite o tipo de gasto.');
    if (isNaN(valor) || valor <= 0) erros.push('Digite um valor válido.');

    if (erros.length > 0) {
        feedbackTipo.textContent = erros[0] || '';
        feedbackValor.textContent = erros[1] || erros[0] || '';
        feedbackTipo.classList.add('text-danger');
        feedbackValor.classList.add('text-danger');
        return;
    }

    const gasto = {
        tipo,
        valor: valor.toFixed(2),
        data: new Date().toISOString(),
        timestamp: Date.now()
    };

    try {
        let gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
        gastos.push(gasto);
        if (gastos.length > MAX_REGISTROS) {
            gastos = gastos.slice(-MAX_REGISTROS);
        }
        localStorage.setItem('gastos', JSON.stringify(gastos));
        carregarGastos();
        tipoGastoInput.value = '';
        valorGastoInput.value = '';
        feedbackTipo.textContent = 'Gasto adicionado!';
        feedbackTipo.classList.add('text-success');
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar gasto:', e);
        feedbackTipo.textContent = 'Erro ao salvar. Limpe o armazenamento.';
        feedbackTipo.classList.add('text-danger');
    }
}

function carregarGastos() {
    const listaGastos = document.getElementById('listaGastos');
    const totalGastos = document.getElementById('totalGastos');
    if (!listaGastos || !totalGastos) return;

    let gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    listaGastos.innerHTML = '';
    let total = 0;

    gastos.forEach((gasto, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            ${gasto.tipo}: R$ ${gasto.valor} 
            <small>(${new Date(gasto.data).toLocaleDateString('pt-BR')})</small>
            <button class="btn btn-danger btn-sm float-right" onclick="removerGasto(${index})" aria-label="Remover gasto">×</button>
        `;
        listaGastos.appendChild(li);
        total += parseFloat(gasto.valor);
    });

    totalGastos.textContent = total.toFixed(2);
}

function salvarGanho() {
    const plataformaInput = document.getElementById('plataformaGanho');
    const kmRodadoInput = document.getElementById('kmRodadoGanho');
    const valorInput = document.getElementById('valorGanho');
    const feedbackPlataforma = document.getElementById('plataformaGanhoFeedback');
    const feedbackKm = document.getElementById('kmRodadoGanhoFeedback');
    const feedbackValor = document.getElementById('valorGanhoFeedback');
    if (!plataformaInput || !kmRodadoInput || !valorInput || !feedbackPlataforma || !feedbackKm || !feedbackValor) return;

    const plataforma = plataformaInput.value.trim();
    const kmRodado = parseFloat(kmRodadoInput.value);
    const valor = parseFloat(valorInput.value);
    feedbackPlataforma.classList.remove('text-success', 'text-danger');
    feedbackKm.classList.remove('text-success', 'text-danger');
    feedbackValor.classList.remove('text-success', 'text-danger');

    let erros = [];
    if (!plataforma) erros.push('Digite a plataforma.');
    if (isNaN(kmRodado) || kmRodado < 0) erros.push('Digite um km válido.');
    if (isNaN(valor) || valor <= 0) erros.push('Digite um valor válido.');

    if (erros.length > 0) {
        feedbackPlataforma.textContent = erros[0] || '';
        feedbackKm.textContent = erros[1] || '';
        feedbackValor.textContent = erros[2] || erros[0] || '';
        feedbackPlataforma.classList.add('text-danger');
        feedbackKm.classList.add('text-danger');
        feedbackValor.classList.add('text-danger');
        return;
    }

    const ganho = {
        plataforma,
        kmRodado: kmRodado.toFixed(1),
        valor: valor.toFixed(2),
        data: new Date().toISOString(),
        timestamp: Date.now()
    };

    try {
        let ganhos = JSON.parse(localStorage.getItem('ganhos') || '[]');
        ganhos.push(ganho);
        if (ganhos.length > MAX_REGISTROS) {
            ganhos = ganhos.slice(-MAX_REGISTROS);
        }
        localStorage.setItem('ganhos', JSON.stringify(ganhos));
        carregarGanhos();
        plataformaInput.value = '';
        kmRodadoInput.value = '';
        valorInput.value = '';
        feedbackPlataforma.textContent = 'Ganho adicionado!';
        feedbackPlataforma.classList.add('text-success');
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar ganho:', e);
        feedbackPlataforma.textContent = 'Erro ao salvar. Limpe o armazenamento.';
        feedbackPlataforma.classList.add('text-danger');
    }
}

function carregarGanhos() {
    const listaGanhos = document.getElementById('listaGanhos');
    const totalGanhos = document.getElementById('totalGanhos');
    const semanaConsulta = document.getElementById('semanaConsulta');
    if (!listaGanhos || !totalGanhos || !semanaConsulta) return;

    let ganhos = JSON.parse(localStorage.getItem('ganhos') || '[]');
    const semanaSelecionada = semanaConsulta.value;
    let ganhosFiltrados = ganhos;

    if (semanaSelecionada) {
        const [ano, semana] = semanaSelecionada.split('-').map(Number);
        ganhosFiltrados = ganhos.filter(ganho => {
            const data = new Date(ganho.data);
            const anoGanho = data.getFullYear();
            const semanaGanho = getWeekNumber(data);
            return anoGanho === ano && semanaGanho === semana;
        });
    } else {
        // Filtrar pela semana atual
        const hoje = new Date();
        const semanaAtual = getWeekNumber(hoje);
        const anoAtual = hoje.getFullYear();
        ganhosFiltrados = ganhos.filter(ganho => {
            const data = new Date(ganho.data);
            return data.getFullYear() === anoAtual && getWeekNumber(data) === semanaAtual;
        });
    }

    listaGanhos.innerHTML = '';
    let total = 0;

    ganhosFiltrados.forEach((ganho, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            ${ganho.plataforma}: R$ ${ganho.valor} (${ganho.kmRodado} km)
            <small>(${new Date(ganho.data).toLocaleDateString('pt-BR')})</small>
            <button class="btn btn-danger btn-sm float-right" onclick="removerGanho(${index})" aria-label="Remover ganho">×</button>
        `;
        listaGanhos.appendChild(li);
        total += parseFloat(ganho.valor);
    });

    totalGanhos.textContent = total.toFixed(2);
}

function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return Math.round(((d - week1) / 86400000 + 1) / 7);
}

function atualizarSemanasDisponiveis() {
    const semanaConsulta = document.getElementById('semanaConsulta');
    if (!semanaConsulta) return;

    const ganhos = JSON.parse(localStorage.getItem('ganhos') || '[]');
    const semanas = new Set();
    ganhos.forEach(ganho => {
        const data = new Date(ganho.data);
        const ano = data.getFullYear();
        const semana = getWeekNumber(data);
        semanas.add(`${ano}-${semana}`);
    });

    semanaConsulta.innerHTML = '<option value="">Semana Atual</option>';
    [...semanas].sort().forEach(semana => {
        const option = document.createElement('option');
        option.value = semana;
        option.textContent = `Semana ${semana.split('-')[1]} de ${semana.split('-')[0]}`;
        semanaConsulta.appendChild(option);
    });
}

function removerGasto(index) {
    let gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    gastos.splice(index, 1);
    localStorage.setItem('gastos', JSON.stringify(gastos));
    carregarGastos();
}

function removerGanho(index) {
    let ganhos = JSON.parse(localStorage.getItem('ganhos') || '[]');
    ganhos.splice(index, 1);
    localStorage.setItem('ganhos', JSON.stringify(ganhos));
    carregarGanhos();
    atualizarSemanasDisponiveis();
}

function limparFinanceiro() {
    if (!confirm('Tem certeza que deseja limpar todos os dados financeiros?')) return;
    localStorage.removeItem('kmPorLitro');
    localStorage.removeItem('precoPorLitro');
    localStorage.removeItem('gastos');
    localStorage.removeItem('ganhos');
    carregarKmPorLitro();
    carregarPrecoPorLitro();
    carregarGastos();
    carregarGanhos();
    atualizarSemanasDisponiveis();
    document.getElementById('kmPorLitroFeedback').textContent = 'Dados limpos!';
    document.getElementById('kmPorLitroFeedback').classList.add('text-success');
}

function limparDadosAntigos() {
    const now = Date.now();
    const expirationMs = STORAGE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    ['gastos', 'ganhos'].forEach(key => {
        let dados = JSON.parse(localStorage.getItem(key) || '[]');
        dados = dados.filter(item => (now - item.timestamp) <= expirationMs);
        localStorage.setItem(key, JSON.stringify(dados));
    });
}