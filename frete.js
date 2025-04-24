document.addEventListener('DOMContentLoaded', () => {
    console.log('[frete.js] DOM carregado. Configurando aba Frete...');
    const btnCalcularFrete = document.getElementById('btnCalcularFrete');
    if (btnCalcularFrete) {
        btnCalcularFrete.addEventListener('click', calcularFrete);
        console.log('[frete.js] Listener do botão de calcular frete configurado.');
    } else {
        console.warn('[frete.js] Botão #btnCalcularFrete não encontrado.');
    }
});

function calcularFrete() {
    console.log('[frete.js] Calculando frete...');
    const km = parseFloat(document.getElementById('km').value) || 0;
    const peso = parseFloat(document.getElementById('peso').value) || 0;
    const custoPorKm = parseFloat(document.getElementById('custoPorKm').value) || 0;
    const custoPorKg = parseFloat(document.getElementById('custoPorKg').value) || 0;
    const resultadoDiv = document.getElementById('resultadoFrete');

    if (!resultadoDiv) {
        console.error('[frete.js] Elemento #resultadoFrete não encontrado.');
        return;
    }

    if (km <= 0 || custoPorKm <= 0) {
        resultadoDiv.innerHTML = '<span class="error">Por favor, insira uma distância válida e custo por km.</span>';
        console.warn('[frete.js] Dados inválidos: km ou custoPorKm inválidos.');
        return;
    }

    const custoDistancia = km * custoPorKm;
    const custoPeso = peso * custoPorKg;
    const total = custoDistancia + custoPeso;

    resultadoDiv.innerHTML = `Valor do Frete: R$ ${total.toFixed(2)}`;
    console.log('[frete.js] Frete calculado: R$', total.toFixed(2));
}