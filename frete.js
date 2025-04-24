document.addEventListener('DOMContentLoaded', () => {
    console.log('[frete.js] Configurando listener para Frete...');
    const btnCalcularFrete = document.getElementById('btnCalcularFrete');
    if (btnCalcularFrete) btnCalcularFrete.addEventListener('click', calcularFrete);
    else console.warn('[frete.js] Botão #btnCalcularFrete não encontrado.');
});

function calcularFrete() {
    const kmInput = document.getElementById('km');
    const pesoInput = document.getElementById('peso');
    const resultadoFreteSpan = document.getElementById('resultadoFrete');
    if (!kmInput || !pesoInput || !resultadoFreteSpan) {
        console.error('[frete.js] Elementos do DOM ausentes.');
        return;
    }

    const km = parseFloat(kmInput.value) || 0;
    const peso = parseFloat(pesoInput.value) || 0;
    if (km <= 0 || peso <= 0) {
        alert('Preencha valores válidos para distância e peso!');
        resultadoFreteSpan.textContent = 'Valor do Frete: R$ 0.00';
        return;
    }
    const valorFrete = (km * 1.5) + (peso * 0.5);
    console.log(`[frete.js] Frete: ${km} km, ${peso} kg = R$${valorFrete.toFixed(2)}`);
    resultadoFreteSpan.textContent = `Valor do Frete: R$ ${valorFrete.toFixed(2)}`;
}