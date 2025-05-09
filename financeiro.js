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
    // Ajusta a data para garantir que a semana comece na segunda-feira
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Define o primeiro dia da semana como segunda-feira (1)
    const day = (d.getUTCDay() + 6) % 7; // Ajusta: domingo=0 -> 6, segunda=1 -> 0
    d.setUTCDate(d.getUTCDate() - day + 3); // Move para a quinta-feira da semana para cálculo correto
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

    const btnSalvarGanho = document.getElementById('btnSalvarGanho');
    const btnSalvarGasto = document.getElementById('btnSalvarGasto');
    const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
    if (btnSalvarGanho) {
        btnSalvarGanho.addEventListener('click', () => salvarRegistro('ganho'));
    } else {
        console.warn('[financeiro.js] Botão #btnSalvarGanho não encontrado.');
    }

    if (btnSalvarGasto) {
        btnSalvarGasto.addEventListener('click', () => salvarRegistro('gasto'));
    } else {
        console.warn('[financeiro.js] Botão #btnSalvarGasto não encontrado.');
    }

    if (btnCancelarEdicao) {
        btnCancelarEdicao.addEventListener('click', cancelarEdicao);
    } else {
        console.warn('[financeiro.js] Botão #btnCancelarEdicao não encontrado.');
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

function salvarRegistro(tipo) {
    const btnSalvarGanho = document.getElementById('btnSalvarGanho');
    const btnSalvarGasto = document.getElementById('btnSalvarGasto');
    const descricaoInput = document.getElementById('descricaoRegistro');
    const valorInput = document.getElementById('valorRegistro');
    const indiceEdicaoInput = document.getElementById('indiceEdicao');
    const descricaoFeedback = document.getElementById('descricaoRegistroFeedback');
    const valorFeedback = document.getElementById('valorRegistroFeedback');

    if (!descricaoInput || !valorInput || !indiceEdicaoInput || !descricaoFeedback || !valorFeedback) {
        console.error('[financeiro.js] Elementos de registro não encontrados.');
        return;
    }

    // Desabilitar botões para evitar múltiplos cliques
    if (btnSalvarGanho) btnSalvarGanho.disabled = true;
    if (btnSalvarGasto) btnSalvarGasto.disabled = true;

    const descricao = descricaoInput.value.trim();
    const valor = parseFloat(valorInput.value);
    const indiceEdicao = indiceEdicaoInput.value;

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

    if (hasError) {
        if (btnSalvarGanho) btnSalvarGanho.disabled = false;
        if (btnSalvarGasto) btnSalvarGasto.disabled = false;
        return;
    }

    try {
        limparDadosAntigos();
        let registros = decompressData(localStorage.getItem('registros') || compressData([]));
        
        if (indiceEdicao !== '') {
            // Modo edição: atualizar registro existente
            const indice = parseInt(indiceEdicao);
            if (indice >= 0 && indice < registros.length) {
                registros[indice] = {
                    tipo,
                    descricao,
                    valor,
                    data: registros[indice].data // Manter a data original
                };
                cancelarEdicao(); // Resetar formulário após edição
                showToast('Registro atualizado!', 'success');
                console.log('[financeiro.js] Registro atualizado:', registros[indice]);
            } else {
                throw new Error('Índice de edição inválido.');
            }
        } else {
            // Modo adição: novo registro
            const novoRegistro = {
                tipo,
                descricao,
                valor,
                data: new Date().toISOString()
            };
            registros.push(novoRegistro);
            console.log('[financeiro.js] Novo registro salvo:', novoRegistro);
        }

        if (registros.length > MAX_REGISTROS) registros = registros.slice(-MAX_REGISTROS);
        if (checkStorageAvailability({ registros })) {
            localStorage.setItem('registros', compressData(registros));
            descricaoInput.value = '';
            valorInput.value = '';
            descricaoFeedback.className = 'form-text text-success';
            descricaoFeedback.textContent = indiceEdicao !== '' ? 'Registro atualizado com sucesso!' : 'Registro salvo com sucesso!';
            showToast(indiceEdicao !== '' ? 'Registro atualizado!' : `${tipo === 'gasto' ? 'Gasto' : 'Ganho'} registrado!`, 'success');
            carregarRegistros();
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        descricaoFeedback.className = 'form-text text-danger';
        descricaoFeedback.textContent = 'Erro ao salvar registro. O armazenamento está cheio. Considere limpar os dados financeiros.';
        showToast('Erro ao salvar registro. Armazenamento cheio.', 'error');
        console.error('[financeiro.js] Erro ao salvar registro:', e);
    } finally {
        if (btnSalvarGanho) btnSalvarGanho.disabled = false;
        if (btnSalvarGasto) btnSalvarGasto.disabled = false;
    }
}

function editarRegistro(indice) {
    const registros = decompressData(localStorage.getItem('registros') || compressData([]));
    if (indice < 0 || indice >= registros.length) {
        showToast('Registro inválido.', 'error');
        console.error('[financeiro.js] Índice de edição inválido:', indice);
        return;
    }

    const registro = registros[indice];
    const descricaoInput = document.getElementById('descricaoRegistro');
    const valorInput = document.getElementById('valorRegistro');
    const indiceEdicaoInput = document.getElementById('indiceEdicao');
    const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
    const btnSalvarGanho = document.getElementById('btnSalvarGanho');
    const btnSalvarGasto = document.getElementById('btnSalvarGasto');
    const tituloRegistro = document.getElementById('tituloRegistro');

    if (!descricaoInput || !valorInput || !indiceEdicaoInput || !btnCancelarEdicao || !btnSalvarGanho || !btnSalvarGasto || !tituloRegistro) {
        console.error('[financeiro.js] Elementos do formulário não encontrados.');
        return;
    }

    descricaoInput.value = registro.descricao;
    valorInput.value = registro.valor.toFixed(2);
    indiceEdicaoInput.value = indice;
    btnCancelarEdicao.style.display = 'inline-block';
    btnSalvarGanho.textContent = registro.tipo === 'ganho' ? 'Salvar Alterações' : 'Adicionar Ganho';
    btnSalvarGasto.textContent = registro.tipo === 'gasto' ? 'Salvar Alterações' : 'Adicionar Gasto';
    tituloRegistro.textContent = 'Editar Registro';
    console.log('[financeiro.js] Editando registro:', registro);
}

function cancelarEdicao() {
    const descricaoInput = document.getElementById('descricaoRegistro');
    const valorInput = document.getElementById('valorRegistro');
    const indiceEdicaoInput = document.getElementById('indiceEdicao');
    const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
    const btnSalvarGanho = document.getElementById('btnSalvarGanho');
    const btnSalvarGasto = document.getElementById('btnSalvarGasto');
    const descricaoFeedback = document.getElementById('descricaoRegistroFeedback');
    const valorFeedback = document.getElementById('valorRegistroFeedback');
    const tituloRegistro = document.getElementById('tituloRegistro');

    if (!descricaoInput || !valorInput || !indiceEdicaoInput || !btnCancelarEdicao || !btnSalvarGanho || !btnSalvarGasto || !descricaoFeedback || !valorFeedback || !tituloRegistro) {
        console.error('[financeiro.js] Elementos do formulário não encontrados.');
        return;
    }

    descricaoInput.value = '';
    valorInput.value = '';
    indiceEdicaoInput.value = '';
    btnCancelarEdicao.style.display = 'none';
    btnSalvarGanho.textContent = 'Adicionar Ganho';
    btnSalvarGasto.textContent = 'Adicionar Gasto';
    descricaoFeedback.textContent = '';
    valorFeedback.textContent = '';
    tituloRegistro.textContent = 'Adicionar Registro';
    console.log('[financeiro.js] Edição cancelada.');
}

function removerRegistro(indice) {
    if (!confirm('Deseja remover este registro?')) return;

    try {
        let registros = decompressData(localStorage.getItem('registros') || compressData([]));
        if (indice < 0 || indice >= registros.length) {
            throw new Error('Índice inválido.');
        }
        registros.splice(indice, 1);
        if (checkStorageAvailability({ registros })) {
            localStorage.setItem('registros', compressData(registros));
            showToast('Registro removido!', 'success');
            console.log('[financeiro.js] Registro removido, índice:', indice);
            carregarRegistros();
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        showToast('Erro ao remover registro. Armazenamento cheio.', 'error');
        console.error('[financeiro.js] Erro ao remover registro:', e);
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
                const anoRegistro = data.getUTCFullYear();
                const semanaRegistro = getWeekNumber(data);
                const isSameWeek = anoRegistro === ano && semanaRegistro === semana;
                console.log(`[financeiro.js] Filtrando registro: Data=${data.toISOString()}, Ano=${anoRegistro}, Semana=${semanaRegistro}, Selecionado=${semanaSelecionada}, Incluído=${isSameWeek}`);
                return isSameWeek;
            });
        } else {
            // Filtrar pela semana atual (segunda a domingo)
            const hoje = new Date();
            const anoAtual = hoje.getUTCFullYear();
            const semanaAtual = getWeekNumber(hoje);
            registrosFiltrados = registros.filter(registro => {
                const data = new Date(registro.data);
                const anoRegistro = data.getUTCFullYear();
                const semanaRegistro = getWeekNumber(data);
                const isCurrentWeek = anoRegistro === anoAtual && semanaRegistro === semanaAtual;
                console.log(`[financeiro.js] Filtrando semana atual: Data=${data.toISOString()}, Ano=${anoRegistro}, Semana=${semanaRegistro}, Atual=${anoAtual}-${semanaAtual}, Incluído=${isCurrentWeek}`);
                return isCurrentWeek;
            });
        }

        // Agrupar registros por descrição
        const registrosAgrupados = {};
        registrosFiltrados.forEach((registro, index) => {
            const { descricao, tipo, valor, data } = registro;
            if (!registrosAgrupados[descricao]) {
                registrosAgrupados[descricao] = { gastos: 0, ganhos: 0, registros: [] };
            }
            if (tipo === 'gasto') {
                registrosAgrupados[descricao].gastos += valor;
            } else {
                registrosAgrupados[descricao].ganhos += valor;
            }
            registrosAgrupados[descricao].registros.push({ ...registro, index: registros.indexOf(registro) });
        });

        listaRegistros.innerHTML = '';
        let totalGastosValue = 0;
        let totalGanhosValue = 0;

        Object.keys(registrosAgrupados).sort().forEach(descricao => {
            const grupo = registrosAgrupados[descricao];
            const liGrupo = document.createElement('li');
            liGrupo.className = 'list-group-item';
            let htmlContent = `<strong>${descricao}</strong><br>`;
            if (grupo.ganhos > 0) {
                htmlContent += `Total de Ganhos: R$ ${grupo.ganhos.toFixed(2)}<br>`;
            }
            if (grupo.gastos > 0) {
                htmlContent += `Total de Gastos: R$ ${grupo.gastos.toFixed(2)}<br>`;
            }
            htmlContent += `<button class="btn btn-danger btn-sm" onclick="removerRegistrosAgrupados('${descricao}')" aria-label="Remover todos os registros com descrição ${descricao}">Remover Todos</button>`;
            htmlContent += `<ul class="list-group mt-2">`;
            
            grupo.registros.forEach(reg => {
                const dataFormatada = new Date(reg.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                htmlContent += `
                    <li class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" style="font-size: 0.9em;">
                        <span>${reg.tipo === 'ganho' ? 'Ganho' : 'Gasto'}: R$ ${reg.valor.toFixed(2)} (${dataFormatada})</span>
                        <div>
                            <button class="btn btn-primary btn-sm mr-1" onclick="editarRegistro(${reg.index})" aria-label="Editar registro de ${reg.tipo} com descrição ${reg.descricao} e valor ${reg.valor.toFixed(2)}">✏️</button>
                            <button class="btn btn-danger btn-sm" onclick="removerRegistro(${reg.index})" aria-label="Remover registro de ${reg.tipo} com descrição ${reg.descricao} e valor ${reg.valor.toFixed(2)}">×</button>
                        </div>
                    </li>`;
            });
            
            htmlContent += `</ul>`;
            liGrupo.innerHTML = htmlContent;
            listaRegistros.appendChild(liGrupo);

            totalGastosValue += grupo.gastos;
            totalGanhosValue += grupo.ganhos;
        });

        totalGastos.textContent = totalGastosValue.toFixed(2);
        totalGanhos.textContent = totalGanhosValue.toFixed(2);
        saldoTotal.textContent = (totalGanhosValue - totalGastosValue).toFixed(2);
        console.log('[financeiro.js] Registros agrupados carregados:', Object.keys(registrosAgrupados).length, 'Total Gastos: R$', totalGastosValue.toFixed(2), 'Total Ganhos: R$', totalGanhosValue.toFixed(2), 'Saldo: R$', (totalGanhosValue - totalGastosValue).toFixed(2));
    } catch (e) {
        console.error('[financeiro.js] Erro ao carregar registros:', e);
        listaRegistros.innerHTML = '<li class="list-group-item text-danger">Erro ao carregar registros.</li>';
        totalGastos.textContent = '0.00';
        totalGanhos.textContent = '0.00';
        saldoTotal.textContent = '0.00';
    }
}

function removerRegistrosAgrupados(descricao) {
    if (!confirm(`Deseja remover todos os registros com a descrição "${descricao}"?`)) return;

    try {
        let registros = decompressData(localStorage.getItem('registros') || compressData([]));
        registros = registros.filter(registro => registro.descricao !== descricao);
        if (checkStorageAvailability({ registros })) {
            localStorage.setItem('registros', compressData(registros));
            showToast('Registros removidos!', 'success');
            console.log('[financeiro.js] Registros com descrição removidos:', descricao);
            carregarRegistros();
        } else {
            throw new Error('Espaço insuficiente no localStorage.');
        }
    } catch (e) {
        showToast('Erro ao remover registros. Armazenamento cheio.', 'error');
        console.error('[financeiro.js] Erro ao remover registros agrupados:', e);
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
            const ano = data.getUTCFullYear();
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