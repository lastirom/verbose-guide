const API = 'http://localhost:5000';
let products = [];
let filteredProducts = [];
let cart = [];
let currentProduct = null;
let token = null;
let user = null;
let activeCategory = 'all';
let searchQuery = '';

function esc(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
}

function showToast(msg, isErr = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast' + (isErr ? ' err' : '') + ' show';
    setTimeout(() => t.classList.remove('show'), 3800);
}

function stockData(stock) {
    if (stock === 0) {
        return { cls: 's-out', pillCls: 'out', label: 'Out of Stock', pdLabel: 'Out of Stock' };
    }
    const label = `${stock} in stock`;
    const pillCls = stock <= 5 ? 'low' : 'in';
    const cls = stock <= 5 ? 's-low' : 's-in';
    return { cls, pillCls, label, pdLabel: label };
}

function fmtPrice(p) {
    const [d, c] = parseFloat(p).toFixed(2).split('.');
    return `<sup>$</sup>${d}<span style="font-size:15px;font-weight:500">.${c}</span>`;
}

function updateTotalItemsStat() {
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const totalStatElem = document.getElementById('totalItemsStat');
    if (totalStatElem) totalStatElem.textContent = totalStock;
}

function saveToken(tk, ud) {
    token = tk;
    user = ud;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    document.getElementById('accountLabel').textContent = user.full_name.split(' ')[0];
    syncCartAfterLogin();
}

function logout() {
    token = null;
    user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    cart = [];
    updateCartUI();
    document.getElementById('accountLabel').textContent = 'Account';
    document.getElementById('profileModal').classList.remove('open');
    showToast('Logged out');
}

async function syncCartAfterLogin() {
    try {
        const res = await fetch(`${API}/api/cart`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            cart = data.map(i => ({ productId: i.product_id, name: i.name, price: i.price, stock: i.stock, quantity: i.quantity }));
            updateCartUI();
        }
    } catch(e) {}
}

async function saveCartToBackend() {
    if (!token) return;
    const items = cart.map(i => ({ product_id: i.productId, quantity: i.quantity }));
    await fetch(`${API}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items })
    });
}

function openAuthModal() {
    document.getElementById('authTitle').textContent = 'Login';
    document.getElementById('authForm').innerHTML = `
        <div class="f-group"><label class="f-label">Email</label><input class="f-input" type="email" id="loginEmail" placeholder="you@example.com"></div>
        <div class="f-group"><label class="f-label">Password</label><input class="f-input" type="password" id="loginPassword" placeholder="Your password"></div>
        <button class="f-btn f-btn-ink" id="submitLogin">Login</button>`;
    document.getElementById('authSwitch').innerHTML = `Don't have an account? <a href="#" id="showReg">Register</a>`;
    document.getElementById('submitLogin').onclick = doLogin;
    document.getElementById('showReg').onclick = (e) => { e.preventDefault(); showRegisterForm(); };
    document.getElementById('authModal').classList.add('open');
}

function showRegisterForm() {
    document.getElementById('authTitle').textContent = 'Create Account';
    document.getElementById('authForm').innerHTML = `
        <div class="f-group"><label class="f-label">Full Name</label><input class="f-input" type="text" id="regName" placeholder="Your full name"></div>
        <div class="f-group"><label class="f-label">Email</label><input class="f-input" type="email" id="regEmail" placeholder="you@example.com"></div>
        <div class="f-group"><label class="f-label">Password</label><input class="f-input" type="password" id="regPassword" placeholder="Create a password"></div>
        <button class="f-btn f-btn-ink" id="submitReg">Create Account</button>`;
    document.getElementById('authSwitch').innerHTML = `Already have an account? <a href="#" id="showLogin">Login</a>`;
    document.getElementById('submitReg').onclick = doRegister;
    document.getElementById('showLogin').onclick = (e) => { e.preventDefault(); openAuthModal(); };
}

async function doLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const res = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (res.ok) {
        saveToken(data.token, data.user);
        document.getElementById('authModal').classList.remove('open');
        showToast(`Welcome back, ${data.user.full_name.split(' ')[0]}`);
        loadStore();
    } else {
        showToast(data.error || 'Login failed', true);
    }
}

async function doRegister() {
    const full_name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const res = await fetch(`${API}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name, email, password }) });
    const data = await res.json();
    if (res.ok) {
        saveToken(data.token, data.user);
        document.getElementById('authModal').classList.remove('open');
        showToast(`Welcome, ${full_name}!`);
        openProfileModal();
    } else {
        showToast(data.error || 'Registration failed', true);
    }
}

function openProfileModal() {
    if (!token) { openAuthModal(); return; }
    document.getElementById('profileForm').innerHTML = `
        <div class="f-group"><label class="f-label">Full Name</label><input class="f-input" type="text" id="profName" value="${esc(user.full_name)}"></div>
        <div class="f-group"><label class="f-label">Email</label><input class="f-input" type="email" id="profEmail" value="${esc(user.email)}"></div>
        <div class="f-group"><label class="f-label">Birth Date</label><input class="f-input" type="date" id="profBirth" value="${user.birthdate || ''}"></div>
        <div class="f-group"><label class="f-label">Shipping Address</label><textarea class="f-input" id="profAddr" rows="3" placeholder="Full shipping address">${esc(user.address || '')}</textarea></div>
        <button class="f-btn f-btn-ink" id="saveProf">Save Changes</button>
        <button class="f-btn f-btn-outline" id="logoutBtn" style="margin-top:8px">Logout</button>`;
    document.getElementById('saveProf').onclick = async () => {
        const full_name = document.getElementById('profName').value;
        const email = document.getElementById('profEmail').value;
        const birthdate = document.getElementById('profBirth').value;
        const address = document.getElementById('profAddr').value;
        const res = await fetch(`${API}/api/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ full_name, email, birthdate, address })
        });
        if (res.ok) {
            user.full_name = full_name; user.email = email; user.birthdate = birthdate; user.address = address;
            localStorage.setItem('user', JSON.stringify(user));
            showToast('Profile updated');
        } else {
            showToast('Failed to update profile', true);
        }
    };
    document.getElementById('logoutBtn').onclick = logout;
    document.getElementById('profileModal').classList.add('open');
}

async function loadStore() {
    const grid = document.getElementById('storeGrid');
    grid.innerHTML = '<div class="skel-card"><div class="skel skel-img"></div><div class="skel-body"><div class="skel skel-line w80"></div><div class="skel skel-line w60"></div><div class="skel skel-line w40"></div></div></div>'.repeat(4);
    try {
        const res = await fetch(`${API}/api/products`);
        products = await res.json();
        if (token) syncCartAfterLogin();
    } catch(e) {
        products = [];
    }
    document.getElementById('heroCount').textContent = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    document.getElementById('totalItemsStat').textContent = totalStock;
    buildFilters();
    applyFilter();
}

function buildFilters() {
    const cats = ['all', ...new Set(products.map(p => p.category).filter(Boolean).sort())];
    const row = document.getElementById('filtersRow');
    row.innerHTML = '<span class="filter-label">Category</span>';
    cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'chip' + (cat === activeCategory ? ' active' : '');
        btn.dataset.cat = cat;
        btn.textContent = cat === 'all' ? 'All' : cat;
        btn.onclick = () => { activeCategory = cat; buildFilters(); applyFilter(); };
        row.appendChild(btn);
    });
}

function applyFilter() {
    const q = searchQuery.toLowerCase();
    filteredProducts = products.filter(p => {
        const catOk = activeCategory === 'all' || p.category === activeCategory;
        const srchOk = !q || (p.name || '').toLowerCase().includes(q)
                          || (p.description || '').toLowerCase().includes(q)
                          || (p.category || '').toLowerCase().includes(q);
        return catOk && srchOk;
    });
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('storeGrid');
    const count = document.getElementById('gridCount');
    count.textContent = filteredProducts.length + ' item' + (filteredProducts.length !== 1 ? 's' : '');
    if (!filteredProducts.length) {
        grid.innerHTML = `
            <div class="state-box">
                <div class="state-icon">
                    <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </div>
                <h3>No results found</h3>
                <p>Try a different category or search term.</p>
            </div>`;
        return;
    }
    grid.innerHTML = '';
    filteredProducts.forEach((p, i) => {
        const imgUrl = p.image_url ? API + p.image_url : '';
        const sd = stockData(p.stock);
        const badge = p.discount  ? '<span class="p-badge b-sale">Sale</span>'
                    : p.is_new    ? '<span class="p-badge b-new">New</span>'
                    : p.stock === 0 ? '<span class="p-badge b-out">Out of Stock</span>'
                    : p.stock <= 5  ? '<span class="p-badge b-low">Low Stock</span>' : '';
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.animationDelay = (i * 32) + 'ms';
        card.innerHTML = `
            <div class="card-img-wrap">
                ${imgUrl
                    ? `<img class="product-img" src="${esc(imgUrl)}" alt="${esc(p.name)}" onerror="this.style.display='none'">`
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center">
                           <svg width="40" height="40" fill="none" stroke="#c9c2b8" stroke-width="1.2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6m0-6-6 6"/></svg>
                       </div>`}
                <div class="card-overlay"><button class="qv-btn">View Details</button></div>
                ${badge}
            </div>
            <div class="card-body">
                ${p.category ? `<div class="card-cat">${esc(p.category)}</div>` : ''}
                <div class="card-name">${esc(p.name)}</div>
                ${p.description ? `<div class="card-desc">${esc(p.description)}</div>` : ''}
                <div class="card-footer">
                    <div class="card-price">${fmtPrice(p.price)}</div>
                    <div class="stock-pill ${sd.cls}"><span class="stock-dot"></span>${sd.label}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-ghost">Details</button>
                    <button class="btn-primary" ${p.stock === 0 ? 'disabled' : ''}>Add to Cart</button>
                </div>
            </div>`;
        card.querySelector('.btn-ghost').onclick = (e) => { e.stopPropagation(); openProductModal(p.id); };
        card.querySelector('.qv-btn').onclick = (e) => { e.stopPropagation(); openProductModal(p.id); };
        card.querySelector('.btn-primary').onclick = (e) => { e.stopPropagation(); addToCart(products.find(pr => pr.id === p.id)); };
        card.onclick = () => openProductModal(p.id);
        grid.appendChild(card);
    });
}

async function openProductModal(productId) {
    currentProduct = products.find(p => p.id == productId);
    if (!currentProduct) return;
    const p = currentProduct;
    const imgUrl = p.image_url ? API + p.image_url : '';
    const sd = stockData(p.stock);

    let attrs = {}, reviews = [];
    try {
        const [ar, rr] = await Promise.all([
            fetch(`${API}/api/attributes/${productId}`),
            fetch(`${API}/api/reviews/${productId}`)
        ]);
        attrs = await ar.json(); reviews = await rr.json();
    } catch(e) {}

    const EXCL = ['_id', 'product_id', 'updated_at'];
    const attrKeys = Object.keys(attrs).filter(k => !EXCL.includes(k));

    let specHtml = '';
    if (attrKeys.length) {
        specHtml = `<div class="sec-label" style="margin-bottom:12px">Specifications</div><div class="spec-grid">`;
        attrKeys.forEach(k => {
            specHtml += `<div class="spec-k">${esc(k)}</div><div class="spec-v">${esc(attrs[k])}</div>`;
        });
        specHtml += `</div>`;
    }

    let revHtml = `<div class="sec-label" style="margin-bottom:12px">Reviews (${reviews.length})</div>`;
    if (!reviews.length) {
        revHtml += `<p class="no-rev">No reviews yet. Be the first!</p>`;
    } else {
        reviews.slice(0, 5).forEach(r => {
            const stars = '★'.repeat(Math.min(5, r.rating || 0)) + '☆'.repeat(5 - Math.min(5, r.rating || 0));
            revHtml += `<div class="rev-card">
                <div class="rev-top"><span class="rev-author">${esc(r.user || 'Anonymous')}</span><span class="rev-stars">${stars}</span></div>
                <p class="rev-text">${esc(r.comment)}</p>
                <p class="rev-date">${new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>`;
        });
    }

    const revFormHtml = token ? `
        <div class="sec-label" style="margin:20px 0 12px">Write a Review</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
            <input class="f-input" type="text" id="revName" placeholder="Your name" value="${esc(user?.full_name || '')}">
            <select class="f-input" id="revRating">
                <option value="">Rating...</option>
                <option value="5">★★★★★ Excellent</option>
                <option value="4">★★★★ Very Good</option>
                <option value="3">★★★ Good</option>
                <option value="2">★★ Fair</option>
                <option value="1">★ Poor</option>
            </select>
        </div>
        <textarea class="f-input" id="revComment" rows="2" placeholder="Share your experience..." style="margin-bottom:10px"></textarea>
        <button class="f-btn f-btn-outline" id="submitRevBtn" style="margin-top:0;border-radius:var(--r-sm)">Post Review</button>` : '';

    const existing = document.getElementById('pdModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'pdModal';
    modal.className = 'modal open';
    modal.innerHTML = `
        <div class="modal-box wide" style="padding:0;">
            <div class="p-detail" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;max-height:92vh;">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:24px 28px 18px;border-bottom:1px solid rgba(201,194,184,.35);flex-shrink:0;">
                    <div>
                        ${p.category ? `<div class="pd-cat">${esc(p.category)}</div>` : ''}
                        <h2 class="pd-name" style="margin-bottom:0">${esc(p.name)}</h2>
                    </div>
                    <button class="modal-x" id="closePd" style="flex-shrink:0;margin-top:2px">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="pd-img">
                    ${imgUrl
                        ? `<img src="${esc(imgUrl)}" alt="${esc(p.name)}" onerror="this.parentElement.innerHTML='<div class=\\'no-img\\'><svg width=\\'28\\' height=\\'28\\' fill=\\'none\\' stroke=\\'#c9c2b8\\' stroke-width=\\'1.5\\' viewBox=\\'0 0 24 24\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\'/><path d=\\'m9 9 6 6m0-6-6 6\\'/></svg></div>'">`
                        : `<div class="no-img"><svg width="28" height="28" fill="none" stroke="#c9c2b8" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6m0-6-6 6"/></svg></div>`}
                </div>
                <div class="pd-info">
                    <div class="pd-price">${fmtPrice(p.price)}</div>
                    <div class="pd-stock ${sd.pillCls}" style="margin-bottom:18px">
                        <span style="width:7px;height:7px;border-radius:50%;background:${sd.pillCls==='in'?'var(--green)':sd.pillCls==='low'?'var(--gold)':'var(--mid)'};display:inline-block"></span>
                        ${sd.pdLabel}
                    </div>
                    ${p.description ? `<p class="pd-desc">${esc(p.description)}</p>` : ''}
                    ${specHtml}
                    <div class="sec-label" style="margin-bottom:12px">Add to Cart</div>
                    <div class="qty-row">
                        <span class="qty-label">Quantity</span>
                        <div class="qty-ctrl">
                            <button id="qminus">&#8722;</button>
                            <input type="number" id="modalQty" value="1" min="1" max="${p.stock}">
                            <button id="qplus">+</button>
                        </div>
                    </div>
                    <button class="modal-atc" id="modalATC" ${p.stock === 0 ? 'disabled' : ''}>
                        ${p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <div style="margin-top:28px">${revHtml}${revFormHtml}</div>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);

    document.getElementById('closePd').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.getElementById('qminus').onclick = (e) => { e.stopPropagation(); const i = document.getElementById('modalQty'); if ((parseInt(i.value)||1) > 1) i.value = (parseInt(i.value)||1) - 1; };
    document.getElementById('qplus').onclick = (e) => { e.stopPropagation(); const i = document.getElementById('modalQty'); const v = parseInt(i.value)||1; if (v < p.stock) i.value = v + 1; };
    document.getElementById('modalATC').onclick = () => { const qty = parseInt(document.getElementById('modalQty').value) || 1; if (addToCart(p, qty)) modal.remove(); };

    if (token && document.getElementById('submitRevBtn')) {
        document.getElementById('submitRevBtn').onclick = async () => {
            const rating = parseInt(document.getElementById('revRating').value);
            const comment = document.getElementById('revComment').value;
            if (!rating || rating < 1 || rating > 5) { showToast('Please select a rating', true); return; }
            const res = await fetch(`${API}/api/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ product_id: p.id, rating, comment })
            });
            if (res.ok) {
                showToast('Review posted');
                modal.remove();
                openProductModal(p.id);
            } else {
                showToast('Failed to post review', true);
            }
        };
    }
}

function addToCart(product, qty = 1) {
    if (!token) { showToast('Please login to add items to cart', true); openAuthModal(); return false; }
    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
        if (existing.quantity + qty > product.stock) { showToast(`Only ${product.stock} in stock`, true); return false; }
        existing.quantity += qty;
    } else {
        cart.push({ productId: product.id, name: product.name, price: product.price, stock: product.stock, quantity: qty });
    }
    updateCartUI();
    saveCartToBackend();
    showToast(`${product.name} added to cart`);
    return true;
}

function updateCartUI() {
    const container = document.getElementById('cartItemsList');
    const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
    const totalPrice = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    document.getElementById('cartCount').textContent = totalQty;
    document.getElementById('cartTotal').textContent = `$${totalPrice.toFixed(2)}`;
    if (!cart.length) {
        container.innerHTML = `<div class="cart-empty-state">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <p>Your cart is empty</p></div>`;
        return;
    }
    container.innerHTML = cart.map(item => {
        const pr = products.find(p => p.id === item.productId);
        const imgUrl = pr?.image_url ? API + pr.image_url : '';
        return `<div class="cart-item">
            <div class="ci-img">${imgUrl ? `<img src="${imgUrl}" alt="" onerror="this.style.display='none'">` : ''}</div>
            <div class="ci-info">
                <div class="ci-name">${esc(item.name)}</div>
                <div class="ci-price">$${(item.price * item.quantity).toFixed(2)}</div>
                <div class="ci-qty">
                    <button class="qty-btn" onclick="updateCartQty(${item.productId},-1)">&#8722;</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQty(${item.productId},1)">+</button>
                </div>
            </div>
            <button class="ci-remove" onclick="removeFromCart(${item.productId})">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
        </div>`;
    }).join('');
}

function updateCartQty(productId, change) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    const newQty = item.quantity + change;
    if (newQty <= 0) { removeFromCart(productId); return; }
    const pr = products.find(p => p.id === productId);
    if (newQty > pr.stock) { showToast(`Only ${pr.stock} in stock`, true); return; }
    item.quantity = newQty;
    updateCartUI();
    saveCartToBackend();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId != productId);
    updateCartUI();
    saveCartToBackend();
    showToast('Item removed');
}

document.getElementById('checkoutBtn').onclick = async () => {
    if (!token) { showToast('Please login to place order', true); openAuthModal(); return; }
    if (!user?.address) { showToast('Please add a shipping address in your profile', true); openProfileModal(); return; }
    if (!cart.length) { showToast('Cart is empty', true); return; }
    const items = cart.map(i => ({ product_id: i.productId, quantity: i.quantity }));
    const res = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items })
    });
    const data = await res.json();
    if (res.ok) {
        const del = new Date(data.delivery_date);
        showToast(`Order #${data.orderId} placed! Delivery: ${del.toLocaleDateString()}`);
        cart = [];
        updateCartUI();
        saveCartToBackend();
        loadStore();
        document.getElementById('cartPanel').classList.remove('open');
        document.getElementById('backdrop').classList.remove('show');
    } else {
        showToast(data.error || 'Order failed', true);
    }
};

document.getElementById('accountBtn').onclick = () => { if (token) openProfileModal(); else openAuthModal(); };
document.getElementById('cartIcon').onclick = () => { document.getElementById('cartPanel').classList.add('open'); document.getElementById('backdrop').classList.add('show'); };
document.getElementById('closeCart').onclick = closePanel;
document.getElementById('backdrop').onclick = closePanel;
window.onclick = (e) => { if (e.target.classList.contains('modal') && !e.target.id.startsWith('pd')) e.target.classList.remove('open'); };
function closePanel() {
    document.getElementById('cartPanel').classList.remove('open');
    document.getElementById('backdrop').classList.remove('show');
}
document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    applyFilter();
});

(function init() {
    const st = localStorage.getItem('token');
    const su = localStorage.getItem('user');
    if (st && su) {
        token = st;
        try {
            user = JSON.parse(su);
            document.getElementById('accountLabel').textContent = user.full_name?.split(' ')[0] || 'Account';
        } catch(e) {}
    }
    loadStore();
})();
