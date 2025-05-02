const MAX_REGISTROS = 200;
const STORAGE_EXPIRATION_DAYS = 90;

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

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
        if (totalSize > 4 * 1024 * 1024) {
            console.warn('[financeiro.js] localStorage próximo do limite:', totalSize / (1024 * 1024), 'MB');
            try {
                localStorage.removeItem('cacheBusca');
                console.log('[financeiro.js] cacheBusca removido para liberar espaço.');
                totalSize = 0;
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        totalSize += ((localStorage[key].length + key.length) * 2);
                    }
                }
                if (totalSize > 4 * 1024 * 1024) {
                    let registros = decompressData(localStorage.getItem('registros') || compressData([]));
                    if (registros.length > MAX_REGISTROS) registros = registros.slice(-MAX_REGISTROS);
                    localStorage.setItem('registros', compressData(registros));
                    console.log('[financeiro.js] registros reduzidos para liberar espaço.');
                    totalSize = 0;
                    for (let key in localStorage) {
                        if (localStorage.hasOwnProperty(key)) {
                            totalSize += ((localStorage[key].length + key.length) * 2);
                        }
                    }
                    if (totalSize > 4 * 1024 * 1024) {
                        return false;
                    }
                }
            } catch (e) {
                console.error('[financeiro.js] Erro ao limpar cacheBusca ou dados:', e);
                return false;
            }
        }
        return true;
    } catch (e) {
        console.error('[financeiro.js] Espaço insuficiente no localStorage:', e);
        try {
            localStorage.removeItem('cacheBusca');
            let registros = decompressData(localStorage.getItem('registros') || compressData([]));
            if (registros.length > MAX_REGISTROS) registros = registros.slice(-MAX_REGISTROS);
            localStorage.setItem('registros', compressData(registros));
            console.log('[financeiro.js] cacheBusca removido e dados reduzidos após falha inicial.');
            return true;
        } catch (e) {
            console.error('[financeiro.js] Falha ao limpar dados:', e);
            return false;
        }
    }
}

function compressData(data) {
    try {
        return JSON.stringify(data);
    } catch (e) {
        console.error('[financeiro.js] Erro ao comprimir dados:', e);
        return JSON.stringify([]);
    }
}

function decompressData(compressed) {
    try {
        return JSON.parse(compressed || '[]');
    } catch (e) {
        console.error('[financeiro.js] Erro ao descomprimir dados:', e);
        return [];
    }
}

function isIncognito() {
    try {
        localStorage.setItem('__test_incognito__', 'test');
        localStorage.removeItem('__test_incognito__');
        return false;
    } catch (e) {
        return true;
    }
}

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

function limparDadosAntigos() {
    const now = Date.now();
    const expirationMs = STORAGE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    let registros = decompressData(localStorage.getItem('registros') || compressData([]));

    registros = registros.filter(r => now - new Date(r.data).getTime() <= expirationMs);

    try {
        if (registros.length > MAX_REGISTROS) registros = registros.slice(-MAX_REGISTROS);
        if (checkStorageAvailability({ registros })) {
            localStorage.setItem('registros', compressData(registros));
            console.log('[financeiro.js] Dados antigos limpos.');
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        console.error('[financeiro.js] Erro ao limpar dados antigos:', e);
        showToast('Erro ao limpar dados antigos. Considere limpar os dados financeiros manualmente.', 'error');
    }
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[financeiro.js] DOM carregado. Configurando aba Financeiro...');

    if (isIncognito()) {
        showToast('Modo anônimo detectado. O salvamento pode não funcionar corretamente.', 'error');
        console.warn('[financeiro.js] Modo anônimo detectado.');
    }

    try {
        let registros = decompressData(localStorage.getItem('registros') || compressData([]));
        if (registros.length > MAX_REGISTROS) {
            limparDadosAntigos();
        }
    } catch (e) {
        console.error('[financeiro.js] Erro na verificação inicial de dados:', e);
    }

    limparDadosAntigos();
    carregarConfiguracoes();
    carregarRegistros();
    configurarEventos();
    atualizarSemanas();
});

function configurarEventos() {
    console.log('[financeiro.js] Configurando eventos...');

    const kmPorLitroInput = document.getElementById('kmPorLitro');
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    const semanaConsulta = document.getElementById('semanaConsulta');

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

    const btnSalvarRegistro = document.getElementById('btnSalvarRegistro');
    if (btnSalvarRegistro) {
        btnSalvarRegistro.addEventListener('click', salvarRegistro);
    } else {
        console.warn('[financeiro.js] Botão #btnSalvarRegistro não encontrado.');
    }

    if (semanaConsulta) {
        semanaConsulta.addEventListener('change', carregarRegistros);
    } else {
        console.warn('[financeiro.js] Select #semanaConsulta não encontrado.');
    }
}

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
        limparDadosAntigos();
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
        feedback.textContent = 'Erro ao salvar consumo. O armazenamento está cheio. Considere limpar os dados financeiros.';
        kmPorLitroInput.classList.remove('saved');
        showToast('Erro ao salvar consumo. Armazenamento cheio.', 'error');
        console.error('[financeiro.js] Erro ao salvar kmPorLitro:', e);
    }
}

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
        limparDadosAntigos();
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
        feedback.textContent = 'Erro ao salvar preço. O armazenamento está cheio. Considere limpar os dados financeiros.';
        precoPorLitroInput.classList.remove('saved');
        showToast('Erro ao salvar preço. Armazenamento cheio.', 'error');
        console.error('[financeiro.js] Erro ao salvar precoPorLitro:', e);
    }
}

function salvarRegistro() {
    const tipoRegistroSelect = document.getElementById('tipoRegistro');
    const descricaoInput = document.getElementById('descricaoRegistro');
    const valorInput = document.getElementById('valorRegistro');
    const tipoFeedback = document.getElementById('tipoRegistroFeedback');
    const descricaoFeedback = document.getElementById('descricaoRegistroFeedback');
    const valorFeedback = document.getElementById('valorRegistroFeedback');

    if (!tipoRegistroSelect || !descricaoInput || !valorInput || !tipoFeedback || !descricaoFeedback || !valorFeedback) {
        console.error('[financeiro.js] Elementos de registro não encontrados.');
        return;
    }

    const tipo = tipoRegistroSelect.value;
    const descricao = descricaoInput.value.trim();
    const valor = parseFloat(valorInput.value);

    tipoFeedback.textContent = '';
    descricaoFeedback.textContent = '';
    valorFeedback.textContent = '';

    let hasError = false;
    if (!descricao) {
        descricaoFeedback.className = 'form-text text-danger';
        descricaoFeedback.textContent = 'Insira a descrição.';
        hasError = true;
    } else if (descricao.length > 50) {
        descricaoFeedback.className = 'form-text text-danger';
        descricaoFeedback.textContent = 'A descrição deve ter até 50 caracteres.';
        hasError = true;
    }
    if (isNaN(valor) || valor <= 0) {
        valorFeedback.className = 'form-text text-danger';
        valorFeedback.textContent = 'Insira um valor válido maior que 0.';
        hasError = true;
    }

    if (hasError) return;

    const novoRegistro = {
        tipo,
        descricao,
        valor,
        data: new Date().toISOString()
    };

    try {
        limparDadosAntigos();
        let registros = decompressData(localStorage.getItem('registros') || compressData([]));
        registros.push(novoRegistro);
        if (registros.length > MAX_REGISTROS) registros = registros.slice(-MAX_REGISTROS);
        if (checkStorageAvailability({ registros })) {
            localStorage.setItem('registros', compressData(registros));
            tipoRegistroSelect.value = 'gasto';
            descricaoInput.value = '';
            valorInput.value = '';
            descricaoFeedback.className = 'form-text text-success';
            descricaoFeedback.textContent = 'Registro salvo com sucesso!';
            showToast(`${tipo === 'gasto' ? 'Gasto' : 'Ganho'} registrado!`, 'success');
            console.log('[financeiro.js] Registro salvo:', novoRegistro);
            carregarRegistros();
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        descricaoFeedback.className = 'form-text text-danger';
        descricaoFeedback.textContent = 'Erro ao salvar registro. O armazenamento está cheio. Considere limpar os dados financeiros.';
        showToast('Erro ao salvar registro. Armazenamento cheio.', 'error');
        console.error('[financeiro.js] Erro ao salvar registro:', e);
    }
}

function carregarRegistros() {
    const listaRegistros = document.getElementById('listaRegistros');
    const totalGastos = document.getElementById('totalGastos');
    const totalGanhos = document.getElementById('totalGanhos');
    const saldoTotal = document.getElementById('saldoTotal');
    const semanaConsulta = document.getElementById('semanaConsulta');

    if (!listaRegistros || !totalGastos || !totalGanhos || !saldoTotal || !semanaConsulta) {
        console.error('[financeiro.js] Elementos #listaRegistros, #totalGastos, #totalGanhos, #saldoTotal ou #semanaConsulta não encontrados.');
        return;
    }

    try {
        const registros = decompressData(localStorage.getItem('registros') || compressData([]));
        const semanaSelecionada = semanaConsulta.value;
        let registrosFiltrados = registros;

        if (semanaSelecionada) {
            const [ano, semana] = semanaSelecionada.split('-').map(Number);
            registrosFiltrados = registros.filter(registro => {
                const data = new Date(registro.data);
                const anoRegistro = data.getFullYear();
                const semanaRegistro = getWeekNumber(data);
                return anoRegistro === ano && semanaRegistro === semana;
            });
        }

        listaRegistros.innerHTML = '';
        let totalGastosValue = 0;
        let totalGanhosValue = 0;

        registrosFiltrados.forEach((registro, index) => {
            const dataFormatada = new Date(registro.data).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const li = document.createElement('li');
            li.className = `list-group-item ${registro.tipo === 'gasto' ? 'gasto' : 'ganho'}`;
            li.innerHTML = `
                ${registro.descricao}: R$ ${registro.valor.toFixed(2)} <small class="text-muted">(${dataFormatada})</small>
                <button class="btn btn-danger btn-sm" onclick="removerRegistro(${index})" aria-label="Remover registro">×</button>
            `;
            listaRegistros.appendChild(li);
            if (registro.tipo === 'gasto') {
                totalGastosValue += registro.valor;
            } else {
                totalGanhosValue += registro.valor;
            }
        });

        totalGastos.textContent = totalGastosValue.toFixed(2);
        totalGanhos.textContent = totalGanhosValue.toFixed(2);
        saldoTotal.textContent = (totalGanhosValue - totalGastosValue).toFixed(2);
        console.log('[financeiro.js] Registros carregados:', registrosFiltrados.length, 'Total Gastos: R$', totalGastosValue.toFixed(2), 'Total Ganhos: R$', totalGanhosValue.toFixed(2), 'Saldo: R$', (totalGanhosValue - totalGastosValue).toFixed(2));
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar registros:', e);
        listaRegistros.innerHTML = '<li class="list-group-item text-danger">Erro ao carregar registros.</li>';
        totalGastos.textContent = '0.00';
        totalGanhos.textContent = '0.00';
        saldoTotal.textContent = '0.00';
    }
}

function removerRegistro(index) {
    if (!confirm('Deseja remover este registro?')) return;

    try {
        let registros = decompressData(localStorage.getItem('registros') || compressData([]));
        registros.splice(index, 1);
        if (checkStorageAvailability({ registros })) {
            localStorage.setItem('registros', compressData(registros));
            showToast('Registro removido!', 'success');
            console.log('[financeiro.js] Registro removido no índice:', index);
            carregarRegistros();
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        showToast('Erro ao remover registro. Armazenamento cheio.', 'error');
        console.error('[financeiro.js] Erro ao remover registro:', e);
    }
}

function atualizarSemanas() {
    const semanaConsulta = document.getElementById('semanaConsulta');
    if (!semanaConsulta) {
        console.warn('[financeiro.js] Select #semanaConsulta não encontrado.');
        return;
    }

    try {
        const registros = decompressData(localStorage.getItem('registros') || compressData([]));
        const semanas = new Set();
        registros.forEach(registro => {
            const data = new Date(registro.data);
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
