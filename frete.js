document.addEventListener('DOMContentLoaded', () => {
    console.log('[frete.js] Configurando listener para Frete...');
    const btnCalcularFrete = document.getElementById('btnCalcularFrete');
    if (btnCalcularFrete) btnCalcularFrete.addEventListener('click', calcularFrete);
    else console.warn('[frete.js] Botão #btnCalcularFrete não encontrado.');
});

function calcularFrete() {
    const kmInput = document.getElementById('km');
    const pesoInput = document.getElementById('peso');
    const custoPorKmInput = document.getElementById('custoPorKm');
    const custoPorKgInput = document.getElementById('custoPorKg');
    const resultadoFreteSpan = document.getElementById('resultadoFrete');
    if (!kmInput || !pesoInput || !custoPorKmInput || !custoPorKgInput || !resultadoFreteSpan) {
        console.error('[frete.js] Elementos do DOM ausentes.');
        return;
    }

    const km = parseFloat(kmInput.value) || 0;
    const peso = parseFloat(pesoInput.value) || 0;
    const custoPorKm = parseFloat(custoPorKmInput.value) || 0;
    const custoPorKg = parseFloat(custoPorKgInput.value) || 0;

    if (km <= 0 || custoPorKm <= 0) {
        alert('Preencha valores válidos para distância e custo por km!');
        resultadoFreteSpan.textContent = 'Valor do Frete: R$ 0.00';
        return;
    }

    const valorFrete = (km * custoPorKm) + (peso * custoPorKg);
    console.log(`[frete.js] Frete: ${km} km, ${peso} kg, R$${custoPorKm}/km, R$${custoPorKg}/kg = R$${valorFrete.toFixed(2)}`);
    resultadoFreteSpan.textContent = `Valor do Frete: R$ ${valorFrete.toFixed(2)}`;
}