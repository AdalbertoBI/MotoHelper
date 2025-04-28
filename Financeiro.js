document.addEventListener('DOMContentLoaded', () => {
    // Verificar disponibilidade do localStorage
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        console.log('[financeiro.js] localStorage disponível.');
    } catch (e) {
        console.error('[financeiro.js] localStorage não disponível:', e);
        alert('Erro: Armazenamento local não disponível. Verifique as configurações do navegador ou permissões de armazenamento.');
        return;
    }

    // Função para registrar eventos com verificação robusta
    function registerEvent(elementId, event, handler, errorMessage) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`[financeiro.js] Evento '${event}' registrado para #${elementId}.`);
        } else {
            console.warn(`[financeiro.js] ${errorMessage}`);
        }
    }

    registerEvent('btnSalvarGasto', 'click', salvarGasto, 'Botão #btnSalvarGasto não encontrado.');
    registerEvent('btnSalvarGanho', 'click', salvarGanho, 'Botão #btnSalvarGanho não encontrado.');
    registerEvent('btnSalvarKmPorLitro', 'click', salvarKmPorLitro, 'Botão #btnSalvarKmPorLitro não encontrado.');
    registerEvent('btnSalvarPrecoPorLitro', 'click', salvarPrecoPorLitro, 'Botão #btnSalvarPrecoPorLitro não encontrado.');
    registerEvent('semanaConsulta', 'change', () => carregarGanhos(document.getElementById('semanaConsulta')?.value), 'Elemento #semanaConsulta não encontrado.');

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
        console.error('[financeiro.js] Elementos do DOM ausentes: tipoGasto ou valorGasto');
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
        console.error('[financeiro.js] Elementos do DOM ausentes: listaGastos ou totalGastos');
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
        console.error('[financeiro.js] Elementos do DOM ausentes: plataformaGanho, kmRodadoGanho ou valorGanho');
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
    console.log('[financeiro.js] Semanas carregadas:', semanas.size);
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
        console.error('[financeiro.js] Elementos do DOM ausentes: listaGanhos ou totalGanhos');
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
        console.error('[financeiro.js] Elementos do DOM ausentes: kmPorLitro ou kmPorLitroFeedback');
        alert('Erro interno: Elementos da página ausentes.');
        return;
    }

    console.log('[financeiro.js] Iniciando salvamento de Km/Litro...');

    // Validação robusta do valor inserido
    const inputValue = kmPorLitroInput.value.trim();
    if (inputValue === '') {
        alert('Por favor, insira um valor para Km/Litro!');
        kmPorLitroInput.focus();
        return;
    }

    const kmPorLitro = parseFloat(inputValue);
    if (isNaN(kmPorLitro)) {
        alert('Digite um valor numérico válido para Km/Litro!');
        kmPorLitroInput.focus();
        return;
    }

    if (kmPorLitro <= 0) {
        alert('O valor de Km/Litro deve ser maior que zero!');
        kmPorLitroInput.focus();
        return;
    }

    if (kmPorLitro > 100) {
        alert('O valor de Km/Litro parece muito alto. O máximo permitido é 100 km/litro. Verifique o valor inserido.');
        kmPorLitroInput.focus();
        return;
    }

    const formattedValue = kmPorLitro.toFixed(2);

    try {
        localStorage.setItem('kmPorLitro', formattedValue);
        console.log('[financeiro.js] Km/Litro salvo no localStorage:', formattedValue);
        carregarKmPorLitro(); // Forçar recarregamento para garantir sincronização
        feedbackDiv.textContent = 'Km/Litro salvo com sucesso!';
        feedbackDiv.className = 'form-text text-success';
        feedbackDiv.style.display = 'block';
        kmPorLitroInput.classList.add('saved');
        setTimeout(() => {
            feedbackDiv.style.display = 'none';
            feedbackDiv.textContent = '';
            kmPorLitroInput.classList.remove('saved');
        }, 3000);
        kmPorLitroInput.value = formattedValue; // Garante que o input reflita o valor salvo
    } catch (e) {
        let errorMessage = 'Erro ao salvar Km/Litro. ';
        if (e.name === 'QuotaExceededError') {
            errorMessage += 'O armazenamento do navegador está cheio. Limpe os dados do site ou aumente a cota de armazenamento.';
        } else if (e.name === 'SecurityError') {
            errorMessage += 'Acesso ao armazenamento foi bloqueado. Verifique se o site está sendo executado em um ambiente seguro (HTTPS) e se o modo de navegação anônima não está ativo.';
        } else {
            errorMessage += 'Detalhes: ' + e.message;
        }
        console.error('[financeiro.js] Erro ao salvar Km/Litro:', e);
        feedbackDiv.textContent = errorMessage;
        feedbackDiv.className = 'form-text text-danger';
        feedbackDiv.style.display = 'block';
        setTimeout(() => {
            feedbackDiv.style.display = 'none';
            feedbackDiv.textContent = '';
        }, 7000); // Tempo maior para mensagens de erro
    }
}

function carregarKmPorLitro() {
    const kmPorLitroInput = document.getElementById('kmPorLitro');
    if (!kmPorLitroInput) {
        console.error('[financeiro.js] Elemento #kmPorLitro não encontrado.');
        return;
    }
    try {
        const kmPorLitro = localStorage.getItem('kmPorLitro');
        console.log('[financeiro.js] Valor de Km/Litro carregado do localStorage:', kmPorLitro);
        if (kmPorLitro === null || kmPorLitro === '') {
            kmPorLitroInput.value = '';
        } else {
            const parsedValue = parseFloat(kmPorLitro);
            if (isNaN(parsedValue) || parsedValue <= 0) {
                console.warn('[financeiro.js] Valor inválido encontrado no localStorage para kmPorLitro:', kmPorLitro);
                localStorage.removeItem('kmPorLitro');
                kmPorLitroInput.value = '';
            } else {
                kmPorLitroInput.value = parsedValue.toFixed(2);
            }
        }
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar Km/Litro:', e);
        kmPorLitroInput.value = '';
        alert('Erro ao carregar o valor de Km/Litro. Verifique o armazenamento do navegador.');
    }
}

function salvarPrecoPorLitro() {
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    const feedbackDiv = document.getElementById('precoPorLitroFeedback');
    if (!precoPorLitroInput || !feedbackDiv) {
        console.error('[financeiro.js] Elementos do DOM ausentes: precoPorLitro ou precoPorLitroFeedback');
        alert('Erro interno: Elementos da página ausentes.');
        return;
    }

    console.log('[financeiro.js] Iniciando salvamento de Preço/Litro...');

    // Validação robusta do valor inserido
    const inputValue = precoPorLitroInput.value.trim();
    if (inputValue === '') {
        alert('Por favor, insira um valor para Preço/Litro!');
        precoPorLitroInput.focus();
        return;
    }

    const precoPorLitro = parseFloat(inputValue);
    if (isNaN(precoPorLitro)) {
        alert('Digite um valor numérico válido para Preço/Litro!');
        precoPorLitroInput.focus();
        return;
    }

    if (precoPorLitro <= 0) {
        alert('O valor de Preço/Litro deve ser maior que zero!');
        precoPorLitroInput.focus();
        return;
    }

    if (precoPorLitro > 100) {
        alert('O valor de Preço/Litro parece muito alto. O máximo permitido é R$ 100/litro. Verifique o valor inserido.');
        precoPorLitroInput.focus();
        return;
    }

    const formattedValue = precoPorLitro.toFixed(2);

    try {
        localStorage.setItem('precoPorLitro', formattedValue);
        console.log('[financeiro.js] Preço/Litro salvo no localStorage:', formattedValue);
        carregarPrecoPorLitro(); // Forçar recarregamento para garantir sincronização
        feedbackDiv.textContent = 'Preço/Litro salvo com sucesso!';
        feedbackDiv.className = 'form-text text-success';
        feedbackDiv.style.display = 'block';
        precoPorLitroInput.classList.add('saved');
        setTimeout(() => {
            feedbackDiv.style.display = 'none';
            feedbackDiv.textContent = '';
            precoPorLitroInput.classList.remove('saved');
        }, 3000);
        precoPorLitroInput.value = formattedValue; // Garante que o input reflita o valor salvo
    } catch (e) {
        let errorMessage = 'Erro ao salvar Preço/Litro. ';
        if (e.name === 'QuotaExceededError') {
            errorMessage += 'O armazenamento do navegador está cheio. Limpe os dados do site ou aumente a cota de armazenamento.';
        } else if (e.name === 'SecurityError') {
            errorMessage += 'Acesso ao armazenamento foi bloqueado. Verifique se o site está sendo executado em um ambiente seguro (HTTPS) e se o modo de navegação anônima não está ativo.';
        } else {
            errorMessage += 'Detalhes: ' + e.message;
        }
        console.error('[financeiro.js] Erro ao salvar Preço/Litro:', e);
        feedbackDiv.textContent = errorMessage;
        feedbackDiv.className = 'form-text text-danger';
        feedbackDiv.style.display = 'block';
        setTimeout(() => {
            feedbackDiv.style.display = 'none';
            feedbackDiv.textContent = '';
        }, 7000); // Tempo maior para mensagens de erro
    }
}

function carregarPrecoPorLitro() {
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    if (!precoPorLitroInput) {
        console.error('[financeiro.js] Elemento #precoPorLitro não encontrado.');
        return;
    }
    try {
        const precoPorLitro = localStorage.getItem('precoPorLitro');
        console.log('[financeiro.js] Valor de Preço/Litro carregado do localStorage:', precoPorLitro);
        if (precoPorLitro === null || precoPorLitro === '') {
            precoPorLitroInput.value = '';
        } else {
            const parsedValue = parseFloat(precoPorLitro);
            if (isNaN(parsedValue) || parsedValue <= 0) {
                console.warn('[financeiro.js] Valor inválido encontrado no localStorage para precoPorLitro:', precoPorLitro);
                localStorage.removeItem('precoPorLitro');
                precoPorLitroInput.value = '';
            } else {
                precoPorLitroInput.value = parsedValue.toFixed(2);
            }
        }
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar Preço/Litro:', e);
        precoPorLitroInput.value = '';
        alert('Erro ao carregar o valor de Preço/Litro. Verifique o armazenamento do navegador.');
    }
}