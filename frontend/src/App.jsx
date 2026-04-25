import axios from 'axios';
import { useState, useEffect, useRef } from 'react';

// ---------- OYUN BİLEŞENLERİ (TAMAMI KORUNDU) ----------
const ClickRace = () => {
  const [clicks, setClicks] = useState(0);
  return (
    <div className="flex flex-col items-center">
      <button onClick={() => setClicks((c) => c + 1)}
        className="w-32 h-32 bg-blue-600 hover:bg-blue-500 rounded-full text-3xl font-bold shadow-lg active:scale-90 transition-transform">
        {clicks}
      </button>
      <p className="text-slate-300 mt-2 text-sm">Tıklama: {clicks}</p>
    </div>
  );
};

const ColorFlipper = () => {
  const [count, setCount] = useState(0);
  const [color, setColor] = useState('#3B82F6');
  const flip = () => {
    setCount((c) => c + 1);
    setColor('#' + Math.floor(Math.random() * 16777215).toString(16));
  };
  return (
    <div className="flex flex-col items-center">
      <button onClick={flip} className="w-32 h-32 rounded-full shadow-lg active:scale-90 transition-transform"
        style={{ backgroundColor: color }} />
      <p className="text-slate-300 mt-2 text-sm">Renk Değişimi: {count}</p>
    </div>
  );
};

const DiceRoller = () => {
  const [total, setTotal] = useState(0);
  const [last, setLast] = useState(null);
  const roll = () => {
    const num = Math.floor(Math.random() * 6) + 1;
    setTotal((t) => t + num);
    setLast(num);
  };
  return (
    <div className="flex flex-col items-center">
      <div className="text-6xl mb-4">{last ? ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][last] : '🎲'}</div>
      <button onClick={roll}
        className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-2xl font-bold shadow-lg active:scale-95 transition-transform">
        Zar At
      </button>
      <p className="text-slate-300 mt-2 text-sm">Toplam: {total}</p>
    </div>
  );
};

const DartGame = () => {
  const [score, setScore] = useState(0);
  const [dart, setDart] = useState(null);
  const throwDart = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const maxRadius = rect.width / 2;
    let points = Math.max(0, Math.floor(100 - (distance / maxRadius) * 100));
    setScore((s) => s + points);
    setDart({ x, y });
    setTimeout(() => setDart(null), 300);
  };
  return (
    <div className="flex flex-col items-center">
      <div onClick={throwDart}
        className="w-48 h-48 rounded-full cursor-pointer relative overflow-hidden"
        style={{
          background: 'radial-gradient(circle, #ef4444 0%, #f97316 25%, #eab308 50%, #22c55e 75%, #3b82f6 100%)',
          boxShadow: '0 0 20px rgba(255,255,255,0.2)',
        }}>
        {dart && <div className="absolute text-2xl" style={{ left: dart.x - 12, top: dart.y - 12 }}>🎯</div>}
      </div>
      <p className="text-slate-300 mt-2 text-sm">Skor: {score}</p>
      <p className="text-slate-500 text-xs">Hedefe tıkla!</p>
    </div>
  );
};

const BallJump = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const stateRef = useRef({ ballY: 140, ballVY: 0, obstacleX: 260, score: 0, gameOver: false });
  const animationRef = useRef(null);

  const jump = () => {
    if (stateRef.current.gameOver) {
      stateRef.current = { ballY: 140, ballVY: -8, obstacleX: 260, score: 0, gameOver: false };
      setScore(0);
      setGameOver(false);
    } else if (stateRef.current.ballY >= 140) {
      stateRef.current.ballVY = -8;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = () => {
      const s = stateRef.current;
      if (!s.gameOver) {
        s.ballVY += 0.5;
        s.ballY += s.ballVY;
        if (s.ballY >= 140) { s.ballY = 140; s.ballVY = 0; }
        s.obstacleX -= 3;
        if (s.obstacleX < -20) { s.obstacleX = 260; s.score += 1; setScore(s.score); }
        if (s.obstacleX < 35 && s.obstacleX > 10 && s.ballY > 110) { s.gameOver = true; setGameOver(true); }
      }
      ctx.clearRect(0, 0, 280, 160);
      ctx.fillStyle = '#334155'; ctx.fillRect(0, 150, 280, 10);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(s.obstacleX, 118, 12, 32);
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(20, 150 - s.ballY - 6, 8, 0, Math.PI * 2); ctx.fill();
      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, 280, 160);
        ctx.fillStyle = 'white'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`Oyun Bitti! Skor: ${s.score}`, 140, 80);
        ctx.fillText('Boşluk tuşuna bas', 140, 100);
      }
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);

    const handleKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={280} height={160} className="bg-slate-800 rounded-lg border border-slate-600" onClick={jump} />
      <p className="text-slate-300 mt-2 text-sm">{gameOver ? `Oyun bitti! Skor: ${score}` : `Zıpla! Skor: ${score}`}</p>
      <p className="text-slate-400 text-xs mt-1">Boşluk / dokun</p>
    </div>
  );
};

const GAMES = [
  { name: 'Tıklama Yarışı', component: ClickRace },
  { name: 'Renk Değiştir', component: ColorFlipper },
  { name: 'Zar Atma', component: DiceRoller },
  { name: 'Dart Atma', component: DartGame },
  { name: 'Zıplayan Top', component: BallJump },
];

// ---------- EFEKT LİSTESİ ----------
const EFFECTS = [
  { value: 'shopify-template-soft-studio-glow', label: 'Yumuşak Stüdyo Işığı' },
  { value: 'shopify-template-warm-ivory-fade', label: 'Sıcak Fildişi' },
  { value: 'shopify-template-cool-minimal-spotlight', label: 'Minimal Spot' },
  { value: 'shopify-template-golden-hour-shadow', label: 'Altın Saat Gölgesi' },
  { value: 'shopify-template-amber-luxe-gradient', label: 'Lüks Kehribar' },
  { value: 'shopify-template-sunset-silhouette', label: 'Gün Batımı' },
  { value: 'shopify-template-monochrome-softbox', label: 'Monokrom Softbox' },
  { value: 'shopify-template-tropical-shadow-play', label: 'Tropikal Gölge' },
  { value: 'shopify-template-cinematic-glow-cast', label: 'Sinematik Işık' },
];

// ---------- ANA UYGULAMA (GÜNCELLENMİŞ) ----------
function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [copywriting, setCopywriting] = useState(null);
  const [activeGameIndex, setActiveGameIndex] = useState(0);
  const [selectedEffect, setSelectedEffect] = useState(EFFECTS[0].value);
  const [customCaption, setCustomCaption] = useState('');

  const ActiveGameComponent = GAMES[activeGameIndex].component;

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setActiveGameIndex(0);
    setStatusMessage('🚀 Wiro AI işliyor...');
    setGeneratedImage(null);
    setCopywriting(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('effect_type', selectedEffect);
    formData.append('caption', customCaption);

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/v1/campaign/generate-from-image',
        formData
      );
      setGeneratedImage(response.data.image_url);
      setCopywriting(response.data.copywriting || null);
      setActiveTab('home');
    } catch (error) {
      console.error('Hata oluştu:', error);
      alert('Hata: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestCaption = async () => {
    try {
      const idea = await axios.get(
        'http://127.0.0.1:8000/api/v1/campaign/suggest-caption?effect_type=' + selectedEffect
      );
      setCustomCaption(idea.data.caption);
    } catch (error) {
      console.error('Fikir alınamadı:', error);
    }
  };

  // Navbar sekmeleri
  const tabs = [
    { key: 'home', label: '🏠 Ana Sayfa' },
    { key: 'about', label: 'ℹ️ Hakkımda' },
    { key: 'pricing', label: '💰 Fiyatlar' },
  ];

  const sampleWorks = [
    '/ornek1.jpeg',
    '/ornek2.jpeg',
    '/ornek3.jpeg',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            AdCreative AI
          </div>
          <div className="flex gap-4">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* İÇERİK */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* ANA SAYFA */}
        {activeTab === 'home' && (
          <div className="space-y-12">
            {/* Hero Bölümü */}
            {!generatedImage && !loading && (
              <div className="text-center space-y-6 py-12">
                <h1 className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  Wiro AI ile Saniyeler İçinde Satış
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                  Wiro'nun arka plan silme ve gelişmiş Shopify Template modelleriyle ürün görsellerinizi çarpıcı afişlere dönüştürün, AI reklam metinleriyle taçlandırın.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => document.getElementById('create-section').scrollIntoView({ behavior: 'smooth' })}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-full text-lg font-bold shadow-xl shadow-blue-500/20 transition-all"
                  >
                    Hemen Başla 🚀
                  </button>
                </div>
              </div>
            )}

            {/* Örnek Çalışmalar */}
            {!generatedImage && !loading && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white text-center">Örnek Çalışmalar</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sampleWorks.map((url, i) => (
                <div key={i} className="bg-white/5 ...">
                  <img src={url} alt={`Örnek ${i+1}`} className="w-full h-48 object-cover" />
                  <div className="p-3 text-sm text-slate-400">Shopify Afişi #{i+1}</div>
                </div>
              ))}
                </div>
              </div>
            )}

            {/* Oluşturma / Sonuç Bölümü */}
            <div id="create-section" className="space-y-8">
              {!loading && !generatedImage && (
                <div className="max-w-2xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
                  <h2 className="text-2xl font-bold text-white mb-6">🎨 Yeni Kampanya Oluştur</h2>

                  <input type="file" onChange={(e) => setFile(e.target.files[0])}
                    className="mb-6 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-400 mb-2">🎨 Tema</label>
                    <select
                      value={selectedEffect}
                      onChange={(e) => setSelectedEffect(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                    >
                      {EFFECTS.map((eff) => (
                        <option key={eff.value} value={eff.value}>{eff.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      ✏️ Reklam Metni (opsiyonel)
                    </label>
                    <input
                      type="text"
                      value={customCaption}
                      onChange={(e) => setCustomCaption(e.target.value)}
                      placeholder="Örn: İndirim Zamanı!"
                      className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg p-2 mb-2 focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleSuggestCaption}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-bold transition-all"
                    >
                      💡 Yapay Zekadan Fikir Al
                    </button>
                  </div>

                  <button onClick={handleUpload} disabled={!file}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 rounded-xl font-bold text-lg transition-all active:scale-95 disabled:opacity-50">
                    Kampanyayı Başlat
                  </button>
                </div>
              )}

              {/* Yükleniyor + Oyunlar */}
              {loading && (
                <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <h2 className="text-2xl font-bold animate-pulse text-blue-400 mb-8">{statusMessage}</h2>
                  <div className="bg-slate-800 p-6 rounded-xl border border-blue-500/30 shadow-2xl text-center min-w-[280px]">
                    <p className="text-white text-lg mb-4">🎮 {GAMES[activeGameIndex].name}</p>
                    <ActiveGameComponent />
                    <button onClick={() => setActiveGameIndex((prev) => (prev + 1) % GAMES.length)}
                      className="mt-4 text-sm text-blue-400 hover:underline">
                      Oyun Değiştir ▶
                    </button>
                  </div>
                </div>
              )}

              {/* Sonuç: Görsel + Toolkit */}
              {generatedImage && !loading && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white/5 rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                    <img src={generatedImage} alt="Kampanya" className="w-full h-auto" />
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                      <span>✍️</span> AI Marketing Toolkit
                    </h3>
                    {copywriting ? (
                      <div className="space-y-6">
                        <div>
                          <label className="text-xs uppercase text-slate-500 font-bold mb-2 block">Slogan</label>
                          <p className="text-lg font-semibold italic text-white">"{copywriting.slogan}"</p>
                        </div>
                        <div>
                          <label className="text-xs uppercase text-slate-500 font-bold mb-2 block">Instagram Caption</label>
                          <p className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-white/10">{copywriting.caption}</p>
                        </div>
                        <div>
                          <label className="text-xs uppercase text-slate-500 font-bold mb-2 block">Hashtags</label>
                          <p className="text-sm text-blue-400 font-mono italic">{copywriting.hashtags}</p>
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(copywriting.caption); alert('Metin kopyalandı!'); }}
                          className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold transition-all">
                          Metni Kopyala
                        </button>
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">Metinler henüz üretilmedi.</p>
                    )}
                    <button onClick={() => { setGeneratedImage(null); setFile(null); setCopywriting(null); }}
                      className="w-full mt-8 text-slate-500 hover:text-white text-sm transition-colors">
                      ← Yeni Kampanya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HAKKIMDA (Bireysel) */}
        {activeTab === 'about' && (
          <div className="max-w-3xl mx-auto bg-white/5 rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-6">AdCreative AI Hakkında</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              AdCreative AI, Wiro AI'nin güçlü görüntü işleme modelleri (Arka Plan Silme, Shopify Template) ve DeepSeek LLM entegrasyonuyla geliştirilmiş, e‑ticaret ürünleriniz için saniyeler içinde profesyonel reklam afişleri ve metinleri üreten bireysel bir projedir.
            </p>
            <h3 className="text-xl font-semibold text-white mt-8 mb-3">🛠️ Kullanılan Wiro Modelleri</h3>
            <ul className="list-disc list-inside text-slate-400 space-y-1">
              <li>wiro/remove-background</li>
              <li>wiro/shopify-template</li>
              <li>deepseek-ai/deepseek-r1-distill-qwen-14b (LLM)</li>
            </ul>
            <h3 className="text-xl font-semibold text-white mt-8 mb-3">👤 Geliştirici</h3>
            <p className="text-slate-400">
              İsmail Efe Terlemez – Hackathon için solo proje.
            </p>
          </div>
        )}

        {/* FİYATLANDIRMA */}
        {activeTab === 'pricing' && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Başlangıç', price: 'Ücretsiz', features: ['Ayda 10 afiş', 'Temel şablonlar', 'Standart çözünürlük'] },
              { title: 'Profesyonel', price: '₺149/ay', features: ['Sınırsız afiş', 'Tüm şablonlar', 'Yüksek çözünürlük', 'Öncelikli destek'] },
              { title: 'Kurumsal', price: 'Özel', features: ['Özel API erişimi', 'Marka kitleri', 'Kullanıcı yönetimi', '7/24 destek'] },
            ].map((plan, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:border-blue-500/50 transition-all">
                <h3 className="text-xl font-bold text-white mb-2">{plan.title}</h3>
                <div className="text-3xl font-extrabold text-blue-400 mb-4">{plan.price}</div>
                <ul className="text-slate-400 space-y-2 mb-6">
                  {plan.features.map((f, j) => <li key={j}>{f}</li>)}
                </ul>
                <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors">
                  Seç
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-6 text-center text-slate-500 text-sm">
        © 2024 AdCreative AI — Wiro AI destekli bireysel proje.
      </footer>
    </div>
  );
}

export default App;