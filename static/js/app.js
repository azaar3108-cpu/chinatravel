document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    initializeAnimations();
});

function initializeApp() {
    const buttons = document.querySelectorAll('button[type="submit"]');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.form && this.form.checkValidity()) {
                showLoading(this);
            }
        });
    });
}

function setupEventListeners() {
    const itineraryForm = document.getElementById('itineraryForm');
    if (itineraryForm) {
        itineraryForm.addEventListener('submit', handleItinerarySubmit);
    }
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', handleSmoothScroll);
    });
    setupModalListeners();
    const loadEventsBtn = document.getElementById('loadEventsBtn');
    if (loadEventsBtn) {
        loadEventsBtn.addEventListener('click', loadCultureEvents);
    }
    const chatSend = document.getElementById('chatSend');
    if (chatSend) {
        chatSend.addEventListener('click', sendCultureChat);
    }
    loadArFilters();
    const loadFoodBtn = document.getElementById('loadFoodBtn');
    if (loadFoodBtn) loadFoodBtn.addEventListener('click', loadFoodDelivery);
    const calcCo2 = document.getElementById('calcCo2');
    if (calcCo2) calcCo2.addEventListener('click', calculateCo2Client);
    const loadEcoHotelsBtn = document.getElementById('loadEcoHotels');
    if (loadEcoHotelsBtn) loadEcoHotelsBtn.addEventListener('click', () => loadEcoHotelsClient());
}

function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);
    const animatedElements = document.querySelectorAll('.feature-card, .booking-card, .support-card');
    animatedElements.forEach(el => observer.observe(el));
}

function handleItinerarySubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        city: document.getElementById('city').value,
        days: parseInt(document.getElementById('days').value),
        interests: Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value),
        budget: parseInt(document.getElementById('budget').value),
        mode: (document.querySelector('input[name="mode"]:checked') || {}).value || 'popular'
    };
    loadTravelContext(data.city, data.days);
    generateItinerary(data);
}

async function generateItinerary(data) {
    try {
        showLoading(document.querySelector('#itineraryForm button[type="submit"]'));
        const itinerary = StubAPI.generateItinerary(data);
        displayItinerary(itinerary);
    } catch (error) {
        showError('Ошибка при создании маршрута. Попробуйте еще раз.');
    } finally {
        hideLoading(document.querySelector('#itineraryForm button[type="submit"]'));
    }
}

function displayItinerary(itinerary) {
    const resultDiv = document.getElementById('itineraryResult');
    const placeholderDiv = document.getElementById('itineraryPlaceholder');
    const contentDiv = document.getElementById('itineraryContent');
    placeholderDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    let html = `
        <div class="itinerary-header mb-4">
            <h4>${itinerary.city} - ${itinerary.days} дней</h4>
            <p class="text-muted">Бюджет: ${formatCurrency(itinerary.total_budget)}</p>
        </div>
    `;
    itinerary.daily_plans.forEach(dayPlan => {
        html += `
            <div class="day-plan">
                <h5>День ${dayPlan.day}</h5>
                ${dayPlan.activities.map(activity => `
                    <div class="activity">
                        <div class="activity-time">${activity.time}</div>
                        <div class="activity-details">
                            <div class="fw-semibold">${activity.activity}</div>
                            <div class="text-muted small">${activity.location}</div>
                        </div>
                        <div class="activity-cost">${formatCurrency(activity.cost)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    });
    contentDiv.innerHTML = html;
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

async function loadTravelContext(city, days){
    const ctx = StubAPI.getTravelContext(city, days);
    const box = document.getElementById('travelContextBox');
    if(!box) return;
    box.style.display = 'block';
    box.innerHTML = `
        <div><strong>Безвиз:</strong> до ${ctx.visa_free.max_days} дней</div>
        <div><strong>Погода:</strong> ${ctx.weather.summary}, днём ${ctx.weather.temp_c.day}°C</div>
        <div><strong>Фестивали:</strong> ${ctx.festivals.map(f=>f.name).join(', ')}</div>
        <div><strong>Бюджет (ср.):</strong> Перелёт ~ ${formatCurrency(ctx.budget_baseline.flight_rub)}, Отель/ночь ~ ${formatCurrency(ctx.budget_baseline.hotel_per_night_rub)}</div>
    `;
}

function showBookingModal(type) {
    const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
    const modalTitle = document.getElementById('bookingModalTitle');
    const modalBody = document.getElementById('bookingModalBody');
    let title, content;
    switch(type) {
        case 'flights':
            title = 'Поиск авиабилетов';
            content = generateFlightSearchForm();
            break;
        case 'trains':
            title = 'Бронирование поездов';
            content = generateTrainSearchForm();
            break;
        case 'hotels':
            title = 'Поиск отелей';
            content = generateHotelSearchForm();
            break;
        case 'transfers':
            title = 'Заказ трансфера';
            content = generateTransferForm();
            break;
        default:
            title = 'Бронирование';
            content = '<p>Функция в разработке</p>';
    }
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.show();
}

function generateFlightSearchForm() {
    return `
        <form id="flightSearchForm">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Откуда</label>
                    <select class="form-select" required>
                        <option value="">Выберите город</option>
                        <option value="MOW">Москва</option>
                        <option value="LED">Санкт-Петербург</option>
                        <option value="KRR">Краснодар</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Куда</label>
                    <select class="form-select" required>
                        <option value="">Выберите город</option>
                        <option value="PEK">Пекин</option>
                        <option value="SHA">Шанхай</option>
                        <option value="CAN">Гуанчжоу</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Дата вылета</label>
                    <input type="date" class="form-control" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Количество пассажиров</label>
                    <select class="form-select" required>
                        <option value="1">1 пассажир</option>
                        <option value="2">2 пассажира</option>
                        <option value="3">3 пассажира</option>
                        <option value="4">4 пассажира</option>
                    </select>
                </div>
                <div class="col-12">
                    <button type="submit" class="btn btn-primary w-100">
                        <i class="fas fa-search me-2"></i>Найти рейсы
                    </button>
                </div>
            </div>
        </form>
    `;
}

function generateTrainSearchForm() {
    return `
        <form id="trainSearchForm">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Откуда</label>
                    <select class="form-select" required>
                        <option value="">Выберите станцию</option>
                        <option value="MOW">Москва</option>
                        <option value="LED">Санкт-Петербург</option>
                        <option value="PEK">Пекин</option>
                        <option value="SHA">Шанхай</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Куда</label>
                    <select class="form-select" required>
                        <option value="">Выберите станцию</option>
                        <option value="PEK">Пекин</option>
                        <option value="SHA">Шанхай</option>
                        <option value="CAN">Гуанчжоу</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Дата поездки</label>
                    <input type="date" class="form-control" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Класс</label>
                    <select class="form-select" required>
                        <option value="economy">Эконом</option>
                        <option value="business">Бизнес</option>
                        <option value="first">Первый</option>
                    </select>
                </div>
                <div class="col-12">
                    <button type="submit" class="btn btn-primary w-100">
                        <i class="fas fa-train me-2"></i>Найти поезда
                    </button>
                </div>
            </div>
        </form>
    `;
}

function generateHotelSearchForm() {
    return `
        <form id="hotelSearchForm">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Город</label>
                    <select class="form-select" required>
                        <option value="">Выберите город</option>
                        <option value="PEK">Пекин</option>
                        <option value="SHA">Шанхай</option>
                        <option value="CAN">Гуанчжоу</option>
                        <option value="SZX">Шэньчжэнь</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Дата заезда</label>
                    <input type="date" class="form-control" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Дата выезда</label>
                    <input type="date" class="form-control" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Количество гостей</label>
                    <select class="form-select" required>
                        <option value="1">1 гость</option>
                        <option value="2">2 гостя</option>
                        <option value="3">3 гостя</option>
                        <option value="4">4 гостя</option>
                    </select>
                </div>
                <div class="col-12">
                    <button type="submit" class="btn btn-primary w-100">
                        <i class="fas fa-bed me-2"></i>Найти отели
                    </button>
                </div>
            </div>
        </form>
    `;
}

function generateTransferForm() {
    return `
        <form id="transferForm">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Откуда</label>
                    <input type="text" class="form-control" placeholder="Адрес или место" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Куда</label>
                    <input type="text" class="form-control" placeholder="Адрес или место" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Дата и время</label>
                    <input type="datetime-local" class="form-control" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Тип автомобиля</label>
                    <select class="form-select" required>
                        <option value="economy">Эконом</option>
                        <option value="comfort">Комфорт</option>
                        <option value="business">Бизнес</option>
                        <option value="minivan">Минивэн</option>
                    </select>
                </div>
                <div class="col-12">
                    <button type="submit" class="btn btn-primary w-100">
                        <i class="fas fa-car me-2"></i>Заказать трансфер
                    </button>
                </div>
            </div>
        </form>
    `;
}

function showTranslator() {
    const modal = new bootstrap.Modal(document.getElementById('translatorModal'));
    modal.show();
}

async function translateText() {
    const text = document.getElementById('translateText').value.trim();
    if (!text) {
        showError('Введите текст для перевода');
        return;
    }
    const result = StubAPI.translate(text, 'ru');
    displayTranslation(result);
}

function displayTranslation(result) {
    const resultDiv = document.getElementById('translationResult');
    const translatedDiv = document.getElementById('translatedText');
    translatedDiv.textContent = result.translated;
    resultDiv.style.display = 'block';
}

function showTaxRefund() {
    const modal = new bootstrap.Modal(document.getElementById('taxRefundModal'));
    modal.show();
}

async function calculateTaxRefund() {
    const amount = parseFloat(document.getElementById('purchaseAmount').value);
    if (!amount || amount <= 0) {
        showError('Введите корректную сумму покупки');
        return;
    }
    const result = StubAPI.taxRefund(amount);
    displayTaxRefund(result);
}

function displayTaxRefund(result) {
    const resultDiv = document.getElementById('taxRefundResult');
    const contentDiv = document.getElementById('taxRefundContent');
    let html = `
        <div class="row">
            <div class="col-6">
                <strong>Сумма покупки:</strong><br>
                ${formatCurrency(result.purchase_amount)} юаней
            </div>
            <div class="col-6">
                <strong>Ставка НДС:</strong><br>
                ${result.tax_rate}
            </div>
        </div>
        <hr>
        <div class="text-center">
            <h4 class="text-success">Возврат: ${formatCurrency(result.refund_amount)} юаней</h4>
            <p class="text-muted">${result.requirements}</p>
        </div>
    `;
    if (result.eligible) {
        html += '<div class="alert alert-success mt-3">Вы имеете право на возврат НДС!</div>';
    } else {
        html += '<div class="alert alert-warning mt-3">Минимальная сумма покупки для возврата НДС: 500 юаней</div>';
    }
    contentDiv.innerHTML = html;
    resultDiv.style.display = 'block';
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

function handleSmoothScroll(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href').substring(1);
    scrollToSection(targetId);
}

function showLoading(button) {
    if (button) {
        button.classList.add('loading');
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="spinner"></span> Загрузка...';
        button.dataset.originalText = originalText;
    }
}

function hideLoading(button) {
    if (button) {
        button.classList.remove('loading');
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
    }
}

function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-danger border-0 position-fixed top-0 end-0 m-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-exclamation-circle me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toast);
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function setupModalListeners() {
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'flightSearchForm') {
            e.preventDefault();
            handleFlightSearch(e.target);
        } else if (e.target.id === 'trainSearchForm') {
            e.preventDefault();
            handleTrainSearch(e.target);
        } else if (e.target.id === 'hotelSearchForm') {
            e.preventDefault();
            handleHotelSearch(e.target);
        } else if (e.target.id === 'transferForm') {
            e.preventDefault();
            handleTransferOrder(e.target);
        }
    });
}

async function handleFlightSearch(form) {
    showLoading(form.querySelector('button[type="submit"]'));
    setTimeout(() => {
        hideLoading(form.querySelector('button[type="submit"]'));
        showError('Поиск рейсов временно недоступен. Функция в разработке.');
    }, 2000);
}

async function handleTrainSearch(form) {
    showLoading(form.querySelector('button[type="submit"]'));
    setTimeout(() => {
        hideLoading(form.querySelector('button[type="submit"]'));
        showError('Поиск поездов временно недоступен. Функция в разработке.');
    }, 2000);
}

async function handleHotelSearch(form) {
    showLoading(form.querySelector('button[type="submit"]'));
    setTimeout(() => {
        hideLoading(form.querySelector('button[type="submit"]'));
        showError('Поиск отелей временно недоступен. Функция в разработке.');
    }, 2000);
}

async function handleTransferOrder(form) {
    showLoading(form.querySelector('button[type="submit"]'));
    setTimeout(() => {
        hideLoading(form.querySelector('button[type="submit"]'));
        showError('Заказ трансфера временно недоступен. Функция в разработке.');
    }, 2000);
}

document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('navbar-scrolled');
    } else {
        navbar.classList.remove('navbar-scrolled');
    }
});

const StubAPI = {
    generateItinerary(input){
        const {city='Пекин', days=3, mode='popular', budget=100000} = input || {};
        const baseDay = [
            {time:'09:00', activity:'Завтрак в традиционном ресторане', location:'Центр города', cost:500, type:'еда'},
            {time:'10:30', activity:'Посещение исторического музея', location:'Музейный квартал', cost:800, type:'культура'},
            {time:'14:00', activity:'Обед в местном ресторане', location:'Торговый район', cost:1200, type:'еда'},
            {time:'16:00', activity:'Шопинг в торговом центре', location:'Wangfujing Street', cost:5000, type:'шопинг'}
        ];
        const adjust = (arr, d) => {
            const a = arr.map(x=>({...x}));
            if (mode==='cheapest') {
                a.forEach(x=>{ if (x.cost) x.cost = Math.round(x.cost*0.75); });
                a.push({time:'18:30', activity:'Комбинированные билеты (эконом)', location:'Онлайн', cost:0, type:'логистика'});
            } else if (mode==='popular') {
                a.push({time:'12:00', activity:'Топ-достопримечательность', location:'Центр', cost:1000, type:'культура', rating:4.8});
            } else if (mode==='cultural') {
                a.push({time:'19:00', activity:'Культурное событие/фестиваль', location:'Городская сцена', cost:1500, type:'культура'});
            } else if (mode==='work_min') {
                return [
                    {time:'10:00', activity:'Встречи и дела', location:'Деловой район', cost:0, type:'работа'},
                    {time:'18:00', activity:'Упрощенная логистика', location:'По городу', cost:300, type:'логистика'}
                ];
            }
            return a;
        };
        const daily_plans = Array.from({length: days}, (_,i)=>({day:i+1, activities: adjust(baseDay, i+1)}));
        return {city, days, total_budget: budget, daily_plans};
    },
    getTravelContext(city='Пекин', days=3){
        return {
            city, days,
            visa_free:{available:true, max_days:30, note:'Безвиз до 30 дней'},
            weather:{summary:'Солнечно, возможны осадки', temp_c:{day:24, night:16}},
            festivals:[{name:'Праздник весны (Чуньцзе)', month:2},{name:'Фестиваль фонарей', month:2}],
            budget_baseline:{flight_rub:50000, hotel_per_night_rub:10000, note:'На 15% дешевле, чем в 2024'}
        };
    },
    getCultureEvents(city='Пекин', month=(new Date().getMonth()+1)){
        const y = new Date().getFullYear();
        return {city, month, events:[
            {title:'Чуньцзе — Парад драконов', date:`${y}-${String(month).padStart(2,'0')}-10`, city},
            {title:'Фестиваль фонарей', date:`${y}-${String(month).padStart(2,'0')}-15`, city},
            {title:'Пекинская опера', date:`${y}-${String(month).padStart(2,'0')}-22`, city}
        ]};
    },
    getCultureRecommendations(city='Пекин'){
        return {city, recommendations:[
            {name:'Запретный город', score:9.6, reviews:250000},
            {name:'Храм Неба', score:9.2, reviews:180000},
            {name:'Летний дворец', score:9.4, reviews:200000}
        ]};
    },
    cultureChat(message=''){
        const reply = message ? 'Рекомендую Запретный город утром и парк Бейхай вечером.' : 'Здравствуйте! Чем помочь с культурной программой?';
        return {message, reply};
    },
    getArFilters(){
        return {filters:[
            {id:'forbidden-city-mask', title:'Запретный город — AR гид'},
            {id:'great-wall-portal', title:'Великая стена — портал'}
        ]};
    },
    getFoodDelivery({dietary, ru_menu}={}){
        let restaurants=[
            {name:'老北京炸酱面', rating:4.6, delivery_time:'25-35 мин', min_order:150, cuisine:'Chinese Traditional', dietary:['halal'], ru_menu:true},
            {name:'海底捞火锅', rating:4.8, delivery_time:'30-45 мин', min_order:200, cuisine:'Hot Pot', dietary:['vegan','vegetarian'], ru_menu:false}
        ];
        if (dietary) restaurants = restaurants.filter(r=>r.dietary && r.dietary.includes(dietary));
        if (ru_menu) restaurants = restaurants.filter(r=>r.ru_menu);
        return {restaurants, platforms:['Meituan','Ele.me','Dianping'], sla:'~30 мин', budget_share:0.20, savings_vs_restaurants:'10–15%'};
    },
    calcCO2(legs){
        const factors = {flight:0.15, train:0.035, metro:0.02, car:0.12};
        const total = (legs||[]).reduce((s,l)=> s + (Number(l.distance_km||0) * (factors[l.mode]||0.1)), 0);
        return {total_co2_kg: Math.round(total*100)/100, advice:'Выбирайте поезда и метро для снижения выбросов.'};
    },
    getEcoHotels(city='Пекин'){
        return {city, hotels:[
            {name:'Eco Beijing Hotel', eco_cert:'LEED Gold', price:9000, rating:4.6},
            {name:'Green Dragon Inn', eco_cert:'Green Key', price:7500, rating:4.4}
        ]};
    },
    getWasteTips(city='Пекин'){
        return {city, tips:[
            'Используйте многоразовую бутылку',
            'Сортируйте мусор: пищевые отходы отдельно',
            'Ищите отметку Trip.com Green при бронировании'
        ]};
    },
    translate(text='', target_lang='ru'){
        const dict = { 'hello':'привет', 'thank you':'спасибо', 'how much':'сколько стоит', 'where is':'где находится', 'food':'еда', 'hotel':'отель', 'taxi':'такси' };
        const translated = dict[text.toLowerCase()] || `[Переведено: ${text}]`;
        return { original: text, translated, target_language: target_lang };
    },
    taxRefund(amount){
        const tax_rate = 0.13;
        const refund_amount = amount * tax_rate;
        const eligible = amount >= 500;
        return { purchase_amount: amount, tax_rate: `${tax_rate*100}%`, refund_amount, eligible, requirements: 'Минимальная покупка: 500 юаней' };
    }
};

async function loadCultureEvents(){
    const city = document.getElementById('cultureCity').value;
    const month = parseInt(document.getElementById('cultureMonth').value || new Date().getMonth()+1);
    const list = document.getElementById('eventsList');
    list.textContent = 'Загрузка...';
    const data = StubAPI.getCultureEvents(city, month);
    list.innerHTML = data.events.map(e=>`<div>• ${e.date}: ${e.title}</div>`).join('');
    const recs = StubAPI.getCultureRecommendations(city);
    list.innerHTML += `<hr><div class="fw-semibold">Рекомендации:</div>` + recs.recommendations.map(r=>`<div>${r.name} — рейтинг ${r.score}</div>`).join('');
}

async function sendCultureChat(){
    const input = document.getElementById('chatInput');
    const history = document.getElementById('chatHistory');
    const msg = (input.value||'').trim();
    if(!msg) return;
    history.innerHTML += `<div><strong>Вы:</strong> ${msg}</div>`;
    input.value='';
    const data = StubAPI.cultureChat(msg);
    history.innerHTML += `<div><strong>Чат:</strong> ${data.reply}</div>`;
}

async function loadArFilters(){
    const container = document.getElementById('arFilters');
    if(!container) return;
    const data = StubAPI.getArFilters();
    container.innerHTML = data.filters.map(f=>`<span class="badge bg-secondary">${f.title}</span>`).join(' ');
}

async function loadFoodDelivery(){
    const dietary = document.getElementById('dietary').value;
    const ruMenu = document.getElementById('ruMenu').checked;
    const list = document.getElementById('foodList');
    list.textContent = 'Загрузка...';
    const data = StubAPI.getFoodDelivery({dietary, ru_menu: ruMenu});
    list.innerHTML = `<div class="text-muted">Платформы: ${data.platforms.join(', ')}; SLA: ${data.sla}</div>` +
        data.restaurants.map(r=>`<div class="mt-1">• ${r.name} — ${r.cuisine}, рейтинг ${r.rating}, мин. заказ ${r.min_order}</div>`).join('');
}

async function calculateCo2Client(){
    const flight = parseFloat(document.getElementById('co2Flight').value||0);
    const train = parseFloat(document.getElementById('co2Train').value||0);
    const metro = parseFloat(document.getElementById('co2Metro').value||0);
    const out = document.getElementById('co2Result');
    out.textContent = 'Расчет...';
    const data = StubAPI.calcCO2([
        {mode:'flight', distance_km: flight},
        {mode:'train', distance_km: train},
        {mode:'metro', distance_km: metro}
    ]);
    out.innerHTML = `Итого: <strong>${data.total_co2_kg} кг CO2</strong>. ${data.advice}`;
    const city = document.getElementById('ecoCity').value || 'Пекин';
    await loadEcoHotelsClient(city);
    await loadWasteTips(city);
}

async function loadEcoHotelsClient(city){
    city = city || (document.getElementById('ecoCity')||{}).value || 'Пекин';
    const list = document.getElementById('ecoHotelsList');
    if (!list) return;
    list.textContent = 'Загрузка отелей...';
    const data = StubAPI.getEcoHotels(city);
    list.innerHTML = data.hotels.map(h=>`<div>• ${h.name} — ${h.eco_cert}, ${formatCurrency(h.price)} / ночь, рейтинг ${h.rating}</div>`).join('');
}

async function loadWasteTips(city){
    const tipsEl = document.getElementById('wasteTips');
    if (!tipsEl) return;
    tipsEl.textContent = 'Загрузка советов...';
    const data = StubAPI.getWasteTips(city);
    tipsEl.innerHTML = `<div class="fw-semibold mt-2">Эко-советы для ${data.city}:</div>` + data.tips.map(t=>`<div>• ${t}</div>`).join('');
}
