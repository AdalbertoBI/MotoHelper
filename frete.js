document.addEventListener('DOMContentLoaded', () => {
    console.log('[frete.js] Configurando listener para Frete...');
    const btnCalcularFrete = document.getElementById('btnCalcularFrete');
    if (btnCalcularFrete) {
        btnCalcularFrete.addEventListener('click', calcularFrete);
    } else {
        console.warn('[frete.js] Botão #btnCalcularFrete não encontrado.');
    }
});

function calcularFrete() {
    const kmInput = document.getElementById('km');
    const pesoInput = document.getElementById('peso');
    const custoPorKmInput = document.getElementById('custoPorKm');
    const custoPorKgInput = document.getElementById('custoPorKg');
    const resultadoFrete = document.getElementById('resultadoFrete');

    if (!kmInput || !pesoInput || !custoPorKmInput || !custoPorKgInput || !resultadoFrete) {
        console.error('[frete.js] Elementos do DOM ausentes.');
        alert('Erro interno: Elementos da página ausentes.');
        return;
    }

    const km = parseFloat(kmInput.value);
    const peso = parseFloat(pesoInput.value) || 0;
    const custoPorKm = parseFloat(custoPorKmInput.value);
    const custoPorKg = parseFloat(custoPorKgInput.value) || 0;

    if (isNaN(km) || km < 0) {
        alert('Digite uma distância válida (km)!');
        kmInput.focus();
        return;
    }
    if (isNaN(peso) || peso < 0) {
        alert('Digite um peso válido (kg)!');
        pesoInput.focus();
        return;
    }
    if (isNaN(custoPorKm) || custoPorKm < 0) {
        alert('Digite um custo por km válido!');
        custoPorKmInput.focus();
        return;
    }
    if (isNaN(custoPorKg) || custoPorKg < 0) {
        alert('Digite um custo por kg válido!');
        custoPorKgInput.focus();
        return;
    }

    const valorFrete = (km * custoPorKm) + (peso * custoPorKg);
    resultadoFrete.textContent = `Valor do Frete: R$ ${valorFrete.toFixed(2)}`;
    console.log('[frete.js] Frete calculado:', {
        km,
        peso,
        custoPorKm,
        custoPorKg,
        valorFrete
    });
}