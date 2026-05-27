const API = 'https://7m2hvlrc-5000.asse.devtunnels.ms';
let allProducts = [];
let allOrders = [];
let allUsers = [];
let currentAttributeOrder = [];
let productSearchTerm = '';
let productCurrentLimit = 10;
let orderSearchTerm = '';
let orderCurrentLimit = 10;
let userSearchTerm = '';
let userCurrentLimit = 10;

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]);
}

// ---------- PRODUCTS ----------
async function loadProducts() {
    const res = await fetch(`${API}/api/products`);
    allProducts = await res.json();
    filterAndRenderProducts();
}

function filterAndRenderProducts() {
    let filtered = [...allProducts];
    if (productSearchTerm) {
        const term = productSearchTerm.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(term) || (p.category && p.category.toLowerCase().includes(term)));
    }
    const display = productCurrentLimit === 999999 ? filtered : filtered.slice(0, productCurrentLimit);
    renderProductList(display, filtered.length);
}

function renderProductList(productsToShow, totalCount) {
    const container = document.getElementById('adminProductList');
    if (!productsToShow.length) {
        container.innerHTML = '<div class="empty-state">No products found</div>';
        document.getElementById('productResultsInfo').innerHTML = '';
        return;
    }
    container.innerHTML = '';
    productsToShow.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-item';
        const thumbHtml = p.image_url
            ? `<img src="${API}${escapeHtml(p.image_url)}" class="product-thumb" onerror="this.style.display='none'">`
            : `<div class="product-thumb"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></div>`;
        div.innerHTML = `
            <div class="product-info">
                ${thumbHtml}
                <div>
                    <div class="product-name">${escapeHtml(p.name)}</div>
                    <div class="product-meta">
                        <span class="meta-chip">$${p.price}</span>
                        <span class="meta-chip">Stock: ${p.stock}</span>
                        <span class="meta-chip">${escapeHtml(p.category || 'Uncategorized')}</span>
                    </div>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn btn-warning btn-sm manage" data-id="${p.id}">Manage</button>
                <button class="btn btn-primary btn-sm edit" data-id="${p.id}">Edit</button>
                <button class="btn btn-danger btn-sm delete" data-id="${p.id}">Delete</button>
            </div>`;
        div.querySelector('.manage').addEventListener('click', () => openDetailModal(p.id));
        div.querySelector('.edit').addEventListener('click', () => fillEditForm(p));
        div.querySelector('.delete').addEventListener('click', async () => {
            if (confirm(`Delete "${p.name}" permanently? This also removes its attributes and reviews.`)) {
                await fetch(`${API}/api/products/${p.id}`, { method: 'DELETE' });
                loadProducts();
            }
        });
        container.appendChild(div);
    });
    document.getElementById('productResultsInfo').innerHTML = `Showing ${productsToShow.length} of ${totalCount} products`;
}

function fillEditForm(product) {
    document.getElementById('productId').value = product.id;
    document.getElementById('prodName').value = product.name;
    document.getElementById('prodPrice').value = product.price;
    document.getElementById('prodStock').value = product.stock;
    document.getElementById('prodCategory').value = product.category || '';
    document.getElementById('prodImage').value = '';
    const imgWrap = document.getElementById('currentImageContainer');
    if (product.image_url) {
        imgWrap.style.display = 'flex';
        document.getElementById('currentImagePreview').src = API + product.image_url;
    } else {
        imgWrap.style.display = 'none';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const name = document.getElementById('prodName').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const stock = parseInt(document.getElementById('prodStock').value);
    const category = document.getElementById('prodCategory').value.trim();
    const imageFile = document.getElementById('prodImage').files[0];
    if (!name || isNaN(price) || isNaN(stock)) return alert('Name, price and stock are required');
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('stock', stock);
    formData.append('category', category);
    if (imageFile) formData.append('image', imageFile);
    const url = id ? `${API}/api/products/${id}` : `${API}/api/products`;
    const method = id ? 'PUT' : 'POST';
    const resp = await fetch(url, { method, body: formData });
    if (resp.ok) {
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('currentImageContainer').style.display = 'none';
        loadProducts();
    } else {
        const err = await resp.json();
        alert('Error: ' + err.error);
    }
});

document.getElementById('clearFormBtn').addEventListener('click', () => {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('currentImageContainer').style.display = 'none';
});

document.getElementById('searchProductsBtn').onclick = () => { productSearchTerm = document.getElementById('productSearch').value.trim(); filterAndRenderProducts(); };
document.getElementById('resetProductsBtn').onclick = () => { document.getElementById('productSearch').value = ''; productSearchTerm = ''; filterAndRenderProducts(); };
document.getElementById('productLimit').onchange = (e) => { productCurrentLimit = parseInt(e.target.value); filterAndRenderProducts(); };
document.getElementById('productSearch').addEventListener('keypress', (e) => { if (e.key === 'Enter') { productSearchTerm = document.getElementById('productSearch').value.trim(); filterAndRenderProducts(); } });

// ---------- ORDERS ----------
async function loadOrders() {
    const res = await fetch(`${API}/api/orders`);
    allOrders = await res.json();
    filterAndRenderOrders();
}

function filterAndRenderOrders() {
    let filtered = [...allOrders];
    if (orderSearchTerm) {
        const term = orderSearchTerm.toLowerCase();
        filtered = filtered.filter(o =>
            o.customer_name.toLowerCase().includes(term) ||
            (o.customer_email && o.customer_email.toLowerCase().includes(term)) ||
            (o.items_summary && o.items_summary.toLowerCase().includes(term))
        );
    }
    filtered.sort((a, b) => new Date(a.order_date) - new Date(b.order_date));
    const display = orderCurrentLimit === 999999 ? filtered : filtered.slice(0, orderCurrentLimit);
    renderOrdersTable(display, filtered.length);
}

function renderOrdersTable(ordersToShow, totalCount) {
    const container = document.getElementById('ordersList');
    if (!ordersToShow.length) {
        container.innerHTML = '<div class="empty-state">No orders found</div>';
        document.getElementById('orderResultsInfo').innerHTML = '';
        return;
    }
    let html = `<table class="data-table">
        <thead><tr>
            <th>Order ID</th><th>Customer</th><th>Items</th>
            <th>Total</th><th>Order Date</th><th>Delivery Date</th>
        </tr></thead><tbody>`;
    ordersToShow.forEach(o => {
        let itemsList = '';
        if (o.items && o.items.length) {
            itemsList = o.items.map(i => `${escapeHtml(i.product_name)} &times;${i.quantity}`).join('<br>');
        } else {
            itemsList = o.items_summary || '—';
        }
        html += `<tr>
            <td><span class="badge">#${o.id}</span></td>
            <td><strong>${escapeHtml(o.customer_name)}</strong><br><span style="font-size:12px;color:var(--muted)">${escapeHtml(o.customer_email || '')}</span></td>
            <td>${itemsList}</td>
            <td><strong>$${parseFloat(o.total_amount).toFixed(2)}</strong></td>
            <td>${new Date(o.order_date).toLocaleDateString()}</td>
            <td>${new Date(o.delivery_date).toLocaleDateString()}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
    document.getElementById('orderResultsInfo').innerHTML = `Showing ${ordersToShow.length} of ${totalCount} orders`;
}

document.getElementById('searchOrdersBtn').onclick = () => { orderSearchTerm = document.getElementById('orderSearch').value.trim(); filterAndRenderOrders(); };
document.getElementById('resetOrdersBtn').onclick = () => { document.getElementById('orderSearch').value = ''; orderSearchTerm = ''; filterAndRenderOrders(); };
document.getElementById('orderLimit').onchange = (e) => { orderCurrentLimit = parseInt(e.target.value); filterAndRenderOrders(); };
document.getElementById('orderSearch').addEventListener('keypress', (e) => { if (e.key === 'Enter') { orderSearchTerm = document.getElementById('orderSearch').value.trim(); filterAndRenderOrders(); } });

// ---------- USERS ----------
async function loadUsers() {
    const res = await fetch(`${API}/api/users`);
    allUsers = await res.json();
    filterAndRenderUsers();
}

function filterAndRenderUsers() {
    let filtered = [...allUsers];
    if (userSearchTerm) {
        const term = userSearchTerm.toLowerCase();
        filtered = filtered.filter(u => u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
    }
    const display = userCurrentLimit === 999999 ? filtered : filtered.slice(0, userCurrentLimit);
    renderUserList(display, filtered.length);
}

function renderUserList(usersToShow, totalCount) {
    const container = document.getElementById('userList');
    if (!usersToShow.length) {
        container.innerHTML = '<div class="empty-state">No users found</div>';
        document.getElementById('userResultsInfo').innerHTML = '';
        return;
    }
    container.innerHTML = '';
    usersToShow.forEach(u => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
            <div style="flex:1;min-width:0">
                <div class="product-name">${escapeHtml(u.full_name)}</div>
                <div class="product-meta">
                    <span class="meta-chip">${escapeHtml(u.email)}</span>
                    ${u.birthdate ? `<span class="meta-chip">DOB: ${u.birthdate}</span>` : ''}
                    ${u.address ? `<span class="meta-chip" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(u.address)}</span>` : ''}
                </div>
            </div>
            <div class="user-actions">
                <button class="btn btn-primary btn-sm edit-user">Edit</button>
                <button class="btn btn-danger btn-sm delete-user">Delete</button>
            </div>`;
        div.querySelector('.edit-user').addEventListener('click', () => openEditUserModal(u));
        div.querySelector('.delete-user').addEventListener('click', async () => {
            if (confirm(`Delete user "${u.full_name}"? This will also delete their orders and cart.`)) {
                await fetch(`${API}/api/users/${u.id}`, { method: 'DELETE' });
                loadUsers();
            }
        });
        container.appendChild(div);
    });
    document.getElementById('userResultsInfo').innerHTML = `Showing ${usersToShow.length} of ${totalCount} users`;
}

function openEditUserModal(user) {
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editFullName').value = user.full_name;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editBirthdate').value = user.birthdate || '';
    document.getElementById('editAddress').value = user.address || '';
    document.getElementById('editUserModal').style.display = 'flex';
}

async function saveUserEdit() {
    const userId = document.getElementById('editUserId').value;
    const full_name = document.getElementById('editFullName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const birthdate = document.getElementById('editBirthdate').value.trim();
    const address = document.getElementById('editAddress').value.trim();
    if (!full_name || !email) { alert('Full name and email are required'); return; }
    const res = await fetch(`${API}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, birthdate, address })
    });
    if (res.ok) { loadUsers(); document.getElementById('editUserModal').style.display = 'none'; alert('User updated successfully'); }
    else { const err = await res.json(); alert('Error: ' + err.error); }
}

function closeEditUserModal() { document.getElementById('editUserModal').style.display = 'none'; }

document.getElementById('saveUserEditBtn').onclick = saveUserEdit;
document.getElementById('cancelUserEditBtn').onclick = closeEditUserModal;
document.getElementById('closeEditUserModal').onclick = closeEditUserModal;

document.getElementById('searchUsersBtn').onclick = () => { userSearchTerm = document.getElementById('userSearch').value.trim(); filterAndRenderUsers(); };
document.getElementById('resetUsersBtn').onclick = () => { document.getElementById('userSearch').value = ''; userSearchTerm = ''; filterAndRenderUsers(); };
document.getElementById('userLimit').onchange = (e) => { userCurrentLimit = parseInt(e.target.value); filterAndRenderUsers(); };
document.getElementById('userSearch').addEventListener('keypress', (e) => { if (e.key === 'Enter') { userSearchTerm = document.getElementById('userSearch').value.trim(); filterAndRenderUsers(); } });

// ---------- DETAIL MODAL (Attributes & Reviews) ----------
async function openDetailModal(productId) {
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;
    document.getElementById('detailProductName').innerText = product.name;
    const attrRes = await fetch(`${API}/api/attributes/${productId}`);
    let attributes = await attrRes.json();
    const revRes = await fetch(`${API}/api/reviews/${productId}`);
    let reviews = await revRes.json();

    const EXCLUDED = ['_id', 'product_id', 'updated_at'];
    let attrKeys = Object.keys(attributes).filter(k => !EXCLUDED.includes(k));
    if (!currentAttributeOrder.length) currentAttributeOrder = [...attrKeys];

    let attrHtml = `<div class="modal-section-label">Specifications</div>`;
    if (attrKeys.length === 0) {
        attrHtml += `<div class="empty-state" style="padding:20px">No attributes yet. Add one below.</div>`;
    } else {
        attrHtml += `<table class="attr-table" id="attrTable">
            <thead><tr>
                <th style="width:28px"></th>
                <th>Attribute</th>
                <th>Value</th>
                <th style="width:80px">Action</th>
            </tr></thead>
            <tbody id="attrTableBody">`;
        currentAttributeOrder.forEach(key => {
            if (!attributes[key]) return;
            attrHtml += `<tr data-key="${escapeHtml(key)}">
                <td style="text-align:center"><span class="drag-handle">&#8942;&#8942;</span></td>
                <td><strong>${escapeHtml(key)}</strong></td>
                <td>${escapeHtml(attributes[key])}</td>
                <td><button class="btn btn-danger btn-sm delete-attr" data-key="${escapeHtml(key)}">Delete</button></td>
            </tr>`;
        });
        attrHtml += `</tbody></table>
        <div class="sorting-controls">
            <button id="moveUpBtn" class="btn btn-outline btn-sm">Move Up</button>
            <button id="moveDownBtn" class="btn btn-outline btn-sm">Move Down</button>
            <span>Click a row to select, then use Move Up / Move Down</span>
        </div>`;
    }
    attrHtml += `<p style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Add Attribute</p>
        <div class="inline-form-row">
            <input type="text" id="newAttrKey" placeholder="Attribute name">
            <input type="text" id="newAttrVal" placeholder="Value">
            <button id="addAttrBtn" class="btn btn-success btn-sm">Add</button>
        </div>
        <hr>`;

    let reviewsHtml = `<div class="modal-section-label">Customer Reviews</div>`;
    if (reviews.length === 0) {
        reviewsHtml += `<div class="empty-state" style="padding:20px">No reviews yet.</div>`;
    } else {
        reviews.forEach(r => {
            reviewsHtml += `<div class="review-item">
                <div class="r-top">
                    <span class="r-author">${escapeHtml(r.user)}</span>
                    <span class="r-rating">${r.rating}/5</span>
                </div>
                <div class="r-text">${escapeHtml(r.comment)}</div>
                <div class="r-date">${new Date(r.created_at).toLocaleString()}</div>
                <button class="btn btn-danger btn-sm delReview" data-id="${r._id}" style="margin-top:8px">Delete</button>
            </div>`;
        });
    }
    reviewsHtml += `<p style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">Add Review</p>
        <div class="inline-form-row">
            <input type="text" id="reviewName" placeholder="Customer name" style="flex:2">
            <input type="number" id="reviewRating" placeholder="Rating 1-5" style="flex:0 0 110px">
            <input type="text" id="reviewComment" placeholder="Comment" style="flex:3">
            <button id="addReviewBtn" class="btn btn-primary btn-sm">Add</button>
        </div>`;

    document.getElementById('detailContent').innerHTML = attrHtml + reviewsHtml;

    document.getElementById('addAttrBtn').onclick = async () => {
        const key = document.getElementById('newAttrKey').value.trim();
        const val = document.getElementById('newAttrVal').value.trim();
        if (!key || !val) return alert('Both fields required');
        await fetch(`${API}/api/attributes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId, attributes: { [key]: val } }) });
        currentAttributeOrder = [];
        openDetailModal(productId);
        loadProducts();
    };
    document.querySelectorAll('.delete-attr').forEach(btn => {
        btn.onclick = async () => {
            const key = btn.getAttribute('data-key');
            if (!confirm(`Delete attribute "${key}"?`)) return;
            const cur = await fetch(`${API}/api/attributes/${productId}`);
            let curAttrs = await cur.json();
            delete curAttrs[key];
            await fetch(`${API}/api/attributes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId, attributes: curAttrs }) });
            currentAttributeOrder = currentAttributeOrder.filter(k => k !== key);
            openDetailModal(productId);
            loadProducts();
        };
    });
    document.getElementById('addReviewBtn').onclick = async () => {
        const user = document.getElementById('reviewName').value.trim() || 'Anonymous';
        const rating = parseInt(document.getElementById('reviewRating').value);
        const comment = document.getElementById('reviewComment').value;
        if (isNaN(rating) || rating < 1 || rating > 5) return alert('Rating must be 1-5');
        await fetch(`${API}/api/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId, rating, comment, user }) });
        openDetailModal(productId);
    };
    document.querySelectorAll('.delReview').forEach(btn => {
        btn.onclick = async () => {
            const revId = btn.getAttribute('data-id');
            await fetch(`${API}/api/reviews/${revId}`, { method: 'DELETE' });
            openDetailModal(productId);
        };
    });

    const tableBody = document.getElementById('attrTableBody');
    let selectedRowIndex = -1;
    if (tableBody) {
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach((row, idx) => {
            row.style.cursor = 'pointer';
            row.onclick = () => { rows.forEach(r => r.classList.remove('selected-row')); row.classList.add('selected-row'); selectedRowIndex = idx; };
        });
        const moveUp = document.getElementById('moveUpBtn');
        const moveDown = document.getElementById('moveDownBtn');
        if (moveUp) moveUp.onclick = () => {
            if (selectedRowIndex > 0) { [currentAttributeOrder[selectedRowIndex], currentAttributeOrder[selectedRowIndex-1]] = [currentAttributeOrder[selectedRowIndex-1], currentAttributeOrder[selectedRowIndex]]; openDetailModal(productId); }
            else alert('Select an attribute first or it is already at the top');
        };
        if (moveDown) moveDown.onclick = () => {
            if (selectedRowIndex < currentAttributeOrder.length-1 && selectedRowIndex >= 0) { [currentAttributeOrder[selectedRowIndex], currentAttributeOrder[selectedRowIndex+1]] = [currentAttributeOrder[selectedRowIndex+1], currentAttributeOrder[selectedRowIndex]]; openDetailModal(productId); }
            else alert('Select an attribute first or it is already at the bottom');
        };
    }
    document.getElementById('detailModal').style.display = 'flex';
}

document.querySelector('#detailModal .modal-close').onclick = () => { document.getElementById('detailModal').style.display = 'none'; currentAttributeOrder = []; };
window.onclick = (e) => {
    if (e.target === document.getElementById('detailModal')) { document.getElementById('detailModal').style.display = 'none'; currentAttributeOrder = []; }
    if (e.target === document.getElementById('editUserModal')) closeEditUserModal();
};

// Tab switching
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');
tabs.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        contents.forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');
    });
});

loadProducts();
loadOrders();
loadUsers();