import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './SubscriptionCenter.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });

const TXN_LABELS = {
  SUBSCRIPTION_PAYMENT: 'اشتراك باقة',
  LISTING_PAYMENT: 'شراء إعلان',
  LISTING_UPGRADE: 'ترقية إعلان',
  SUCCESS_FEE: 'رسوم نجاح صفقة',
  BROKERAGE_FEE: 'رسوم وساطة',
  MARKETING_PAYMENT: 'دفعة تسويق',
  PHOTOGRAPHY_COMMISSION: 'عمولة تصوير',
  POINT_PURCHASE: 'شراء نقاط',
  REFUND: 'استرداد',
};

const FEATURE_LABELS = {
  max_listings: 'عدد الإعلانات',
  featured_listings: 'إعلانات مميزة',
  premium_listings: 'إعلانات مميز بلس',
  success_fee_percentage: 'عمولة النجاح',
  monthly_points: 'نقاط شهرية',
  team_members: 'أعضاء الفريق',
};

const fmtFeature = (key, val) => {
  if (val === null || val === undefined) return 'حسب الاتفاق';
  if (key === 'success_fee_percentage') return `${val}%`;
  return val;
};

export const SubscriptionCenter = ({ currentUser, onClose, onRequireLogin }) => {
  const [config, setConfig] = useState(null);
  const [me, setMe] = useState(null);
  const [promo, setPromo] = useState('');
  const [promoStatus, setPromoStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [simAmount, setSimAmount] = useState('10000');
  const [simResult, setSimResult] = useState(null);

  const isGuest = !currentUser;
  const userType = currentUser?.user_type || 'broker_individual';

  const load = useCallback(() => {
    axios.get(`${API}/finance/config?user_type=${userType}`).then(r => setConfig(r.data)).catch(() => {});
    if (!isGuest && localStorage.getItem('access_token')) {
      axios.get(`${API}/finance/me`, authHeaders()).then(r => setMe(r.data)).catch(() => setMe({ billing: {}, wallet: { available_points: 0 }, badges: [], transactions: [], commission: null }));
    } else {
      setMe({ billing: {}, wallet: { available_points: 0 }, badges: [], transactions: [], commission: null });
    }
  }, [userType, isGuest]);

  useEffect(() => { load(); }, [load]);

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const checkPromo = async () => {
    if (!promo) return;
    try {
      const r = await axios.post(`${API}/finance/validate-promo`, { code: promo, transaction_type: 'SUBSCRIPTION_PAYMENT' });
      setPromoStatus({ valid: true, ...r.data });
    } catch (e) {
      setPromoStatus({ valid: false, error: e.response?.data?.detail || 'كود غير صالح' });
    }
  };

  const selectModel = async (model) => {
    if (isGuest) { onRequireLogin && onRequireLogin(); return; }
    setBusy(true);
    try {
      await axios.post(`${API}/finance/select-model`, { model }, authHeaders());
      flash('success', 'تم تفعيل نموذج التعامل بنجاح');
      load();
    } catch (e) {
      flash('error', e.response?.data?.detail || 'حدث خطأ');
    } finally { setBusy(false); }
  };

  const subscribe = async (plan) => {
    if (isGuest) { onRequireLogin && onRequireLogin(); return; }
    setBusy(true);
    try {
      const r = await axios.post(`${API}/finance/subscribe`,
        { plan_id: plan.id, promo_code: promoStatus?.valid ? promo : null }, authHeaders());
      const t = r.data.transaction;
      flash('success', `تم الاشتراك في باقة ${plan.name_ar} — المبلغ: ${t.net_amount} ريال${t.discount ? ` (خصم ${t.discount} ريال)` : ''}${r.data.points_awarded ? ` + ${r.data.points_awarded} نقطة` : ''}`);
      setPromo(''); setPromoStatus(null);
      load();
    } catch (e) {
      flash('error', e.response?.data?.detail || 'فشل الاشتراك');
    } finally { setBusy(false); }
  };

  const simulate = async () => {
    try {
      const r = await axios.post(`${API}/finance/success-fee/preview`, { amount: parseFloat(simAmount) || 0 }, authHeaders());
      setSimResult(r.data);
    } catch { setSimResult(null); }
  };

  if (!config || !me) {
    return (
      <div className="sub-backdrop" onClick={onClose}>
        <div className="sub-panel" onClick={e => e.stopPropagation()}>
          <div className="sub-loading">جارٍ التحميل...</div>
        </div>
      </div>
    );
  }

  const billing = me.billing || {};
  const isOwnerType = ['property_owner', 'property_seeker'].includes(userType);

  return (
    <div className="sub-backdrop" onClick={onClose} data-testid="subscription-backdrop">
      <div className="sub-panel" onClick={e => e.stopPropagation()} data-testid="subscription-center">
        <div className="sub-header">
          <h2>الاشتراكات والباقات</h2>
          <button className="sub-close" onClick={onClose} data-testid="subscription-close">✕</button>
        </div>

        {message && (
          <div className={`sub-flash ${message.type}`} data-testid="subscription-flash">{message.text}</div>
        )}

        {/* Guest CTA */}
        {isGuest && (
          <div className="sub-flash success" data-testid="guest-cta">
            تصفّح الباقات والأسعار بحرية — سجّل الدخول للاشتراك وإدارة باقتك ونقاطك
          </div>
        )}

        {/* Current status */}
        {!isGuest && (
        <div className="sub-status" data-testid="billing-status">
          <div className="sub-status-item">
            <span className="lbl">نموذج التعامل</span>
            <strong>{billing.engagement_model ? (config.engagement_models.find(m => m.key === billing.engagement_model)?.name_ar || billing.engagement_model) : 'لم يُحدد'}</strong>
          </div>
          <div className="sub-status-item">
            <span className="lbl">الباقة الحالية</span>
            <strong>{billing.plan_name_ar || '—'}</strong>
          </div>
          <div className="sub-status-item">
            <span className="lbl">عمولة النجاح</span>
            <strong>{me.commission?.percentage ?? 0}%</strong>
          </div>
          <div className="sub-status-item points">
            <span className="lbl">رصيد النقاط</span>
            <strong data-testid="points-balance">{me.wallet?.available_points ?? 0} نقطة</strong>
          </div>
        </div>
        )}

        {/* Badges */}
        {me.badges?.length > 0 && (
          <div className="sub-badges" data-testid="user-badges">
            {me.badges.map(b => (
              <span key={b.badge_key} className="sub-badge">🏅 {b.badge_name_ar}</span>
            ))}
          </div>
        )}

        {/* Engagement models */}
        <h3 className="sub-section-title">نموذج التعامل</h3>
        <div className="sub-models">
          {config.engagement_models.map(m => (
            <button
              key={m.key}
              className={`sub-model-card ${billing.engagement_model === m.key ? 'active' : ''} ${m.coming_soon ? 'soon' : ''}`}
              disabled={busy || m.coming_soon}
              onClick={() => selectModel(m.key)}
              data-testid={`model-${m.key.toLowerCase()}`}
            >
              <strong>{m.name_ar}</strong>
              <span>{m.description_ar}</span>
              {m.coming_soon && <em className="soon-tag">قريباً</em>}
              {billing.engagement_model === m.key && <em className="active-tag">مفعّل ✓</em>}
            </button>
          ))}
        </div>

        {/* Plans (brokers & photographers) */}
        {!isOwnerType && (
          <>
            <h3 className="sub-section-title">الباقات المتاحة</h3>
            <div className="sub-promo-row">
              <input
                value={promo}
                onChange={e => { setPromo(e.target.value); setPromoStatus(null); }}
                placeholder="كود الخصم (اختياري)"
                data-testid="promo-input"
              />
              <button onClick={checkPromo} disabled={!promo} data-testid="promo-check-btn">تحقق</button>
              {promoStatus && (
                <span className={`promo-result ${promoStatus.valid ? 'ok' : 'bad'}`} data-testid="promo-result">
                  {promoStatus.valid
                    ? `✓ خصم ${promoStatus.discount_type === 'percentage' ? promoStatus.value + '%' : promoStatus.value + ' ريال'}`
                    : promoStatus.error}
                </span>
              )}
            </div>
            <div className="sub-plans">
              {config.plans.map(plan => (
                <div key={plan.id} className={`sub-plan-card ${billing.plan_key === plan.key ? 'current' : ''} plan-${plan.key}`} data-testid={`plan-card-${plan.key}`}>
                  <div className="plan-name">{plan.name_ar}</div>
                  <div className="plan-price">
                    {plan.billing === 'custom'
                      ? <span className="custom">حسب الاتفاق</span>
                      : <><strong>{plan.price}</strong> ريال{plan.billing === 'monthly' ? '/شهر' : ''}</>}
                  </div>
                  <ul className="plan-features">
                    {Object.entries(FEATURE_LABELS).map(([k, label]) => (
                      <li key={k}><span>{label}</span><strong>{fmtFeature(k, plan.features?.[k])}</strong></li>
                    ))}
                    {plan.features?.crm_access && <li className="yes">✓ نظام CRM</li>}
                    {plan.features?.priority_support && <li className="yes">✓ دعم أولوية</li>}
                  </ul>
                  {billing.plan_key === plan.key ? (
                    <div className="plan-current-tag">باقتك الحالية</div>
                  ) : plan.billing === 'custom' ? (
                    <button className="plan-btn outline" data-testid={`plan-contact-${plan.key}`}>تواصل مع المبيعات</button>
                  ) : (
                    <button className="plan-btn" disabled={busy} onClick={() => subscribe(plan)} data-testid={`plan-subscribe-${plan.key}`}>
                      {plan.price > 0 ? 'اشترك الآن' : 'فعّل مجاناً'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Success fee simulator */}
            {!isGuest && (
            <>
            <h3 className="sub-section-title">حاسبة عمولة النجاح</h3>
            <div className="sub-sim" data-testid="fee-simulator">
              <input
                type="number"
                value={simAmount}
                onChange={e => setSimAmount(e.target.value)}
                placeholder="قيمة العمولة / الصفقة"
                data-testid="sim-amount-input"
              />
              <button onClick={simulate} data-testid="sim-calc-btn">احسب</button>
              {simResult && (
                <div className="sim-result" data-testid="sim-result">
                  رسوم المنصة ({simResult.percentage}%): <strong>{simResult.platform_fee} ريال</strong>
                  {' — '}صافي لك: <strong>{simResult.net_amount} ريال</strong>
                </div>
              )}
            </div>
            </>
            )}
          </>
        )}
        {isOwnerType && (
          <>
            <h3 className="sub-section-title">منتجات الإعلانات</h3>
            <div className="sub-plans ads">
              {config.ad_products.map(p => (
                <div key={p.id} className="sub-plan-card" data-testid={`ad-product-${p.key}`}>
                  <div className="plan-name">{p.name_ar}</div>
                  <div className="plan-price"><strong>{p.price}</strong> ريال / {p.duration_days} يوم</div>
                  <ul className="plan-features">
                    <li><span>الأولوية</span><strong>{p.priority_level}</strong></li>
                    {p.homepage_visibility && <li className="yes">✓ الظهور بالرئيسية</li>}
                    {p.search_boost && <li className="yes">✓ تعزيز البحث</li>}
                  </ul>
                  <button
                    className="plan-btn"
                    disabled={busy}
                    onClick={async () => {
                      if (isGuest) { onRequireLogin && onRequireLogin(); return; }
                      setBusy(true);
                      try {
                        const r = await axios.post(`${API}/finance/purchase-ad`,
                          { product_key: p.key, promo_code: promoStatus?.valid ? promo : null }, authHeaders());
                        flash('success', `تم شراء إعلان ${p.name_ar} — ${r.data.transaction.net_amount} ريال`);
                        load();
                      } catch (e) {
                        flash('error', e.response?.data?.detail || 'فشل الشراء');
                      } finally { setBusy(false); }
                    }}
                    data-testid={`ad-buy-${p.key}`}
                  >
                    {p.price > 0 ? 'شراء' : 'نشر مجاني'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Redeem points */}
        {!isGuest && config.redeem_rules?.length > 0 && (
          <>
            <h3 className="sub-section-title">استبدال النقاط</h3>
            <div className="sub-redeem">
              {config.redeem_rules.map(r => (
                <button
                  key={r.key}
                  className="redeem-card"
                  disabled={busy || (me.wallet?.available_points ?? 0) < r.points}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await axios.post(`${API}/finance/redeem-points`, { service_key: r.key }, authHeaders());
                      flash('success', `تم استبدال ${res.data.points_used} نقطة مقابل: ${res.data.service}`);
                      load();
                    } catch (e) {
                      flash('error', e.response?.data?.detail || 'فشل الاستبدال');
                    } finally { setBusy(false); }
                  }}
                  data-testid={`redeem-${r.key.toLowerCase()}`}
                >
                  <strong>{r.name_ar}</strong>
                  <span>{r.points} نقطة</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Transactions */}
        {!isGuest && (
        <>
        <h3 className="sub-section-title">آخر المعاملات المالية</h3>
        {me.transactions?.length === 0 ? (
          <div className="sub-empty">لا توجد معاملات بعد</div>
        ) : (
          <div className="sub-txns" data-testid="transactions-list">
            {me.transactions.map(t => (
              <div key={t.id} className="sub-txn">
                <span className="t-type">{TXN_LABELS[t.transaction_type] || t.transaction_type}</span>
                <span className="t-desc">{t.description}</span>
                <span className={`t-amount ${t.platform_fee > 0 ? 'fee' : ''}`}>
                  {t.platform_fee > 0 ? `رسوم: ${t.platform_fee}` : t.net_amount} ريال
                </span>
                <span className={`t-status ${t.payment_status}`}>{t.payment_status === 'paid' ? 'مدفوع' : t.payment_status}</span>
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionCenter;
