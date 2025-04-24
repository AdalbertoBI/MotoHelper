// Configurações globais
const GRAPHHOPPER_API_KEY = 'cef6b46d-c99b-42d4-beb0-65ad29fe4f58';
let paradasCount = 1;
let localizacaoAtual = null;
let cacheBusca = JSON.parse(localStorage.getItem('cacheBusca')) || {};
let rotaCoordenadas = [];
let timeoutBusca = null;
let mapaPronto = false; // Variável para rastrear se o mapa está pronto

// Coordenadas padrão para São José dos Campos, SP
const COORDENADAS_PADRAO = {
    lat: -23.2237,
    lon: -45.9009
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, iniciando inicialização...');

    // Inicializa o mapa imediatamente com a localização padrão
    await esperarLeaflet();
    usarLocalizacaoPadrao(); // Força a inicialização do mapa

    carregarGastos();
    carregarKmPorLitro();
    carregarPrecoPorLitro();

    const btnAdicionarParada = document.getElementById('btnAdicionarParada');
    if (btnAdicionarParada) {
        btnAdicionarParada.addEventListener('click', adicionarParada);
    }

    configurarEventosBusca();
    obterLocalizacaoAtual(); // Tenta obter a localização atual, mas o mapa já está inicializado
});

// Função para adicionar paradas
function adicionarParada() {
    paradasCount++;
    const paradasDiv = document.getElementById('paradas');
    const novaParada = document.createElement('input');
    novaParada.type = 'text';
    novaParada.id = `parada${paradasCount}`;
    novaParada.setAttribute('data-id', `parada${paradasCount}`);
    novaParada.placeholder = `Parada ${paradasCount} (opcional)`;
    novaParada.className = 'form-control mb-2';
    novaParada.setAttribute('list', `sugestoesParada${paradasCount}`);
    
    const novaDatalist = document.createElement('datalist');
    novaDatalist.id = `sugestoesParada${paradasCount}`;
    
    paradasDiv.appendChild(novaParada);
    paradasDiv.appendChild(novaDatalist);

    configurarEventosBusca();
}

// Configura eventos de busca para todos os inputs
function configurarEventosBusca() {
    const inputs = document.querySelectorAll('input[data-id]');
    inputs.forEach(input => {
        const inputId = input.getAttribute('data-id');
        const datalistId = `sugestoes${inputId.charAt(0).toUpperCase() + inputId.slice(1)}`;
        input.addEventListener('input', () => {
            clearTimeout(timeoutBusca);
            timeoutBusca = setTimeout(() => {
                buscarSugestoes(inputId, datalistId);
            }, 500);
        });
    });
}

// Obtém a localização atual do usuário
function obterLocalizacaoAtual() {
    if (!navigator.geolocation) {
        console.log('Geolocalização não suportada pelo navegador.');
        return;
    }

    document.getElementById('carregandoLocalizacao').style.display = 'block';

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            localizacaoAtual = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
            };
            
            try {
                centralizarMapa(localizacaoAtual.lat, localizacaoAtual.lon);
                
                // Tenta obter o endereço da localização
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${localizacaoAtual.lat}&lon=${localizacaoAtual.lon}&addressdetails=1`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    const endereco = formatarEndereco(data.address);
                    document.getElementById('origem').value = endereco || 'Localização Atual';
                }
            } catch (error) {
                console.error('Erro ao obter localização:', error);
                document.getElementById('origem').value = 'Localização Atual';
            } finally {
                document.getElementById('carregandoLocalizacao').style.display = 'none';
            }
        },
        (error) => {
            console.error('Erro ao obter localização:', error);
            document.getElementById('carregandoLocalizacao').style.display = 'none';
        },
        {
            timeout: 10000,
            enableHighAccuracy: true
        }
    );
}

// Função para garantir que o Leaflet está carregado
function esperarLeaflet() {
    return new Promise((resolve) => {
        const checkLeaflet = () => {
            if (typeof L !== 'undefined') {
                console.log('Leaflet carregado com sucesso!');
                resolve();
            } else {
                console.log('Aguardando Leaflet carregar...');
                setTimeout(checkLeaflet, 100);
            }
        };
        checkLeaflet();
    });
}

// Usa localização padrão (São José dos Campos)
function usarLocalizacaoPadrao() {
    localizacaoAtual = COORDENADAS_PADRAO;
    inicializarMapa([localizacaoAtual.lat, localizacaoAtual.lon]);
    mapaPronto = true; // Marca que o mapa está pronto
    console.log('Mapa inicializado com localização padrão.');
    document.getElementById('origem').value = 'São José dos Campos, São Paulo';
}

// Formata endereço para exibição
function formatarEndereco(address) {
    if (!address) return '';
    
    const partes = [];
    if (address.road) partes.push(address.road);
    if (address.house_number) partes.push(address.house_number);
    if (address.suburb) partes.push(address.suburb);
    if (address.city || address.town || address.village) partes.push(address.city || address.town || address.village);
    if (address.state) partes.push(address.state);
    
    return partes.join(', ');
}

// Calcula distância entre duas coordenadas em km
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Busca sugestões de endereços
async function buscarSugestoes(inputId, datalistId) {
    const entrada = document.getElementById(inputId).value.trim();
    if (!entrada || entrada.length < 3) {
        document.getElementById(datalistId).innerHTML = '';
        return;
    }

    // Verifica cache primeiro
    if (cacheBusca[entrada]) {
        preencherDatalist(datalistId, cacheBusca[entrada]);
        return;
    }

    document.getElementById('buscandoSugestoes').style.display = 'block';

    try {
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(entrada)}&limit=5&addressdetails=1&countrycodes=BR`;
        
        if (localizacaoAtual) {
            url += `&bounded=1&viewbox=${localizacaoAtual.lon-0.1},${localizacaoAtual.lat+0.1},${localizacaoAtual.lon+0.1},${localizacaoAtual.lat-0.1}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Erro na busca de sugestões');
        
        const data = await res.json();
        const sugestoes = data.map(item => item.display_name).slice(0, 10);
        
        cacheBusca[entrada] = sugestoes;
        localStorage.setItem('cacheBusca', JSON.stringify(cacheBusca));
        
        preencherDatalist(datalistId, sugestoes);
    } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        preencherDatalist(datalistId, ['Erro ao carregar sugestões']);
    } finally {
        document.getElementById('buscandoSugestoes').style.display = 'none';
    }
}

// Preenche o datalist com sugestões
function preencherDatalist(datalistId, sugestoes) {
    const datalist = document.getElementById(datalistId);
    datalist.innerHTML = '';
    
    sugestoes.forEach(sugestao => {
        const option = document.createElement('option');
        option.value = sugestao;
        datalist.appendChild(option);
    });
}

// Converte endereço em coordenadas
async function geocodificar(endereco) {
    if (!endereco) return null;
    
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Erro na geocodificação');
        
        const data = await res.json();
        if (data.length === 0) throw new Error('Endereço não encontrado');
        
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch (error) {
        console.error('Erro na geocodificação:', error);
        throw error;
    }
}

// Calcula a rota entre os pontos
async function calcularRota() {
    // Verifica se o mapa está pronto
    if (!mapaPronto) {
        alert("Aguarde o mapa carregar antes de calcular a rota.");
        console.error('Tentativa de calcular rota antes do mapa estar pronto.');
        return;
    }

    const origem = document.getElementById('origem').value.trim();
    const destino = document.getElementById('destino').value.trim();
    const paradas = [];

    for (let i = 1; i <= paradasCount; i++) {
        const parada = document.getElementById(`parada${i}`);
        if (parada && parada.value) paradas.push(parada.value.trim());
    }

    if (!origem || !destino) {
        alert("Por favor, preencha os campos de origem e destino!");
        return;
    }

    try {
        document.getElementById('resultadoRota').innerHTML = '<div class="loading">Calculando rota...</div>';
        document.getElementById('botaoIniciarRota').style.display = 'none';

        const coordsOrigem = await geocodificar(origem);
        const coordsDestino = await geocodificar(destino);
        const coordsParadas = await Promise.all(paradas.map(geocodificar));

        if (!coordsOrigem || !coordsDestino) {
            throw new Error("Não foi possível encontrar os locais especificados");
        }

        const coords = [coordsOrigem, ...coordsParadas.filter(c => c !== null), coordsDestino];
        rotaCoordenadas = coords;

        // Monta a URL com os pontos
        const points = coords.map(coord => `point=${coord[0]},${coord[1]}`).join('&');
        const url = `https://graphhopper.com/api/1/route?${points}&vehicle=car&locale=pt&instructions=true&key=${GRAPHHOPPER_API_KEY}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const data = await response.json();
        processarRespostaRota(data, coordsOrigem, coordsParadas.filter(c => c !== null), coordsDestino);
    } catch (error) {
        console.error('Erro ao calcular rota:', error);
        document.getElementById('resultadoRota').innerHTML = `<div class="error">Erro: ${error.message}</div>`;
    }
}

// Processa a resposta da API de rotas
function processarRespostaRota(data, coordsOrigem, coordsParadas, coordsDestino) {
    if (data.paths && data.paths.length > 0) {
        const path = data.paths[0];
        const distancia = path.distance / 1000; // em km
        const geometry = path.points.coordinates;

        // Atualiza o mapa
        adicionarMarcadores(coordsOrigem, coordsParadas, coordsDestino);
        desenharRota(geometry);

        // Calcula custos
        const kmPorLitro = parseFloat(localStorage.getItem('kmPorLitro')) || 0;
        const precoPorLitro = parseFloat(localStorage.getItem('precoPorLitro')) || 0;
        const litros = kmPorLitro > 0 ? distancia / kmPorLitro : 0;
        const custoCombustivel = litros * precoPorLitro;

        // Exibe resultados
        let resultadoHTML = `<h3>Resultados da Rota</h3>
                           <p><strong>Distância:</strong> ${distancia.toFixed(2)} km</p>`;
        
        if (kmPorLitro > 0) {
            resultadoHTML += `<p><strong>Combustível estimado:</strong> ${litros.toFixed(2)} litros</p>`;
            
            if (precoPorLitro > 0) {
                resultadoHTML += `<p><strong>Custo do combustível:</strong> R$${custoCombustivel.toFixed(2)}</p>`;
            }
        }

        // Adiciona instruções
        if (path.instructions) {
            resultadoHTML += `<h4>Instruções:</h4><ol>`;
            path.instructions.forEach(step => {
                resultadoHTML += `<li>${step.text} (${(step.distance/1000).toFixed(2)} km)</li>`;
            });
            resultadoHTML += `</ol>`;
        }

        document.getElementById('resultadoRota').innerHTML = resultadoHTML;
        document.getElementById('botaoIniciarRota').style.display = 'block';
    } else {
        throw new Error("Nenhuma rota encontrada");
    }
}

// Abre a rota no Google Maps/Waze
function iniciarRota() {
    if (!rotaCoordenadas || rotaCoordenadas.length < 2) {
        alert("Nenhuma rota disponível para iniciar. Calcule a rota primeiro.");
        return;
    }

    const waypoints = rotaCoordenadas.slice(1, -1).map(coord => `${coord[0]},${coord[1]}`).join('/');
    const origem = `${rotaCoordenadas[0][0]},${rotaCoordenadas[0][1]}`;
    const destino = `${rotaCoordenadas[rotaCoordenadas.length-1][0]},${rotaCoordenadas[rotaCoordenadas.length-1][1]}`;

    // Google Maps
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origem}&destination=${destino}&waypoints=${waypoints}&travelmode=driving`;
    
    // Waze
    const wazeUrl = `https://www.waze.com/ul?ll=${destino}&navigate=yes`;

    window.open(googleMapsUrl, '_blank');
    setTimeout(() => {
        window.open(wazeUrl, '_blank');
    }, 1000);
}

// Funções para cálculo de frete
function calcularFrete() {
    const km = parseFloat(document.getElementById('km').value) || 0;
    const peso = parseFloat(document.getElementById('peso').value) || 0;
    
    if (km <= 0 || peso <= 0) {
        alert("Preencha valores válidos para distância e peso!");
        return;
    }

    const valorFrete = (km * 1.5) + (peso * 0.5);
    document.getElementById('resultadoFrete').textContent = `Valor do Frete: R$${valorFrete.toFixed(2)}`;
}

// Funções para busca de postos
function buscarPostos() {
    if (!navigator.geolocation) {
        alert("GPS não suportado pelo navegador.");
        return;
    }

    document.getElementById('listaPostos').innerHTML = '<li>Buscando postos próximos...</li>';

    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            
            inicializarMapaPostos(lat, lng);
            
            fetch(`https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="fuel"](around:5000,${lat},${lng});out;`)
                .then(res => res.json())
                .then(data => {
                    const postos = data.elements;
                    const listaPostos = document.getElementById('listaPostos');
                    listaPostos.innerHTML = "";

                    if (postos.length === 0) {
                        listaPostos.innerHTML = "<li>Nenhum posto encontrado na região.</li>";
                        return;
                    }

                    postos.forEach(posto => {
                        adicionarMarcadorPosto(posto.lat, posto.lon, posto.tags?.name);
                        
                        const li = document.createElement('li');
                        li.textContent = posto.tags?.name || "Posto sem nome";
                        listaPostos.appendChild(li);
                    });
                })
                .catch(error => {
                    console.error('Erro ao buscar postos:', error);
                    document.getElementById('listaPostos').innerHTML = "<li>Erro ao buscar postos. Tente novamente.</li>";
                });
        },
        error => {
            console.error('Erro ao obter localização:', error);
            document.getElementById('listaPostos').innerHTML = "<li>Não foi possível obter sua localização.</li>";
        }
    );
}

// Funções para gerenciamento de gastos
function salvarGasto() {
    const tipo = document.getElementById('tipoGasto').value.trim();
    const valor = parseFloat(document.getElementById('valorGasto').value);

    if (!tipo || isNaN(valor) || valor <= 0) {
        alert("Preencha todos os campos com valores válidos!");
        return;
    }

    const gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    gastos.push({
        tipo,
        valor,
        data: new Date().toLocaleDateString('pt-BR')
    });
    
    localStorage.setItem('gastos', JSON.stringify(gastos));
    carregarGastos();
    
    // Limpa campos
    document.getElementById('tipoGasto').value = "";
    document.getElementById('valorGasto').value = "";
}

function carregarGastos() {
    const gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    const listaGastos = document.getElementById('listaGastos');
    listaGastos.innerHTML = "";

    let total = 0;
    gastos.forEach(gasto => {
        total += gasto.valor;
        
        const li = document.createElement('li');
        li.textContent = `${gasto.data}: ${gasto.tipo} - R$${gasto.valor.toFixed(2)}`;
        listaGastos.appendChild(li);
    });

    document.getElementById('totalGastos').textContent = total.toFixed(2);
}

function salvarKmPorLitro() {
    const kmPorLitro = parseFloat(document.getElementById('kmPorLitro').value);
    
    if (isNaN(kmPorLitro) || kmPorLitro <= 0) {
        alert("Digite um valor válido para km/litro!");
        return;
    }
    
    localStorage.setItem('kmPorLitro', kmPorLitro);
    alert("Km/litro salvo com sucesso!");
}

function carregarKmPorLitro() {
    const kmPorLitro = localStorage.getItem('kmPorLitro') || '';
    document.getElementById('kmPorLitro').value = kmPorLitro;
}

function salvarPrecoPorLitro() {
    const precoPorLitro = parseFloat(document.getElementById('precoPorLitro').value);
    
    if (isNaN(precoPorLitro) || precoPorLitro <= 0) {
        alert("Digite um valor válido para o preço por litro!");
        return;
    }
    
    localStorage.setItem('precoPorLitro', precoPorLitro);
    alert("Preço por litro salvo com sucesso!");
}

function carregarPrecoPorLitro() {
    const precoPorLitro = localStorage.getItem('precoPorLitro') || '';
    document.getElementById('precoPorLitro').value = precoPorLitro;
}

// Função de emergência
function enviarSOS() {
    if (!navigator.geolocation) {
        alert("Seu navegador não suporta geolocalização.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            alert(`SOS ENVIADO!\n\nSua localização:\nLatitude: ${lat.toFixed(6)}\nLongitude: ${lng.toFixed(6)}`);
            
            // Aqui você pode adicionar código para enviar a localização para um servidor/contato de emergência
        },
        error => {
            alert("Não foi possível obter sua localização para o SOS. Por favor, tente novamente.");
        }
    );
}