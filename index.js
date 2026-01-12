// backend/index.js - BASİT VERSİYON
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Basit veritabanı
let products = {};

// Ana sayfa
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>FiyatTakip API</title>
      <style>
        body { font-family: Arial; padding: 40px; text-align: center; }
        .endpoint { background: #f5f5f5; padding: 20px; margin: 20px auto; max-width: 600px; border-radius: 10px; }
      </style>
    </head>
    <body>
      <h1>✅ FiyatTakip API Çalışıyor</h1>
      <p>Frontend URL: <a href="https://ahmetdurmus1218-ctrl.github.io/mobil-pc-assistan/">https://ahmetdurmus1218-ctrl.github.io/mobil-pc-assistan/</a></p>
      
      <div class="endpoint">
        <h3>GET /api/search/:query</h3>
        <p>Ürün arama endpoint'i</p>
        <p><strong>Örnek:</strong> <code>GET /api/search/iphone%2013</code></p>
      </div>
      
      <div class="endpoint">
        <h3>GET /health</h3>
        <p>Sağlık kontrolü</p>
      </div>
      
      <p><em>Backend çalışıyor. Frontend'ten istek bekleniyor...</em></p>
    </body>
    </html>
  `);
});

// Ürün arama
app.get('/api/search/:query', (req, res) => {
  const query = req.params.query;
  console.log(`🔍 Arama: "${query}"`);
  
  // Mock veri döndür
  res.json({
    success: true,
    query: query,
    fiyatlar: [
      {
        urun: `${query} - En Uygun Seçenek`,
        fiyat: "₺1.500",
        site: "Sahibinden",
        link: `https://www.sahibinden.com/ara?query_text=${encodeURIComponent(query)}`
      },
      {
        urun: `${query} - Orta Segment`,
        fiyat: "₺1.800",
        site: "Trendyol",
        link: `https://www.trendyol.com/sr?q=${encodeURIComponent(query)}`
      },
      {
        urun: `${query} - Premium`,
        fiyat: "₺2.200",
        site: "Hepsiburada",
        link: `https://www.hepsiburada.com/ara?q=${encodeURIComponent(query)}`
      }
    ],
    toplamUrun: 3,
    sayfa: 1,
    toplamSayfa: 1,
    siralama: 'asc'
  });
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
  res.json({ 
    status: '🟢 ÇALIŞIYOR', 
    timestamp: new Date().toISOString(),
    service: 'FiyatTakip Backend'
  });
});

// Ürün ekleme (test için)
app.post('/api/add-product', (req, res) => {
  const { query, product, source } = req.body;
  
  if (!query || !product || !source) {
    return res.status(400).json({ 
      success: false, 
      error: "Eksik bilgi" 
    });
  }
  
  console.log(`➕ Ürün eklendi: ${query} - ${source}`);
  
  res.json({ 
    success: true, 
    message: "Ürün başarıyla eklendi!",
    addedProduct: product
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
✅ Backend başlatıldı: http://localhost:${PORT}
🌐 Canlı URL: https://pc-scraper-backend.onrender.com
  `);
});
