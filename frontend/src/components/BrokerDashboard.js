import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './BrokerDashboard.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');
const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
const TXN = { SUBSCRIPTION_PAYMENT: 'اشتراك', LISTING_PAYMENT: 'إعلان', SUCCESS_FEE: 'رسوم نجاح', PHOTOGRAPHY_COMMISSION: 'عمولة تصوير', POINTS_PURCHASE: 'شراء نقاط' };
const TABS = [['overview', 'نظرة عامة'], ['stats', 'الإحصائيات'], ['listings', 'إعلاناتي'], ['leads', 'المهتمون'], ['finance', 'المعاملات المالية'], ['points', 'النقاط والشارات']];

const Kpi = ({ value, label, accent, testId }) => (
  <div className={`bd-kpi ${accent || ''}`} data-testid={testId}><span>{fmtNum(value)}</span><label>{label}</label></div>
);

const ViewsChart = ({ series }) => {
  const max = Math.max(1, ...series.map((s) => s.views));
  return (
    <div className="bd-chart" data-testid="views-chart">
      {series.map((s) => (
        <div key={s.date} className="bd-bar-col" title={`${s.date}: ${s.views} مشاهدة`}>
          <div className="bd-bar" style={{ height: `${Math.max(3, (s.views / max) * 100)}%` }} />
          {new Date(s.date).getDate() % 5 === 0 && <small>{s.date.slice(5)}</small>}
        </div>
      ))}
    </div>
  );
};

export default function BrokerDashboard({ currentUser, initialTab = 'overview', onClose, onOpenAddProperty, onOpenProfile, onOpenSubscriptions, onSelectProperty, onToggleStatus }) {
  const [tab, setTab] = useState(initialTab);
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => axios.get(`${API}/broker/dashboard`, auth()).then((r) => setD(r.data))
    .catch((e) => setError(e.response?.data?.detail || 'تعذر تحميل اللوحة')), []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id, val) => { await onToggleStatus(id, val); load(); };
  const act = (a) => ({ profile: onOpenProfile, subscriptions: onOpenSubscriptions, add: onOpenAddProperty }[a] || (() => {}))();

  const k = d?.kpis || {};
  const plan = d?.plan || {};
  const usagePct = plan.max_listings ? Math.min(100, Math.round((plan.used / plan.max_listings) * 100)) : 0;

  return (
    <div className="bd-page" data-testid="broker-dashboard">
      <header className="bd-top">
        <div className="bd-top-user">
          <div className="bd-avatar">
            {currentUser.avatar_url ? <img src={`${process.env.REACT_APP_BACKEND_URL}${currentUser.avatar_url}`} alt="" /> : (currentUser.full_name_arabic || '?').charAt(0)}
          </div>
          <div>
            <h1>لوحة تحكم الوسيط</h1>
            <p>{currentUser.company_name || currentUser.full_name_arabic || currentUser.phone_number}{plan.name_ar ? ` · باقة ${plan.name_ar}` : ''}</p>
          </div>
        </div>
        <div className="bd-top-actions">
          <button type="button" className="bd-btn primary" onClick={onOpenAddProperty} data-testid="bd-add-property">+ إضافة عقار</button>
          <button type="button" className="bd-btn" onClick={onOpenProfile} data-testid="bd-open-profile">ملفي</button>
          <button type="button" className="bd-btn" onClick={onOpenSubscriptions} data-testid="bd-open-subscriptions">الاشتراك</button>
          <button type="button" className="bd-close" onClick={onClose} data-testid="bd-close">العودة للموقع</button>
        </div>
      </header>

      <nav className="bd-tabs">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" className={tab === key ? 'on' : ''} onClick={() => setTab(key)} data-testid={`bd-tab-${key}`}>{label}</button>
        ))}
      </nav>

      <div className="bd-body">
        {error && <div className="bd-error" data-testid="bd-error">{error}</div>}
        {!d && !error && <div className="bd-loading">جاري التحميل...</div>}

        {d && tab === 'overview' && (
          <>
            {d.alerts.length > 0 && (
              <div className="bd-alerts" data-testid="bd-alerts">
                {d.alerts.map((a, i) => (
                  <div key={i} className={`bd-alert ${a.level}`}>
                    <span>{a.text}</span>
                    <button type="button" onClick={() => act(a.action)}>{a.action === 'profile' ? 'إكمال الملف' : 'عرض'}</button>
                  </div>
                ))}
              </div>
            )}
            <div className="bd-kpis">
              <Kpi value={k.active_listings} label="إعلانات نشطة" accent="navy" testId="kpi-active" />
              <Kpi value={k.completed_deals} label="صفقات مكتملة" testId="kpi-completed" />
              <Kpi value={k.total_views} label="إجمالي المشاهدات" testId="kpi-views" />
              <Kpi value={k.leads} label="مهتمون" testId="kpi-leads" />
              <Kpi value={k.points} label="رصيد النقاط" testId="kpi-points" />
              <div className="bd-kpi plan" data-testid="kpi-plan">
                <span>{plan.name_ar || 'بدون باقة'}</span>
                <label>{plan.max_listings ? `${plan.used} / ${plan.max_listings} إعلان` : plan.key ? 'إعلانات غير محدودة' : 'نشر مجاني'}</label>
                {plan.max_listings && <div className="bd-usage"><i style={{ width: `${usagePct}%` }} /></div>}
              </div>
            </div>
            <div className="bd-two">
              <section className="bd-card">
                <h3>المشاهدات آخر 30 يوماً <small>{fmtNum(k.views_30d)} مشاهدة</small></h3>
                <ViewsChart series={d.views_series} />
              </section>
              <section className="bd-card">
                <h3>آخر إعلاناتي</h3>
                <ListingsTable listings={d.listings.slice(0, 5)} onSelect={onSelectProperty} onToggle={toggle} compact />
                {d.listings.length === 0 && <EmptyRow text="لم تنشر أي إعلان بعد" action="ابدأ بإضافة عقار" onAction={onOpenAddProperty} />}
              </section>
            </div>
          </>
        )}

        {d && tab === 'stats' && (
          <>
            <div className="bd-kpis">
              <Kpi value={k.views_30d} label="مشاهدات 30 يوماً" accent="navy" />
              <Kpi value={k.total_views} label="إجمالي المشاهدات" />
              <Kpi value={k.likes} label="إعجابات" />
              <Kpi value={k.leads} label="مهتمون" />
              <Kpi value={k.featured_listings} label="إعلانات مميزة" />
            </div>
            <section className="bd-card"><h3>المشاهدات اليومية</h3><ViewsChart series={d.views_series} /></section>
            <section className="bd-card">
              <h3>أداء كل إعلان</h3>
              <table className="bd-table" data-testid="stats-table">
                <thead><tr><th>الإعلان</th><th>الحالة</th><th>مشاهدات 30 يوماً</th><th>إجمالي</th><th>إعجابات</th><th>مهتمون</th><th>النوع</th></tr></thead>
                <tbody>{d.listings.map((p) => (
                  <tr key={p.id} onClick={() => onSelectProperty(p)}>
                    <td><strong>{p.title}</strong><small>{p.location}</small></td>
                    <td>{p.is_completed ? <span className="bd-badge ok">مكتمل</span> : <span className="bd-badge info">{p.status}</span>}</td>
                    <td className="num">{fmtNum(p.views_30d)}</td><td className="num">{fmtNum(p.views)}</td>
                    <td className="num">{p.likes}</td><td className="num">{p.interested}</td>
                    <td>{p.featured_type && p.featured_type !== 'standard' ? <span className="bd-badge gold">{p.featured_type}</span> : 'عادي'}</td>
                  </tr>))}</tbody>
              </table>
            </section>
          </>
        )}

        {d && tab === 'listings' && (
          <section className="bd-card">
            <h3>إعلاناتي <small>{d.listings.length} إعلان{plan.max_listings ? ` من ${plan.max_listings}` : ''}</small></h3>
            <ListingsTable listings={d.listings} onSelect={onSelectProperty} onToggle={toggle} />
            {d.listings.length === 0 && <EmptyRow text="لم تنشر أي إعلان بعد" action="إضافة عقار" onAction={onOpenAddProperty} />}
          </section>
        )}

        {d && tab === 'leads' && (
          <section className="bd-card">
            <h3>المهتمون بإعلاناتك <small>{d.leads.length}</small></h3>
            {d.leads.length === 0 ? <EmptyRow text="لا يوجد مهتمون بعد — عندما يضغط زائر «مهتم» على إعلانك سيظهر هنا مع بيانات التواصل" /> : (
              <table className="bd-table" data-testid="leads-table">
                <thead><tr><th>المهتم</th><th>الجوال</th><th>الإعلان</th><th>المدينة</th><th>التاريخ</th><th></th></tr></thead>
                <tbody>{d.leads.map((l, i) => (
                  <tr key={i}>
                    <td><strong>{l.user_name}</strong></td><td dir="ltr">{l.phone}</td>
                    <td>{l.property_title}</td><td>{l.city || '—'}</td><td>{fmtDate(l.since)}</td>
                    <td>{l.phone && <a className="bd-wa" href={`https://wa.me/966${l.phone.replace(/^0/, '')}`} target="_blank" rel="noreferrer">واتساب</a>}</td>
                  </tr>))}</tbody>
              </table>
            )}
          </section>
        )}

        {d && tab === 'finance' && (
          <>
            <div className="bd-kpis">
              <div className="bd-kpi navy"><span>{plan.name_ar || '—'}</span><label>الباقة الحالية</label></div>
              <div className="bd-kpi"><span>{plan.expires_at ? fmtDate(plan.expires_at) : '—'}</span><label>تاريخ الانتهاء</label></div>
              <div className="bd-kpi"><span>{plan.success_fee_percentage != null ? `${plan.success_fee_percentage}%` : '—'}</span><label>رسوم نجاح الصفقة</label></div>
              <div className="bd-kpi"><span>{d.transactions.length}</span><label>عدد المعاملات</label></div>
            </div>
            <section className="bd-card">
              <h3>المعاملات والفواتير</h3>
              {d.transactions.length === 0 ? <EmptyRow text="لا توجد معاملات بعد" /> : (
                <table className="bd-table" data-testid="finance-table">
                  <thead><tr><th>النوع</th><th>الوصف</th><th>المبلغ</th><th>الخصم</th><th>الحالة</th><th>التاريخ</th><th>المرجع</th></tr></thead>
                  <tbody>{d.transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{TXN[t.transaction_type] || t.transaction_type}</td><td>{t.description}</td>
                      <td className="num">{fmtNum(t.net_amount)} ر.س</td><td className="num">{fmtNum(t.discount)}</td>
                      <td><span className={`bd-badge ${t.payment_status === 'paid' ? 'ok' : 'warn'}`}>{t.payment_status === 'paid' ? 'مدفوع' : t.payment_status}</span></td>
                      <td>{fmtDate(t.created_at)}</td><td dir="ltr"><small>{t.id?.slice(0, 8)}</small></td>
                    </tr>))}</tbody>
                </table>
              )}
            </section>
          </>
        )}

        {d && tab === 'points' && (
          <>
            <div className="bd-kpis">
              <Kpi value={d.wallet.available_points} label="نقاط متاحة" accent="navy" />
              <Kpi value={d.wallet.total_points} label="إجمالي النقاط المكتسبة" />
              <Kpi value={d.badges.length} label="شارات" />
            </div>
            <section className="bd-card">
              <h3>شاراتي</h3>
              <div className="bd-badges" data-testid="badges-list">
                {d.badges.length === 0 ? <EmptyRow text="لم تحصل على شارات بعد — أكمل صفقاتك عبر المنصة لتكسب شاراتك" /> : d.badges.map((b) => (
                  <div key={b.key} className="bd-badge-card"><strong>{b.name_ar}</strong><small>{b.description_ar || ''}</small><em>{fmtDate(b.earned_at)}</em></div>
                ))}
              </div>
            </section>
            <section className="bd-card">
              <h3>سجل النقاط</h3>
              {d.point_transactions.length === 0 ? <EmptyRow text="لا توجد حركات نقاط بعد" /> : (
                <table className="bd-table">
                  <thead><tr><th>الحركة</th><th>النقاط</th><th>التاريخ</th></tr></thead>
                  <tbody>{d.point_transactions.map((t) => (
                    <tr key={t.id}><td>{t.description || t.rule_key}</td>
                      <td className={`num ${t.points < 0 ? 'neg' : 'pos'}`}>{t.points > 0 ? '+' : ''}{t.points}</td><td>{fmtDate(t.created_at)}</td></tr>))}</tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const EmptyRow = ({ text, action, onAction }) => (
  <div className="bd-empty">{text}{action && <button type="button" onClick={onAction}>{action}</button>}</div>
);

const ListingsTable = ({ listings, onSelect, onToggle, compact }) => listings.length === 0 ? null : (
  <table className="bd-table" data-testid="listings-table">
    <thead><tr><th>الإعلان</th><th>السعر</th><th>الحالة</th>{!compact && <th>مشاهدات</th>}{!compact && <th>مهتمون</th>}<th>تاريخ النشر</th><th>إجراء</th></tr></thead>
    <tbody>{listings.map((p) => (
      <tr key={p.id} data-testid={`listing-row-${p.id}`}>
        <td onClick={() => onSelect(p)} className="clickable"><strong>{p.title}</strong><small>{p.location}</small></td>
        <td className="num">{p.price} ر.س</td>
        <td>{p.is_completed ? <span className="bd-badge ok">{p.status === 'للإيجار' ? 'تم التأجير' : 'تم البيع'}</span> : <span className="bd-badge info">{p.status}</span>}</td>
        {!compact && <td className="num">{fmtNum(p.views)}</td>}
        {!compact && <td className="num">{p.interested}</td>}
        <td>{p.publishDate}</td>
        <td>
          <button type="button" className={`bd-toggle ${p.is_completed ? 'republish' : ''}`} onClick={() => onToggle(p.id, !p.is_completed)} data-testid={`toggle-status-${p.id}`}>
            {p.is_completed ? 'إعادة النشر' : p.status === 'للإيجار' ? 'تم التأجير' : 'تم البيع'}
          </button>
        </td>
      </tr>))}</tbody>
  </table>
);
