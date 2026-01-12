const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

// ==================== SAHİBİNDEN ====================
async function scrapeSahibinden(query) {
    try {
        // İSTEDİĞİN GİBİ: https://www.sahibinden.com/bilgisayar?query_text_mf=XXX&query_text=XXX
        const searchUrl = `https://www.sahibinden.com/bilgisayar?query_text_mf=${encodeURIComponent(query)}&query_text=${encodeURIComponent(query)}`;
        console.log('🔍 Sahibinden URL:', searchUrl);
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9',
                'Referer': 'https://www.sahibinden.com/'
            },
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        const products = [];
        
        // SAHİBİNDEN GÜNCEL HTML YAPISI
        $('tr[class*="searchResultsItem"]:not(.searchResultsPromoHighlighted)').each((i, elem) => {
            if (products.length >= 20) return false;
            
            const titleElem = $(elem).find('.classifiedTitle');
            const title = titleElem.text().trim();
            const relativeLink = titleElem.attr('href');
            const priceText = $(elem).find('.searchResultsPriceValue').text().trim();
            const location = $(elem).find('.searchResultsLocationValue').text().trim();
            const date = $(elem).find('.searchResultsDateValue').text().trim();
            
            if (title && priceText && relativeLink) {
                const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
                
                // İSTEDİĞİN LİNK FORMATI: Tam link olacak
                const fullLink = relativeLink.startsWith('http') ? relativeLink : `https://www.sahibinden.com${relativeLink}`;
                
                products.push({
                    title: title.length > 80 ? title.substring(0, 77) + '...' : title,
                    price: price,
                    formattedPrice: price.toLocaleString('tr-TR') + ' TL',
                    link: fullLink, // Tam link
                    location: location || 'Belirtilmemiş',
                    date: date || '-',
                    source: 'sahibinden'
                });
            }
        });
        
        // EN DÜŞÜK FIYATA SIRALA
        products.sort((a, b) => a.price - b.price);
        console.log(`✅ Sahibinden'de ${products.length} ürün bulundu`);
        return products.slice(0, 15);
        
    } catch (error) {
        console.error('❌ Sahibinden hatası:', error.message);
        return [];
    }
}

// ==================== DOLAP ====================
async function scrapeDolap(query) {
    try {
        // İSTEDİĞİN GİBİ: https://dolap.com/ara?q=kelimeler+aralarinda+artı
        const searchQuery = query.replace(/ /g, '+'); // boşlukları + ya çevir
        const searchUrl = `https://dolap.com/ara?q=${searchQuery}`;
        console.log('🔍 Dolap URL:', searchUrl);
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9',
                'Referer': 'https://dolap.com/'
            },
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        const products = [];
        
        // DOLAP GÜNCEL HTML YAPISI
        $('[data-testid="product-card"], .product-card, article').each((i, elem) => {
            if (products.length >= 15) return false;
            
            const title = $(elem).find('h3, .product-name, [class*="title"]').first().text().trim();
            const priceText = $(elem).find('[data-testid="price"], .price, [class*="price"]').first().text().trim();
            const linkElem = $(elem).find('a').first();
            const relativeLink = linkElem.attr('href');
            
            if (title && priceText && relativeLink) {
                const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
                
                // İSTEDİĞİN LİNK FORMATI: https://dolap.com/ara?q=...
                const fullLink = relativeLink.startsWith('http') ? relativeLink : `https://dolap.com${relativeLink}`;
                
                products.push({
                    title: title.length > 70 ? title.substring(0, 67) + '...' : title,
                    price: price,
                    formattedPrice: price.toLocaleString('tr-TR') + ' TL',
                    link: fullLink, // Tam link
                    source: 'dolap'
                });
            }
        });
        
        // EN DÜŞÜK FIYATA SIRALA
        products.sort((a, b) => a.price - b.price);
        console.log(`✅ Dolap'ta ${products.length} ürün bulundu`);
        return products.slice(0, 10);
        
    } catch (error) {
        console.error('❌ Dolap hatası:', error.message);
        return [];
    }
}

// ==================== LETGO ====================
async function scrapeLetgo(query) {
    try {
        // LETGO ARAMA URL'Sİ
        const searchQuery = query.replace(/ /g, '+');
        const searchUrl = `https://www.letgo.com/tr-tr/arama?q=${searchQuery}`;
        console.log('🔍 Letgo URL:', searchUrl);
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Referer': 'https://www.letgo.com/'
            },
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        let bestProduct = null;
        let lowestPrice = Infinity;
        
        // TÜM ÜRÜNLERİ TARA, EN DÜŞÜK FIYATLIYI BUL
        $('[data-testid="listing"], .listing, article').each((i, elem) => {
            const title = $(elem).find('h3, .title, [class*="title"]').first().text().trim();
            const priceText = $(elem).find('.price, [aria-label*="TL"], [class*="price"]').first().text().trim();
            const linkElem = $(elem).find('a').first();
            const relativeLink = linkElem.attr('href');
            
            if (title && priceText && relativeLink) {
                const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
                
                // EN DÜŞÜK FIYATLI ÜRÜNÜ SEÇ
                if (price > 0 && price < lowestPrice) {
                    lowestPrice = price;
                    
                    // İSTEDİĞİN LİNK FORMATI: https://www.letgo.com/item/...
                    const fullLink = relativeLink.startsWith('http') ? relativeLink : `https://www.letgo.com${relativeLink}`;
                    
                    bestProduct = {
                        title: title.length > 60 ? title.substring(0, 57) + '...' : title,
                        price: price,
                        formattedPrice: price.toLocaleString('tr-TR') + ' TL',
                        link: fullLink, // Direkt ürün linki
                        source: 'letgo',
                        note: 'En düşük fiyatlı tek ilan (doğrudan link)'
                    };
                }
            }
        });
        
        if (bestProduct) {
            console.log(`✅ Letgo'da bulundu: ${bestProduct.title} - ${bestProduct.formattedPrice}`);
        } else {
            console.log('⚠️ Letgo\'da ürün bulunamadı');
        }
        
        return bestProduct;
        
    } catch (error) {
        console.error('❌ Letgo hatası:', error.message);
        return null;
    }
}

// ==================== API ENDPOINT ====================
app.get('/api/search/:query', async (req, res) => {
    const query = req.params.query;
    console.log(`\n📱 İstek: "${query}"`);
    
    try {
        // 3 SİTEDEN AYNI ANDA VERİ ÇEK
        const [sahibindenResults, dolapResults, letgoResult] = await Promise.allSettled([
            scrapeSahibinden(query),
            scrapeDolap(query),
            scrapeLetgo(query)
        ]);
        
        const responseData = {
            success: true,
            query: query,
            timestamp: new Date().toISOString(),
            sahibinden: sahibindenResults.status === 'fulfilled' ? sahibindenResults.value : [],
            dolap: dolapResults.status === 'fulfilled' ? dolapResults.value : [],
            letgo: letgoResult.status === 'fulfilled' ? letgoResult.value : null
        };
        
        console.log(`📊 Sonuç: Sahibinden(${responseData.sahibinden.length}), Dolap(${responseData.dolap.length}), Letgo(${responseData.letgo ? '1' : '0'})`);
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ API hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            query: query
        });
    }
});

// ==================== DİĞER ENDPOINT'LER ====================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '🟢 ÇALIŞIYOR', 
        timestamp: new Date().toISOString(),
        message: 'Backend çalışıyor - Link formatları güncellendi'
    });
});

app.get('/', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px; background: #f5f5f5;">
            <div style="max-width: 800px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h1>🚀 PC Fiyat Scraper Backend</h1>
                <p><strong style="color: green;">✓ Çalışıyor</strong></p>
                <p>Link formatları güncellendi:</p>
                <ul>
                    <li><strong>Sahibinden:</strong> https://www.sahibinden.com/bilgisayar?query_text_mf=XXX&amp;query_text=XXX</li>
                    <li><strong>Dolap:</strong> https://dolap.com/ara?q=kelimeler+artı+ile</li>
                    <li><strong>Letgo:</strong> https://www.letgo.com/item/... (direkt ürün linki)</li>
                </ul>
                <hr>
                <p><strong>Test Endpoint'leri:</strong></p>
                <ul>
                    <li><a href="/api/health">/api/health</a> - Durum kontrolü</li>
                    <li><a href="/api/search/ddr4%208gb%203200mhz">/api/search/ddr4 8gb 3200mhz</a> - Örnek arama</li>
                    <li><a href="/api/search/rtx%204050">/api/search/rtx 4050</a> - Grafik kartı arama</li>
                </ul>
            </div>
        </body>
        </html>
    `);
});

// ==================== SUNUCU BAŞLAT ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Backend başlatıldı: http://localhost:${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/api/health\n`);
});
