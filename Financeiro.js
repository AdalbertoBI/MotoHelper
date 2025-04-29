const MAX_REGISTROS = 500; // Limite de registros para gastos e ganhos
const STORAGE_EXPIRATION_DAYS = 90; // Expiração de dados em 90 dias

// Função para verificar espaço disponível no localStorage
function checkStorageAvailability(data) {
    try {
        const testKey = '__test__';
        const testData = JSON.stringify(data);
        localStorage.setItem(testKey, testData);
        localStorage.removeItem(testKey);
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += ((localStorage[key].length + key.length) * 2);
            }
        }
        // Limite típico de 5MB
        if (totalSize > 4.5 * 1024 * 1024) {
            console.warn('[financeiro.js] localStorage próximo do limite:', totalSize / (1024 * 1024), 'MB');
            return false;
        }
        return true;
    } catch (e) {
        console.error('[financeiro.js] Espaço insuficiente no localStorage:', e);
        return false;
    }
}

// Função para comprimir dados
function compressData(data) {
    try {
        return LZString.compressToUTF16(JSON.stringify(data));
    } catch (e) {
        console.error('[financeiro.js] Erro ao comprimir dados:', e);
        return JSON.stringify(data);
    }
}

// Função para descomprimir dados
function decompressData(compressed) {
    try {
        return JSON.parse(LZString.decompressFromUTF16(compressed) || '[]');
    } catch (e) {
        console.error('[financeiro.js] Erro ao descomprimir dados:', e);
        return [];
    }
}

// Função para detectar modo anônimo
function isIncognito() {
    try {
        localStorage.setItem('__test_incognito__', 'test');
        localStorage.removeItem('__test_incognito__');
        return false;
    } catch (e) {
        return true;
    }
}

// Função para exibir notificações temporárias
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Função para limpar dados antigos
function limparDadosAntigos() {
    const now = Date.now();
    const expirationMs = STORAGE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    let gastos = decompressData(localStorage.getItem('gastos') || compressData([]));
    let ganhos = decompressData(localStorage.getItem('ganhos') || compressData([]));

    gastos = gastos.filter(g => now - new Date(g.data).getTime() <= expirationMs);
    ganhos = ganhos.filter(g => now - new Date(g.data).getTime() <= expirationMs);

    try {
        if (gastos.length > MAX_REGISTROS) gastos = gastos.slice(-MAX_REGISTROS);
        if (ganhos.length > MAX_REGISTROS) ganhos = ganhos.slice(-MAX_REGISTROS);
        localStorage.setItem('gastos', compressData(gastos));
        localStorage.setItem('ganhos', compressData(ganhos));
        console.log('[financeiro.js] Dados antigos limpos.');
    } catch (e) {
        console.error('[financeiro.js] Erro ao limpar dados antigos:', e);
        showToast('Erro ao limpar dados antigos. Tente novamente.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[financeiro.js] DOM carregado. Configurando aba Financeiro...');

    // Verificar modo anônimo
    if (isIncognito()) {
        showToast('Modo anônimo detectado. O salvamento pode não funcionar corretamente.', 'error');
    }

    // Configurar listeners
    const btnSalvarKmPorLitro = document.getElementById('btnSalvarKmPorLitro');
    const btnSalvarPrecoPorLitro = document.getElementById('btnSalvarPrecoPorLitro');
    const btnSalvarGasto = document.getElementById('btnSalvarGasto');
    const btnSalvarGanho = document.getElementById('btnSalvarGanho');
    const btnLimparFinanceiro = document.getElementById('btnLimparFinanceiro');
    const btnLimparCache = document.getElementById('btnLimparCache');

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

    if (btnLimparCache) {
        btnLimparCache.addEventListener('click', limparCache);
    } else {
        console.error('[financeiro.js] Botão #btnLimparCache não encontrado.');
    }

    // Carregar dados iniciais
    carregarKmPorLitro();
    carregarPrecoPorLitro();
    carregarGastos();
    carregarGanhos();
    configurarFiltroSemana();

    // Sincronizar dados entre abas
    window.addEventListener('storage', (event) => {
        if (event.key === 'kmPorLitro') carregarKmPorLitro();
        if (event.key === 'precoPorLitro') carregarPrecoPorLitro();
        if (event.key === 'gastos') carregarGastos();
        if (event.key === 'ganhos') carregarGanhos();
    });

    // Limpar dados antigos
    limparDadosAntigos();
});

function salvarKmPorLitro() {
    const input = document.getElementById('kmPorLitro');
    const feedback = document.getElementById('kmPorLitroFeedback');
    if (!input || !feedback) {
        console.error('[financeiro.js] Elementos #kmPorLitro ou #kmPorLitroFeedback não encontrados.');
        return;
    }

    const valor = parseFloat(input.value);
    if (isNaN(valor) || valor <= 0 || valor > 50) {
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Por favor, insira um valor válido entre 0 e 50.';
        return;
    }

    try {
        if (!checkStorageAvailability({ kmPorLitro: valor })) {
            limparDadosAntigos();
            if (!checkStorageAvailability({ kmPorLitro: valor })) {
                showToast('Armazenamento cheio. Tente limpar o cache.', 'error');
                return;
            }
        }
        localStorage.setItem('kmPorLitro', valor.toFixed(2));
        input.classList.add('saved');
        setTimeout(() => input.classList.remove('saved'), 1000);
        feedback.className = 'form-text text-success';
        feedback.textContent = 'Consumo salvo com sucesso!';
        showToast('Consumo salvo com sucesso!', 'success');
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar kmPorLitro:', e);
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Erro ao salvar. Tente limpar o cache.';
        showToast('Erro ao salvar consumo. Tente novamente.', 'error');
        // Fallback para sessionStorage
        try {
            sessionStorage.setItem('kmPorLitro', valor.toFixed(2));
            feedback.textContent += ' (Salvo temporariamente)';
        } catch (e2) {
            console.error('[financeiro.js] Fallback para sessionStorage falhou:', e2);
        }
    }
}

function carregarKmPorLitro() {
    const input = document.getElementById('kmPorLitro');
    const feedback = document.getElementById('kmPorLitroFeedback');
    if (!input || !feedback) return;

    let valor = parseFloat(localStorage.getItem('kmPorLitro'));
    if (isNaN(valor)) {
        valor = parseFloat(sessionStorage.getItem('kmPorLitro'));
    }
    if (!isNaN(valor)) {
        input.value = valor.toFixed(2);
        feedback.className = 'form-text text-muted';
        feedback.textContent = 'Valor carregado.';
    } else {
        feedback.className = 'form-text text-muted';
        feedback.textContent = 'Nenhum valor salvo.';
    }
}

function salvarPrecoPorLitro() {
    const input = document.getElementById('precoPorLitro');
    const feedback = document.getElementById('precoPorLitroFeedback');
    if (!input || !feedback) {
        console.error('[financeiro.js] Elementos #precoPorLitro ou #precoPorLitroFeedback não encontrados.');
        return;
    }

    const valor = parseFloat(input.value);
    if (isNaN(valor) || valor <= 0 || valor > 20) {
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Por favor, insira um valor válido entre 0 e 20.';
        return;
    }

    try {
        if (!checkStorageAvailability({ precoPorLitro: valor })) {
            limparDadosAntigos();
            if (!checkStorageAvailability({ precoPorLitro: valor })) {
                showToast('Armazenamento cheio. Tente limpar o cache.', 'error');
                return;
            }
        }
        localStorage.setItem('precoPorLitro', valor.toFixed(2));
        input.classList.add('saved');
        setTimeout(() => input.classList.remove('saved'), 1000);
        feedback.className = 'form-text text-success';
        feedback.textContent = 'Preço salvo com sucesso!';
        showToast('Preço salvo com sucesso!', 'success');
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar precoPorLitro:', e);
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Erro ao salvar. Tente limpar o cache.';
        showToast('Erro ao salvar preço. Tente novamente.', 'error');
        // Fallback para sessionStorage
        try {
            sessionStorage.setItem('precoPorLitro', valor.toFixed(2));
            feedback.textContent += ' (Salvo temporariamente)';
        } catch (e2) {
            console.error('[financeiro.js] Fallback para sessionStorage falhou:', e2);
        }
    }
}

function carregarPrecoPorLitro() {
    const input = document.getElementById('precoPorLitro');
    const feedback = document.getElementById('precoPorLitroFeedback');
    if (!input || !feedback) return;

    let valor = parseFloat(localStorage.getItem('precoPorLitro'));
    if (isNaN(valor)) {
        valor = parseFloat(sessionStorage.getItem('precoPorLitro'));
    }
    if (!isNaN(valor)) {
        input.value = valor.toFixed(2);
        feedback.className = 'form-text text-muted';
        feedback.textContent = 'Valor carregado.';
    } else {
        feedback.className = 'form-text text-muted';
        feedback.textContent = 'Nenhum valor salvo.';
    }
}

function salvarGasto() {
    const tipo = document.getElementById('tipoGasto')?.value.trim();
    const valor = parseFloat(document.getElementById('valorGasto')?.value);
    const feedback = document.getElementById('valorGastoFeedback');
    if (!tipo || isNaN(valor) || valor <= 0) {
        if (feedback) {
            feedback.className = 'form-text text-danger';
            feedback.textContent = 'Preencha o tipo e um valor válido.';
        }
        return;
    }

    let gastos = decompressData(localStorage.getItem('gastos') || compressData([]));
    const novoGasto = {
        tipo,
        valor: valor.toFixed(2),
        data: new Date().toISOString()
    };

    try {
        gastos.push(novoGasto);
        if (gastos.length > MAX_REGISTROS) gastos = gastos.slice(-MAX_REGISTROS);
        if (!checkStorageAvailability(gastos)) {
            limparDadosAntigos();
            if (!checkStorageAvailability(gastos)) {
                showToast('Armazenamento cheio. Tente limpar o cache.', 'error');
                return;
            }
        }
        localStorage.setItem('gastos', compressData(gastos));
        document.getElementById('tipoGasto').value = '';
        document.getElementById('valorGasto').value = '';
        feedback.className = 'form-text text-success';
        feedback.textContent = 'Gasto adicionado!';
        showToast('Gasto adicionado com sucesso!', 'success');
        carregarGastos();
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar gasto:', e);
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Erro ao salvar gasto. Tente limpar o cache.';
        showToast('Erro ao salvar gasto. Tente novamente.', 'error');
    }
}

function carregarGastos() {
    const lista = document.getElementById('listaGastos');
    const totalSpan = document.getElementById('totalGastos');
    if (!lista || !totalSpan) return;

    let gastos = decompressData(localStorage.getItem('gastos') || compressData([]));
    lista.innerHTML = '';
    let total = 0;

    gastos.forEach((gasto, index) => {
        total += parseFloat(gasto.valor);
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `${gasto.tipo}: R$ ${gasto.valor} <small>(${new Date(gasto.data).toLocaleDateString('pt-BR')})</small>
                        <button class="btn btn-danger btn-sm" onclick="removerGasto(${index})" aria-label="Remover gasto">×</button>`;
        lista.appendChild(li);
    });

    totalSpan.textContent = total.toFixed(2);
}

function removerGasto(index) {
    let gastos = decompressData(localStorage.getItem('gastos') || compressData([]));
    gastos.splice(index, 1);
    try {
        localStorage.setItem('gastos', compressData(gastos));
        carregarGastos();
        showToast('Gasto removido com sucesso!', 'success');
    } catch (e) {
        console.error('[financeiro.js] Erro ao remover gasto:', e);
        showToast('Erro ao remover gasto. Tente novamente.', 'error');
    }
}

function salvarGanho() {
    const plataforma = document.getElementById('plataformaGanho')?.value.trim();
    const kmRodado = parseFloat(document.getElementById('kmRodadoGanho')?.value);
    const valor = parseFloat(document.getElementById('valorGanho')?.value);
    const feedback = document.getElementById('valorGanhoFeedback');
    if (!plataforma || isNaN(kmRodado) || kmRodado < 0 || isNaN(valor) || valor <= 0) {
        if (feedback) {
            feedback.className = 'form-text text-danger';
            feedback.textContent = 'Preencha todos os campos com valores válidos.';
        }
        return;
    }

    let ganhos = decompressData(localStorage.getItem('ganhos') || compressData([]));
    const novoGanho = {
        plataforma,
        kmRodado: kmRodado.toFixed(1),
        valor: valor.toFixed(2),
        data: new Date().toISOString()
    };

    try {
        ganhos.push(novoGanho);
        if (ganhos.length > MAX_REGISTROS) ganhos = ganhos.slice(-MAX_REGISTROS);
        if (!checkStorageAvailability(ganhos)) {
            limparDadosAntigos();
            if (!checkStorageAvailability(ganhos)) {
                showToast('Armazenamento cheio. Tente limpar o cache.', 'error');
                return;
            }
        }
        localStorage.setItem('ganhos', compressData(ganhos));
        document.getElementById('plataformaGanho').value = '';
        document.getElementById('kmRodadoGanho').value = '';
        document.getElementById('valorGanho').value = '';
        feedback.className = 'form-text text-success';
        feedback.textContent = 'Ganho adicionado!';
        showToast('Ganho adicionado com sucesso!', 'success');
        carregarGanhos();
    } catch (e) {
        console.error('[financeiro.js] Erro ao salvar ganho:', e);
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Erro ao salvar ganho. Tente limpar o cache.';
        showToast('Erro ao salvar ganho. Tente novamente.', 'error');
    }
}

function carregarGanhos() {
    const lista = document.getElementById('listaGanhos');
    const totalSpan = document.getElementById('totalGanhos');
    const semanaConsulta = document.getElementById('semanaConsulta')?.value;
    if (!lista || !totalSpan) return;

    let ganhos = decompressData(localStorage.getItem('ganhos') || compressData([]));
    if (semanaConsulta) {
        const [ano, semana] = semanaConsulta.split('-W');
        ganhos = ganhos.filter(ganho => {
            const date = new Date(ganho.data);
            const year = date.getFullYear();
            const week = getWeekNumber(date);
            return year === parseInt(ano) && week === parseInt(semana);
        });
    }

    lista.innerHTML = '';
    let total = 0;

    ganhos.forEach((ganho, index) => {
        total += parseFloat(ganho.valor);
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `${ganho.plataforma}: R$ ${ganho.valor} (${ganho.kmRodado} km) <small>(${new Date(ganho.data).toLocaleDateString('pt-BR')})</small>
                        <button class="btn btn-danger btn-sm" onclick="removerGanho(${index})" aria-label="Remover ganho">×</button>`;
        lista.appendChild(li);
    });

    totalSpan.textContent = total.toFixed(2);
}

function removerGanho(index) {
    let ganhos = decompressData(localStorage.getItem('ganhos') || compressData([]));
    ganhos.splice(index, 1);
    try {
        localStorage.setItem('ganhos', compressData(ganhos));
        carregarGanhos();
        showToast('Ganho removido com sucesso!', 'success');
    } catch (e) {
        console.error('[financeiro.js] Erro ao remover ganho:', e);
        showToast('Erro ao remover ganho. Tente novamente.', 'error');
    }
}

function limparFinanceiro() {
    if (!confirm('Tem certeza que deseja limpar todos os dados financeiros? Isso não pode ser desfeito.')) return;
    try {
        localStorage.removeItem('kmPorLitro');
        localStorage.removeItem('precoPorLitro');
        localStorage.removeItem('gastos');
        localStorage.removeItem('ganhos');
        sessionStorage.removeItem('kmPorLitro');
        sessionStorage.removeItem('precoPorLitro');
        document.getElementById('kmPorLitro').value = '';
        document.getElementById('precoPorLitro').value = '';
        document.getElementById('tipoGasto').value = '';
        document.getElementById('valorGasto').value = '';
        document.getElementById('plataformaGanho').value = '';
        document.getElementById('kmRodadoGanho').value = '';
        document.getElementById('valorGanho').value = '';
        carregarKmPorLitro();
        carregarPrecoPorLitro();
        carregarGastos();
        carregarGanhos();
        showToast('Dados financeiros limpos com sucesso!', 'success');
    } catch (e) {
        console.error('[financeiro.js] Erro ao limpar financeiro:', e);
        showToast('Erro ao limpar dados financeiros. Tente novamente.', 'error');
    }
}

function limparCache() {
    try {
        localStorage.removeItem('cacheBusca');
        showToast('Cache de busca limpo com sucesso!', 'success');
    } catch (e) {
        console.error('[financeiro.js] Erro ao limpar cache:', e);
        showToast('Erro ao limpar cache. Tente novamente.', 'error');
    }
}

function configurarFiltroSemana() {
    const select = document.getElementById('semanaConsulta');
    if (!select) return;

    select.addEventListener('change', carregarGanhos);
    const hoje = new Date();
    const semanas = new Set();

    let ganhos = decompressData(localStorage.getItem('ganhos') || compressData([]));
    ganhos.forEach(ganho => {
        const date = new Date(ganho.data);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        semanas.add(`${year}-W${week.toString().padStart(2, '0')}`);
    });

    semanas.forEach(semana => {
        const [ano, semanaNum] = semana.split('-W');
        const option = document.createElement('option');
        option.value = semana;
        option.textContent = `Semana ${semanaNum} de ${ano}`;
        select.appendChild(option);
    });
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}