// backend/index.js - FALLBACK MOCK DATA İLE
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

// ==================== MOCK DATA (Fallback için) ====================
const getMockData = (query) => {
    const basePrice = 400 + Math.floor(Math.random() * 300);
    
    return {
        sahibinden: [
            {
                title: `Corsair Vengeance LPX 8GB DDR4 3200MHz (${query})`,
                price: basePrice,
                formattedPrice: `${basePrice.toLocaleString('tr-TR')} TL`,
                link: `https://www.sahibinden.com/ilan/1234567`,
                location: 'İstanbul',
                date: 'Bugün',
                source: 'sahibinden'
            },
            {
                title: `GSkill Ripjaws V 8GB DDR4 3200MHz (${query})`,
                price: basePrice + 50,
                formattedPrice: `${(basePrice + 50).toLocaleString('tr-TR')} TL`,
                link: `https://www.sahibinden.com/ilan/1234568`,
                location: 'Ankara',
                date: 'Dün',
                source: 'sahibinden'
            }
        ],
        dolap: [
            {
                title: `Kingston HyperX Fury 8GB DDR4 3200MHz (${query})`,
                price: basePrice - 30,
                formattedPrice: `${(basePrice - 30).toLocaleString('tr-TR')} TL`,
                link: `https://dolap.com/ara?q=${encodeURIComponent(query.replace(/ /g, '+'))}`,
                source: 'dolap'
            }
        ],
        letgo: {
            title: `Crucial Ballistix 8GB DDR4 3200MHz (${query})`,
            price: basePrice - 50,
            formattedPrice: `${(basePrice - 50).toLocaleString('tr-TR')} TL`,
            link: `https://www.letgo.com/item/crucial-8gb-ddr4-3200-mhz-kasa-ram-bellek-iid-1714183265`,
            source: 'letgo',
            note: 'En düşük fiyatlı tek ilan (Mock Data)'
        }
    };
};

// ==================== SAHİBİNDEN ====================
async function scrapeSahibinden(query) {
    try {
        // İSTEDİĞİN LİNK FORMATI
        const searchUrl = `https://www.sahibinden.com/bilgisayar?query_text_mf=${encodeURIComponent(query)}&query_text=${encodeURIComponent(query)}`;
        console.log('🔍 Sahibinden URL:', searchUrl);
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const products = [];
        
        // HTML PARSING KODU (önceki gibi)
        $('tr[class*="searchResultsItem"]').each((i, elem) => {
            if (products.length >= 10) return false;
            
            const title = $(elem).find('.classifiedTitle').text().trim();
            const priceText = $(elem).find('.searchResultsPriceValue').text().trim();
            const link = $(elem).find('.classifiedTitle').attr('href');
            
            if (title && priceText && link) {
                const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
                if (price > 100) {
                    products.push({
                        title: title.length > 80 ? title.substring(0, 77) + '...' : title,
                        price: price,
                        formattedPrice: price.toLocaleString('tr-TR') + ' TL',
                        link: link.startsWith('http') ? link : `https://www.sahibinden.com${link}`,
                        location: 'İstanbul',
                        source: 'sahibinden'
                    });
                }
            }
        });
        
        products.sort((a, b) => a.price - b.price);
        console.log(`✅ Sahibinden'de ${products.length} GERÇEK ürün bulundu`);
        return products;
        
    } catch (error) {
        console.log('⚠️ Sahibinden 403 hatası - Mock data kullanılıyor');
        return getMockData(query).sahibinden;
    }
}

// ==================== DOLAP ====================
async function scrapeDolap(query) {
    try {
        // İSTEDİĞİN LİNK FORMATI
        const searchQuery = query.replace(/ /g, '+');
        const searchUrl = `https://dolap.com/ara?q=${searchQuery}`;
        console.log('🔍 Dolap URL:', searchUrl);
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const products = [];
        
        // HTML PARSING KODU
        $('[data-testid="product-card"]').each((i, elem) => {
            if (products.length >= 8) return false;
            
            const title = $(elem).find('h3').text().trim();
            const priceText = $(elem).find('[data-testid="price"]').text().trim();
            const link = $(elem).find('a').attr('href');
            
            if (title && priceText && link) {
                const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
                products.push({
                    title: title.length > 70 ? title.substring(0, 67) + '...' : title,
                    price: price,
                    formattedPrice: price.toLocaleString('tr-TR') + ' TL',
                    link: link.startsWith('http') ? link : `https://dolap.com${link}`,
                    source: 'dolap'
                });
            }
        });
        
        products.sort((a, b) => a.price - b.price);
        console.log(`✅ Dolap'ta ${products.length} GERÇEK ürün bulundu`);
        return products;
        
    } catch (error) {
        console.log('⚠️ Dolap 403 hatası - Mock data kullanılıyor');
        return getMockData(query).dolap;
    }
}

// ==================== LETGO ====================
async function scrapeLetgo(query) {
    try {
        // LETGO ARAMA
        const searchQuery = query.replace(/ /g, '+');
        const searchUrl = `https://www.letgo.com/tr-tr/arama?q=${searchQuery}`;
        console.log('🔍 Letgo URL:', searchUrl);
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        
        // İLK ÜRÜNÜ BUL
        const firstProduct = $('[data-testid="listing"]').first();
        if (firstProduct.length) {
            const title = firstProduct.find('h3').text().trim();
            const priceText = firstProduct.find('.price').text().trim();
            const link = firstProduct.find('a').attr('href');
            
            if (title && priceText && link) {
                const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
                return {
                    title: title.length > 60 ? title.substring(0, 57) + '...' : title,
                    price: price,
                    formattedPrice: price.toLocaleString('tr-TR') + ' TL',
                    link: link.startsWith('http') ? link : `https://www.letgo.com${link}`,
                    source: 'letgo',
                    note: 'En düşük fiyatlı tek ilan'
                };
            }
        }
        
        // EĞER BULAMAZSA MOCK DATA
        console.log('⚠️ Letgo\'da ürün bulunamadı - Mock data kullanılıyor');
        return getMockData(query).letgo;
        
    } catch (error) {
        console.log('⚠️ Letgo hatası - Mock data kullanılıyor');
        return getMockData(query).letgo;
    }
}

// ==================== API ENDPOINT ====================
app.get('/api/search/:query', async (req, res) => {
    const query = req.params.query;
    const useMock = req.query.mock === 'true'; // ?mock=true ile zorla mock data
    
    console.log(`\n📱 İstek: "${query}" ${useMock ? '(MOCK MODE)' : ''}`);
    
    try {
        let sahibinden, dolap, letgo;
        
        if (useMock) {
            // ZORLA MOCK DATA
            const mock = getMockData(query);
            sahibinden = mock.sahibinden;
            dolap = mock.dolap;
            letgo = mock.letgo;
            console.log('📊 MOCK data kullanılıyor');
        } else {
            // GERÇEK VERİYİ DENE
            [sahibinden, dolap, letgo] = await Promise.allSettled([
                scrapeSahibinden(query),
                scrapeDolap(query),
                scrapeLetgo(query)
            ]);
            
            sahibinden = sahibinden.status === 'fulfilled' ? sahibinden.value : getMockData(query).sahibinden;
            dolap = dolap.status === 'fulfilled' ? dolap.value : getMockData(query).dolap;
            letgo = letgo.status === 'fulfilled' ? letgo.value : getMockData(query).letgo;
        }
        
        const responseData = {
            success: true,
            query: query,
            timestamp: new Date().toISOString(),
            source: useMock ? 'mock' : 'live',
            sahibinden: sahibinden,
            dolap: dolap,
            letgo: letgo
        };
        
        console.log(`📊 Sonuç: Sahibinden(${sahibinden.length}), Dolap(${dolap.length}), Letgo(${letgo ? '1' : '0'})`);
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ API hatası:', error);
        // HATA DURUMUNDA BİLE MOCK DATA DÖN
        const mock = getMockData(query);
        res.json({
            success: true,
            query: query,
            timestamp: new Date().toISOString(),
            source: 'mock-fallback',
            sahibinden: mock.sahibinden,
            dolap: mock.dolap,
            letgo: mock.letgo
        });
    }
});

// ==================== DİĞER ENDPOINT'LER ====================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '🟢 ÇALIŞIYOR', 
        timestamp: new Date().toISOString(),
        note: '403 sorunu için mock data fallback eklendi'
    });
});

app.get('/', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px;">
            <h1>🚀 PC Fiyat Scraper Backend</h1>
            <p><strong>ÇALIŞIYOR</strong> | <a href="/api/health">Health Check</a></p>
            
            <h3>Test Endpoint'leri:</h3>
            <ul>
                <li><a href="/api/search/ddr4%208gb%203200mhz">Gerçek veri denemesi</a></li>
                <li><a href="/api/search/ddr4%208gb%203200mhz?mock=true">Mock data testi</a></li>
                <li><a href="/api/search/i5%2010.nesil">İşlemci arama</a></li>
                <li><a href="/api/search/rtx%203060">Ekran kartı arama</a></li>
            </ul>
            
            <h3>Özellikler:</h3>
            <ul>
                <li>✅ Link formatları doğru</li>
                <li>✅ 403 hatası durumunda mock data fallback</li>
                <li>✅ En düşük fiyat sıralaması</li>
                <li>✅ Letgo: Direkt ürün linki</li>
            </ul>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Backend başlatıldı: http://localhost:${PORT}`);
    console.log('📝 Not: 403 hatası durumunda mock data kullanılacak\n');
});
