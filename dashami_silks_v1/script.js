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
        applyAllFilters(); // Initial load

    } catch (error) {
        console.error("Critical Error:", error);
        if(resultLabel) resultLabel.textContent = "System Error";
        if(grid) grid.innerHTML = `<div class="alert alert-danger text-center w-100 p-5"><h4>⚠️ Could not load shop</h4><p>${error.message}</p></div>`;
    }
}

// --- SETUP & UI FUNCTIONS ---
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
        const gallery = p.gallery || [];
        const allImages = [mainImg, ...gallery];
        const safeImages = JSON.stringify(allImages).replace(/"/g, "&quot;");
        html += `
            <div class="carousel-item ${activeClass} h-100" onclick="openLightbox(${safeImages})">
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

// --- DUAL SLIDER LOGIC ---
function setupDualSlider(products) {
    let maxPrice = 0;
    products.forEach(p => { let price = parseInt(p.discount_price || p.price || 0); if(price > maxPrice) maxPrice = price; });
    if(maxPrice === 0) maxPrice = 10000;
    
    // Set attributes for both inputs
    const rangeMin = document.getElementById('priceRangeMin');
    const rangeMax = document.getElementById('priceRangeMax');
    rangeMin.max = maxPrice + 500; 
    rangeMax.max = maxPrice + 500;
    rangeMax.value = maxPrice + 500; // Start at max
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

    // Prevent crossing
    if (minVal > maxVal - 500) {
        // If user drags min past max, push max
        rangeMin.value = maxVal - 500;
        minVal = maxVal - 500;
    }

    displayMin.textContent = minVal;
    displayMax.textContent = maxVal;

    // Visual Track Coloring (Color the space BETWEEN the thumbs)
    const percentMin = (minVal / rangeMin.max) * 100;
    const percentMax = (maxVal / rangeMax.max) * 100;
    track.style.background = `linear-gradient(to right, #ddd ${percentMin}%, var(--primary) ${percentMin}%, var(--primary) ${percentMax}%, #ddd ${percentMax}%)`;

    applyAllFilters();
}

// --- FILTERING LOGIC ---
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
    
    // Get Active Rating
    const ratingEl = document.querySelector('input[name="ratingBtn"]:checked');
    const minRating = ratingEl ? parseInt(ratingEl.value) : 0;

    // MAIN FILTER LOOP
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

    // Update UI Results
    const countLabel = document.getElementById('resultCount');
    if(countLabel) countLabel.textContent = `Showing ${filtered.length} products`;
    renderProducts(filtered);

    // SMART FEATURE: Disable invalid filters
    checkFilterAvailability(query, minPrice, maxPrice, activeCategory, minRating);
}

// --- CHECK AVAILABILITY (GREY OUT BUTTONS) ---
function checkFilterAvailability(currentQuery, minP, maxP, currentCat, currentRating) {
    // 1. Check Categories: "If I switched to Category X, would there be products?"
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const cat = btn.getAttribute('data-cat');
        // Count products that match: Search + Price + Rating + THIS Category
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

        if (count === 0) btn.classList.add('disabled');
        else btn.classList.remove('disabled');
    });

    // 2. Check Ratings: "If I switched to Rating X, would there be products?"
    document.querySelectorAll('.rating-opt').forEach(radio => {
        const ratingVal = parseInt(radio.value);
        // Count products that match: Search + Price + Category + THIS Rating
        const count = allProducts.filter(p => {
            if(!p.visible || p.deleted) return false;
            const searchStr = ((p.name||'') + (p.category||'') + (p.fabric||'') + (p.color||'')).toLowerCase();
            const price = parseInt(p.discount_price || p.price || 0);

            const matchS = searchStr.includes(currentQuery);
            const matchP = price >= minP && price <= maxP;
            const matchC = (currentCat === 'all') || (p.category === currentCat) || (p.fabric && p.fabric.includes(currentCat));
            const matchR = (p.stars || 0) >= ratingVal;

            return matchS && matchP && matchC && matchR;
        }).length;

        const label = document.querySelector(`label[for="${radio.id}"]`);
        if (count === 0) {
            radio.disabled = true;
            if(label) label.classList.add('disabled');
        } else {
            radio.disabled = false;
            if(label) label.classList.remove('disabled');
        }
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
        const mainImg = p.image || p.image_hd || 'placeholder.jpg';
        const gallery = p.gallery || [];
        const allImages = [mainImg, ...gallery];
        const safeImages = JSON.stringify(allImages).replace(/"/g, "&quot;");
        let priceHtml = `<span class="final-price">₹${p.price}</span>`;
        if(p.discount_price) priceHtml = `<span class="original-price">₹${p.price}</span> <span class="final-price">₹${p.discount_price}</span>`;
        const stockClass = p.stock === 'Sold Out' ? 'stock-out' : 'stock-badge';
        const reviewHtml = p.reviews && p.reviews.length > 0 ? `<div class="reviews">"${p.reviews[0]}"</div>` : '';
        const msg = `Hello Dashami Silks, I am interested in:\n*${p.name}*\nID: ${p.id}`;
        const rawWaLink = `whatsapp://send?phone=${MY_NUMBER}&text=${encodeURIComponent(msg)}`;
        const link = `redirect.html?target=${encodeURIComponent(rawWaLink)}`;

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
                <a href="${link}" target="_blank" class="btn-wa">Buy on WhatsApp</a>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- LIGHTBOX ---
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
function closeLightbox() { document.getElementById('lightbox').style.display = 'none'; }
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
    setTimeout(() => { img.src = currentGallery[currentIndex]; img.style.opacity = 1; }, 150);
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

// --- CLICK OUTSIDE TO CLOSE FILTERS ---
document.addEventListener('click', function(event) {
    const filterPanel = document.getElementById('filterPanel');
    const filterBtn = document.getElementById('filterToggleBtn');
    
    // If panel is open (has class 'show') AND click is NOT inside panel AND NOT on the button
    if (filterPanel.classList.contains('show') && 
        !filterPanel.contains(event.target) && 
        !filterBtn.contains(event.target)) {
            // Use Bootstrap API to hide it
            new bootstrap.Collapse(filterPanel).hide();
    }
});

loadShop();