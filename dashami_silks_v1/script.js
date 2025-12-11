const MY_NUMBER = "918904528959"; 
let allProducts = []; 
let currentFilteredProducts = []; 
let activeCategory = 'all'; 

// Infinite Scroll
let loadedCount = 0; 
let batchSize = 20; 
let isLoading = false;

// --- GLOBAL ERROR HANDLER ---
window.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
        if(e.target.src.includes('logo/logo.png')) return;
        e.target.src = 'logo/logo.png'; 
        e.target.classList.add('opacity-50', 'p-4'); 
        if(e.target.parentElement.classList.contains('skeleton')) {
            e.target.parentElement.classList.remove('skeleton');
        }
    }
}, true);

const yearSpan = document.getElementById('year');
if(yearSpan) yearSpan.textContent = new Date().getFullYear();

// --- MAIN CONTROLLER ---
async function init() {
    try {
        loadFooter();

        const response = await fetch('data.json');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        try { allProducts = await response.json(); } catch (e) { throw new Error("Invalid JSON format."); }
        
        // 1. MAIN SHOP PAGE LOGIC
        if (document.getElementById('product-grid')) {
            updateBatchSize();
            window.addEventListener('resize', updateBatchSize);
            
            generateDynamicFilters(allProducts);
            setupDualSlider(allProducts);
            setupHeroSlider(allProducts);
            applyAllFilters(); 
            
            window.addEventListener('scroll', handleScroll);
        }

        // 2. PRODUCT DETAILS PAGE LOGIC
        if (document.getElementById('product-details-wrapper')) {
            loadProductDetails();
        }

    } catch (error) {
        console.error("Critical Error:", error);
    }
}

// --- INFINITE SCROLL ---
function updateBatchSize() {
    batchSize = window.innerWidth >= 768 ? 50 : 20;
}

function handleScroll() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 400) {
        if (!isLoading && loadedCount < currentFilteredProducts.length) {
            renderNextBatch();
        }
    }
}

function renderNextBatch() {
    isLoading = true;
    const loader = document.getElementById('infinite-loader');
    if(loader) loader.classList.remove('d-none');

    setTimeout(() => {
        const grid = document.getElementById('product-grid');
        const start = loadedCount;
        const end = Math.min(start + batchSize, currentFilteredProducts.length);
        const batch = currentFilteredProducts.slice(start, end);

        batch.forEach(p => {
            const card = createProductCard(p);
            grid.appendChild(card);
        });

        loadedCount = end;
        isLoading = false;
        
        if(loader) loader.classList.add('d-none');
        
        const countLabel = document.getElementById('resultCount');
        if (countLabel) countLabel.textContent = `Showing ${loadedCount} of ${currentFilteredProducts.length} products`;
    }, 600);
}

// --- HELPER: CREATE CARD (OLD STYLE LOGIC) ---
function createProductCard(p) {
    const card = document.createElement('div');
    card.className = 'card h-100'; 
    card.onclick = () => window.open(`product.html?id=${p.id}`, '_blank');

    const safeName = p.name || "Unknown Product";
    const safeCat = p.category || "Saree";
    const safeFab = p.fabric || "Silk";
    const safeImg = p.image || p.image_hd || 'logo/logo.png';
    const safeStock = p.stock || "Ready to Ship";
    const safeColor = p.color || "Multi";
    
    // SMART SNIPPET: Use Review if available, else Description
    let snippet = '"Absolutely stunning quality. The zari work is real gold."';
    if(p.reviews && p.reviews.length > 0) {
        snippet = `"${p.reviews[0]}"`;
    } else if(p.desc) {
        snippet = `"${p.desc.split('.')[0]}."`; 
    }

    let priceHtml = `<span class="badge bg-secondary">Ask Price</span>`;
    if (p.price) {
        if(p.discount_price) {
            priceHtml = `<span class="original-price">₹${p.price}</span> <span class="final-price">₹${p.discount_price}</span>`;
        } else {
            priceHtml = `<span class="final-price">₹${p.price}</span>`;
        }
    }
    
    const productUrl = `${window.location.origin}/product.html?id=${p.id}`;
    const msg = `Hello Dashami Silks, I am interested in:\n*${safeName}*\nID: ${p.id}\nLink: ${productUrl}`;
    const rawWaLink = `whatsapp://send?phone=${MY_NUMBER}&text=${encodeURIComponent(msg)}`;
    const link = `social_redirect.html?target=${encodeURIComponent(rawWaLink)}&platform=WhatsApp`;

    card.innerHTML = `
        <div class="img-box skeleton">
            <div class="card-overlay"><span class="view-btn">View Details</span></div>
            <img class="product-img" 
                 onload="this.parentElement.classList.remove('skeleton')" 
                 src="${safeImg}" 
                 alt="${safeName}">
        </div>
        <div class="info">
            <div class="cat-fabric">${safeCat} | ${safeFab}</div>
            <h3 class="title">${safeName}</h3>
            <div class="meta-line">Color: ${safeColor} | <span style="color:#2E7D32;">${safeStock}</span></div>
            <div class="price-area">${priceHtml}</div>
            <div class="stars">${"★".repeat(p.stars || 5)}</div>
            <div class="review-snippet">${snippet}</div>
            <a href="${link}" target="_blank" class="btn-card-action" onclick="event.stopPropagation()">
                Buy on WhatsApp
            </a>
        </div>
    `;
    return card;
}

// --- FILTERING ---
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

    currentFilteredProducts = allProducts.filter(p => {
        if (!p.visible || p.deleted) return false;
        const matchesCategory = (activeCategory === 'all') || (p.category === activeCategory) || (p.fabric && p.fabric.includes(activeCategory));
        const searchStr = ((p.name||'') + (p.category||'') + (p.fabric||'') + (p.color||'')).toLowerCase();
        const price = parseInt(p.discount_price || p.price || 0);
        
        return matchesCategory && 
               searchStr.includes(query) && 
               (price >= minPrice && price <= maxPrice) && 
               ((p.stars || 0) >= minRating);
    });

    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    loadedCount = 0;

    if (currentFilteredProducts.length === 0) {
        grid.innerHTML = '<div class="text-center w-100 py-5 text-muted"><h4>No sarees match your filters</h4></div>';
        document.getElementById('resultCount').textContent = "0 products found";
    } else {
        renderNextBatch();
    }

    checkFilterAvailability(query, minPrice, maxPrice, activeCategory, minRating);
}

// --- UTILS ---
async function loadFooter() {
    const container = document.getElementById('footer-socials');
    if(!container) return;
    try {
        const response = await fetch('footer.json');
        const links = await response.json();
        let html = '';
        links.forEach(link => {
            const finalLink = `social_redirect.html?target=${encodeURIComponent(link.url)}&platform=${encodeURIComponent(link.platform)}`;
            html += `<a href="${finalLink}" target="_blank" title="${link.platform}"><i class="${link.icon}"></i></a>`;
        });
        container.innerHTML = html;
    } catch (error) { console.error("Footer Error:", error); }
}

function selectCategory(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = cat;
    applyAllFilters();
}
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
        const mainImg = p.image || p.image_hd || 'logo/logo.png';
        html += `
            <div class="carousel-item ${activeClass} h-100" onclick="window.open('product.html?id=${p.id}', '_blank')">
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

// Product Page Logic
let currentGallery = [];
let currentIndex = 0;
function loadProductDetails() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const product = allProducts.find(p => p.id === productId);
    if (!product) { document.getElementById('pd-title').innerText = "Product Not Found"; return; }
    document.getElementById('pd-title').innerText = product.name;
    document.getElementById('pd-cat').innerText = product.category || 'Saree';
    document.getElementById('pd-desc').innerText = product.desc || 'No description available.';
    document.getElementById('pd-fabric').innerText = product.fabric || 'Silk';
    document.getElementById('pd-color').innerText = product.color || 'Multi';
    document.getElementById('pd-rating').innerText = "★".repeat(product.stars || 4);
    document.title = `${product.name} | Dashami Silks`;
    
    // Stock & Price Logic
    const stockEl = document.getElementById('pd-stock');
    stockEl.innerText = product.stock || 'In Stock';
    stockEl.className = product.stock === 'Sold Out' ? 'text-danger fw-bold' : 'text-success fw-bold';
    
    if(product.discount_price) {
        document.getElementById('pd-price').innerText = `₹${product.discount_price}`;
        document.getElementById('pd-old-price').innerText = `₹${product.price}`;
    } else {
        document.getElementById('pd-price').innerText = `₹${product.price}`;
        document.getElementById('pd-old-price').innerText = "";
    }
    
    // WhatsApp
    const pageUrl = window.location.href; 
    const msg = `Hello Dashami Silks, I want to buy:\n*${product.name}*\nID: ${product.id}\nLink: ${pageUrl}`;
    const rawLink = `whatsapp://send?phone=${MY_NUMBER}&text=${encodeURIComponent(msg)}`;
    document.getElementById('pd-whatsapp-btn').href = `social_redirect.html?target=${encodeURIComponent(rawLink)}&platform=WhatsApp`;
    
    // Gallery
    const mainImg = product.image || product.image_hd || 'logo/logo.png';
    const gallery = product.gallery || [];
    currentGallery = [mainImg, ...gallery];
    currentIndex = 0;
    const thumbContainer = document.getElementById('pd-thumbnails');
    let thumbHTML = '';
    currentGallery.forEach((img, idx) => { thumbHTML += `<img src="${img}" class="thumb-img" onclick="jumpToSlide(${idx})">`; });
    thumbContainer.innerHTML = thumbHTML;
    updateMainStage();
}
function changeSlide(direction) {
    if(currentGallery.length <= 1) return;
    currentIndex += direction;
    if (currentIndex >= currentGallery.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = currentGallery.length - 1;
    updateMainStage();
}
function jumpToSlide(index) { currentIndex = index; updateMainStage(); }
function updateMainStage() {
    const img = document.getElementById('pd-main-img');
    const fullImg = document.getElementById('fullscreen-img'); 
    const thumbs = document.querySelectorAll('.thumb-img');
    const counter = document.getElementById('image-counter');
    thumbs.forEach((t, i) => {
        if(i === currentIndex) { t.classList.add('active'); t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } 
        else t.classList.remove('active');
    });
    if (counter) counter.textContent = `${currentIndex + 1} / ${currentGallery.length}`;
    img.style.opacity = 0.5;
    setTimeout(() => { img.src = currentGallery[currentIndex]; img.style.opacity = 1; }, 150);
    
    // Sync zoom view
    if(fullImg) fullImg.src = currentGallery[currentIndex];
}

// Zoom Logic
function openFullscreen() {
    const viewer = document.getElementById('full-image-viewer');
    const fullImg = document.getElementById('fullscreen-img');
    fullImg.src = currentGallery[currentIndex];
    viewer.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeFullscreen() {
    document.getElementById('full-image-viewer').style.display = 'none';
    document.body.style.overflow = 'auto';
}
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") closeFullscreen();
});

document.addEventListener('click', function(event) {
    const filterPanel = document.getElementById('filterPanel');
    const filterBtn = document.getElementById('filterToggleBtn');
    if (filterPanel && filterPanel.classList.contains('show') && !filterPanel.contains(event.target) && !filterBtn.contains(event.target)) {
        new bootstrap.Collapse(filterPanel).hide();
    }
});

init();