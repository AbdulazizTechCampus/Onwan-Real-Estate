import React, { useState, useMemo, useEffect } from 'react';
import {
  parsePrice,
  formatPrice,
  computeMarketAverages,
  matchScore,
} from '../utils/marketAnalysis';
import './AIComponents.css';

/* Inline icon set - matches PropertyCard icons for visual consistency */
const Icon = {
  Area: () => (
    <svg viewBox="0 0 24 24" className="pd-ico" width="20" height="20">
      <rect x="2" y="2" width="20" height="20" stroke="#0066B1" strokeWidth="1.6" fill="none" />
      <path d="M2 2l5 5M22 2l-5 5M2 22l5-5M22 22l-5-5" stroke="#0066B1" strokeWidth="1.6" />
      <path d="M7 12h10M12 7v10" stroke="#0066B1" strokeWidth="1.2" />
    </svg>
  ),
  Bed: () => (
    <img
      src="https://customer-assets.emergentagent.com/job_realty-revamp-2/artifacts/pkmtzp3w_%D8%A3%D9%8A%D9%82%D9%88%D9%86%D8%A9_%D8%A7%D9%84%D8%B3%D8%B1%D9%8A%D8%B1_%D8%A7%D9%84%D8%B3%D9%88%D8%AF%D8%A7%D8%A1-removebg-preview.png"
      alt="غرف"
      className="pd-ico-img"
    />
  ),
  Bath: () => (
    <img
      src="https://customer-assets.emergentagent.com/job_realty-revamp-2/artifacts/lffof85s_%D8%A3%D9%8A%D9%82%D9%88%D9%86%D8%A9_%D8%A7%D9%84%D8%AD%D9%88%D8%B6_%D8%A7%D9%84%D8%B3%D9%88%D8%AF%D8%A7%D8%A1-removebg-preview.png"
      alt="حمامات"
      className="pd-ico-img"
    />
  ),
  Age: () => (
    <svg viewBox="0 0 24 24" className="pd-ico" width="20" height="20">
      <rect x="4" y="6" width="16" height="16" rx="2" stroke="#0066B1" strokeWidth="1.6" fill="none" />
      <path d="M4 6c0-1.5 1-3 3-3h10c2 0 3 1.5 3 3" stroke="#0066B1" strokeWidth="1.6" fill="none" />
      <rect x="8" y="10" width="3" height="3" fill="#0066B1" />
      <rect x="13" y="10" width="3" height="3" fill="#0066B1" />
      <rect x="10" y="16" width="4" height="6" stroke="#0066B1" strokeWidth="1" fill="none" />
    </svg>
  ),
  Location: () => (
    <svg viewBox="0 0 24 24" className="pd-ico" width="20" height="20">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#ef4444" strokeWidth="2" fill="none" />
      <circle cx="12" cy="9" r="2.5" fill="#ef4444" />
    </svg>
  ),
  Views: () => (
    <svg viewBox="0 0 24 24" className="pd-ico" width="20" height="20">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#0066B1" />
    </svg>
  ),
  Date: () => (
    <svg viewBox="0 0 24 24" className="pd-ico" width="20" height="20">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="#0066B1" />
    </svg>
  ),
  Sparkle: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
    </svg>
  ),
  Trending: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />
    </svg>
  ),
  Fire: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
    </svg>
  ),
};

/* ===========================
   1) AI Hero Hook
   =========================== */
export const AIHeroHook = ({ onStartMatching }) => {
  return (
    <section className="ai-hero-hook" data-testid="ai-hero-hook">
      <div className="container ai-hero-inner">
        <div className="ai-hero-text">
          <span className="ai-hero-eyebrow">
            <span className="pulse" />
            مدعوم بالذكاء الاصطناعي
          </span>
          <h1 className="ai-hero-title">
            اعثر على أفضل عقار خلال{' '}
            <span className="ai-grad">30 ثانية</span>{' '}
            باستخدام الذكاء الاصطناعي
          </h1>
          <p className="ai-hero-sub">
            أخبرنا عن احتياجك وسنُرشّح لك أفضل العقارات تلقائياً بناءً على ميزانيتك،
            موقعك المفضّل، ونمط حياتك — بدون بحث طويل.
          </p>
          <div className="ai-hero-cta-row">
            <button
              className="ai-cta-primary"
              onClick={onStartMatching}
              data-testid="ai-matching-cta-btn"
            >
              <span className="ai-spark" />
              خلّنا نختار لك
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
              </svg>
            </button>
            <button
              className="ai-cta-ghost"
              onClick={() => {
                const el = document.querySelector('.search-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              data-testid="ai-hero-browse-btn"
            >
              تصفّح العقارات يدوياً
            </button>
          </div>
          <div className="ai-hero-stats">
            <div className="ai-hero-stat">
              <span className="num">+12,400</span>
              <span className="lbl">عقار نشِط</span>
            </div>
            <div className="ai-hero-stat">
              <span className="num">+850</span>
              <span className="lbl">وسيط معتمد</span>
            </div>
            <div className="ai-hero-stat">
              <span className="num">98%</span>
              <span className="lbl">دقة المطابقة</span>
            </div>
          </div>
        </div>
        <div className="ai-hero-visual" aria-hidden>
          <div className="ai-orb-ring r2" />
          <div className="ai-orb-ring r1" />
          <div className="ai-orb" />
        </div>
      </div>
    </section>
  );
};

/* ===========================
   2) AI Matching Modal (Wizard)
   =========================== */
const PURPOSE_OPTIONS = [
  { value: 'sale', label: 'شراء', emoji: '🏠' },
  { value: 'rent', label: 'إيجار', emoji: '🔑' },
];

const TYPE_OPTIONS = [
  { value: 'apartment', label: 'شقة', emoji: '🏢' },
  { value: 'villa', label: 'فيلا', emoji: '🏡' },
  { value: 'land', label: 'أرض', emoji: '📐' },
  { value: 'office', label: 'مكتب', emoji: '🏬' },
  { value: 'building', label: 'مبنى', emoji: '🏗️' },
  { value: '', label: 'أي نوع', emoji: '✨' },
];

const REGION_OPTIONS = [
  'الرياض',
  'جدة',
  'الدمام',
  'مكة',
  'المدينة',
  'الخبر',
  '',
];

const BUDGET_RANGES = [
  { value: 500000, label: 'حتى 500 ألف' },
  { value: 1000000, label: 'حتى 1 مليون' },
  { value: 2000000, label: 'حتى 2 مليون' },
  { value: 5000000, label: 'حتى 5 مليون' },
  { value: 10000000, label: 'أكثر من 5 مليون' },
];

export const AIMatchingModal = ({
  isOpen,
  onClose,
  properties,
  onSelectProperty,
}) => {
  const [step, setStep] = useState(0); // 0..3 questions, 4 loading, 5 results
  const [prefs, setPrefs] = useState({
    purpose: '',
    region: '',
    type: '',
    budget: 0,
    bedrooms: 0,
  });
  const [results, setResults] = useState([]);

  if (!isOpen) return null;

  const reset = () => {
    setStep(0);
    setPrefs({ purpose: '', region: '', type: '', budget: 0, bedrooms: 0 });
    setResults([]);
  };

  const close = () => {
    reset();
    onClose();
  };

  const compute = () => {
    setStep(4); // loading
    setTimeout(() => {
      const scored = properties
        .map((p) => ({ p, score: matchScore(p, prefs) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setResults(scored);
      setStep(5);
    }, 1100);
  };

  const next = () => {
    if (step < 3) setStep(step + 1);
    else compute();
  };
  const back = () => setStep(Math.max(0, step - 1));

  const canProceed = () => {
    if (step === 0) return !!prefs.purpose;
    if (step === 1) return prefs.region !== null;
    if (step === 2) return true; // type optional
    if (step === 3) return prefs.budget > 0;
    return true;
  };

  return (
    <div className="ai-modal-backdrop" role="dialog" aria-modal="true">
      <div className="ai-modal" data-testid="ai-matching-modal">
        <div className="ai-modal-header">
          <button
            className="ai-modal-close"
            onClick={close}
            data-testid="ai-modal-close-btn"
            aria-label="إغلاق"
          >
            ✕
          </button>
          <h3 className="ai-modal-title">
            <span className="ai-pill">AI</span>
            مساعد المطابقة الذكي
          </h3>
          <p className="ai-modal-sub">
            أجب على 4 أسئلة سريعة وسنرشّح أفضل العقارات لك
          </p>
        </div>

        <div className="ai-modal-body">
          {step <= 3 && (
            <div className="ai-step-progress">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`ai-step-dot ${i <= step ? 'active' : ''}`}
                />
              ))}
            </div>
          )}

          {step === 0 && (
            <>
              <h4 className="ai-q-label">ما الذي تبحث عنه؟</h4>
              <p className="ai-q-hint">اختر الغرض من العقار</p>
              <div className="ai-options-grid">
                {PURPOSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`ai-option ${prefs.purpose === opt.value ? 'active' : ''}`}
                    onClick={() => setPrefs((p) => ({ ...p, purpose: opt.value }))}
                    data-testid={`ai-purpose-${opt.value}`}
                  >
                    <span className="opt-emoji">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h4 className="ai-q-label">في أي منطقة؟</h4>
              <p className="ai-q-hint">اختر المدينة المفضّلة</p>
              <div className="ai-options-grid">
                {REGION_OPTIONS.map((r) => (
                  <button
                    key={r || 'any'}
                    className={`ai-option ${prefs.region === r ? 'active' : ''}`}
                    onClick={() => setPrefs((p) => ({ ...p, region: r }))}
                    data-testid={`ai-region-${r || 'any'}`}
                  >
                    {r || 'أي منطقة'}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h4 className="ai-q-label">نوع العقار؟</h4>
              <p className="ai-q-hint">اختر النوع المناسب أو اتركها مفتوحة</p>
              <div className="ai-options-grid">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value || 'any'}
                    className={`ai-option ${prefs.type === opt.value ? 'active' : ''}`}
                    onClick={() => setPrefs((p) => ({ ...p, type: opt.value }))}
                    data-testid={`ai-type-${opt.value || 'any'}`}
                  >
                    <span className="opt-emoji">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h4 className="ai-q-label">ما هي ميزانيتك التقريبية؟</h4>
              <p className="ai-q-hint">سنُرشّح لك العقارات الأقرب لميزانيتك</p>
              <div className="ai-options-grid">
                {BUDGET_RANGES.map((b) => (
                  <button
                    key={b.value}
                    className={`ai-option ${prefs.budget === b.value ? 'active' : ''}`}
                    onClick={() => setPrefs((p) => ({ ...p, budget: b.value }))}
                    data-testid={`ai-budget-${b.value}`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <div className="ai-loading">
              <div className="ai-loading-orb" />
              <p>جاري تحليل تفضيلاتك...</p>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>
                نقارن +12,000 عقار في الوقت الحالي
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="ai-results" data-testid="ai-match-results">
              <div className="ai-result-header">
                <h4>🎯 وجدنا {results.length} عقاراً مناسباً لك</h4>
                <p>مرتّبة حسب الأقرب لتفضيلاتك</p>
              </div>
              {results.map(({ p, score }) => {
                const pct = Math.min(98, Math.max(60, score));
                return (
                  <div
                    key={p.id}
                    className="ai-match-card"
                    onClick={() => {
                      onSelectProperty?.(p);
                      close();
                    }}
                    data-testid={`ai-match-card-${p.id}`}
                  >
                    <img src={p.image} alt={p.title} />
                    <div className="ai-match-info">
                      <h5>{p.title}</h5>
                      <div className="loc">{p.location}</div>
                      <div className="price">{p.price} ريال</div>
                    </div>
                    <div className="ai-match-score">
                      <span className="pct">{pct}%</span>
                      <span className="lbl">مطابقة</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {step <= 3 && (
          <div className="ai-modal-footer">
            <button
              className="ai-btn ai-btn-ghost"
              onClick={step === 0 ? close : back}
              data-testid="ai-modal-back-btn"
            >
              {step === 0 ? 'إلغاء' : 'رجوع'}
            </button>
            <button
              className="ai-btn ai-btn-primary"
              onClick={next}
              disabled={!canProceed()}
              data-testid="ai-modal-next-btn"
            >
              {step === 3 ? 'احصل على التوصيات ✨' : 'التالي'}
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="ai-modal-footer">
            <button
              className="ai-btn ai-btn-ghost"
              onClick={reset}
              data-testid="ai-modal-restart-btn"
            >
              ابدأ من جديد
            </button>
            <button
              className="ai-btn ai-btn-primary"
              onClick={close}
              data-testid="ai-modal-done-btn"
            >
              تصفّح المزيد
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ===========================
   3) Smart Filter Chips
   =========================== */
export const SmartFilters = ({ active, onChange }) => {
  const chips = [
    { key: 'all', label: 'الكل', emoji: '🏘️' },
    { key: 'opportunities', label: 'فرص الأسبوع', emoji: '🔥' },
    { key: 'best_value', label: 'أفضل قيمة مقابل السعر', emoji: '💎' },
    { key: 'budget_close', label: 'الأقرب لميزانيتك', emoji: '🎯' },
    { key: 'recommended', label: 'موصى به لك', emoji: '⭐' },
  ];

  return (
    <section className="smart-filters-section" data-testid="smart-filters-section">
      <div className="container">
        <div className="smart-filters-row">
          <span className="smart-filters-label">فلاتر ذكية:</span>
          {chips.map((c) => (
            <button
              key={c.key}
              className={`smart-chip ${active === c.key ? 'active' : ''}`}
              onClick={() => onChange(c.key)}
              data-testid={`smart-chip-${c.key}`}
            >
              <span className="chip-emoji">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ===========================
   4) Property Details Modal
   =========================== */
const FALLBACK_GALLERY = {
  residential: [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=80',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80',
  ],
  commercial: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&q=80',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80',
  ],
};

const getGallery = (property) => {
  if (Array.isArray(property.gallery) && property.gallery.length > 0) {
    return property.gallery;
  }
  const base = [property.image];
  const extra = FALLBACK_GALLERY[property.category] || FALLBACK_GALLERY.default;
  return [...base, ...extra].slice(0, 5);
};

/* Lightbox component */
const Lightbox = ({ images, startIndex = 0, onClose }) => {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i + 1) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  return (
    <div className="lb-backdrop" onClick={onClose} data-testid="property-lightbox">
      <button className="lb-close" onClick={onClose} data-testid="lb-close-btn" aria-label="إغلاق">
        ✕
      </button>
      <button
        className="lb-arrow lb-arrow-prev"
        onClick={(e) => {
          e.stopPropagation();
          setIndex((i) => (i + 1) % images.length);
        }}
        aria-label="الصورة السابقة"
      >
        ‹
      </button>
      <button
        className="lb-arrow lb-arrow-next"
        onClick={(e) => {
          e.stopPropagation();
          setIndex((i) => (i - 1 + images.length) % images.length);
        }}
        aria-label="الصورة التالية"
      >
        ›
      </button>
      <img
        className={`lb-image ${zoomed ? 'zoomed' : ''}`}
        src={images[index]}
        alt={`صورة ${index + 1}`}
        onClick={(e) => {
          e.stopPropagation();
          setZoomed((z) => !z);
        }}
      />
      <div className="lb-counter">
        <bdi dir="ltr">{index + 1} / {images.length}</bdi>
      </div>
      <div className="lb-thumbs" onClick={(e) => e.stopPropagation()}>
        {images.map((src, i) => (
          <button
            key={i}
            className={`lb-thumb ${i === index ? 'active' : ''}`}
            onClick={() => setIndex(i)}
          >
            <img src={src} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
};

export const PropertyDetailsModal = ({ property, properties, onClose, favorites, onToggleFavorite }) => {
  const averages = useMemo(
    () => computeMarketAverages(properties || []),
    [properties]
  );

  const gallery = useMemo(() => (property ? getGallery(property) : []), [property]);
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(null); // null or starting index
  const liked = !!favorites?.likes?.includes(property?.id);
  const starred = !!favorites?.interests?.includes(property?.id);

  const handleShare = async () => {
    const text = `${property.title} - ${property.price} ريال`;
    try {
      if (navigator.share) {
        await navigator.share({ title: property.title, text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('تم نسخ الرابط!');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        try {
          const ta = document.createElement('textarea');
          ta.value = window.location.href;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          alert('تم نسخ الرابط!');
        } catch {
          alert('تعذّرت المشاركة، انسخ الرابط من شريط العنوان');
        }
      }
    }
  };

  const handleReport = () => {
    alert('تم استلام بلاغك عن هذا الإعلان وسيتم مراجعته من فريق عنوان العقارية');
  };

  if (!property) return null;

  const price = parsePrice(property.price);
  const area = parseFloat(property.area) || 0;
  const key = `${property.category || 'all'}__${property.status || 'all'}`;
  const avg = averages[key];
  let insight = null;
  if (price && area && avg) {
    const propPerSqm = price / area;
    const diff = ((avg - propPerSqm) / avg) * 100;
    insight = {
      percent: Math.abs(Math.round(diff)),
      isBelow: diff > 0,
      marketAvgPerSqm: Math.round(avg),
      propPerSqm: Math.round(propPerSqm),
    };
  }

  const interestedNow = Math.max(
    3,
    Math.round((property.views || 0) * 0.018) + ((property.id || 0) % 7)
  );

  const summaryParts = [];
  if (property.category === 'residential') {
    if (property.bedrooms >= 4) summaryParts.push('مناسب لعائلة');
    else if (property.bedrooms >= 2) summaryParts.push('مناسب لعائلة صغيرة');
    else summaryParts.push('مناسب للأفراد');
  } else if (property.category === 'commercial') {
    summaryParts.push('استثمار تجاري واعد');
  }
  if (property.location?.includes('الملقا') || property.location?.includes('النرجس'))
    summaryParts.push('في حي راقٍ قريب من المدارس والخدمات');
  else if (property.location?.includes('العليا') || property.location?.includes('الملز'))
    summaryParts.push('في موقع حيوي قريب من مراكز الأعمال');
  if (property.age === 0) summaryParts.push('بناء جديد ولم يُسكَن من قبل');
  else if (property.age <= 2) summaryParts.push('بناء حديث بمواصفات عصرية');
  const aiSummary = summaryParts.join('. ') + '.';

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  return (
    <>
      <div className="pd-modal-backdrop" onClick={onClose}>
        <div
          className="pd-modal"
          onClick={(e) => e.stopPropagation()}
          data-testid="property-details-modal"
        >
          <button
            className="pd-close"
            onClick={onClose}
            data-testid="property-details-close-btn"
            aria-label="إغلاق"
          >
            ✕
          </button>

          {/* Gallery */}
          <div className="pd-gallery">
            <div
              className="pd-gallery-main"
              onClick={() => setLightbox(activeImg)}
              data-testid="pd-gallery-main"
            >
              <img src={gallery[activeImg]} alt={property.title} />
              <button className="pd-zoom-btn" aria-label="تكبير الصورة">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 001.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 00-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 005.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <span>تكبير</span>
              </button>
              <div className={`pd-status-pill ${property.is_completed ? 'completed' : ''}`}>
                {property.is_completed
                  ? (property.status === 'للبيع' ? 'تم البيع' : 'تم التأجير')
                  : property.status}
              </div>

              {/* Action buttons - same as property card */}
              <div className="pd-actions-stack" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`pd-icon-btn like ${liked ? 'active' : ''}`}
                  onClick={() => onToggleFavorite && onToggleFavorite(property.id, 'like')}
                  title="إعجاب"
                  data-testid="pd-like-btn"
                >
                  <svg viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </button>
                <button
                  className={`pd-icon-btn interest ${starred ? 'active' : ''}`}
                  onClick={() => onToggleFavorite && onToggleFavorite(property.id, 'interest')}
                  title="اهتمام"
                  data-testid="pd-star-btn"
                >
                  <svg viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </button>
                <button
                  className="pd-icon-btn share"
                  onClick={handleShare}
                  title="مشاركة"
                  data-testid="pd-share-btn"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </button>
                <button className="pd-icon-btn report" title="بلاغ" onClick={handleReport} data-testid="pd-report-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                </button>
              </div>
            </div>
            {gallery.length > 1 && (
              <div className="pd-thumbs-row">
                {gallery.map((src, i) => (
                  <button
                    key={i}
                    className={`pd-thumb ${i === activeImg ? 'active' : ''}`}
                    onClick={() => setActiveImg(i)}
                    data-testid={`pd-thumb-${i}`}
                    aria-label={`الصورة ${i + 1}`}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pd-body">
            <h2 className="pd-title" data-testid="property-details-title">
              {property.title}
            </h2>
            <div className="pd-loc">
              <Icon.Location />
              <span>{property.location}</span>
            </div>

            <div className="pd-price-row">
              <div className="pd-price">
                {property.price} <small>ريال</small>
              </div>
              {insight && (
                <div className={`ai-price-insight ${insight.isBelow ? '' : 'over'}`}>
                  <Icon.Trending />
                  {insight.isBelow
                    ? `أرخص بـ ${insight.percent}% من متوسط السوق`
                    : `أعلى بـ ${insight.percent}% من متوسط السوق`}
                </div>
              )}
            </div>

            {/* AI Summary Card */}
            <div className="pd-ai-summary-card" data-testid="pd-ai-summary">
              <span className="label">
                <Icon.Sparkle />
                تحليل الذكاء الاصطناعي
              </span>
              <p>{aiSummary}</p>
            </div>

            {/* Insights Grid */}
            <div className="pd-insights-grid">
              {insight && (
                <div className={`pd-insight ${insight.isBelow ? 'pos' : 'warn'}`}>
                  <div className="pd-i-tag">
                    <Icon.Trending /> تحليل السعر
                  </div>
                  <div className="pd-i-val">
                    {formatPrice(insight.propPerSqm)} ريال/م²
                  </div>
                  <div className="pd-i-sub">
                    متوسط السوق: {formatPrice(insight.marketAvgPerSqm)} ريال/م²
                  </div>
                </div>
              )}
              <div className="pd-insight pos">
                <div className="pd-i-tag">
                  <Icon.Fire /> طلب نشِط
                </div>
                <div className="pd-i-val">{interestedNow} شخص</div>
                <div className="pd-i-sub">يهتمّون بهذا العقار الآن</div>
              </div>
              <div className="pd-insight">
                <div className="pd-i-tag">
                  <Icon.Views /> مشاهدات
                </div>
                <div className="pd-i-val">
                  {property.views?.toLocaleString('en') || 0}
                </div>
                <div className="pd-i-sub">إجمالي زوار الإعلان</div>
              </div>
            </div>

            {/* Specs - using property card icons */}
            <h3 className="pd-section-title">
              <Icon.Area /> المواصفات
            </h3>
            <div className="pd-specs-grid">
              <div className="pd-spec">
                <Icon.Area />
                <div className="num">{property.area}</div>
                <div className="lbl">م²</div>
              </div>
              {property.bedrooms != null && (
                <div className="pd-spec">
                  <Icon.Bed />
                  <div className="num">{property.bedrooms}</div>
                  <div className="lbl">غرفة نوم</div>
                </div>
              )}
              {property.bathrooms != null && (
                <div className="pd-spec">
                  <Icon.Bath />
                  <div className="num">{property.bathrooms}</div>
                  <div className="lbl">حمام</div>
                </div>
              )}
              {property.age != null && (
                <div className="pd-spec">
                  <Icon.Age />
                  <div className="num">
                    {property.age === 0 ? 'جديد' : property.age}
                  </div>
                  <div className="lbl">{property.age === 0 ? 'البناء' : 'سنة'}</div>
                </div>
              )}
              {property.publishDate && (
                <div className="pd-spec">
                  <Icon.Date />
                  <div className="num" style={{ fontSize: 14 }}>
                    {formatDate(property.publishDate)}
                  </div>
                  <div className="lbl">تاريخ النشر</div>
                </div>
              )}
            </div>

            {/* Agent */}
            {property.agent && (
              <>
                <h3 className="pd-section-title">الوسيط المسؤول</h3>
                <div className="pd-agent-row">
                  <img
                    src={property.agent.image}
                    alt={property.agent.name}
                    className="pd-agent-avatar"
                  />
                  <div>
                    <div className="pd-agent-name">{property.agent.name}</div>
                    <div className="pd-agent-phone">{property.agent.phone}</div>
                  </div>
                </div>
              </>
            )}

            {property.is_completed ? (
              <div className="pd-completed-notice" data-testid="pd-completed-notice">
                <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>
                  {property.status === 'للبيع'
                    ? 'هذا العقار تم بيعه'
                    : 'هذا العقار تم تأجيره'}
                </span>
              </div>
            ) : (
              <div className="pd-actions-row">
                {property.agent && (
                  <>
                    <a
                      className="pd-action whatsapp"
                      href={`https://wa.me/${property.agent.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="pd-whatsapp-btn"
                    >
                      تواصل عبر واتساب
                    </a>
                    <a
                      className="pd-action call"
                      href={`tel:${property.agent.phone}`}
                      data-testid="pd-call-btn"
                    >
                      اتصال مباشر
                    </a>
                  </>
                )}
                <button className="pd-action primary" data-testid="pd-interest-btn">
                  سجّل اهتمامك
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {lightbox !== null && (
        <Lightbox
          images={gallery}
          startIndex={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
};
