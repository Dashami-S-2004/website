const MY_NUMBER = "918904528959"; 
let allProducts = []; 
let activeCategory = 'all'; 

const yearSpan = document.getElementById('year');
if(yearSpan) yearSpan.textContent = new Date().getFullYear();

// --- MAIN LOADER ---
async function loadShop() {
    const resultLabel = document.getElementById('resultCount');
    const grid = document.getElementById('product-grid');

    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        try { allProducts = await response.json(); } catch (e) { throw new Error("Invalid JSON format."); }
        
        generateDynamicFilters(allProducts);
        setupDualSlider(allProducts);
        setupHeroSlider(allProducts);
        applyAllFilters(); 
        loadFooter();

    } catch (error) {
        console.error("Critical Error:", error);
        if(resultLabel) resultLabel.textContent = "System Error";
        if(grid) grid.innerHTML = `<div class="alert alert-danger text-center w-100 p-5"><h4>⚠️ Could not load shop</h4><p>${error.message}</p></div>`;
    }
}

// --- FOOTER LOADER ---
async function loadFooter() {
    const container = document.getElementById('footer-socials');
    if(!container) return;

    try {
        const response = await fetch('footer.json');
        const links = await response.json();

        let html = '';
        links.forEach(link => {
            // Build the Redirect URL with your Branded Page
            const finalLink = `social_redirect.html?target=${encodeURIComponent(link.url)}&platform=${encodeURIComponent(link.platform)}`;
            
            html += `
                <a href="${finalLink}" target="_blank" title="${link.platform}">
                    <i class="${link.icon}"></i>
                </a>
            `;
        });
        container.innerHTML = html;

    } catch (error) {
        console.error("Could not load footer links:", error);
    }
}

// --- SETUP FUNCTIONS ---
function generateDynamicFilters(products) {
    const container = document.getElementById('dynamic-category-filters');
    if(!container) return;
    const categories = new Set();
    products.forEach(p => { if(p.visible && !p.deleted && p.category) categories.add(p.category); });
    let html = `<button class="btn btn-sm btn-outline-danger rounded-pill active filter-btn px-3" data-cat="all" onclick="selectCategory('all', this)">All</button>`;
    categories.forEach(cat => { html += `<button class="btn btn-sm btn-outline-danger rounded-pill filter-btn px-3" data-cat="${cat}" onclick="selectCategory('${cat}', this)">${cat}</button>`; });
    container.innerHTML = html;
}

function setupHeroSlider(products) {
    const container = document.getElementById('hero-slides-container');
    if(!container) return;
    const featured = products.filter(p => p.visible && !p.deleted).slice(0, 5);
    let html = '';
    featured.forEach((p, index) => {
        const activeClass = index === 0 ? 'active' : '';
        const mainImg = p.image || p.image_hd || 'placeholder.jpg';
        html += `
            <div class="carousel-item ${activeClass} h-100" onclick="openLightbox('${p.id}')">
                <img src="${mainImg}" class="d-block w-100 hero-img" alt="${p.name}">
                <div class="carousel-caption d-none d-md-block">
                    <h5 class="hero-title">${p.name}</h5>
                    <p class="hero-price">₹${p.discount_price || p.price}</p>
                    <button class="btn btn-sm btn-outline-light mt-2 rounded-pill px-4">View Details</button>
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

function setupDualSlider(products) {
    let maxPrice = 0;
    products.forEach(p => { let price = parseInt(p.discount_price || p.price || 0); if(price > maxPrice) maxPrice = price; });
    if(maxPrice === 0) maxPrice = 10000;
    const rangeMin = document.getElementById('priceRangeMin');
    const rangeMax = document.getElementById('priceRangeMax');
    rangeMin.max = maxPrice + 500; rangeMax.max = maxPrice + 500;
    rangeMax.value = maxPrice + 500;
    updateDualSlider();
}

function updateDualSlider() {
    const rangeMin = document.getElementById('priceRangeMin');
    const rangeMax = document.getElementById('priceRangeMax');
    const displayMin = document.getElementById('priceMinDisplay');
    const displayMax = document.getElementById('priceMaxDisplay');
    const track = document.querySelector('.slider-track');
    let minVal = parseInt(rangeMin.value);
    let maxVal = parseInt(rangeMax.value);
    if (minVal > maxVal - 500) { rangeMin.value = maxVal - 500; minVal = maxVal - 500; }
    displayMin.textContent = minVal; displayMax.textContent = maxVal;
    const percentMin = (minVal / rangeMin.max) * 100;
    const percentMax = (maxVal / rangeMax.max) * 100;
    track.style.background = `linear-gradient(to right, #ddd ${percentMin}%, var(--primary) ${percentMin}%, var(--primary) ${percentMax}%, #ddd ${percentMax}%)`;
    applyAllFilters();
}

// --- FILTERING ---
function selectCategory(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = cat;
    applyAllFilters();
}

function applyAllFilters() {
    const searchInput = document.getElementById('searchBar');
    const minPriceInput = document.getElementById('priceRangeMin');
    const maxPriceInput = document.getElementById('priceRangeMax');
    if(!searchInput) return;

    const query = searchInput.value.toLowerCase();
    const minPrice = parseInt(minPriceInput.value);
    const maxPrice = parseInt(maxPriceInput.value);
    const ratingEl = document.querySelector('input[name="ratingBtn"]:checked');
    const minRating = ratingEl ? parseInt(ratingEl.value) : 0;

    const filtered = allProducts.filter(p => {
        if (!p.visible || p.deleted) return false;
        const matchesCategory = (activeCategory === 'all') || (p.category === activeCategory) || (p.fabric && p.fabric.includes(activeCategory));
        const searchStr = ((p.name||'') + (p.category||'') + (p.fabric||'') + (p.color||'')).toLowerCase();
        const matchesSearch = searchStr.includes(query);
        const price = parseInt(p.discount_price || p.price || 0);
        const matchesPrice = price >= minPrice && price <= maxPrice;
        const matchesRating = (p.stars || 0) >= minRating;
        return matchesCategory && matchesSearch && matchesPrice && matchesRating;
    });

    document.getElementById('resultCount').textContent = `Showing ${filtered.length} products`;
    renderProducts(filtered);
    checkFilterAvailability(query, minPrice, maxPrice, activeCategory, minRating);
}

function checkFilterAvailability(currentQuery, minP, maxP, currentCat, currentRating) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const cat = btn.getAttribute('data-cat');
        const count = allProducts.filter(p => {
            if(!p.visible || p.deleted) return false;
            const searchStr = ((p.name||'') + (p.category||'') + (p.fabric||'') + (p.color||'')).toLowerCase();
            const price = parseInt(p.discount_price || p.price || 0);
            const matchS = searchStr.includes(currentQuery);
            const matchP = price >= minP && price <= maxP;
            const matchR = (p.stars || 0) >= currentRating;
            const matchC = (cat === 'all') || (p.category === cat) || (p.fabric && p.fabric.includes(cat));
            return matchS && matchP && matchR && matchC;
        }).length;
        if (count === 0) btn.classList.add('disabled'); else btn.classList.remove('disabled');
    });
}

// --- RENDER FUNCTION ---
function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if(!grid) return;
    grid.innerHTML = ''; 

    if(products.length === 0) {
        grid.innerHTML = '<div class="text-center w-100 py-5 text-muted"><h4>No sarees match your filters</h4></div>';
        return;
    }

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openLightbox(p.id);

        const mainImg = p.image || p.image_hd || 'placeholder.jpg';
        
        let priceHtml = `<span class="final-price">₹${p.price}</span>`;
        if(p.discount_price) priceHtml = `<span class="original-price">₹${p.price}</span> <span class="final-price">₹${p.discount_price}</span>`;
        const stockClass = p.stock === 'Sold Out' ? 'stock-out' : 'stock-badge';
        const reviewHtml = p.reviews && p.reviews.length > 0 ? `<div class="reviews">"${p.reviews[0]}"</div>` : '';
        
        const msg = `Hello Dashami Silks, I am interested in:\n*${p.name}*\nID: ${p.id}`;
        
        // --- CHANGED TO whatsapp:// PROTOCOL ---
        // This skips the website and opens the App directly
        const rawWaLink = `whatsapp://send?phone=${MY_NUMBER}&text=${encodeURIComponent(msg)}`;
        
        // Pass it to your Branded Redirect Page
        const link = `social_redirect.html?target=${encodeURIComponent(rawWaLink)}&platform=WhatsApp`;

        card.innerHTML = `
            <div class="img-box skeleton">
                <div class="card-overlay"><span class="view-btn">View Details</span></div>
                <img class="product-img" onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton')" onerror="this.style.border='5px solid red'" src="${mainImg}" alt="${p.name}">
            </div>
            <div class="info">
                <span class="cat">${p.category || 'Saree'} | ${p.fabric || 'Silk'}</span>
                <h3 class="title">${p.name}</h3>
                <div class="meta">Color: ${p.color || 'Multi'} | <span class="${stockClass}">${p.stock || 'In Stock'}</span></div>
                <div class="price-area">${priceHtml}</div>
                <div style="color:gold; margin-bottom:8px;">${"★".repeat(p.stars || 4)}</div>
                ${reviewHtml}
                <a href="${link}" target="_blank" class="btn-wa" onclick="event.stopPropagation()">Buy on WhatsApp</a>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- LIGHTBOX LOGIC ---
let currentGallery = [];
let currentIndex = 0;

function openLightbox(productId) {
    const product = allProducts.find(p => p.id === productId);
    if(!product) return;

    document.getElementById('lb-title').innerText = product.name;
    document.getElementById('lb-cat').innerText = product.category || 'Saree';
    document.getElementById('lb-desc').innerText = product.desc || 'No description available.';
    document.getElementById('lb-fabric').innerText = product.fabric || 'Silk';
    document.getElementById('lb-color').innerText = product.color || 'Multi';
    document.getElementById('lb-rating').innerText = "★".repeat(product.stars || 4);
    
    const stockEl = document.getElementById('lb-stock');
    stockEl.innerText = product.stock || 'In Stock';
    stockEl.className = product.stock === 'Sold Out' ? 'badge bg-danger rounded-pill fw-normal' : 'badge bg-success rounded-pill fw-normal';

    if(product.discount_price) {
        document.getElementById('lb-price').innerText = `₹${product.discount_price}`;
        document.getElementById('lb-old-price').innerText = `₹${product.price}`;
    } else {
        document.getElementById('lb-price').innerText = `₹${product.price}`;
        document.getElementById('lb-old-price').innerText = "";
    }

    // --- BUTTON LOGIC (Skipping Website) ---
    const msg = `Hello Dashami Silks, I want to buy:\n*${product.name}*\nID: ${product.id}`;
    const rawLink = `whatsapp://send?phone=${MY_NUMBER}&text=${encodeURIComponent(msg)}`;
    
    document.getElementById('lb-whatsapp-btn').href = `social_redirect.html?target=${encodeURIComponent(rawLink)}&platform=WhatsApp`;

    const mainImg = product.image || product.image_hd || 'placeholder.jpg';
    const gallery = product.gallery || [];
    currentGallery = [mainImg, ...gallery]; 
    currentIndex = 0;

    const thumbContainer = document.getElementById('lb-thumbnails');
    let thumbHTML = '';
    currentGallery.forEach((img, idx) => {
        thumbHTML += `<img src="${img}" class="thumb-img" onclick="jumpToSlide(${idx})">`;
    });
    thumbContainer.innerHTML = thumbHTML;

    updateLightboxImage();
    document.getElementById('lightbox').style.display = 'flex';
}

function closeLightbox() { document.getElementById('lightbox').style.display = 'none'; }

function changeSlide(direction) {
    if(currentGallery.length <= 1) return;
    currentIndex += direction;
    if (currentIndex >= currentGallery.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = currentGallery.length - 1;
    updateLightboxImage();
}

function jumpToSlide(index) {
    currentIndex = index;
    updateLightboxImage();
}

function updateLightboxImage() {
    const img = document.getElementById('lightbox-img');
    const thumbs = document.querySelectorAll('.thumb-img');
    const counter = document.getElementById('image-counter'); 
    
    thumbs.forEach((t, i) => {
        if(i === currentIndex) {
            t.classList.add('active');
            t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else t.classList.remove('active');
    });

    if (counter) counter.textContent = `${currentIndex + 1} / ${currentGallery.length}`;

    img.style.opacity = 0.5;
    setTimeout(() => { img.src = currentGallery[currentIndex]; img.style.opacity = 1; }, 150);
}

document.addEventListener('keydown', function(event) { if (event.key === "Escape") closeLightbox(); });
document.addEventListener('click', function(event) {
    const filterPanel = document.getElementById('filterPanel');
    const filterBtn = document.getElementById('filterToggleBtn');
    if (filterPanel.classList.contains('show') && !filterPanel.contains(event.target) && !filterBtn.contains(event.target)) {
        new bootstrap.Collapse(filterPanel).hide();
    }
});

loadShop();