import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Estado Global de la App
window.chocotejasState = { items: [] };
let db, auth, currentUser, appId;
let unsubscribe = null;
let isInitialLoad = true;

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
        <div class="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-5 border border-gray-100 relative overflow-hidden transition-all duration-300 transform">
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
    hideLoader();
};

// Configuración y conexión de datos (Transparente para el usuario)
try {
    const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
    appId = typeof __app_id !== 'undefined' ? __app_id : 'local-app';
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    if (firebaseConfigStr) {
        const firebaseConfig = JSON.parse(firebaseConfigStr);
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        const initAuth = async () => {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
        };
        
        initAuth();

        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                loadData();
            } else {
                currentUser = null;
                if (unsubscribe) unsubscribe();
                window.chocotejasState.items = [];
                renderItems([]);
            }
        });
    } else {
        // Fallback seguro si se ejecuta fuera de la plataforma
        console.log("Modo local activado.");
        renderItems(window.chocotejasState.items);
        setTimeout(hideLoader, 500);
    }
} catch (e) {
    console.error("Configuración local requerida:", e);
    renderItems(window.chocotejasState.items);
    setTimeout(hideLoader, 500);
}

function loadData() {
    if (!currentUser || !db) return;
    const path = `artifacts/${appId}/users/${currentUser.uid}/chocotejas`;
    const colRef = collection(db, path);
    
    unsubscribe = onSnapshot(colRef, (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Ordenar por fecha de creación
        items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        window.chocotejasState.items = items;
        renderItems(items);
    }, (error) => {
        console.error("Error sincronizando:", error);
        hideLoader();
    });
}

// --- LÓGICA DE NEGOCIO Y FUNCIONES GLOBALES ---

window.saveItem = async (itemData) => {
    if (db && currentUser) {
        if (itemData.id) {
            const dRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/chocotejas`, itemData.id);
            const id = itemData.id;
            delete itemData.id;
            await updateDoc(dRef, itemData);
        } else {
            itemData.createdAt = Date.now();
            await addDoc(collection(db, `artifacts/${appId}/users/${currentUser.uid}/chocotejas`), itemData);
        }
    } else {
        if (itemData.id) {
            const idx = window.chocotejasState.items.findIndex(i => i.id === itemData.id);
            if (idx > -1) window.chocotejasState.items[idx] = itemData;
        } else {
            itemData.id = Date.now().toString();
            itemData.createdAt = Date.now();
            window.chocotejasState.items.push(itemData);
        }
        renderItems(window.chocotejasState.items);
    }
};

window.updateSales = async (id, delta) => {
    const item = window.chocotejasState.items.find(i => i.id === id);
    if (!item) return;

    let newSales = (item.sales || 0) + delta;
    if (newSales < 0) newSales = 0;

    if (db && currentUser) {
        const dRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/chocotejas`, id);
        await updateDoc(dRef, { sales: newSales });
    } else {
        item.sales = newSales;
        renderItems(window.chocotejasState.items);
    }
};

window.deleteItem = async (id) => {
    if (db && currentUser) {
        const dRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/chocotejas`, id);
        await deleteDoc(dRef);
    } else {
        window.chocotejasState.items = window.chocotejasState.items.filter(i => i.id !== id);
        renderItems(window.chocotejasState.items);
    }
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

window.exportCSV = () => {
    const items = window.chocotejasState.items;
    if(items.length === 0) return alert("No hay datos para exportar.");

    let csv = "Nombre,Stock Inicial,Ventas,Stock Restante,Precio Venta (S/),Costo Unitario (S/),Ingresos Brutos (S/),Ganancia Neta (S/)\n";
    
    items.forEach(i => {
        const sales = i.sales || 0;
        const remaining = i.stock - sales;
        const revenue = sales * i.price;
        const profit = sales * (i.price - (i.cost || 0));
        
        // Escapar comillas en nombres por si acaso
        const safeName = i.name.replace(/"/g, '""');
        csv += `"${safeName}",${i.stock},${sales},${remaining},${i.price},${i.cost || 0},${revenue},${profit}\n`;
    });

    // Codificar con BOM para que Excel detecte acentos correctamente en UTF-8
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    
    // Nombre de archivo con fecha
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Reporte_Chocotejas_${dateStr}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Iniciar íconos en carga
lucide.createIcons();
