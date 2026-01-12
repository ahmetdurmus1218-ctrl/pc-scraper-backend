const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

const userAgents = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
];

// SAHİBİNDEN ÇEK
async function scrapeSahibinden(query) {
  try {
    const url = `https://www.sahibinden.com/arama?query=${encodeURIComponent(query)}`;
    console.log('🔍 Sahibinden:', url);
    
    return [
      { title: "Corsair 8GB DDR4 3200MHz", price: 450, link: "https://www.sahibinden.com/ilk-urun", source: "sahibinden" },
      { title: "GSkill 8GB DDR4 3200MHz", price: 420, link: "https://www.sahibinden.com/ikinci-urun", source: "sahibinden" }
    ];
  } catch (error) {
    console.error('Hata:', error);
    return [];
  }
}

// DOLAP ÇEK
async function scrapeDolap(query) {
  try {
    return [
      { title: "Kingston 8GB DDR4 3200MHz", price: 430, link: "https://www.dolap.com/urun1", source: "dolap" },
      { title: "HyperX 8GB DDR4 3200MHz", price: 460, link: "https://www.dolap.com/urun2", source: "dolap" }
    ];
  } catch (error) {
    return [];
  }
}

// LETGO TEK ÜRÜN
async function scrapeLetgo(query) {
  return {
    title: "Samsung 8GB DDR4 3200MHz",
    price: 410,
    link: "https://www.letgo.com/tek-urun",
    source: "letgo"
  };
}

// API ENDPOINT
app.get('/api/search/:query', async (req, res) => {
  const { query } = req.params;
  console.log('📱 İstek geldi:', query);
  
  try {
    const [sahibinden, dolap, letgo] = await Promise.all([
      scrapeSahibinden(query),
      scrapeDolap(query),
      scrapeLetgo(query)
    ]);
    
    res.json({
      success: true,
      query: query,
      sahibinden: sahibinden,
      dolap: dolap,
      letgo: letgo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: '🟢 ÇALIŞIYOR', time: new Date().toISOString() });
});

// Ana sayfa
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; padding: 20px;">
        <h1>🚀 PC Fiyat Scraper Backend</h1>
        <p>Çalışıyor!</p>
        <p>Test et: <a href="/api/health">/api/health</a></p>
        <p>Örnek arama: <a href="/api/search/ddr4%208gb">/api/search/ddr4 8gb</a></p>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor`);
});
