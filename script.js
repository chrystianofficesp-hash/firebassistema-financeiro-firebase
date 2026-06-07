/* ============================================
   SCRIPT.JS - Sistema de Controle Financeiro Empresarial
   
   Este arquivo contém:
   - Gerenciamento de dados com localStorage
   - CRUD completo de contas (Criar, Ler, Atualizar, Excluir)
   - Atualização dinâmica de cards, tabela e gráficos
   - Modal para cadastro e edição de contas
============================================ */

// ============================================
// CONSTANTES E CONFIGURAÇÕES
// ============================================

/**
 * Ícones por categoria
 */
const ICONES_CATEGORIA = {
  Internet: "📶",
  Aluguel: "🏠",
  Utilidades: "⚡",
  Escritório: "📦",
  Software: "💻",
  Telefone: "📞",
  Outros: "📋",
};

/**
 * Cores por categoria para o gráfico
 */
const CORES_CATEGORIA = {
  Aluguel: "#16a34a",
  Internet: "#3b82f6",
  Utilidades: "#f59e0b",
  Escritório: "#a855f7",
  Software: "#06b6d4",
  Telefone: "#ec4899",
  Outros: "#64748b",
};

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

/**
 * Lista de contas (carregada do localStorage ou inicializada com dados de exemplo)
 */
let contas = [];

/**
 * Instâncias dos gráficos Chart.js (para atualização)
 */
let gastosChart = null;
let resumoChart = null;

/**
 * ID da conta a ser excluída (usado no modal de confirmação)
 */
let contaParaExcluir = null;

// ============================================
// DADOS INICIAIS DE EXEMPLO
// ============================================

/**
 * Dados de exemplo para inicialização
 */
const dadosExemplo = [
  {
    id: 1,
    descricao: "Internet Vivo",
    categoria: "Internet",
    vencimento: "2026-06-10",
    valor: 120.0,
    status: "Atrasado",
  },
  {
    id: 2,
    descricao: "Aluguel Sala Comercial",
    categoria: "Aluguel",
    vencimento: "2026-06-05",
    valor: 1500.0,
    status: "Atrasado",
  },
  {
    id: 3,
    descricao: "Energia Elétrica",
    categoria: "Utilidades",
    vencimento: "2026-06-15",
    valor: 300.0,
    status: "Pendente",
  },
  {
    id: 4,
    descricao: "Material de Escritório",
    categoria: "Escritório",
    vencimento: "2026-06-20",
    valor: 250.0,
    status: "Pendente",
  },
  {
    id: 5,
    descricao: "Sistema Contábil",
    categoria: "Software",
    vencimento: "2026-06-01",
    valor: 450.0,
    status: "Pago",
  },
  {
    id: 6,
    descricao: "Telefone Fixo",
    categoria: "Telefone",
    vencimento: "2026-06-01",
    valor: 150.0,
    status: "Pago",
  },
];

// FUNÇÕES DE LOCALSTORAGE
// ============================================
/**
 * Carrega as contas do localStorage
 * Se não houver dados, inicializa com dados de exemplo
 */
async function carregarDados() {
  if (!window.auth.currentUser) {
    return;
  }
  try {
    console.log("UID logado:", window.auth.currentUser.uid);
    const q = window.query(
      collection(db, "contas"),
      window.where("uid", "==", window.auth.currentUser.uid),
    );

    const snapshot = await getDocs(q);

    contas = [];

    snapshot.forEach((doc) => {

    console.log("DOC ID =", doc.id);

    contas.push({
        firestoreId: doc.id,
        descricao: doc.data().descricao,
        categoria: doc.data().categoria,
        valor: doc.data().valor,
        vencimento: doc.data().vencimento,
        status: doc.data().status,
        uid: doc.data().uid
    });

});

    console.log(contas.length + " contas carregadas do Firestore");

    atualizarTudo();
  } catch (erro) {
    console.error("Erro ao carregar contas:", erro);
  }
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Gera um novo ID único para uma conta
 * @returns {number} Novo ID
 */
function gerarNovoId() {
  if (contas.length === 0) return 1;
  return Math.max(...contas.map((c) => c.id)) + 1;
}

/**
 * Formata um valor numérico para o formato de moeda brasileira
 * @param {number} valor - Valor a ser formatado
 * @returns {string} Valor formatado em R$
 */
function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata uma data ISO para o formato brasileiro (DD/MM/YYYY)
 * @param {string} dataISO - Data no formato ISO (YYYY-MM-DD)
 * @returns {string} Data formatada
 */
function formatarData(dataISO) {
  const partes = dataISO.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/**
 * Converte data brasileira para ISO
 * @param {string} dataBR - Data no formato DD/MM/YYYY
 * @returns {string} Data no formato ISO
 */
function dataBRparaISO(dataBR) {
  const partes = dataBR.split("/");
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

/**
 * Retorna a classe CSS para a categoria
 * @param {string} categoria - Nome da categoria
 * @returns {string} Classe CSS da categoria
 */
function getClasseCategoria(categoria) {
  const classes = {
    Internet: "categoria-internet",
    Aluguel: "categoria-aluguel",
    Utilidades: "categoria-utilidades",
    Escritório: "categoria-escritorio",
    Software: "categoria-software",
    Telefone: "categoria-telefone",
    Outros: "categoria-outros",
  };
  return classes[categoria] || "categoria-outros";
}

/**
 * Retorna a classe CSS para o status
 * @param {string} status - Status da conta
 * @returns {string} Classe CSS do status
 */
function getClasseStatus(status) {
  const classes = {
    Pendente: "status-pendente",
    Pago: "status-pago",
    Atrasado: "status-atrasado",
  };
  return classes[status] || "";
}

/**
 * Retorna o ícone da categoria
 * @param {string} categoria - Nome da categoria
 * @returns {string} Emoji do ícone
 */
function getIconeCategoria(categoria) {
  return ICONES_CATEGORIA[categoria] || "📋";
}

/**
 * Calcula dias até o vencimento
 * @param {string} dataVencimento - Data no formato ISO
 * @returns {number} Dias restantes (negativo se atrasado)
 */
function calcularDiasRestantes(dataVencimento) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(dataVencimento + "T00:00:00");
  const diffTime = vencimento - hoje;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// FUNÇÕES DE CÁLCULO
// ============================================

/**
 * Calcula os totais por status
 * @returns {Object} Objeto com totais e contagens
 */
function calcularTotais() {
  const totais = {
    pendente: { valor: 0, quantidade: 0 },
    pago: { valor: 0, quantidade: 0 },
    atrasado: { valor: 0, quantidade: 0 },
    geral: { valor: 0, quantidade: 0 },
  };

  contas.forEach((conta) => {
    totais.geral.valor += conta.valor;
    totais.geral.quantidade++;

    switch (conta.status) {
      case "Pendente":
        totais.pendente.valor += conta.valor;
        totais.pendente.quantidade++;
        break;
      case "Pago":
        totais.pago.valor += conta.valor;
        totais.pago.quantidade++;
        break;
      case "Atrasado":
        totais.atrasado.valor += conta.valor;
        totais.atrasado.quantidade++;
        break;
    }
  });

  return totais;
}

/**
 * Calcula gastos agrupados por categoria
 * @returns {Array} Array de objetos com categoria, valor e cor
 */
function calcularGastosPorCategoria() {
  const gastos = {};

  contas.forEach((conta) => {
    if (!gastos[conta.categoria]) {
      gastos[conta.categoria] = 0;
    }
    gastos[conta.categoria] += conta.valor;
  });

  // Converter para array e ordenar por valor
  return Object.entries(gastos)
    .map(([categoria, valor]) => ({
      categoria,
      valor,
      cor: CORES_CATEGORIA[categoria] || "#64748b",
    }))
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Obtém próximos vencimentos (contas pendentes ou atrasadas)
 * @returns {Array} Array de contas ordenadas por data de vencimento
 */
function obterProximosVencimentos() {
  return contas
    .filter(
      (conta) => conta.status === "Pendente" || conta.status === "Atrasado",
    )
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento))
    .slice(0, 5);
}

// ============================================
// FUNÇÕES DE RENDERIZAÇÃO - CARDS
// ============================================

/**
 * Atualiza os cards de resumo com os totais calculados
 */
function atualizarCards() {
  const totais = calcularTotais();

  // Card Pendente
  const cardPendente = document.querySelector(".card-pendente");
  if (cardPendente) {
    cardPendente.querySelector(".card-value").textContent = formatarMoeda(
      totais.pendente.valor,
    );
    cardPendente.querySelector(".card-count").textContent =
      `${totais.pendente.quantidade} conta${totais.pendente.quantidade !== 1 ? "s" : ""}`;
  }

  // Card Pago
  const cardPago = document.querySelector(".card-pago");
  if (cardPago) {
    cardPago.querySelector(".card-value").textContent = formatarMoeda(
      totais.pago.valor,
    );
    cardPago.querySelector(".card-count").textContent =
      `${totais.pago.quantidade} conta${totais.pago.quantidade !== 1 ? "s" : ""}`;
  }

  // Card Atrasado
  const cardAtrasado = document.querySelector(".card-atrasado");
  if (cardAtrasado) {
    cardAtrasado.querySelector(".card-value").textContent = formatarMoeda(
      totais.atrasado.valor,
    );
    cardAtrasado.querySelector(".card-count").textContent =
      `${totais.atrasado.quantidade} conta${totais.atrasado.quantidade !== 1 ? "s" : ""}`;
  }

  // Card Geral
  const cardGeral = document.querySelector(".card-geral");
  if (cardGeral) {
    cardGeral.querySelector(".card-value").textContent = formatarMoeda(
      totais.geral.valor,
    );
    cardGeral.querySelector(".card-count").textContent =
      `${totais.geral.quantidade} conta${totais.geral.quantidade !== 1 ? "s" : ""}`;
  }

  // Total de gastos no gráfico
  const totalGastos = document.querySelector(".total-value");
  if (totalGastos) {
    totalGastos.textContent = formatarMoeda(totais.geral.valor);
  }
}

// ============================================
// FUNÇÕES DE RENDERIZAÇÃO - TABELA
// ============================================

/**
 * Renderiza a tabela de contas a pagar
 */
function renderizarTabela() {
  const tbody = document.getElementById("contasTableBody");

  if (!tbody) return;

  tbody.innerHTML = "";

  // Ordenar por data de vencimento
  const contasOrdenadas = [...contas].sort(
    (a, b) => new Date(a.vencimento) - new Date(b.vencimento),
  );

  contasOrdenadas.forEach((conta) => {
    console.log("CONTA:", conta);
    console.log("CONTA RENDERIZADA:", conta);
console.log("FIRESTORE ID:", conta.firestoreId);
    const tr = document.createElement("tr");

    tr.innerHTML = `
            <td>
                <div class="conta-descricao">
                    <span class="conta-icon">${getIconeCategoria(conta.categoria)}</span>
                    <span>${conta.descricao}</span>
                </div>
            </td>
            <td>
                <span class="categoria-tag ${getClasseCategoria(conta.categoria)}">
                    ${conta.categoria}
                </span>
            </td>
            <td class="vencimento">${formatarData(conta.vencimento)}</td>
            <td class="valor">${formatarMoeda(conta.valor)}</td>
            <td>
                <span class="status-badge ${getClasseStatus(conta.status)}">
                    ${conta.status}
                </span>
            </td>
            <td>
                <div class="acoes">
    <button class="btn-acao" title="Editar" onclick="editarConta('${conta.firestoreId}')"
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
    </button>

    <button class="btn-acao" title="Excluir" onclick="excluirConta('${conta.firestoreId}')"
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    </button>
</div>
            </td>
        `;

    tbody.appendChild(tr);
  });
}

// ============================================
// FUNÇÕES DE RENDERIZAÇÃO - GRÁFICOS
// ============================================

/**
 * Renderiza ou atualiza o gráfico de gastos por categoria
 */
function renderizarGraficoGastos() {
  const ctx = document.getElementById("gastosChart");

  if (!ctx) return;

  const gastos = calcularGastosPorCategoria();

  // Dados para o gráfico
  const dados = {
    labels: gastos.map((g) => g.categoria),
    datasets: [
      {
        data: gastos.map((g) => g.valor),
        backgroundColor: gastos.map((g) => g.cor),
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  // Se o gráfico já existe, atualiza os dados
  if (gastosChart) {
    gastosChart.data = dados;
    gastosChart.update();
  } else {
    // Cria um novo gráfico
    gastosChart = new Chart(ctx, {
      type: "doughnut",
      data: dados,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "65%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return formatarMoeda(context.raw);
              },
            },
          },
        },
      },
    });
  }

  // Atualizar legenda customizada
  renderizarLegendaGastos(gastos);
}

/**
 * Renderiza a legenda do gráfico de gastos
 * @param {Array} gastos - Array de gastos por categoria
 */
function renderizarLegendaGastos(gastos) {
  const legendContainer = document.getElementById("chartLegend");

  if (!legendContainer) return;

  legendContainer.innerHTML = "";

  gastos.forEach((item) => {
    const legendItem = document.createElement("div");
    legendItem.className = "legend-item";

    legendItem.innerHTML = `
            <div class="legend-left">
                <span class="legend-color" style="background-color: ${item.cor}"></span>
                <span class="legend-label">${item.categoria}</span>
            </div>
            <span class="legend-value">${formatarMoeda(item.valor)}</span>
        `;

    legendContainer.appendChild(legendItem);
  });
}

/**
 * Renderiza ou atualiza o gráfico de resumo mensal
 */
function renderizarGraficoResumo() {
  const ctx = document.getElementById("resumoChart");

  if (!ctx) return;

  // Gerar dados baseados nas contas pagas
  const contasPagas = contas.filter((c) => c.status === "Pago");
  const totalPago = contasPagas.reduce((acc, c) => acc + c.valor, 0);

  // Dados simulados para o gráfico de linha (evolução mensal)
  const resumoMensal = [
    { dia: "01/06", valor: Math.round(totalPago * 0.1) },
    { dia: "05/06", valor: Math.round(totalPago * 0.25) },
    { dia: "10/06", valor: Math.round(totalPago * 0.45) },
    { dia: "15/06", valor: Math.round(totalPago * 0.65) },
    { dia: "20/06", valor: Math.round(totalPago * 0.8) },
    { dia: "25/06", valor: Math.round(totalPago * 0.95) },
    { dia: "30/06", valor: totalPago },
  ];

  const dados = {
    labels: resumoMensal.map((r) => r.dia),
    datasets: [
      {
        label: "Receitas",
        data: resumoMensal.map((r) => r.valor),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22, 163, 74, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#16a34a",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  if (resumoChart) {
    resumoChart.data = dados;
    resumoChart.update();
  } else {
    resumoChart = new Chart(ctx, {
      type: "line",
      data: dados,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return formatarMoeda(context.raw);
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: "#64748b",
              font: {
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "#e2e8f0",
            },
            ticks: {
              color: "#64748b",
              font: {
                size: 11,
              },
              callback: function (value) {
                if (value >= 1000) {
                  return "R$ " + (value / 1000).toFixed(1) + "k";
                }
                return "R$ " + value;
              },
            },
          },
        },
      },
    });
  }

  // Atualizar estatísticas do resumo
  atualizarEstatisticasResumo(totalPago);
}

/**
 * Atualiza as estatísticas do resumo mensal
 * @param {number} totalPago - Total de contas pagas
 */
function atualizarEstatisticasResumo(totalPago) {
  const totais = calcularTotais();
  const despesas = totais.pendente.valor + totais.atrasado.valor;
  const saldo = totalPago - despesas;

  // Receitas (contas pagas)
  const receitasEl = document.querySelector(".stat-value.receitas");
  if (receitasEl) {
    receitasEl.textContent = formatarMoeda(totalPago);
  }

  const receitasCount = document.querySelector(".stat-receitas .stat-count");
  if (receitasCount) {
    receitasCount.textContent = `${totais.pago.quantidade} contas`;
  }

  // Despesas (pendentes + atrasadas)
  const despesasEl = document.querySelector(".stat-value.despesas");
  if (despesasEl) {
    despesasEl.textContent = formatarMoeda(despesas);
  }

  const despesasCount = document.querySelector(".stat-despesas .stat-count");
  if (despesasCount) {
    despesasCount.textContent = `${totais.pendente.quantidade + totais.atrasado.quantidade} contas`;
  }

  // Saldo
  const saldoEl = document.querySelector(".stat-value.saldo");
  if (saldoEl) {
    saldoEl.textContent = formatarMoeda(Math.abs(saldo));
  }

  const saldoStatus = document.querySelector(".stat-count.saldo-status");
  if (saldoStatus) {
    saldoStatus.textContent = saldo >= 0 ? "Positivo" : "Negativo";
    saldoStatus.style.color = saldo >= 0 ? "#16a34a" : "#ef4444";
  }
}

// ============================================
// FUNÇÕES DE RENDERIZAÇÃO - VENCIMENTOS
// ============================================

/**
 * Renderiza a lista de próximos vencimentos
 */
function renderizarVencimentos() {
  const container = document.getElementById("vencimentosList");

  if (!container) return;

  container.innerHTML = "";

  const proximosVencimentos = obterProximosVencimentos();

  if (proximosVencimentos.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #64748b; padding: 20px;">Nenhum vencimento pendente</p>';
    return;
  }

  proximosVencimentos.forEach((vencimento) => {
    const partes = vencimento.vencimento.split("-");
    const dia = partes[2];
    const mesNumero = parseInt(partes[1]);
    const meses = [
      "JAN",
      "FEV",
      "MAR",
      "ABR",
      "MAI",
      "JUN",
      "JUL",
      "AGO",
      "SET",
      "OUT",
      "NOV",
      "DEZ",
    ];
    const mes = meses[mesNumero - 1];

    const diasRestantes = calcularDiasRestantes(vencimento.vencimento);
    const dateClass =
      mesNumero === 6 ? "date-jun" : mesNumero === 7 ? "date-jul" : "date-jun";

    const item = document.createElement("div");
    item.className = "vencimento-item";

    let prazoTexto;
    if (diasRestantes < 0) {
      prazoTexto = `Atrasado há ${Math.abs(diasRestantes)} dias`;
    } else if (diasRestantes === 0) {
      prazoTexto = "Vence hoje";
    } else if (diasRestantes === 1) {
      prazoTexto = "Vence amanhã";
    } else {
      prazoTexto = `Vence em ${diasRestantes} dias`;
    }

    item.innerHTML = `
            <div class="vencimento-date ${dateClass}">
                <span class="dia">${dia}</span>
                <span class="mes">${mes}</span>
            </div>
            <div class="vencimento-info">
                <span class="vencimento-descricao">${vencimento.descricao}</span>
                <span class="vencimento-prazo">${prazoTexto}</span>
            </div>
            <div class="vencimento-valor">
                <span class="valor">${formatarMoeda(vencimento.valor)}</span>
                <span class="status-badge ${getClasseStatus(vencimento.status)}">${vencimento.status}</span>
            </div>
        `;

    container.appendChild(item);
  });
}

// ============================================
// FUNÇÕES DO MODAL
// ============================================

/**
 * Abre o modal para nova conta
 */
function abrirModalNovaConta() {
  const modal = document.getElementById("modalConta");
  const titulo = document.getElementById("modalTitulo");
  const form = document.getElementById("formConta");

  // Resetar formulário
  form.reset();
  document.getElementById("contaId").value = "";

  // Definir título
  titulo.textContent = "Nova Conta";

  // Definir data padrão como hoje
  const hoje = new Date().toISOString().split("T")[0];
  document.getElementById("vencimento").value = hoje;

  // Exibir modal
  modal.classList.add("active");

  // Focar no primeiro campo
  setTimeout(() => {
    document.getElementById("descricao").focus();
  }, 100);
}

/**
 * Abre o modal para editar uma conta existente
 * @param {number} id - ID da conta a ser editada
 */
function editarConta(id) {
  console.log("ID recebido no editar:", id);
console.log("Contas:", contas);
  const conta = contas.find(c => c.firestoreId == id);

  if (!conta) {
    alert("Conta não encontrada!");
    return;
  }

  const modal = document.getElementById("modalConta");
  const titulo = document.getElementById("modalTitulo");

  // Preencher formulário com dados da conta
  document.getElementById("contaId").value = conta.firestoreId;
  document.getElementById("descricao").value = conta.descricao;
  document.getElementById("categoria").value = conta.categoria;
  document.getElementById("valor").value = conta.valor;
  document.getElementById("vencimento").value = conta.vencimento;
  document.getElementById("status").value = conta.status;

  // Definir título
  titulo.textContent = "Editar Conta";

  // Exibir modal
  modal.classList.add("active");
}

/**
 * Fecha o modal de conta
 */
function fecharModal() {
  const modal = document.getElementById("modalConta");
  modal.classList.remove("active");
}

/**
 * Salva a conta (nova ou editada)
 * @param {Event} event - Evento do formulário
 */
async function salvarConta(event) {
  event.preventDefault();

  const contaId = document.getElementById("contaId").value;
  const descricao = document.getElementById("descricao").value.trim();
  const categoria = document.getElementById("categoria").value;
  const valor = parseFloat(document.getElementById("valor").value);
  const vencimento = document.getElementById("vencimento").value;
  const status = document.getElementById("status").value;

  // Validação
  if (!descricao || !categoria || !valor || !vencimento || !status) {
    alert("Por favor, preencha todos os campos.");
    return;
  }

  if (contaId) {
    // Editar conta existente
    const index = contas.findIndex((c) => c.firestoreId === contaId);
    console.log("INDEX:", index);
    if (index !== -1) {
      contas[index] = {
        ...contas[index],
        descricao,
        categoria,
        valor,
        vencimento,
        status,
      };
    }
    const docRef = doc(db, "contas", contaId);

    updateDoc(docRef, {
      descricao: descricao,
      categoria: categoria,
      valor: valor,
      vencimento: vencimento,
      status: status,
    })
      .then(() => {
        console.log("Conta atualizada no Firestore!");
      })
      .catch((erro) => {
        console.error("Erro ao atualizar:", erro);
      });
  } else {
    // Nova conta
    const docRef = await addDoc(collection(db, "contas"), {
    descricao,
    categoria,
    valor,
    vencimento,
    status,
    uid: window.auth.currentUser.uid
});

const novaConta = {
    firestoreId: docRef.id,
    descricao,
    categoria,
    valor,
    vencimento,
    status,
    uid: window.auth.currentUser.uid
};

contas.push(novaConta);

console.log("Conta salva no Firestore:", docRef.id);
  }

  // Atualizar interface
  atualizarTudo();

  // Fechar modal
  fecharModal();
}

// ============================================
// FUNÇÕES DE EXCLUSÃO
// ============================================

/**
 * Abre o modal de confirmação de exclusão
 * @param {number} id - ID da conta a ser excluída
 */
function excluirConta(id) {
  console.log("ID recebido:", id);

  contaParaExcluir = id;

  const modal = document.getElementById("modalConfirmacao");
  modal.classList.add("active");
}

/**
 * Fecha o modal de confirmação
 */
function fecharModalConfirmacao() {
  const modal = document.getElementById("modalConfirmacao");
  modal.classList.remove("active");
  contaParaExcluir = null;
}

/**
 * Confirma e executa a exclusão da conta
 */
async function confirmarExclusao() {
  if (contaParaExcluir === null) return;

  try {
    console.log("ID para excluir:", contaParaExcluir);
    console.log("Usuário logado:", window.auth.currentUser.uid);
    await deleteDoc(doc(db, "contas", contaParaExcluir));

    contas = contas.filter(c => c.firestoreId !== contaParaExcluir);

    atualizarTudo();

    fecharModalConfirmacao();

    console.log("Conta excluída do Firestore!");
  } catch (erro) {
    console.error("Erro ao excluir:", erro);
  }
}

// ============================================
// FUNÇÃO DE ATUALIZAÇÃO GERAL
// ============================================

/**
 * Atualiza todos os componentes da interface
 */
function atualizarTudo() {
  atualizarCards();
  renderizarTabela();
  renderizarGraficoGastos();
  renderizarGraficoResumo();
  renderizarVencimentos();
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Configura os event listeners da página
 */
function configurarEventListeners() {
  // Botão Nova Conta
  const btnNovaConta = document.querySelector(".btn-nova-conta");
  if (btnNovaConta) {
    btnNovaConta.addEventListener("click", abrirModalNovaConta);
  }

  // Fechar modal com ESC
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      fecharModal();
      fecharModalConfirmacao();
    }
  });

  // Busca (funcionalidade básica)
  const searchInput = document.querySelector(".search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      const termo = e.target.value.toLowerCase();
      filtrarContas(termo);
    });
  }
}

/**
 * Filtra as contas na tabela baseado no termo de busca
 * @param {string} termo - Termo de busca
 */
function filtrarContas(termo) {
  const linhas = document.querySelectorAll("#contasTableBody tr");

  linhas.forEach((linha) => {
    const texto = linha.textContent.toLowerCase();
    if (texto.includes(termo)) {
      linha.style.display = "";
    } else {
      linha.style.display = "none";
    }
  });
}

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
 * Inicializa todos os componentes da página
 */
function inicializar() {
  // Carregar dados do localStorage

  // Configurar event listeners
  configurarEventListeners();
window.onAuthStateChanged(window.auth, async (user) => {

  if (user) {

    console.log("Usuário restaurado:", user.uid);

    document.getElementById("loginScreen").style.display = "none";

    await carregarDados();

  } else {

    document.getElementById("loginScreen").style.display = "flex";

  }

});
  // Renderizar todos os componentes

  console.log("Sistema Financeiro Empresarial inicializado com sucesso!");
}

// Executar quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", inicializar);
const campoPesquisa = document.getElementById("campoPesquisa");

if (campoPesquisa) {
  campoPesquisa.addEventListener("input", pesquisarContas);
}

const filtroStatus = document.getElementById("filtroStatus");

if (filtroStatus) {
  filtroStatus.addEventListener("change", filtrarStatus);
}
function pesquisarContas() {
  const termo = document.getElementById("campoPesquisa").value.toLowerCase();

  const linhas = document.querySelectorAll("#contasTableBody tr");

  linhas.forEach((linha) => {
    const textoLinha = linha.textContent.toLowerCase();

    if (textoLinha.includes(termo)) {
      linha.style.display = "";
    } else {
      linha.style.display = "none";
    }
  });
}
function filtrarStatus() {
  const statusSelecionado = document.getElementById("filtroStatus").value;

  const linhas = document.querySelectorAll("#contasTableBody tr");

  linhas.forEach((linha) => {
    if (statusSelecionado === "Todos") {
      linha.style.display = "";
      return;
    }

    const textoLinha = linha.textContent;

    if (textoLinha.includes(statusSelecionado)) {
      linha.style.display = "";
    } else {
      linha.style.display = "none";
    }
  });
}

// ======================
// LOGIN FIREBASE
// ======================

document.getElementById("btnCadastrar").addEventListener("click", async () => {
  const email = document.getElementById("emailLogin").value;
  const senha = document.getElementById("senhaLogin").value;

  try {
    await window.createUserWithEmailAndPassword(window.auth, email, senha);

    alert("Conta criada com sucesso!");
  } catch (erro) {
    alert(erro.message);
  }
});

document.getElementById("btnEntrar").addEventListener("click", async () => {
  const email = document.getElementById("emailLogin").value;
  const senha = document.getElementById("senhaLogin").value;

  try {
    await window.signInWithEmailAndPassword(window.auth, email, senha);

  } catch (erro) {
    alert(erro.message);
  }
});

document.getElementById("btnSair").addEventListener("click", async () => {
  await window.signOut(window.auth);

  document.getElementById("loginScreen").style.display = "flex";
});

document.getElementById("btnSair").addEventListener("click", async () => {
  await window.signOut(window.auth);

  document.getElementById("loginScreen").style.display = "flex";
});
