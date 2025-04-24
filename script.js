// Configurações globais
const GRAPHHOPPER_API_KEY = 'cef6b46d-c99b-42d4-beb0-65ad29fe4f58'; // ATENÇÃO: Chave exposta no frontend! Considere usar um backend.
let paradasCount = 1;
let localizacaoAtual = null; // Objeto { lat: number, lon: number }
let cacheBusca = JSON.parse(localStorage.getItem('cacheBusca')) || {};
let rotaCoordenadas = []; // Armazena as coordenadas [lat, lon] da rota calculada
let timeoutBusca = null;
let mapaPronto = false; // Flag para indicar se o mapa Leaflet está inicializado

// Coordenadas padrão para São José dos Campos, SP (usado como fallback)
const COORDENADAS_PADRAO = {
    lat: -23.1791,
    lon: -45.8872
};

// --- INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[script.js] DOM carregado. Iniciando aplicação...');

    // 1. Espera o Leaflet estar pronto (caso carregue devagar)
    await esperarLeaflet(); // Função definida abaixo

    // 2. Tenta inicializar o mapa imediatamente (a função em mapa.js usa fallback se necessário)
    //    A localização atual será obtida em seguida e centralizará o mapa.
    inicializarMapa(); // Chama a função do mapa.js

    // Verifica se a inicialização no mapa.js foi bem-sucedida (se a variável global 'map' existe)
    if (typeof map !== 'undefined' && map) {
        mapaPronto = true;
        console.log('[script.js] Mapa parece ter sido inicializado com sucesso pelo mapa.js.');
    } else {
        console.error('[script.js] Falha ao verificar a inicialização do mapa após chamar inicializarMapa().');
        mapaPronto = false;
        // Poderia exibir uma mensagem de erro mais proeminente aqui
        const mapDiv = document.getElementById('map');
         if (mapDiv) mapDiv.innerHTML = '<p style="color:red; font-weight:bold;">Erro crítico ao carregar o mapa. Tente recarregar a página.</p>';
    }


    // 3. Carrega dados salvos (gastos, km/l, preço)
    carregarGastos();
    carregarKmPorLitro();
    carregarPrecoPorLitro();

    // 4. Configura listeners de eventos para botões e inputs
    configurarListeners();

    // 5. Tenta obter a localização atual do usuário
    obterLocalizacaoAtual(); // Tentará centralizar o mapa quando tiver a localização

    console.log('[script.js] Inicialização concluída.');
});

// Função para garantir que o Leaflet (variável L) esteja carregado
function esperarLeaflet() {
    return new Promise((resolve) => {
        const checkLeaflet = () => {
            if (typeof L !== 'undefined' && L.map) {
                console.log('[script.js] Leaflet carregado.');
                resolve();
            } else {
                console.log('[script.js] Aguardando Leaflet...');
                setTimeout(checkLeaflet, 150); // Verifica novamente
            }
        };
        checkLeaflet();
    });
}

// Configura todos os event listeners da aplicação
function configurarListeners() {
    console.log('[script.js] Configurando listeners...');

    // Botão Adicionar Parada
    const btnAdicionarParada = document.getElementById('btnAdicionarParada');
    if (btnAdicionarParada) {
        btnAdicionarParada.addEventListener('click', adicionarParada);
    } else console.warn('[script.js] Botão #btnAdicionarParada não encontrado.');

    // Botão Calcular Rota (usando o ID do HTML corrigido)
    const btnCalcularRota = document.getElementById('btnCalcularRota');
    if (btnCalcularRota) {
        btnCalcularRota.addEventListener('click', calcularRota);
    } else console.warn('[script.js] Botão #btnCalcularRota não encontrado.');

     // Botão Iniciar Rota (usando o ID do HTML corrigido)
     const btnGo = document.getElementById('btnGo'); // ID alterado no HTML
     if (btnGo) {
         btnGo.addEventListener('click', iniciarRota);
     } else console.warn('[script.js] Botão #btnGo não encontrado.');


    // Inputs de Origem/Destino/Paradas para busca de sugestões
    configurarEventosBusca(); // Configura para os inputs existentes

    // Botões das outras abas
    const btnCalcularFrete = document.getElementById('btnCalcularFrete');
    if (btnCalcularFrete) btnCalcularFrete.addEventListener('click', calcularFrete);
    else console.warn('[script.js] Botão #btnCalcularFrete não encontrado.');

    const btnBuscarPostos = document.getElementById('btnBuscarPostos');
    if (btnBuscarPostos) btnBuscarPostos.addEventListener('click', buscarPostos);
     else console.warn('[script.js] Botão #btnBuscarPostos não encontrado.');

    const btnSalvarGasto = document.getElementById('btnSalvarGasto');
    if (btnSalvarGasto) btnSalvarGasto.addEventListener('click', salvarGasto);
     else console.warn('[script.js] Botão #btnSalvarGasto não encontrado.');

    const btnSalvarKm = document.getElementById('btnSalvarKmPorLitro');
    if (btnSalvarKm) btnSalvarKm.addEventListener('click', salvarKmPorLitro);
    else console.warn('[script.js] Botão #btnSalvarKmPorLitro não encontrado.');

    const btnSalvarPreco = document.getElementById('btnSalvarPrecoPorLitro');
    if (btnSalvarPreco) btnSalvarPreco.addEventListener('click', salvarPrecoPorLitro);
    else console.warn('[script.js] Botão #btnSalvarPrecoPorLitro não encontrado.');

    const btnSOS = document.getElementById('btnSOS');
    if (btnSOS) btnSOS.addEventListener('click', enviarSOS);
    else console.warn('[script.js] Botão #btnSOS não encontrado.');

    console.log('[script.js] Listeners configurados.');
}


// --- LOCALIZAÇÃO E MAPA ---

// Obtém a localização atual do usuário via Geolocation API
function obterLocalizacaoAtual() {
    if (!navigator.geolocation) {
        console.warn('[script.js] Geolocalização não suportada pelo navegador.');
        // Mapa já foi inicializado com fallback, não faz mais nada
        return;
    }

    const carregandoDiv = document.getElementById('carregandoLocalizacao');
    if(carregandoDiv) carregandoDiv.style.display = 'block';
    console.log('[script.js] Tentando obter localização atual...');

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            localizacaoAtual = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
            };
            console.log('[script.js] Localização obtida:', localizacaoAtual);
            if(carregandoDiv) carregandoDiv.style.display = 'none';

            // Centraliza o mapa na localização obtida (chama função do mapa.js)
            if (mapaPronto) {
                centralizarMapa(localizacaoAtual.lat, localizacaoAtual.lon); // Usa a função do mapa.js
            } else {
                 console.warn('[script.js] Mapa não estava pronto ao obter localização, tentando inicializar/centralizar agora.');
                 inicializarMapa([localizacaoAtual.lat, localizacaoAtual.lon]); // Tenta garantir inicialização com a localização
            }


            // Tenta obter o endereço reverso para preencher a origem
            try {
                const enderecoFormatado = await obterEnderecoReverso(localizacaoAtual.lat, localizacaoAtual.lon);
                const origemInput = document.getElementById('origem');
                 if (origemInput && !origemInput.value) { // Só preenche se estiver vazio
                     origemInput.value = enderecoFormatado || 'Localização Atual';
                 }
            } catch (error) {
                console.error('[script.js] Erro ao obter endereço reverso:', error);
                 const origemInput = document.getElementById('origem');
                 if (origemInput && !origemInput.value) {
                     origemInput.value = 'Localização Atual (erro endereço)';
                 }
            }
        },
        (error) => {
            console.error('[script.js] Erro ao obter localização via Geolocation API:', error.message);
            if(carregandoDiv) carregandoDiv.style.display = 'none';
             alert(`Não foi possível obter sua localização: ${error.message}. Usando localização padrão.`);
             // Garante que o mapa seja inicializado com o padrão se falhar E ainda não estiver pronto
             if (!mapaPronto) {
                 console.warn('[script.js] Falha na geolocalização, garantindo inicialização com padrão.');
                 inicializarMapa(); // Chama com fallback
                 mapaPronto = (typeof map !== 'undefined' && map); // Atualiza o status do mapa
             }
        },
        {
            timeout: 10000, // 10 segundos
            enableHighAccuracy: true,
            maximumAge: 60000 // Aceita localização em cache por 1 minuto
        }
    );
}

// Função separada para geocodificação reversa
async function obterEnderecoReverso(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=pt-BR`;
     console.log('[script.js] Obtendo endereço reverso para:', lat, lon);
    try {
         const res = await fetch(url);
         if (!res.ok) {
             throw new Error(`Nominatim reverse API error! status: ${res.status}`);
         }
         const data = await res.json();
         console.log('[script.js] Endereço reverso data:', data);
         return formatarEndereco(data.address); // Função de formatação definida abaixo
    } catch (error) {
         console.error("[script.js] Falha na requisição de endereço reverso:", error);
         return null; // Retorna null em caso de erro
    }
}

// Formata o objeto de endereço do Nominatim para exibição
function formatarEndereco(address) {
    if (!address) return '';
    const partes = [
        address.road,
        address.house_number,
        address.suburb,          // Bairro mais próximo
        address.neighbourhood,   // Vizinhança (pode ser útil)
        // address.city_district, // Distrito (pode ser redundante)
        address.city || address.town || address.village,
        address.state,
        // address.postcode      // CEP pode poluir muito
    ];
    // Filtra partes vazias/nulas e junta com vírgula e espaço
    return partes.filter(p => p).join(', ');
}


// --- FUNCIONALIDADE DE ROTAS ---

// Adiciona um novo campo de parada
function adicionarParada() {
    paradasCount++;
    const paradasDiv = document.getElementById('paradas');
    if (!paradasDiv) {
        console.error('[script.js] Div #paradas não encontrado para adicionar parada.');
        return;
    }

    const novaParadaContainer = document.createElement('div');
    novaParadaContainer.className = 'form-group parada-container mb-2'; // Container para input e datalist

    const novaParadaInput = document.createElement('input');
    novaParadaInput.type = 'text';
    novaParadaInput.id = `parada${paradasCount}`;
    novaParadaInput.setAttribute('data-id', `parada${paradasCount}`); // Para identificar no listener
    novaParadaInput.placeholder = `Parada ${paradasCount}`;
    novaParadaInput.className = 'form-control parada-input';
    novaParadaInput.setAttribute('list', `sugestoesParada${paradasCount}`);

    const novaParadaDatalist = document.createElement('datalist');
    novaParadaDatalist.id = `sugestoesParada${paradasCount}`;

    // Botão para remover esta parada específica (opcional, mas útil)
    const btnRemover = document.createElement('button');
    btnRemover.type = 'button';
    btnRemover.textContent = '×'; // Ou um ícone de lixeira
    btnRemover.className = 'btn btn-danger btn-sm btn-remover-parada';
    btnRemover.style.marginLeft = '5px';
    btnRemover.onclick = function() {
        paradasDiv.removeChild(novaParadaContainer);
        // Idealmente, renumerar as paradas restantes ou ajustar a lógica de leitura
        // Simplesmente remover é mais fácil, mas a contagem pode ficar estranha.
    };

    novaParadaContainer.appendChild(novaParadaInput);
    novaParadaContainer.appendChild(novaParadaDatalist);
    novaParadaContainer.appendChild(btnRemover); // Adiciona botão de remover
    paradasDiv.appendChild(novaParadaContainer);

    // Reconfigura os eventos de busca para incluir o novo input
    configurarEventosBusca();
}

// (Re)Configura eventos de 'input' para todos os campos de endereço (origem, destino, paradas)
function configurarEventosBusca() {
    const inputs = document.querySelectorAll('input[data-id][list]'); // Seleciona inputs com data-id e list
    inputs.forEach(input => {
        const inputId = input.getAttribute('data-id');
        const datalistId = input.getAttribute('list'); // Pega o ID do datalist diretamente do atributo

        // Remove listener antigo para evitar duplicação (importante ao adicionar paradas)
         // Clonar e substituir é uma forma eficaz de remover todos os listeners anônimos
         const novoInput = input.cloneNode(true);
         input.parentNode.replaceChild(novoInput, input);


        // Adiciona o novo listener ao input clonado/novo
        const inputAtual = document.getElementById(inputId); // Pega a referência do novo input
        if (inputAtual && document.getElementById(datalistId)) {
             inputAtual.addEventListener('input', () => {
                clearTimeout(timeoutBusca); // Cancela buscas anteriores se o usuário digitar rápido
                timeoutBusca = setTimeout(() => {
                    buscarSugestoes(inputId, datalistId);
                }, 400); // Delay um pouco menor (400ms)
            });
        } else {
             console.warn(`[script.js] Elemento não encontrado para configurar busca: input #${inputId} ou datalist #${datalistId}`);
        }
    });
}


// Busca sugestões de endereço na API Nominatim
async function buscarSugestoes(inputId, datalistId) {
    const inputElement = document.getElementById(inputId);
    const datalistElement = document.getElementById(datalistId);
    const buscandoDiv = document.getElementById('buscandoSugestoes');

    if (!inputElement || !datalistElement) return; // Sai se elementos não existem

    const entrada = inputElement.value.trim();
    if (entrada.length < 3) {
        datalistElement.innerHTML = ''; // Limpa se a entrada for muito curta
        return;
    }

    // Verifica cache
    if (cacheBusca[entrada]) {
        preencherDatalist(datalistId, cacheBusca[entrada]);
        return;
    }

    if(buscandoDiv) buscandoDiv.style.display = 'inline'; // Mostra indicador

    try {
        // Constrói URL priorizando viewbox se houver localização
        const viewboxParam = localizacaoAtual
           ? `&viewbox=${localizacaoAtual.lon - 0.5},${localizacaoAtual.lat + 0.5},${localizacaoAtual.lon + 0.5},${localizacaoAtual.lat - 0.5}&bounded=1`
           : '';
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(entrada)}&limit=5&addressdetails=1&countrycodes=BR${viewboxParam}&accept-language=pt-BR`;

        console.log("[script.js] Buscando sugestões:", url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Nominatim suggestions API error! status: ${res.status}`);

        const data = await res.json();
        // Mapeia para display_name e remove duplicatas
        const sugestoes = [...new Set(data.map(item => item.display_name))];

        cacheBusca[entrada] = sugestoes; // Salva no cache
        try { // Bloco try/catch para localStorage que pode falhar em modo privado
             localStorage.setItem('cacheBusca', JSON.stringify(cacheBusca));
        } catch (e) {
             console.warn("[script.js] Não foi possível salvar o cache de busca no localStorage:", e);
             // Limpa cache antigo se estiver cheio
             if (e.name === 'QuotaExceededError') {
                  cacheBusca = {}; // Reseta o cache em memória
                  localStorage.removeItem('cacheBusca');
             }
        }


        preencherDatalist(datalistId, sugestoes);

    } catch (error) {
        console.error('[script.js] Erro ao buscar sugestões:', error);
        // Não preenche com erro para não atrapalhar o usuário
        // preencherDatalist(datalistId, ['Erro ao carregar']);
    } finally {
        if(buscandoDiv) buscandoDiv.style.display = 'none'; // Esconde indicador
    }
}

// Preenche um <datalist> com as sugestões
function preencherDatalist(datalistId, sugestoes) {
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;
    datalist.innerHTML = ''; // Limpa antes de adicionar
    sugestoes.forEach(sugestao => {
        const option = document.createElement('option');
        option.value = sugestao;
        datalist.appendChild(option);
    });
}

// Converte um endereço em coordenadas [latitude, longitude] usando Nominatim
async function geocodificar(endereco) {
    // **Correção para o erro da imagem:** Tenta limpar o endereço
    let enderecoLimpo = endereco.trim();
     // Remove qualquer coisa entre parênteses no final (ex: " (1.52 km)")
     enderecoLimpo = enderecoLimpo.replace(/\s*\([^)]*\)$/, '');
     // Remove CEPs longos no final (ex: ", 12230-000, Brasil") - pode ser arriscado
     enderecoLimpo = enderecoLimpo.replace(/,\s*\d{5}-\d{3},\s*Brasil$/, '');


    if (!enderecoLimpo) {
        console.warn("[script.js] Tentativa de geocodificar endereço vazio ou inválido após limpeza.");
        return null;
    }

    // Se o endereço original era diferente, loga a limpeza
    if (enderecoLimpo !== endereco.trim()) {
         console.log(`[script.js] Geocodificando endereço limpo: "${enderecoLimpo}" (Original: "${endereco.trim()}")`);
    } else {
         console.log(`[script.js] Geocodificando: "${enderecoLimpo}"`);
    }


    // Verifica cache de geocodificação (simples, baseado no endereço limpo)
    const cacheKey = `geo_${enderecoLimpo.toLowerCase()}`;
     if (cacheBusca[cacheKey]) {
         console.log("[script.js] Usando cache de geocodificação para:", enderecoLimpo);
         return cacheBusca[cacheKey];
     }


    try {
        // Não usar viewbox na geocodificação direta pode ser mais flexível
        // const viewboxParam = localizacaoAtual ? `&viewbox=...&bounded=1` : '';
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoLimpo)}&limit=1&countrycodes=BR&accept-language=pt-BR`;

        console.log("[script.js] Geocoding URL:", url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Nominatim geocoding API error! status: ${res.status}`);

        const data = await res.json();
        if (data.length === 0) {
            throw new Error(`Endereço não encontrado via Nominatim: "${enderecoLimpo}"`);
        }

        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        if (isNaN(lat) || isNaN(lon)) {
             throw new Error(`Coordenadas inválidas retornadas para "${enderecoLimpo}"`);
        }

        const coordenadas = [lat, lon];
         console.log(`[script.js] Geocodificado "${enderecoLimpo}" para:`, coordenadas);

         // Salva no cache
         cacheBusca[cacheKey] = coordenadas;
         // Tenta salvar no localStorage
         try { localStorage.setItem('cacheBusca', JSON.stringify(cacheBusca)); } catch(e) { console.warn("Falha ao salvar cache geo");}


        return coordenadas; // Retorna [latitude, longitude]

    } catch (error) {
        console.error(`[script.js] Erro na geocodificação de "${enderecoLimpo}":`, error);
        throw error; // Re-lança o erro para ser tratado pelo chamador (calcularRota)
    }
}

// Função principal para calcular a rota
async function calcularRota() {
    console.log("[script.js] Iniciando cálculo de rota...");
    if (!mapaPronto) {
        alert("O mapa ainda não está pronto. Aguarde a inicialização completa.");
        console.error('[script.js] Tentativa de calcular rota com mapa não pronto.');
        return;
    }

    const origemInput = document.getElementById('origem');
    const destinoInput = document.getElementById('destino');
    const resultadoRotaDiv = document.getElementById('resultadoRota');
    const botaoIniciar = document.getElementById('btnGo'); // ID atualizado

    // Validações básicas dos elementos
    if (!origemInput || !destinoInput || !resultadoRotaDiv || !botaoIniciar) {
         console.error("[script.js] Elementos essenciais do DOM para rota não encontrados!");
         alert("Erro interno: Elementos da página ausentes. Recarregue.");
         return;
    }

    const origem = origemInput.value.trim();
    const destino = destinoInput.value.trim();

    // Coleta paradas dos inputs existentes
    const paradas = [];
    const paradaInputs = document.querySelectorAll('.parada-input'); // Usa a classe adicionada
    paradaInputs.forEach(input => {
        if (input.value.trim()) {
            paradas.push(input.value.trim());
        }
    });

    if (!origem || !destino) {
        alert("Por favor, preencha os campos de Origem e Destino!");
        return;
    }

    // Feedback visual e limpeza
    resultadoRotaDiv.innerHTML = '<div class="loading">Calculando... Geocodificando endereços...</div>';
    botaoIniciar.style.display = 'none';
    limparCamadasDoMapa('tudo'); // Usa a função de limpeza do mapa.js


    try {
        // Geocodifica todos os pontos necessários em paralelo
        console.log("[script.js] Geocodificando pontos...");
        const promessasGeocodificacao = [
            // Trata "Localização Atual" usando coordenadas já obtidas
            (origem.toLowerCase() === 'localização atual' && localizacaoAtual)
                ? Promise.resolve([localizacaoAtual.lat, localizacaoAtual.lon]) // Usa coordenadas direto
                : geocodificar(origem), // Geocodifica normalmente
            ...paradas.map(p => geocodificar(p)), // Mapeia cada parada para uma promessa de geocodificação
            geocodificar(destino)
        ];

        // Espera todas as geocodificações terminarem (com sucesso ou falha)
        const todosResultadosCoords = await Promise.allSettled(promessasGeocodificacao);
        console.log("[script.js] Resultados da geocodificação:", todosResultadosCoords);


        // Processa resultados da geocodificação
        const coordsParaApi = [];
        const falhasGeocodificacao = [];

        // Origem
        if (todosResultadosCoords[0].status === 'fulfilled' && todosResultadosCoords[0].value) {
            coordsParaApi.push(todosResultadosCoords[0].value);
        } else {
            falhasGeocodificacao.push(`Origem (${origem}): ${todosResultadosCoords[0].reason?.message || 'Falha'}`);
        }

        // Paradas
        todosResultadosCoords.slice(1, -1).forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                coordsParaApi.push(result.value);
            } else {
                falhasGeocodificacao.push(`Parada ${index + 1} (${paradas[index]}): ${result.reason?.message || 'Falha'}`);
            }
        });

        // Destino
        const indiceDestino = todosResultadosCoords.length - 1;
        if (todosResultadosCoords[indiceDestino].status === 'fulfilled' && todosResultadosCoords[indiceDestino].value) {
            coordsParaApi.push(todosResultadosCoords[indiceDestino].value);
        } else {
            // **Erro da imagem acontece aqui!**
            falhasGeocodificacao.push(`Destino (${destino}): ${todosResultadosCoords[indiceDestino].reason?.message || 'Falha'}`);
        }

        // Verifica se houve falhas críticas (Origem ou Destino)
        if (todosResultadosCoords[0].status === 'rejected' || todosResultadosCoords[indiceDestino].status === 'rejected') {
             throw new Error(`Não foi possível encontrar as coordenadas. Verifique os endereços:\n- ${falhasGeocodificacao.join('\n- ')}`);
        }
         // Alerta sobre paradas não encontradas, mas continua se origem/destino OK
         if (falhasGeocodificacao.length > 0) {
             alert(`Atenção: Os seguintes pontos não foram encontrados e serão ignorados:\n- ${falhasGeocodificacao.join('\n- ')}`);
         }

         // Precisa ter pelo menos origem e destino válidos
         if (coordsParaApi.length < 2) {
             throw new Error("Não foi possível obter coordenadas válidas para a origem e o destino.");
         }

        // Armazena as coordenadas válidas para usar no botão "Iniciar Rota"
        rotaCoordenadas = coordsParaApi;
        console.log("[script.js] Coordenadas válidas para API GraphHopper:", coordsParaApi);

        // Feedback visual
        resultadoRotaDiv.innerHTML = '<div class="loading">Geocodificação OK. Calculando rota via GraphHopper...</div>';

        // Monta a URL da API GraphHopper
        const pointsQuery = coordsParaApi.map(coord => `point=${coord[0]},${coord[1]}`).join('&');
        const url = `https://graphhopper.com/api/1/route?${pointsQuery}&vehicle=car&locale=pt-BR&points_encoded=false&instructions=true&key=${GRAPHHOPPER_API_KEY}`;
        // points_encoded=false é importante para obter a geometria como array [lon, lat]
        // locale=pt-BR para instruções em português

        console.log("[script.js] URL GraphHopper:", url);

        // Chama a API GraphHopper
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        console.log("[script.js] Resposta da API GraphHopper recebida, status:", response.status);

        // Processa a resposta
        if (!response.ok) {
            let errorMsg = `Erro na API GraphHopper: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg += ` - ${errorData.message || JSON.stringify(errorData)}`;
            } catch (e) { errorMsg += ` - ${response.statusText}`; }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log("[script.js] Dados recebidos da API GraphHopper:", data);

        // Processa os dados da rota e atualiza a UI
        processarRespostaRota(data, coordsParaApi); // Passa apenas as coordenadas válidas

    } catch (error) {
        console.error('[script.js] Erro detalhado durante o cálculo da rota:', error);
        resultadoRotaDiv.innerHTML = `<div class="error"><b>Erro ao calcular a rota:</b><br>${error.message}.<br>Verifique os endereços e sua conexão. Veja o console (F12) para detalhes técnicos.</div>`;
        // Limpa camadas do mapa em caso de erro
        limparCamadasDoMapa('tudo');
    }
}


// Processa a resposta da API GraphHopper e exibe os resultados
function processarRespostaRota(data, coordsUtilizadas) {
     // Recebe as coordenadas que foram efetivamente usadas na API
    if (data.paths && data.paths.length > 0) {
        const path = data.paths[0]; // Pega o primeiro caminho retornado

        // Validações essenciais da resposta
        if (typeof path.distance !== 'number') {
            console.error("[script.js] Resposta da API sem valor numérico para 'distance'.", data);
            throw new Error("A API retornou uma rota inválida (sem distância).");
        }
        if (!path.points || !path.points.coordinates || path.points.coordinates.length === 0) {
            console.warn("[script.js] Resposta da API sem geometria ('points.coordinates'). Rota não será desenhada.");
            // Decide se quer lançar erro ou continuar sem desenhar
            // throw new Error("A API retornou uma rota inválida (sem geometria).");
        }

        const distancia = path.distance / 1000; // Distância em km
        const tempoSegundos = path.time / 1000; // Tempo em segundos (GraphHopper fornece em ms)
        const tempoFormatado = formatarTempo(tempoSegundos); // Formata para H:MM:SS ou M min
        const geometry = path.points?.coordinates; // Array de [lon, lat]

        console.log(`[script.js] Rota encontrada! Distância: ${distancia.toFixed(2)} km, Tempo: ${tempoFormatado}`);

        // ---- ATUALIZA O MAPA (Usando funções do mapa.js) ----
        // Adiciona marcadores usando as coordenadas que FORAM geocodificadas com sucesso
        const coordsOrigem = coordsUtilizadas[0];
        const coordsDestino = coordsUtilizadas[coordsUtilizadas.length - 1];
        const coordsParadas = coordsUtilizadas.slice(1, -1);
        adicionarMarcadores(coordsOrigem, coordsParadas, coordsDestino);

        if (geometry) {
            desenharRota(geometry); // Desenha a linha da rota
        }
        // ---- FIM ATUALIZA O MAPA ----

        // ---- CALCULA CUSTOS ----
        const kmPorLitro = parseFloat(localStorage.getItem('kmPorLitro')) || 0;
        const precoPorLitro = parseFloat(localStorage.getItem('precoPorLitro')) || 0;
        let litros = 0;
        let custoCombustivel = 0;
        let infoCombustivelHTML = '<p class="text-muted"><small><em>Configure Km/Litro e Preço/Litro na aba "Gastos" para estimar custos.</em></small></p>';

        if (kmPorLitro > 0) {
            litros = distancia / kmPorLitro;
            infoCombustivelHTML = `<p><strong>Combustível estimado:</strong> ${litros.toFixed(2)} litros</p>`;
            if (precoPorLitro > 0) {
                custoCombustivel = litros * precoPorLitro;
                infoCombustivelHTML += `<p><strong>Custo estimado do combustível:</strong> R$ ${custoCombustivel.toFixed(2)}</p>`;
            } else {
                infoCombustivelHTML += `<p class="text-muted"><small><em>Configure o Preço/Litro para calcular o custo total.</em></small></p>`;
            }
        }
        // ---- FIM CALCULA CUSTOS ----

        // ---- EXIBE RESULTADOS NO HTML ----
        let resultadoHTML = `<h3>Resultados da Rota</h3>
                             <p><strong>Distância Total:</strong> ${distancia.toFixed(2)} km</p>
                             <p><strong>Tempo Estimado:</strong> ${tempoFormatado}</p>
                             ${infoCombustivelHTML}`; // Adiciona info de combustível

        // Adiciona instruções se existirem
        if (path.instructions && path.instructions.length > 0) {
            resultadoHTML += `<h4 class="mt-3">Instruções de Rota:</h4><ol class="list-group list-group-flush">`;
            path.instructions.forEach(step => {
                // Formata a instrução e a distância do trecho
                const instrucaoTexto = step.text;
                const distanciaInstrucaoKm = (step.distance / 1000).toFixed(2);
                resultadoHTML += `<li class="list-group-item" style="font-size: 0.9em;">${instrucaoTexto} <span class="text-muted">(${distanciaInstrucaoKm} km)</span></li>`;
            });
            resultadoHTML += `</ol>`;
        } else {
            resultadoHTML += `<p class="text-muted mt-2"><em>Instruções detalhadas não disponíveis para esta rota.</em></p>`;
        }

        document.getElementById('resultadoRota').innerHTML = resultadoHTML;
        document.getElementById('btnGo').style.display = 'block'; // Mostra o botão "Iniciar Rota"
        // ---- FIM EXIBE RESULTADOS ----

    } else {
        console.warn("[script.js] Nenhuma rota ('path') encontrada na resposta da API.", data);
        throw new Error(`Nenhuma rota encontrada entre os pontos. ${data.message || ''}`);
    }
}

// Formata segundos em uma string de tempo legível
function formatarTempo(totalSegundos) {
    if (isNaN(totalSegundos) || totalSegundos < 0) return "N/A";

    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = Math.floor(totalSegundos % 60);

    let resultado = '';
    if (horas > 0) {
        resultado += `${horas}h `;
    }
    if (minutos > 0 || horas > 0) { // Mostra minutos mesmo se for 0, caso tenha hora
        resultado += `${minutos}min `;
    }
     // Opcional: Mostrar segundos apenas se o tempo total for curto
     if (horas === 0 && minutos < 5) {
          resultado += `${segundos}s`;
     }

    return resultado.trim() || "Menos de 1 min"; // Se for muito curto
}


// Abre a rota calculada no Google Maps / Waze
function iniciarRota() {
    if (!rotaCoordenadas || rotaCoordenadas.length < 2) {
        alert("Nenhuma rota calculada disponível para iniciar. Calcule a rota primeiro.");
        return;
    }

    const origemCoord = rotaCoordenadas[0];
    const destinoCoord = rotaCoordenadas[rotaCoordenadas.length - 1];
    const waypointsCoord = rotaCoordenadas.slice(1, -1);

    const origemParam = `${origemCoord[0]},${origemCoord[1]}`;
    const destinoParam = `${destinoCoord[0]},${destinoCoord[1]}`;

    // Google Maps URL (suporta waypoints com | )
    let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origemParam}&destination=${destinoParam}&travelmode=driving`;
    if (waypointsCoord.length > 0) {
        const waypointsParam = waypointsCoord.map(coord => `${coord[0]},${coord[1]}`).join('|');
        googleMapsUrl += `&waypoints=${waypointsParam}`;
    }
    console.log("[script.js] Google Maps URL:", googleMapsUrl);
    window.open(googleMapsUrl, '_blank');


    // Waze URL (inicia navegação para o destino)
    const wazeUrl = `https://www.waze.com/ul?ll=${destinoParam.replace(',', '%2C')}&navigate=yes`;
    console.log("[script.js] Waze URL:", wazeUrl);
    // Tenta abrir o Waze (pode não funcionar dependendo do browser/config)
    setTimeout(() => {
         // Tentar redirecionar pode funcionar melhor em mobile às vezes
         // window.location.href = wazeUrl;
         window.open(wazeUrl, '_blank');
    }, 1500); // Pequeno delay
}


// --- FUNCIONALIDADES ADICIONAIS (Frete, Postos, Gastos, SOS) ---
// (Mantidas com pequenas melhorias e logs do código anterior)

function calcularFrete() {
    const kmInput = document.getElementById('km');
    const pesoInput = document.getElementById('peso');
    const resultadoFreteSpan = document.getElementById('resultadoFrete');
    if (!kmInput || !pesoInput || !resultadoFreteSpan) return;

    const km = parseFloat(kmInput.value) || 0;
    const peso = parseFloat(pesoInput.value) || 0;

    if (km <= 0 || peso <= 0) {
        alert("Preencha valores válidos e positivos para distância (km) e peso!");
        resultadoFreteSpan.textContent = 'Valor do Frete: R$ 0.00';
        return;
    }
    // Fórmula de exemplo
    const valorFrete = (km * 1.5) + (peso * 0.5);
    console.log(`[script.js] Calculando frete: ${km} km, ${peso} kg = R$${valorFrete.toFixed(2)}`);
    resultadoFreteSpan.textContent = `Valor do Frete: R$ ${valorFrete.toFixed(2)}`;
}

async function buscarPostos() {
    const listaPostosUl = document.getElementById('listaPostos');
    if (!listaPostosUl) return;

    if (!navigator.geolocation) {
        alert("GPS (Geolocalização) não suportado ou desativado.");
        listaPostosUl.innerHTML = "<li>Geolocalização não disponível.</li>";
        return;
    }

    listaPostosUl.innerHTML = '<li>Obtendo sua localização...</li>';
     limparCamadasDoMapa('tudo'); // Limpa mapa antes de buscar postos

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            console.log(`[script.js] Localização para busca de postos: ${lat}, ${lng}`);

            // Centraliza o mapa principal na localização (mapa.js)
             if(mapaPronto) centralizarMapa(lat, lng, 14); else inicializarMapa([lat, lng]);

            listaPostosUl.innerHTML = '<li>Buscando postos próximos (até 5km)...</li>';
            const raioBuscaMetros = 5000;
            const overpassQuery = `[out:json][timeout:25];node["amenity"="fuel"](around:${raioBuscaMetros},${lat},${lng});out geom;`;
            const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

            try {
                console.log("[script.js] Consultando Overpass API:", overpassUrl);
                const res = await fetch(overpassUrl);
                if (!res.ok) throw new Error(`Erro ${res.status} na API Overpass`);
                const data = await res.json();
                console.log("[script.js] Resposta Overpass:", data);

                const postos = data.elements;
                listaPostosUl.innerHTML = ""; // Limpa a lista

                if (!postos || postos.length === 0) {
                    listaPostosUl.innerHTML = `<li class="list-group-item">Nenhum posto encontrado num raio de ${raioBuscaMetros/1000} km.</li>`;
                    return;
                }

                // Adiciona marcador para a localização atual (referência)
                 adicionarMarcadorUsuario(lat, lng);


                const boundsCoords = [[lat, lng]]; // Inclui usuário nos limites
                postos.forEach(posto => {
                    if (posto.lat && posto.lon) {
                        const nomePosto = posto.tags?.name || "Posto sem nome";
                        adicionarMarcadorPosto(posto.lat, posto.lon, nomePosto); // Adiciona ao mapa principal (mapa.js)
                        boundsCoords.push([posto.lat, posto.lon]);

                        const li = document.createElement('li');
                        li.className = 'list-group-item';
                         const dist = calcularDistancia(lat, lng, posto.lat, posto.lon); // Calcula distância reta
                         li.textContent = `${nomePosto} (~${dist.toFixed(1)} km)`;
                        listaPostosUl.appendChild(li);
                    }
                });

                // Ajusta o zoom para mostrar usuário e postos
                if (map && boundsCoords.length > 1) {
                     map.fitBounds(boundsCoords, { padding: [40, 40] });
                }

            } catch (error) {
                console.error('[script.js] Erro ao buscar postos na API Overpass:', error);
                listaPostosUl.innerHTML = `<li class="list-group-item list-group-item-danger">Erro ao buscar postos (${error.message}).</li>`;
            }
        },
        (error) => {
            console.error('[script.js] Erro ao obter localização para buscar postos:', error.message);
            listaPostosUl.innerHTML = `<li class="list-group-item list-group-item-warning">Não foi possível obter sua localização (${error.message}).</li>`;
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}
// Função auxiliar para adicionar marcador do usuário na busca de postos
function adicionarMarcadorUsuario(lat, lon) {
     if (!map || !markersLayer) return;
      const iconeUsuario = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', // Roxo para usuário
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
     L.marker([lat, lon], { icon: iconeUsuario })
        .bindPopup('Sua Localização Atual')
        .addTo(markersLayer)
         .openPopup(); // Abre o popup
}


// Calcula distância em linha reta (Haversine) - USADO na busca de postos
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distância em km
}


// --- Funções de Gerenciamento de Gastos (com exclusão) ---

function salvarGasto() {
    const tipoInput = document.getElementById('tipoGasto');
    const valorInput = document.getElementById('valorGasto');
    if (!tipoInput || !valorInput) return;

    const tipo = tipoInput.value.trim();
    const valor = parseFloat(valorInput.value);

    if (!tipo || isNaN(valor) || valor <= 0) {
        alert("Preencha o tipo e um valor numérico positivo para o gasto!");
        return;
    }

    const gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    const novoGasto = {
        id: Date.now(), // ID único baseado no timestamp
        tipo,
        valor,
        data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
    gastos.push(novoGasto);
    localStorage.setItem('gastos', JSON.stringify(gastos));
    console.log("[script.js] Gasto salvo:", novoGasto);
    carregarGastos(); // Atualiza a lista na UI

    tipoInput.value = "";
    valorInput.value = "";
    tipoInput.focus();
}

function carregarGastos() {
    const listaGastosUl = document.getElementById('listaGastos');
    const totalGastosSpan = document.getElementById('totalGastos');
    if (!listaGastosUl || !totalGastosSpan) return;

    const gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    listaGastosUl.innerHTML = ""; // Limpa
    let total = 0;

    if (gastos.length === 0) {
        listaGastosUl.innerHTML = "<li class='list-group-item text-muted'>Nenhum gasto registrado.</li>";
    } else {
         // Ordena por ID (data de inserção) - mais recentes primeiro
         gastos.sort((a, b) => b.id - a.id);

        gastos.forEach(gasto => {
            total += gasto.valor;
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <span>${gasto.data}: ${gasto.tipo} - <strong>R$ ${gasto.valor.toFixed(2)}</strong></span>
                <button class="btn btn-outline-danger btn-sm py-0 px-1" onclick="excluirGasto(${gasto.id})" title="Excluir Gasto">&times;</button>
            `; // Botão de exclusão chama função específica
            listaGastosUl.appendChild(li);
        });
    }
    totalGastosSpan.textContent = total.toFixed(2);
    console.log("[script.js] Gastos carregados. Total:", total.toFixed(2));
}

// Função chamada pelo botão de exclusão na lista de gastos
function excluirGasto(idGasto) {
    if (!confirm("Tem certeza que deseja excluir este registro de gasto?")) {
        return;
    }
    let gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
    gastos = gastos.filter(gasto => gasto.id !== idGasto); // Filtra mantendo os outros
    localStorage.setItem('gastos', JSON.stringify(gastos));
    console.log("[script.js] Gasto excluído:", idGasto);
    carregarGastos(); // Recarrega a lista atualizada
}

// --- Funções Salvar/Carregar Km/L e Preço/L ---

function salvarKmPorLitro() {
    const kmPorLitroInput = document.getElementById('kmPorLitro');
    if (!kmPorLitroInput) return;
    const kmPorLitro = parseFloat(kmPorLitroInput.value);
    if (isNaN(kmPorLitro) || kmPorLitro <= 0) {
        alert("Digite um valor numérico positivo para Km/Litro!"); return;
    }
    localStorage.setItem('kmPorLitro', kmPorLitro);
    console.log("[script.js] Km/Litro salvo:", kmPorLitro);
    alert("Consumo (Km/Litro) salvo!");
}

function carregarKmPorLitro() {
    const kmPorLitroInput = document.getElementById('kmPorLitro');
    if (!kmPorLitroInput) return;
    const kmPorLitro = localStorage.getItem('kmPorLitro') || '';
    kmPorLitroInput.value = kmPorLitro;
    console.log("[script.js] Km/Litro carregado:", kmPorLitro || 'N/A');
}

function salvarPrecoPorLitro() {
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    if (!precoPorLitroInput) return;
    const precoPorLitro = parseFloat(precoPorLitroInput.value);
    if (isNaN(precoPorLitro) || precoPorLitro <= 0) {
        alert("Digite um valor numérico positivo para o Preço por Litro!"); return;
    }
    localStorage.setItem('precoPorLitro', precoPorLitro);
    console.log("[script.js] Preço/Litro salvo:", precoPorLitro);
    alert("Preço por Litro salvo!");
}

function carregarPrecoPorLitro() {
    const precoPorLitroInput = document.getElementById('precoPorLitro');
    if (!precoPorLitroInput) return;
    const precoPorLitro = localStorage.getItem('precoPorLitro') || '';
    precoPorLitroInput.value = precoPorLitro;
     console.log("[script.js] Preço/Litro carregado:", precoPorLitro || 'N/A');
}

// --- Função de Emergência SOS ---

function enviarSOS() {
    if (!navigator.geolocation) {
        alert("Seu navegador não suporta Geolocalização."); return;
    }
    alert("Tentando obter sua localização para o SOS...");
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = pos.coords.accuracy;
            const mensagem = `🚨 ALERTA SOS 🚨\nLocalização: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${acc.toFixed(0)}m)\nLink: https://www.google.com/maps?q=${lat},${lng}`;
            console.log("SOS:", mensagem);
            alert(mensagem + "\n\n(Simulação. Nenhuma mensagem foi enviada.)");
            // Aqui entraria a lógica real de envio (fetch para backend, etc.)
        },
        (error) => {
            console.error('[script.js] Erro ao obter localização para SOS:', error.message);
            alert(`Não foi possível obter sua localização para o SOS: ${error.message}`);
        },
        { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
}