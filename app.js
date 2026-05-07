// Estado Global de la App
window.chocotejasState = { items: [] };
let isInitialLoad = true;
const STORAGE_KEY = 'chocoventas_data';

// Utilidades Visuales
const formatMoney = (amount) => parseFloat(amount).toFixed(2);

const hideLoader = () => {
    const loader = document.getElementById('loader');
    if (loader && isInitialLoad) {
        isInitialLoad = false;
        loader.classList.add('opacity-0');
        setTimeout(() => loader.classList.add('hidden'), 500);
    }
};

// Renderizado de UI Principal
window.renderItems = (items) => {
    // Verificar si el loader ya se ocultó y no volver a intentar en subsecuentes renderItems
    hideLoader();

    const container = document.getElementById('chocotejas-grid');
    const emptyState = document.getElementById('empty-state');

    if (items.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
        lucide.createIcons();
        return;
    }

    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');

    container.innerHTML = items.map(item => {
        const sales = item.sales || 0;
        const remaining = item.stock - sales;
        const isLowStock = remaining <= 0;
        const badgeColor = isLowStock ? 'bg-red-100 text-red-700 border-red-200' : 'bg-pink-100 text-pink-800 border-pink-200';
        const mainColor = item.color || '#ec4899';

        return `
        <div class="bg-surface rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-5 border border-gray-100 relative overflow-hidden transition-all duration-300 transform">
            <!-- Barra de color lateral -->
            <div class="absolute top-0 left-0 w-2.5 h-full" style="background-color: ${mainColor}"></div>
            
            <div class="flex justify-between items-start mb-4 pl-3">
                <div class="pr-2">
                    <h3 class="text-xl font-bold text-gray-800 leading-tight mb-1">${item.name}</h3>
                    <div class="text-sm font-medium text-gray-500 flex flex-wrap items-center gap-1">
                        <span class="bg-gray-100 px-2 py-0.5 rounded text-gray-700">Precio: S/ ${formatMoney(item.price)}</span>
                        ${item.cost ? `<span class="text-gray-400 text-xs">Costo: S/ ${formatMoney(item.cost)}</span>` : ''}
                    </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <button onclick="window.openForm('${item.id}')" class="text-gray-400 hover:text-pink-600 bg-gray-50 hover:bg-pink-50 p-2 rounded-full active:bg-gray-200 transition-colors">
                        <i data-lucide="settings-2" class="w-4 h-4"></i>
                    </button>
                    <span class="text-[11px] font-bold px-3 py-1 rounded-full border ${badgeColor} shadow-sm whitespace-nowrap flex items-center gap-1">
                        ${isLowStock ? '<i data-lucide="alert-circle" class="w-3 h-3"></i>' : ''}
                        Stock: ${remaining}
                    </span>
                </div>
            </div>

            <div class="flex items-stretch gap-3 mt-5 pl-3">
                <!-- Botón Gigante Principal -->
                <button onclick="window.updateSales('${item.id}', 1)"
                        class="flex-1 py-4 text-white font-extrabold rounded-2xl text-lg shadow-md active:scale-[0.97] transition-all flex flex-col items-center justify-center relative overflow-hidden group"
                        style="background-color: ${mainColor}">
                    <span class="relative z-10 flex items-center gap-2">
                        <i data-lucide="plus" class="w-6 h-6 stroke-[3]"></i>
                        ¡VENDIDA!
                    </span>
                </button>
                
                <!-- Botón de Restar (Deshacer) -->
                <button onclick="window.updateSales('${item.id}', -1)"
                        class="px-5 py-4 bg-red-50 hover:bg-red-100 text-red-500 font-bold rounded-2xl active:bg-red-200 active:scale-95 transition-all flex items-center justify-center border border-red-100">
                    <i data-lucide="minus" class="w-5 h-5 stroke-[3]"></i>
                </button>
            </div>
            
            <div class="mt-4 pl-3 text-center text-sm font-semibold text-gray-600 flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span class="flex items-center gap-1"><i data-lucide="check-circle-2" class="w-4 h-4 text-green-500"></i> Total Ventas:</span>
                <span class="text-xl font-black text-gray-900">${sales}</span>
            </div>
        </div>
        `;
    }).join('');

    lucide.createIcons();
};

function saveDataToLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.chocotejasState.items));
}

function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            window.chocotejasState.items = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Error cargando datos locales:", e);
    }
    
    renderItems(window.chocotejasState.items);
    hideLoader(); // Asegurarnos de llamar a hideLoader incluso si items está vacío y ocurre un early return
}

// Iniciar carga de datos locales
loadData();

// --- LÓGICA DE NEGOCIO Y FUNCIONES GLOBALES ---

window.saveItem = async (itemData) => {
    if (itemData.id) {
        const idx = window.chocotejasState.items.findIndex(i => i.id === itemData.id);
        if (idx > -1) window.chocotejasState.items[idx] = itemData;
    } else {
        itemData.id = Date.now().toString();
        itemData.createdAt = Date.now();
        window.chocotejasState.items.push(itemData);
    }
    saveDataToLocal();
    renderItems(window.chocotejasState.items);
};

window.updateSales = async (id, delta) => {
    const item = window.chocotejasState.items.find(i => i.id === id);
    if (!item) return;

    let newSales = (item.sales || 0) + delta;
    if (newSales < 0) newSales = 0;
    
    // Evitar que las ventas superen el stock (stock restante >= 0)
    if (newSales > item.stock) {
        newSales = item.stock;
    }

    item.sales = newSales;
    saveDataToLocal();
    renderItems(window.chocotejasState.items);
};

window.deleteItem = async (id) => {
    window.chocotejasState.items = window.chocotejasState.items.filter(i => i.id !== id);
    saveDataToLocal();
    renderItems(window.chocotejasState.items);
};

// --- INTERFAZ DE MODALES ---

window.openForm = (id = null) => {
    const modal = document.getElementById('modal-form');
    const content = document.getElementById('modal-form-content');
    modal.classList.remove('hidden');
    void modal.offsetWidth; // Force reflow para animación
    modal.classList.remove('opacity-0');
    content.classList.remove('translate-y-full');

    const form = document.getElementById('chocoteja-form');
    form.reset();
    document.getElementById('form-id').value = '';
    document.getElementById('form-sales-container').classList.add('hidden');
    document.getElementById('btn-delete').classList.add('hidden');
    document.getElementById('modal-title').innerText = 'Añadir Chocoteja';

    // Si se está editando
    if (id) {
        const item = window.chocotejasState.items.find(i => i.id === id);
        if (item) {
            document.getElementById('modal-title').innerText = 'Editar Chocoteja';
            document.getElementById('form-id').value = item.id;
            document.getElementById('form-name').value = item.name;
            document.getElementById('form-stock').value = item.stock;
            document.getElementById('form-color').value = item.color || '#ec4899';
            document.getElementById('form-price').value = item.price;
            document.getElementById('form-cost').value = item.cost || '';
            document.getElementById('form-sales').value = item.sales || 0;

            document.getElementById('form-sales-container').classList.remove('hidden');
            document.getElementById('btn-delete').classList.remove('hidden');
        }
    }
};

window.closeForm = () => {
    const modal = document.getElementById('modal-form');
    const content = document.getElementById('modal-form-content');
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
};

window.handleFormSubmit = async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('form-id').value;
    const itemData = {
        name: document.getElementById('form-name').value,
        stock: parseInt(document.getElementById('form-stock').value),
        color: document.getElementById('form-color').value,
        price: parseFloat(document.getElementById('form-price').value),
        cost: parseFloat(document.getElementById('form-cost').value) || 0,
        sales: parseInt(document.getElementById('form-sales').value) || 0
    };

    // Evitar que al editar manualmente las ventas superen el stock
    if (itemData.sales > itemData.stock) {
        itemData.sales = itemData.stock;
    }

    if (id) itemData.id = id;

    await window.saveItem(itemData);
    window.closeForm();
};

window.handleDelete = async () => {
    const id = document.getElementById('form-id').value;
    if (id) {
        // Pequeña confirmación nativa para evitar borrados accidentales
        if(confirm("¿Estás seguro de eliminar esta chocoteja? Se borrará su historial de ventas.")) {
            await window.deleteItem(id);
            window.closeForm();
        }
    }
};

// --- RESUMEN Y EXPORTACIÓN ---

window.openSummary = () => {
    const modal = document.getElementById('modal-summary');
    const content = document.getElementById('modal-summary-content');
    modal.classList.remove('hidden');
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    content.classList.remove('translate-y-full');
    
    // Actualizar la fecha del reporte
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const formattedDate = new Date().toLocaleDateDateString ? new Date().toLocaleDateString('es-ES', dateOptions) : new Date().toLocaleString('es-ES', dateOptions);
    document.getElementById('report-date').innerText = `Generado el: ${formattedDate}`;

    const items = window.chocotejasState.items;
    let totalSales = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    const listHTML = items.map(item => {
        const sales = item.sales || 0;
        totalSales += sales;
        const revenue = sales * item.price;
        totalRevenue += revenue;
        const profit = sales * (item.price - (item.cost || 0));
        totalProfit += profit;

        return `
        <div class="flex justify-between items-center p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-xl transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-4 h-4 rounded-full shadow-sm" style="background-color: ${item.color || '#ec4899'}"></div>
                <div>
                    <div class="font-bold text-gray-800 text-sm leading-tight">${item.name}</div>
                    <div class="text-xs text-gray-500 font-medium">${sales} unidades</div>
                </div>
            </div>
            <div class="text-right">
                <div class="font-bold text-gray-800 text-sm">S/ ${formatMoney(revenue)}</div>
                <div class="text-xs text-green-600 font-bold">+ S/ ${formatMoney(profit)}</div>
            </div>
        </div>
        `;
    }).join('');

    document.getElementById('summary-total-sales').innerText = totalSales;
    document.getElementById('summary-total-revenue').innerText = `S/ ${formatMoney(totalRevenue)}`;
    document.getElementById('summary-total-profit').innerText = `S/ ${formatMoney(totalProfit)}`;
    
    const listContainer = document.getElementById('summary-list');
    if (items.length > 0) {
        listContainer.innerHTML = listHTML;
    } else {
        listContainer.innerHTML = '<div class="text-center text-gray-400 py-6 text-sm font-medium"><i data-lucide="cookie" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>Aún no hay datos para mostrar</div>';
        lucide.createIcons();
    }
};

window.closeSummary = () => {
    const modal = document.getElementById('modal-summary');
    const content = document.getElementById('modal-summary-content');
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
};

window.exportPDF = () => {
    const items = window.chocotejasState.items;
    if(items.length === 0) return alert("No hay datos para exportar.");

    // Obtener el elemento que queremos convertir a PDF (la zona de reporte)
    const element = document.getElementById('pdf-content-area');
    
    // Configuraciones de html2pdf
    const dateStr = new Date().toISOString().split('T')[0];
    const opt = {
        margin:       10,
        filename:     `Reporte_Chocotejas_${dateStr}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Forzar modo claro (pink) temporalmente para la exportación
    const originalTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'pink');

    // Generar el PDF y luego restaurar el tema
    html2pdf().set(opt).from(element).save().then(() => {
        document.documentElement.setAttribute('data-theme', originalTheme);
    });
};

const THEMES = ['pink', 'light', 'dark'];
window.cycleTheme = () => {
    let currentTheme = window.currentTheme || localStorage.getItem('chocoventas_theme') || 'pink';
    let idx = THEMES.indexOf(currentTheme);
    idx = (idx + 1) % THEMES.length;
    let newTheme = THEMES[idx];
    
    window.currentTheme = newTheme;
    localStorage.setItem('chocoventas_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
};

// Iniciar íconos en carga
lucide.createIcons();
