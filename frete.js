document.addEventListener('DOMContentLoaded', () => {
    console.log('[frete.js] DOM carregado. Configurando aba Frete...');
    const btnCalcularFrete = document.getElementById('btnCalcularFrete');
    if (btnCalcularFrete) {
        btnCalcularFrete.addEventListener('click', calcularFrete);
        console.log('[frete.js] Listener do botão Calcular Frete configurado.');
    } else {
        console.error('[frete.js] Botão #btnCalcularFrete não encontrado.');
    }

    // Carregar valores salvos
    ['km', 'peso', 'custoPorKm', 'custoPorKg'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            const savedValue = localStorage.getItem(id);
            if (savedValue !== null) {
                input.value = savedValue;
            }
            input.addEventListener('input', () => {
                localStorage.setItem(id, input.value);
            });
        }
    });
});

function calcularFrete() {
    console.log('[frete.js] Iniciando cálculo de frete...');
    const kmInput = document.getElementById('km');
    const pesoInput = document.getElementById('peso');
    const custoPorKmInput = document.getElementById('custoPorKm');
    const custoPorKgInput = document.getElementById('custoPorKg');
    const resultadoFrete = document.getElementById('resultadoFrete');
    const feedbacks = {
        km: document.getElementById('kmFeedback'),
        peso: document.getElementById('pesoFeedback'),
        custoPorKm: document.getElementById('custoPorKmFeedback'),
        custoPorKg: document.getElementById('custoPorKgFeedback')
    };

    if (!kmInput || !pesoInput || !custoPorKmInput || !custoPorKgInput || !resultadoFrete) {
        console.error('[frete.js] Elementos do DOM ausentes.');
        alert('Erro interno: Elementos da página ausentes.');
        return;
    }

    // Resetar feedbacks
    Object.values(feedbacks).forEach(fb => {
        if (fb) {
            fb.textContent = '';
            fb.classList.remove('text-danger', 'text-success');
        }
    });

    const km = parseFloat(kmInput.value) || 0;
    const peso = parseFloat(pesoInput.value) || 0;
    const custoPorKm = parseFloat(custoPorKmInput.value) || 0;
    const custoPorKg = parseFloat(custoPorKgInput.value) || 0;

    let erros = [];
    if (km <= 0) erros.push('Distância deve ser maior que zero.');
    if (custoPorKm <= 0) erros.push('Custo por Km deve ser maior que zero.');
    if (peso < 0) erros.push('Peso não pode ser negativo.');
    if (custoPorKg < 0) erros.push('Custo por Kg não pode ser negativo.');

    if (erros.length > 0) {
        console.warn('[frete.js] Erros de validação:', erros);
        erros.forEach((erro, index) => {
            const field = Object.keys(feedbacks)[index % Object.keys(feedbacks).length];
            if (feedbacks[field]) {
                feedbacks[field].textContent = erro;
                feedbacks[field].classList.add('text-danger');
            }
        });
        resultadoFrete.textContent = 'Valor do Frete: R$ 0.00';
        return;
    }

    const valorFrete = (km * custoPorKm) + (peso * custoPorKg);
    resultadoFrete.textContent = `Valor do Frete: R$ ${valorFrete.toFixed(2)}`;
    console.log('[frete.js] Frete calculado:', valorFrete.toFixed(2));

    // Feedback de sucesso
    feedbacks.km.textContent = 'Distância válida!';
    feedbacks.km.classList.add('text-success');
    feedbacks.custoPorKm.textContent = 'Custo por Km válido!';
    feedbacks.custoPorKm.classList.add('text-success');
}