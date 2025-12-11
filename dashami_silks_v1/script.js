const MY_NUMBER = "918904528959"; 
let allProducts = []; 
let activeCategory = 'all'; 

// Set Year
const yearSpan = document.getElementById('year');
if(yearSpan) yearSpan.textContent = new Date().getFullYear();

// --- MAIN LOADER ---
async function loadShop() {
    const resultLabel = document.getElementById('resultCount');
    const grid = document.getElementById('product-grid');

    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        try { allProducts = await response.json(); } 
        catch (e) { throw new Error("Invalid JSON format."); }
        
        generateDynamicFilters(allProducts);
        setupPriceSlider(allProducts);
        renderProducts(allProducts);

    } catch (error) {
        console.error("Critical Error:", error);
        if(resultLabel) resultLabel.textContent = "System Error";
        if(grid) {
            grid.innerHTML = `<div class="alert alert-danger text-center w-100 p-5"><h4>⚠️ Could not load shop</h4><p>${error.message}</p></div>`;
        }
    }
}

// --- SETUP FUNCTIONS ---
function generateDynamicFilters(products) {
    const container = document.getElementById('dynamic-category-filters');
    if(!container) return;
    const categories = new Set();
    products.forEach(p => { if(p.visible && !p.deleted && p.category) categories.add(p.category); });
    let html = `<button class="btn btn-sm btn-outline-danger rounded-pill active filter-btn px-3" onclick="selectCategory('all', this)">All</button>`;
    categories.forEach(cat => { html += `<button class="btn btn-sm btn-outline-danger rounded-pill filter-btn px-3" onclick="selectCategory('${cat}', this)">${cat}</button>`; });
    container.innerHTML = html;
}

function setupPriceSlider(products) {
    const slider = document.getElementById('priceRange');
    const display = document.getElementById('priceValue');
    if(!slider || !display) return;
    let maxPrice = 0;
    products.forEach(p => { let price = parseInt(p.discount_price || p.price || 0); if(price > maxPrice) maxPrice = price; });
    if(maxPrice === 0) maxPrice = 10000;
    slider.max = maxPrice + 500; slider.value = maxPrice + 500; display.textContent = slider.value;
}
function updatePriceLabel(val) { const display = document.getElementById('priceValue'); if(display) display.textContent = val; }

// --- FILTERING ---
function selectCategory(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = cat;
    applyAllFilters();
}

function applyAllFilters() {
    const searchInput = document.getElementById('searchBar');
    const priceInput = document.getElementById('priceRange');
    if(!searchInput || !priceInput) return;

    const query = searchInput.value.toLowerCase();
    const maxPrice = parseInt(priceInput.value);
    let minRating = 0;
    if(document.getElementById('rate4').checked) minRating = 4;
    if(document.getElementById('rate5').checked) minRating = 5;

    const filtered = allProducts.filter(p => {
        if (!p.visible || p.deleted) return false;
        const matchesCategory = (activeCategory === 'all') || (p.category === activeCategory) || (p.fabric && p.fabric.includes(activeCategory));
        const searchStr = ((p.name||'') + (p.category||'') + (p.fabric||'') + (p.color||'')).toLowerCase();
        const matchesSearch = searchStr.includes(query);
        const matchesPrice = parseInt(p.discount_price || p.price || 0) <= maxPrice;
        const matchesRating = (p.stars || 0) >= minRating;
        return matchesCategory && matchesSearch && matchesPrice && matchesRating;
    });

    const countLabel = document.getElementById('resultCount');
    if(countLabel) countLabel.textContent = `Showing ${filtered.length} products`;
    renderProducts(filtered);
}

// --- RENDER ---
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
        
        const mainImg = p.image || p.image_hd || 'placeholder.jpg';
        const gallery = p.gallery || [];
        const allImages = [mainImg, ...gallery];
        const safeImages = JSON.stringify(allImages).replace(/"/g, "&quot;");

        let priceHtml = `<span class="final-price">₹${p.price}</span>`;
        if(p.discount_price) priceHtml = `<span class="original-price">₹${p.price}</span> <span class="final-price">₹${p.discount_price}</span>`;
        const stockClass = p.stock === 'Sold Out' ? 'stock-out' : 'stock-badge';
        const reviewHtml = p.reviews && p.reviews.length > 0 ? `<div class="reviews">"${p.reviews[0]}"</div>` : '';
        const msg = `Hello Dashami Silks, I am interested in:\n*${p.name}*\nID: ${p.id}`;
        const link = `https://wa.me/${MY_NUMBER}?text=${encodeURIComponent(msg)}`;

        card.innerHTML = `
            <div class="img-box skeleton" onclick="openLightbox(${safeImages})">
                <img class="product-img" onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton')" onerror="this.style.border='5px solid red'" src="${mainImg}" alt="${p.name}">
                ${gallery.length > 0 ? '<span style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.6); color:white; padding:2px 6px; font-size:12px; border-radius:4px;">+'+gallery.length+' Photos</span>' : ''}
            </div>
            <div class="info">
                <span class="cat">${p.category || 'Saree'} | ${p.fabric || 'Silk'}</span>
                <h3 class="title">${p.name}</h3>
                <div class="meta">Color: ${p.color || 'Multi'} | <span class="${stockClass}">${p.stock || 'In Stock'}</span></div>
                <div class="price-area">${priceHtml}</div>
                <div style="color:gold; margin-bottom:8px;">${"★".repeat(p.stars || 4)}</div>
                ${reviewHtml}
                <a href="${link}" class="btn-wa">Buy on WhatsApp</a>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- LIGHTBOX (WITH NAVIGATION BUTTONS) ---
let currentGallery = [];
let currentIndex = 0;

function openLightbox(imagesArray) {
    if(!imagesArray || imagesArray.length === 0) return;
    currentGallery = imagesArray;
    currentIndex = 0; 
    updateLightboxImage();
    const box = document.getElementById('lightbox');
    if(box) box.style.display = 'flex';
}

function closeLightbox() {
    const box = document.getElementById('lightbox');
    if(box) box.style.display = 'none';
}

function changeSlide(direction) {
    if(currentGallery.length <= 1) return;
    currentIndex += direction;
    if (currentIndex >= currentGallery.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = currentGallery.length - 1;
    updateLightboxImage();
}

function updateLightboxImage() {
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('image-counter');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    img.style.opacity = 0.5;
    setTimeout(() => {
        img.src = currentGallery[currentIndex];
        img.style.opacity = 1;
    }, 150);

    // Show or Hide Buttons based on gallery length
    if(currentGallery.length > 1) {
        if(counter) counter.textContent = `Image ${currentIndex + 1} of ${currentGallery.length}`;
        if(prevBtn) prevBtn.style.display = 'block';
        if(nextBtn) nextBtn.style.display = 'block';
    } else {
        if(counter) counter.textContent = "";
        if(prevBtn) prevBtn.style.display = 'none';
        if(nextBtn) nextBtn.style.display = 'none';
    }
}

loadShop();