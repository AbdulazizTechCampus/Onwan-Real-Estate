import React, { useState, useMemo } from 'react';
import {
  parsePrice,
  formatPrice,
  computeMarketAverages,
  matchScore,
} from '../utils/marketAnalysis';
import './AIComponents.css';

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
export const PropertyDetailsModal = ({ property, properties, onClose }) => {
  const averages = useMemo(
    () => computeMarketAverages(properties || []),
    [properties]
  );

  if (!property) return null;

  // Inline computations to avoid duplicate imports
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

  // Generate AI summary
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

  return (
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

        <div className="pd-cover">
          <img src={property.image} alt={property.title} />
          <div className="pd-cover-overlay">
            <span className="pd-status-pill">{property.status}</span>
            {property.featured && (
              <span className="pd-status-pill" style={{ color: '#087E8B' }}>
                ⭐ مميز
              </span>
            )}
          </div>
        </div>

        <div className="pd-body">
          <h2 className="pd-title" data-testid="property-details-title">
            {property.title}
          </h2>
          <div className="pd-loc">📍 {property.location}</div>

          <div className="pd-price-row">
            <div className="pd-price">
              {property.price} <small>ريال</small>
            </div>
            {insight && (
              <div className={`ai-price-insight ${insight.isBelow ? '' : 'over'}`}>
                {insight.isBelow ? '📉' : '📈'}
                {insight.isBelow
                  ? `أرخص بـ ${insight.percent}% من متوسط السوق`
                  : `أعلى بـ ${insight.percent}% من متوسط السوق`}
              </div>
            )}
          </div>

          {/* AI Summary Card */}
          <div className="pd-ai-summary-card" data-testid="pd-ai-summary">
            <span className="label">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
              </svg>
              تحليل الذكاء الاصطناعي
            </span>
            <p>{aiSummary}</p>
          </div>

          {/* Insights Grid */}
          <div className="pd-insights-grid">
            {insight && (
              <div className={`pd-insight ${insight.isBelow ? 'pos' : 'warn'}`}>
                <div className="pd-i-tag">📊 تحليل السعر</div>
                <div className="pd-i-val">
                  {formatPrice(insight.propPerSqm)} ريال/م²
                </div>
                <div className="pd-i-sub">
                  متوسط السوق: {formatPrice(insight.marketAvgPerSqm)} ريال/م²
                </div>
              </div>
            )}
            <div className="pd-insight pos">
              <div className="pd-i-tag">🔥 طلب نشِط</div>
              <div className="pd-i-val">{interestedNow} شخص</div>
              <div className="pd-i-sub">يهتمّون بهذا العقار الآن</div>
            </div>
            <div className="pd-insight">
              <div className="pd-i-tag">👁️ مشاهدات</div>
              <div className="pd-i-val">{property.views?.toLocaleString('en') || 0}</div>
              <div className="pd-i-sub">إجمالي زوار الإعلان</div>
            </div>
          </div>

          {/* Specs */}
          <h3 className="pd-section-title">📐 المواصفات</h3>
          <div className="pd-specs-grid">
            <div className="pd-spec">
              <div className="num">{property.area}</div>
              <div className="lbl">م²</div>
            </div>
            {property.bedrooms != null && (
              <div className="pd-spec">
                <div className="num">{property.bedrooms}</div>
                <div className="lbl">غرفة نوم</div>
              </div>
            )}
            {property.bathrooms != null && (
              <div className="pd-spec">
                <div className="num">{property.bathrooms}</div>
                <div className="lbl">حمام</div>
              </div>
            )}
            {property.age != null && (
              <div className="pd-spec">
                <div className="num">{property.age === 0 ? 'جديد' : property.age}</div>
                <div className="lbl">{property.age === 0 ? 'البناء' : 'سنة'}</div>
              </div>
            )}
          </div>

          {/* Agent */}
          {property.agent && (
            <>
              <h3 className="pd-section-title">👤 الوسيط المسؤول</h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  background: '#f8fafc',
                  borderRadius: 12,
                  marginBottom: 16,
                }}
              >
                <img
                  src={property.agent.image}
                  alt={property.agent.name}
                  style={{ width: 48, height: 48, borderRadius: '50%' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: '#0B3954' }}>
                    {property.agent.name}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {property.agent.phone}
                  </div>
                </div>
              </div>
            </>
          )}

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
                  💬 تواصل عبر واتساب
                </a>
                <a
                  className="pd-action call"
                  href={`tel:${property.agent.phone}`}
                  data-testid="pd-call-btn"
                >
                  📞 اتصال
                </a>
              </>
            )}
            <button className="pd-action primary" data-testid="pd-interest-btn">
              ⭐ سجّل اهتمامك
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
