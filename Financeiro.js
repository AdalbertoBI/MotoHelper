const MAX_REGISTROS = 500;
const STORAGE_EXPIRATION_DAYS = 90;

// Função de debounce para evitar chamadas frequentes
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Verifica disponibilidade de espaço no localStorage
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

// Comprime dados para JSON
function compressData(data) {
    try {
        return JSON.stringify(data);
    } catch (e) {
        console.error('[financeiro.js] Erro ao comprimir dados:', e);
        return JSON.stringify([]);
    }
}

// Descomprime dados JSON
function decompressData(compressed) {
    try {
        return JSON.parse(compressed || '[]');
    } catch (e) {
        console.error('[financeiro.js] Erro ao descomprimir dados:', e);
        return [];
    }
}

// Verifica modo anônimo
function isIncognito() {
    try {
        localStorage.setItem('__test_incognito__', 'test');
        localStorage.removeItem('__test_incognito__');
        return false;
    } catch (e) {
        return true;
    }
}

// Exibe notificação toast
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '10px 20px';
    toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
    toast.style.color = '#fff';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '1000';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Limpa dados antigos do localStorage
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
        if (checkStorageAvailability({ gastos, ganhos })) {
            localStorage.setItem('gastos', compressData(gastos));
            localStorage.setItem('ganhos', compressData(ganhos));
            console.log('[financeiro.js] Dados antigos limpos.');
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        console.error('[financeiro.js] Erro ao limpar dados antigos:', e);
        showToast('Erro ao limpar dados antigos. Tente novamente.', 'error');
    }
}

// Configura a aba Financeiro
document.addEventListener('DOMContentLoaded', () => {
    console.log('[financeiro.js] DOM carregado. Configurando aba Financeiro...');

    if (isIncognito()) {
        showToast('Modo anônimo detectado. O salvamento pode não funcionar corretamente.', 'error');
        console.warn('[financeiro.js] Modo anônimo detectado.');
    }

    limparDadosAntigos();
    carregarConfiguracoes();
    carregarGastos();
    carregarGanhos();
    configurarEventos();
    atualizarSemanas();
});

// Configura eventos dos botões e inputs
function configurarEventos() {
    console.log('[financeiro.js] Configurando eventos...');

    const kmPorLitroInput = document.getElementById('kmPorLitro');
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    const semanaConsulta = document.getElementById('semanaConsulta');

    // Debounce para salvamento automático
    const debouncedSalvarKmPorLitro = debounce(salvarKmPorLitro, 1000);
    const debouncedSalvarPrecoPorLitro = debounce(salvarPrecoPorLitro, 1000);

    if (kmPorLitroInput) {
        kmPorLitroInput.addEventListener('input', debouncedSalvarKmPorLitro);
        kmPorLitroInput.addEventListener('blur', salvarKmPorLitro);
    } else {
        console.warn('[financeiro.js] Input #kmPorLitro não encontrado.');
    }

    if (precoPorLitroInput) {
        precoPorLitroInput.addEventListener('input', debouncedSalvarPrecoPorLitro);
        precoPorLitroInput.addEventListener('blur', salvarPrecoPorLitro);
    } else {
        console.warn('[financeiro.js] Input #precoPorLitro não encontrado.');
    }

    const buttons = [
        { id: 'btnSalvarGasto', handler: salvarGasto },
        { id: 'btnSalvarGanho', handler: salvarGanho },
    ];

    buttons.forEach(({ id, handler }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
        } else {
            console.warn(`[financeiro.js] Botão #${id} não encontrado.`);
        }
    });

    if (semanaConsulta) {
        semanaConsulta.addEventListener('change', carregarGanhos);
    } else {
        console.warn('[financeiro.js] Select #semanaConsulta não encontrado.');
    }
}

// Carrega configurações salvas
function carregarConfiguracoes() {
    const kmPorLitroInput = document.getElementById('kmPorLitro');
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    
    if (kmPorLitroInput) {
        const savedKmPorLitro = localStorage.getItem('kmPorLitro');
        if (savedKmPorLitro) kmPorLitroInput.value = savedKmPorLitro;
    } else {
        console.warn('[financeiro.js] Input #kmPorLitro não encontrado.');
    }

    if (precoPorLitroInput) {
        const savedPrecoPorLitro = localStorage.getItem('precoPorLitro');
        if (savedPrecoPorLitro) precoPorLitroInput.value = savedPrecoPorLitro;
    } else {
        console.warn('[financeiro.js] Input #precoPorLitro não encontrado.');
    }
}

// Salva Km por Litro
function salvarKmPorLitro() {
    const kmPorLitroInput = document.getElementById('kmPorLitro');
    const feedback = document.getElementById('kmPorLitroFeedback');
    
    if (!kmPorLitroInput || !feedback) {
        console.error('[financeiro.js] Elementos #kmPorLitro ou #kmPorLitroFeedback não encontrados.');
        return;
    }

    const kmPorLitro = parseFloat(kmPorLitroInput.value);
    feedback.className = 'form-text';
    feedback.textContent = '';

    if (isNaN(kmPorLitro) || kmPorLitro <= 0) {
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Insira um valor válido maior que 0.';
        kmPorLitroInput.classList.remove('saved');
        return;
    }

    if (kmPorLitro > 100) {
        feedback.className = 'form-text text-warning';
        feedback.textContent = 'Valor alto detectado. Confirme se está correto.';
    }

    try {
        if (checkStorageAvailability({ kmPorLitro })) {
            localStorage.setItem('kmPorLitro', kmPorLitro.toString());
            feedback.className = 'form-text text-success';
            feedback.textContent = 'Consumo salvo com sucesso!';
            kmPorLitroInput.classList.add('saved');
            showToast('Consumo salvo!', 'success');
            console.log('[financeiro.js] Km por litro salvo:', kmPorLitro);
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Erro ao salvar consumo.';
        kmPorLitroInput.classList.remove('saved');
        showToast('Erro ao salvar consumo.', 'error');
        console.error('[financeiro.js] Erro ao salvar kmPorLitro:', e);
    }
}

// Salva Preço por Litro
function salvarPrecoPorLitro() {
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    const feedback = document.getElementById('precoPorLitroFeedback');
    
    if (!precoPorLitroInput || !feedback) {
        console.error('[financeiro.js] Elementos #precoPorLitro ou #precoPorLitroFeedback não encontrados.');
        return;
    }

    const precoPorLitro = parseFloat(precoPorLitroInput.value);
    feedback.className = 'form-text';
    feedback.textContent = '';

    if (isNaN(precoPorLitro) || precoPorLitro <= 0) {
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Insira um valor válido maior que 0.';
        precoPorLitroInput.classList.remove('saved');
        return;
    }

    if (precoPorLitro > 50) {
        feedback.className = 'form-text text-warning';
        feedback.textContent = 'Preço alto detectado. Confirme se está correto.';
    }

    try {
        if (checkStorageAvailability({ precoPorLitro })) {
            localStorage.setItem('precoPorLitro', precoPorLitro.toString());
            feedback.className = 'form-text text-success';
            feedback.textContent = 'Preço salvo com sucesso!';
            precoPorLitroInput.classList.add('saved');
            showToast('Preço salvo!', 'success');
            console.log('[financeiro.js] Preço por litro salvo:', precoPorLitro);
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        feedback.className = 'form-text text-danger';
        feedback.textContent = 'Erro ao salvar preço.';
        precoPorLitroInput.classList.remove('saved');
        showToast('Erro ao salvar preço.', 'error');
        console.error('[financeiro.js] Erro ao salvar precoPorLitro:', e);
    }
}

// Limpa todos os dados financeiros
function limparFinanceiro() {
    if (!confirm('Tem certeza que deseja limpar todos os dados financeiros? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        localStorage.removeItem('kmPorLitro');
        localStorage.removeItem('precoPorLitro');
        localStorage.removeItem('gastos');
        localStorage.removeItem('ganhos');

        document.getElementById('kmPorLitro').value = '';
        document.getElementById('precoPorLitro').value = '';
        document.getElementById('listaGastos').innerHTML = '';
        document.getElementById('listaGanhos').innerHTML = '';
        document.getElementById('totalGastos').textContent = '0.00';
        document.getElementById('totalGanhos').textContent = '0.00';

        showToast('Dados financeiros limpos com sucesso!', 'success');
        console.log('[financeiro.js] Todos os dados financeiros foram limpos.');
    } catch (e) {
        showToast('Erro ao limpar dados financeiros.', 'error');
        console.error('[financeiro.js] Erro ao limpar financeiro:', e);
    }
}

// Salva um novo gasto
function salvarGasto() {
    const tipoGastoInput = document.getElementById('tipoGasto');
    const valorGastoInput = document.getElementById('valorGasto');
    const tipoFeedback = document.getElementById('tipoGastoFeedback');
    const valorFeedback = document.getElementById('valorGastoFeedback');

    if (!tipoGastoInput || !valorGastoInput || !tipoFeedback || !valorFeedback) {
        console.error('[financeiro.js] Elementos de gasto não encontrados.');
        return;
    }

    const tipoGasto = tipoGastoInput.value.trim();
    const valorGasto = parseFloat(valorGastoInput.value);

    tipoFeedback.textContent = '';
    valorFeedback.textContent = '';

    let hasError = false;
    if (!tipoGasto) {
        tipoFeedback.className = 'form-text text-danger';
        tipoFeedback.textContent = 'Insira o tipo de gasto.';
        hasError = true;
    } else if (tipoGasto.length > 50) {
        tipoFeedback.className = 'form-text text-danger';
        tipoFeedback.textContent = 'O tipo de gasto deve ter até 50 caracteres.';
        hasError = true;
    }
    if (isNaN(valorGasto) || valorGasto <= 0) {
        valorFeedback.className = 'form-text text-danger';
        valorFeedback.textContent = 'Insira um valor válido maior que 0.';
        hasError = true;
    }

    if (hasError) return;

    const novoGasto = {
        tipo: tipoGasto,
        valor: valorGasto,
        data: new Date().toISOString()
    };

    try {
        let gastos = decompressData(localStorage.getItem('gastos') || compressData([]));
        gastos.push(novoGasto);
        if (gastos.length > MAX_REGISTROS) gastos = gastos.slice(-MAX_REGISTROS);
        if (checkStorageAvailability({ gastos })) {
            localStorage.setItem('gastos', compressData(gastos));
            tipoGastoInput.value = '';
            valorGastoInput.value = '';
            tipoFeedback.className = 'form-text text-success';
            tipoFeedback.textContent = 'Gasto salvo com sucesso!';
            showToast('Gasto registrado!', 'success');
            console.log('[financeiro.js] Gasto salvo:', novoGasto);
            carregarGastos();
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        tipoFeedback.className = 'form-text text-danger';
        tipoFeedback.textContent = 'Erro ao salvar gasto.';
        showToast('Erro ao salvar gasto.', 'error');
        console.error('[financeiro.js] Erro ao salvar gasto:', e);
    }
}

// Carrega e exibe os gastos
function carregarGastos() {
    const listaGastos = document.getElementById('listaGastos');
    const totalGastos = document.getElementById('totalGastos');

    if (!listaGastos || !totalGastos) {
        console.error('[financeiro.js] Elementos #listaGastos ou #totalGastos não encontrados.');
        return;
    }

    try {
        const gastos = decompressData(localStorage.getItem('gastos') || compressData([]));
        listaGastos.innerHTML = '';
        let total = 0;

        gastos.forEach((gasto, index) => {
            const dataFormatada = new Date(gasto.data).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                ${gasto.tipo}: R$ ${gasto.valor.toFixed(2)} <small class="text-muted">(${dataFormatada})</small>
                <button class="btn btn-danger btn-sm" onclick="removerGasto(${index})" aria-label="Remover gasto">×</button>
            `;
            listaGastos.appendChild(li);
            total += gasto.valor;
        });

        totalGastos.textContent = total.toFixed(2);
        console.log('[financeiro.js] Gastos carregados:', gastos.length, 'Total: R$', total.toFixed(2));
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar gastos:', e);
        listaGastos.innerHTML = '<li class="list-group-item text-danger">Erro ao carregar gastos.</li>';
        totalGastos.textContent = '0.00';
    }
}

// Remove um gasto
function removerGasto(index) {
    if (!confirm('Deseja remover este gasto?')) return;

    try {
        let gastos = decompressData(localStorage.getItem('gastos') || compressData([]));
        gastos.splice(index, 1);
        if (checkStorageAvailability({ gastos })) {
            localStorage.setItem('gastos', compressData(gastos));
            showToast('Gasto removido!', 'success');
            console.log('[financeiro.js] Gasto removido no índice:', index);
            carregarGastos();
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        showToast('Erro ao remover gasto.', 'error');
        console.error('[financeiro.js] Erro ao remover gasto:', e);
    }
}

// Salva um novo ganho
function salvarGanho() {
    const plataformaInput = document.getElementById('plataformaGanho');
    const kmRodadoInput = document.getElementById('kmRodadoGanho');
    const valorGanhoInput = document.getElementById('valorGanho');
    const plataformaFeedback = document.getElementById('plataformaGanhoFeedback');
    const kmFeedback = document.getElementById('kmRodadoGanhoFeedback');
    const valorFeedback = document.getElementById('valorGanhoFeedback');

    if (!plataformaInput || !kmRodadoInput || !valorGanhoInput || !plataformaFeedback || !kmFeedback || !valorFeedback) {
        console.error('[financeiro.js] Elementos de ganho não encontrados.');
        return;
    }

    const plataforma = plataformaInput.value.trim();
    const kmRodado = parseFloat(kmRodadoInput.value) || 0;
    const valorGanho = parseFloat(valorGanhoInput.value);

    plataformaFeedback.textContent = '';
    kmFeedback.textContent = '';
    valorFeedback.textContent = '';

    let hasError = false;
    if (!plataforma) {
        plataformaFeedback.className = 'form-text text-danger';
        plataformaFeedback.textContent = 'Insira a plataforma.';
        hasError = true;
    } else if (plataforma.length > 50) {
        plataformaFeedback.className = 'form-text text-danger';
        plataformaFeedback.textContent = 'A plataforma deve ter até 50 caracteres.';
        hasError = true;
    }
    if (kmRodado < 0) {
        kmFeedback.className = 'form-text text-danger';
        kmFeedback.textContent = 'Km rodado não pode ser negativo.';
        hasError = true;
    }
    if (isNaN(valorGanho) || valorGanho <= 0) {
        valorFeedback.className = 'form-text text-danger';
        valorFeedback.textContent = 'Insira um valor válido maior que 0.';
        hasError = true;
    }

    if (hasError) return;

    const novoGanho = {
        plataforma,
        kmRodado,
        valor: valorGanho,
        data: new Date().toISOString()
    };

    try {
        let ganhos = decompressData(localStorage.getItem('ganhos') || compressData([]));
        ganhos.push(novoGanho);
        if (ganhos.length > MAX_REGISTROS) ganhos = ganhos.slice(-MAX_REGISTROS);
        if (checkStorageAvailability({ ganhos })) {
            localStorage.setItem('ganhos', compressData(ganhos));
            plataformaInput.value = '';
            kmRodadoInput.value = '';
            valorGanhoInput.value = '';
            plataformaFeedback.className = 'form-text text-success';
            plataformaFeedback.textContent = 'Ganho salvo com sucesso!';
            showToast('Ganho registrado!', 'success');
            console.log('[financeiro.js] Ganho salvo:', novoGanho);
            carregarGanhos();
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        plataformaFeedback.className = 'form-text text-danger';
        plataformaFeedback.textContent = 'Erro ao salvar ganho.';
        showToast('Erro ao salvar ganho.', 'error');
        console.error('[financeiro.js] Erro ao salvar ganho:', e);
    }
}

// Carrega e exibe os ganhos
function carregarGanhos() {
    const listaGanhos = document.getElementById('listaGanhos');
    const totalGanhos = document.getElementById('totalGanhos');
    const semanaConsulta = document.getElementById('semanaConsulta');

    if (!listaGanhos || !totalGanhos || !semanaConsulta) {
        console.error('[financeiro.js] Elementos #listaGanhos, #totalGanhos ou #semanaConsulta não encontrados.');
        return;
    }

    try {
        const ganhos = decompressData(localStorage.getItem('ganhos') || compressData([]));
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
        }

        listaGanhos.innerHTML = '';
        let total = 0;

        ganhosFiltrados.forEach((ganho, index) => {
            const dataFormatada = new Date(ganho.data).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const kmInfo = ganho.kmRodado > 0 ? `, ${ganho.kmRodado.toFixed(1)} km` : '';
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                ${ganho.plataforma}: R$ ${ganho.valor.toFixed(2)}${kmInfo} <small class="text-muted">(${dataFormatada})</small>
                <button class="btn btn-danger btn-sm" onclick="removerGanho(${index})" aria-label="Remover ganho">×</button>
            `;
            listaGanhos.appendChild(li);
            total += ganho.valor;
        });

        totalGanhos.textContent = total.toFixed(2);
        console.log('[financeiro.js] Ganhos carregados:', ganhosFiltrados.length, 'Total: R$', total.toFixed(2));
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar ganhos:', e);
        listaGanhos.innerHTML = '<li class="list-group-item text-danger">Erro ao carregar ganhos.</li>';
        totalGanhos.textContent = '0.00';
    }
}

// Remove um ganho
function removerGanho(index) {
    if (!confirm('Deseja remover este ganho?')) return;

    try {
        let ganhos = decompressData(localStorage.getItem('ganhos') || compressData([]));
        ganhos.splice(index, 1);
        if (checkStorageAvailability({ ganhos })) {
            localStorage.setItem('ganhos', compressData(ganhos));
            showToast('Ganho removido!', 'success');
            console.log('[financeiro.js] Ganho removido no índice:', index);
            carregarGanhos();
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        showToast('Erro ao remover ganho.', 'error');
        console.error('[financeiro.js] Erro ao remover ganho:', e);
    }
}

// Atualiza as semanas disponíveis no filtro
function atualizarSemanas() {
    const semanaConsulta = document.getElementById('semanaConsulta');
    if (!semanaConsulta) {
        console.warn('[financeiro.js] Select #semanaConsulta não encontrado.');
        return;
    }

    try {
        const ganhos = decompressData(localStorage.getItem('ganhos') || compressData([]));
        const semanas = new Set();
        ganhos.forEach(ganho => {
            const data = new Date(ganho.data);
            const ano = data.getFullYear();
            const semana = getWeekNumber(data);
            semanas.add(`${ano}-${semana}`);
        });

        semanaConsulta.innerHTML = '<option value="">Semana Atual</option>';
        Array.from(semanas).sort().reverse().forEach(semana => {
            const [ano, semanaNum] = semana.split('-').map(Number);
            const option = document.createElement('option');
            option.value = semana;
            option.textContent = `Semana ${semanaNum} de ${ano}`;
            semanaConsulta.appendChild(option);
        });

        console.log('[financeiro.js] Semanas atualizadas:', semanas.size);
    } catch (e) {
        console.error('[financeiro.js] Erro ao atualizar semanas:', e);
        semanaConsulta.innerHTML = '<option value="">Erro ao carregar semanas</option>';
    }
}

// Obtém o número da semana do ano
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}