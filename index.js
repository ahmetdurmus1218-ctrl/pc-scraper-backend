// backend/index.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// CORS ve JSON ayarları
app.use(cors());
app.use(express.json());

// ====== USER AGENT ROTASYONU (Bot Engeli İçin) ======
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36'
];
function getRandomUserAgent() { return userAgents[Math.floor(Math.random() * userAgents.length)]; }

// ====== SAHİBİNDEN CANLI SCRAPER ======
async function scrapeSahibinden(query) {
    console.log(`[SCRAPER] Sahibinden aranıyor: "${query}"`);
    try {
        const searchUrl = `https://www.sahibinden.com/arama?query=${encodeURIComponent(query)}&sorting=price_asc`;
        const response = await axios.get(searchUrl, {
            headers: { 'User-Agent': getRandomUserAgent() },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const products = [];

        // GÜNCEL SAHİBİNDEN HTML YAPISINA GÖRE SELECTOR'LAR
        $('tbody > tr:not(.nativeAd)').each((index, element) => {
            if (products.length >= 15) return false; // İlk 15 ürün

            const titleElement = $(element).find('.classifiedTitle');
            const title = titleElement.text().trim();
            const relativeLink = titleElement.attr('href');
            const priceText = $(element).find('.searchResultsPriceValue').text().trim();
            const location = $(element).find('.searchResultsLocationValue').text().trim();
            const date = $(element).find('.searchResultsDateValue').text().trim();

            const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;

            if (title && price > 0 && relativeLink) {
                products.push({
                    title: title.length > 80 ? title.substring(0, 77) + '...' : title,
                    price: price,
                    formattedPrice: `${price.toLocaleString('tr-TR')} TL`,
                    link: relativeLink.startsWith('http') ? relativeLink : `https://www.sahibinden.com${relativeLink}`,
                    location: location || 'Belirtilmemiş',
                    date: date || '-',
                    source: 'sahibinden'
                });
            }
        });

        console.log(`[SCRAPER] Sahibinden'de ${products.length} ürün bulundu.`);
        return products.sort((a, b) => a.price - b.price); // En düşük fiyat başta

    } catch (error) {
        console.error('[SCRAPER] Sahibinden hatası:', error.message);
        return []; // Hata durumunda boş dizi dön
    }
}

// ====== DOLAP CANLI SCRAPER ======
async function scrapeDolap(query) {
    console.log(`[SCRAPER] Dolap aranıyor: "${query}"`);
    try {
        const searchUrl = `https://www.dolap.com/ara?q=${encodeURIComponent(query)}`;
        const response = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': getRandomUserAgent(),
                'Accept-Language': 'tr-TR,tr;q=0.9'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const products = [];

        // GÜNCEL DOLAP HTML YAPISINA GÖRE SELECTOR'LAR
        $('article[data-testid="product-card"], .product-card').each((index, element) => {
            if (products.length >= 10) return false;

            const title = $(element).find('h3, .product-name').first().text().trim();
            const priceText = $(element).find('.price, [data-testid="price"]').first().text().trim();
            const linkElement = $(element).find('a').first();
            const relativeLink = linkElement.attr('href');
            const image = $(element).find('img').first().attr('src');

            const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;

            if (title && price > 0 && relativeLink) {
                products.push({
                    title: title.length > 70 ? title.substring(0, 67) + '...' : title,
                    price: price,
                    formattedPrice: `${price.toLocaleString('tr-TR')} TL`,
                    link: relativeLink.startsWith('http') ? relativeLink : `https://www.dolap.com${relativeLink}`,
                    image: image || '',
                    source: 'dolap'
                });
            }
        });

        console.log(`[SCRAPER] Dolap'ta ${products.length} ürün bulundu.`);
        return products.sort((a, b) => a.price - b.price);

    } catch (error) {
        console.error('[SCRAPER] Dolap hatası:', error.message);
        return [];
    }
}

// ====== LETGO CANLI SCRAPER (TEK/EN UYGUN ÜRÜN) ======
async function scrapeLetgo(query) {
    console.log(`[SCRAPER] Letgo aranıyor (tek ürün): "${query}"`);
    try {
        const searchUrl = `https://www.letgo.com/tr-tr/arama?q=${encodeURIComponent(query)}`;
        const response = await axios.get(searchUrl, {
            headers: { 'User-Agent': getRandomUserAgent() },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        let bestProduct = null;
        let lowestPrice = Infinity;

        // Tüm ilanlarda dolaş, fiyatı en düşük olanı bul
        $('[data-testid="listing"], .listing, article').each((index, element) => {
            const title = $(element).find('h3, .title').first().text().trim();
            const priceText = $(element).find('.price, [aria-label*="TL"]').first().text().trim();
            const linkElement = $(element).find('a').first();
            const relativeLink = linkElement.attr('href');

            const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;

            // Geçerli bir ürünse ve şu ana kadarki en düşük fiyatlı ürünse kaydet
            if (title && price > 0 && relativeLink && price < lowestPrice) {
                lowestPrice = price;
                bestProduct = {
                    title: title.length > 60 ? title.substring(0, 57) + '...' : title,
                    price: price,
                    formattedPrice: `${price.toLocaleString('tr-TR')} TL`,
                    link: relativeLink.startsWith('http') ? relativeLink : `https://www.letgo.com${relativeLink}`,
                    source: 'letgo',
                    note: 'En düşük fiyatlı tek ilan (doğrudan link)'
                };
            }
        });

        if (bestProduct) {
            console.log(`[SCRAPER] Letgo'da en uygun ürün bulundu: ${bestProduct.title}`);
        } else {
            console.log(`[SCRAPER] Letgo'da uygun ürün bulunamadı.`);
        }
        return bestProduct; // Tek bir nesne veya null döner

    } catch (error) {
        console.error('[SCRAPER] Letgo hatası:', error.message);
        return null;
    }
}

// ====== ANA ARAMA API ROTASI ======
app.get('/api/search/:query', async (req, res) => {
    const query = req.params.query;
    console.log(`[API] Canlı arama isteği: "${query}"`);

    // Çok uzun sorguyu kes
    const searchQuery = query.length > 100 ? query.substring(0, 100) : query;

    try {
        // 3 SİTEDEN AYNI ANDA (PARALEL) VERİ ÇEK
        const [sahibindenResults, dolapResults, letgoResult] = await Promise.allSettled([
            scrapeSahibinden(searchQuery),
            scrapeDolap(searchQuery),
            scrapeLetgo(searchQuery)
        ]);

        // Sonuçları birleştir
        const responseData = {
            success: true,
            query: searchQuery,
            timestamp: new Date().toISOString(),
            sahibinden: sahibindenResults.status === 'fulfilled' ? sahibindenResults.value : [],
            dolap: dolapResults.status === 'fulfilled' ? dolapResults.value : [],
            letgo: letgoResult.status === 'fulfilled' ? letgoResult.value : null
        };

        console.log(`[API] Arama tamamlandı. Sah:${responseData.sahibinden.length}, Dolap:${responseData.dolap.length}, Letgo:${responseData.letgo ? '1' : '0'}`);
        res.json(responseData);

    } catch (error) {
        console.error('[API] Beklenmeyen hata:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Scraping işlemi sırasında beklenmeyen bir hata oluştu.',
            query: searchQuery
        });
    }
});

// ====== SAĞLIK KONTROLÜ ROTASI ======
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '🟢 ÇALIŞIYOR', 
        service: 'PC Fiyat Scraper Backend',
        timestamp: new Date().toISOString(),
        endpoints: ['GET /api/health', 'GET /api/search/:query']
    });
});

// ====== KÖK DİZİN (Ana Sayfa) ======
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>🚀 PC Fiyat Scraper Backend</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family: sans-serif; padding: 2rem; background: #f5f5f5;} .container{max-width: 800px; margin: auto; background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);} code{background: #eee; padding: 2px 5px; border-radius: 3px;}</style></head>
        <body><div class="container">
            <h1>🚀 PC Fiyat Scraper Backend</h1>
            <p><strong>Durum:</strong> <span style="color:green;">Çalışıyor</span></p>
            <p>Bu backend, <code>mobil-pc-assistan</code> frontend uygulaması için canlı veri sağlar.</p>
            <hr>
            <h3>🔧 Kullanılabilir Endpoint'ler:</h3>
            <ul>
                <li><strong>GET</strong> <code><a href="/api/health">/api/health</a></code> - Sistem durumu</li>
                <li><strong>GET</strong> <code>/api/search/<strong>:query</strong></code> - Ürün arama (örn: <a href="/api/search/ddr4%208gb">/api/search/ddr4 8gb</a>)</li>
            </ul>
            <hr>
            <p><small>GitHub Pages Frontend: <a href="https://ahmetdurmus1218-ctrl.github.io/mobil-pc-assistan/" target="_blank">Mobil PC Fiyat Asistanı</a></small></p>
        </div></body>
        </html>
    `);
});

// ====== SUNUCUYU BAŞLAT ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Backend sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
    console.log(`✅ Sağlık kontrolü: http://localhost:${PORT}/api/health`);
});
