// backend/index.js - ÜRÜN EKLEME SİSTEMİ
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// BOŞ veritabanı (sen dolduracaksın)
let userProducts = {};

// ==================== 1. ÜRÜN ARAMA (Senin eklediklerini gösterir) ====================
app.get('/api/search/:query', (req, res) => {
    const query = req.params.query.toLowerCase().trim();
    console.log(`🔍 Kullanıcı ürünlerinde aranıyor: "${query}"`);
    
    if (userProducts[query]) {
        res.json({
            success: true,
            query: query,
            timestamp: userProducts[query].lastUpdated,
            source: "user-added",
            sahibinden: userProducts[query].sahibinden || [],
            dolap: userProducts[query].dolap || [],
            letgo: userProducts[query].letgo || null,
            message: "Kullanıcı eklenmiş ürünler"
        });
    } else {
        // Bu sorgu için hiç ürün eklenmemiş
        res.json({
            success: true,
            query: query,
            timestamp: new Date().toISOString(),
            source: "not-found",
            sahibinden: [],
            dolap: [],
            letgo: null,
            message: "Henüz bu ürün eklenmemiş. /api/add-product ile ekleyebilirsin."
        });
    }
});

// ==================== 2. ÜRÜN EKLEME ENDPOINT (SEN BUNU KULLANACAKSIN) ====================
app.post('/api/add-product', (req, res) => {
    const { query, product, source } = req.body;
    
    if (!query || !product || !source) {
        return res.status(400).json({ 
            success: false, 
            error: "Eksik bilgi: query, product, source gerekli" 
        });
    }
    
    const queryKey = query.toLowerCase().trim();
    
    // İlk kez ekleniyorsa obje oluştur
    if (!userProducts[queryKey]) {
        userProducts[queryKey] = {
            query: queryKey,
            lastUpdated: new Date().toISOString(),
            sahibinden: [],
            dolap: [],
            letgo: null
        };
    }
    
    console.log(`➕ Yeni ürün ekleniyor: ${queryKey} - ${source}`);
    console.log(`   Ürün: ${product.title} - ${product.price} TL`);
    
    // Kaynağa göre ekle
    if (source === 'sahibinden') {
        userProducts[queryKey].sahibinden.push(product);
        // En düşük fiyata göre sırala
        userProducts[queryKey].sahibinden.sort((a, b) => a.price - b.price);
    }
    else if (source === 'dolap') {
        userProducts[queryKey].dolap.push(product);
        userProducts[queryKey].dolap.sort((a, b) => a.price - b.price);
    }
    else if (source === 'letgo') {
        userProducts[queryKey].letgo = product;
    }
    else {
        return res.status(400).json({ 
            success: false, 
            error: "Geçersiz source: 'sahibinden', 'dolap' veya 'letgo' olmalı" 
        });
    }
    
    userProducts[queryKey].lastUpdated = new Date().toISOString();
    
    res.json({ 
        success: true, 
        message: "Ürün başarıyla eklendi!",
        addedProduct: product,
        totalSahibinden: userProducts[queryKey].sahibinden.length,
        totalDolap: userProducts[queryKey].dolap.length,
        hasLetgo: !!userProducts[queryKey].letgo
    });
});

// ==================== 3. TÜM EKLENEN ÜRÜNLERİ GÖR ====================
app.get('/api/my-products', (req, res) => {
    const queryKeys = Object.keys(userProducts);
    
    res.json({
        success: true,
        totalQueries: queryKeys.length,
        totalProducts: queryKeys.reduce((sum, key) => {
            return sum + 
                   (userProducts[key].sahibinden?.length || 0) + 
                   (userProducts[key].dolap?.length || 0) + 
                   (userProducts[key].letgo ? 1 : 0);
        }, 0),
        products: userProducts
    });
});

// ==================== 4. ÜRÜN SİLME ====================
app.delete('/api/remove-product/:query', (req, res) => {
    const queryKey = req.params.query.toLowerCase().trim();
    
    if (userProducts[queryKey]) {
        delete userProducts[queryKey];
        res.json({ 
            success: true, 
            message: `"${queryKey}" sorgusundaki tüm ürünler silindi` 
        });
    } else {
        res.status(404).json({ 
            success: false, 
            error: "Bu sorguda ürün bulunamadı" 
        });
    }
});

// ==================== 5. SAĞLIK KONTROLÜ ====================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '🟢 ÇALIŞIYOR', 
        timestamp: new Date().toISOString(),
        service: 'PC Ürün Ekleme Backend',
        userProductsCount: Object.keys(userProducts).length
    });
});

// ==================== 6. ANA SAYFA (Kullanım kılavuzu) ====================
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>PC Ürün Ekleme Backend</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial; padding: 20px; max-width: 800px; margin: auto; }
                .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
                code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <h1>🛒 PC Ürün Ekleme Backend</h1>
            <p><strong>Durum:</strong> <span style="color:green;">Çalışıyor</span></p>
            <p>Bu backend'e <strong>SEN</strong> ürün ekleyeceksin. Hazır ürün YOK.</p>
            
            <h3>📋 KULLANIM KILAVUZU:</h3>
            
            <div class="endpoint">
                <h4>1. ÜRÜN EKLEME (POST)</h4>
                <p><code>POST /api/add-product</code></p>
                <p><strong>JSON Body:</strong></p>
                <pre>
{
  "query": "ddr4 8gb 3200mhz",
  "source": "sahibinden",
  "product": {
    "title": "Corsair 8GB DDR4 3200MHz",
    "price": 450,
    "formattedPrice": "450 TL",
    "link": "https://www.sahibinden.com/...",
    "location": "İstanbul",
    "date": "Bugün"
  }
}</pre>
            </div>
            
            <div class="endpoint">
                <h4>2. ÜRÜN ARAMA (GET)</h4>
                <p><code>GET /api/search/ddr4%208gb%203200mhz</code></p>
                <p>Frontend bu endpoint'i kullanacak</p>
            </div>
            
            <div class="endpoint">
                <h4>3. EKLENEN ÜRÜNLERİ GÖR (GET)</h4>
                <p><code>GET /api/my-products</code></p>
            </div>
            
            <hr>
            <p><strong>Frontend URL:</strong> <a href="https://ahmetdurmus1218-ctrl.github.io/mobil-pc-assistan/" target="_blank">Mobil PC Asistan</a></p>
            <p><strong>Backend URL:</strong> <code>https://pc-scraper-backend.onrender.com</code></p>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
✅ Ürün Ekleme Backend Başlatıldı: http://localhost:${PORT}
📝 NOT: Başlangıçta hiç ürün yok. Sen ekleyeceksin.
    
🎯 KULLANIM:
1. Sahibinden/Dolap/Letgo'dan ürün bul
2. POST /api/add-product ile ekle
3. Frontend'te görüntüle
    `);
});
