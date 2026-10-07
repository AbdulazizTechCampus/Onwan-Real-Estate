import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SAUDI_REGIONS } from '../utils/saudiRegions';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPE_LABELS = { broker_individual: 'وسيط فرد', broker_company: 'شركة وساطة', photographer: 'مصور', property_owner: 'مالك عقار' };
const SPEC = {
  residential_sale: 'بيع سكني', residential_rent: 'تأجير سكني', commercial: 'تجاري', land: 'أراضٍ', projects: 'مشاريع',
  management: 'إدارة أملاك', photo: 'فوتوغرافي', video: 'فيديو', drone: 'درون', virtual_tour: 'جولة 360', staging: 'تجهيز',
};
const TXN = {
  SUBSCRIPTION_PAYMENT: 'اشتراك', LISTING_PAYMENT: 'إعلان', SUCCESS_FEE: 'رسوم نجاح',
  PHOTOGRAPHY_COMMISSION: 'عمولة تصوير', POINTS_PURCHASE: 'شراء نقاط',
};
const fmt = (d) => (d ? new Date(d).toLocaleString('en-US') : '—');
const Field = ({ label, value, ltr }) => (
  <div className="ud-field"><label>{label}</label><span dir={ltr ? 'ltr' : undefined}>{value || <em>غير محدد</em>}</span></div>
);

export default function AdminUserDetail({ userId, getAuthHeaders, onBack }) {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('properties');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const load = () => axios.get(`${API}/admin/directory/user/${userId}`, getAuthHeaders()).then((r) => setD(r.data)).catch(console.error);
  useEffect(() => { load(); }, [userId]);

  if (!d) return <div className="dir-loading">جاري التحميل...</div>;
  const u = d.user;
  const suspended = u.is_active === false;

  const toggleSuspend = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/admin/directory/user/${userId}/suspend`, { suspended: !suspended, reason: reason || null }, getAuthHeaders());
      setConfirm(false); setReason('');
      await load();
    } catch (e) { alert(e.response?.data?.detail || 'فشلت العملية'); }
    finally { setBusy(false); }
  };

  const tabs = [
    ['properties', `الإعلانات (${d.properties.length})`],
    ['transactions', `المعاملات المالية (${d.transactions.length})`],
    ['audit', `سجل التدقيق (${d.audit_logs.length})`],
  ];

  return (
    <div className="management-section ud" data-testid="admin-user-detail">
      <button type="button" className="ud-back" onClick={onBack} data-testid="ud-back">← العودة للقائمة</button>

      <div className={`ud-hero ${suspended ? 'suspended' : ''}`}>
        <div className="ud-avatar">{(u.company_name || u.full_name_arabic || '?').charAt(0)}</div>
        <div className="ud-hero-info">
          <h2>{u.company_name || u.full_name_arabic || 'بدون اسم'}</h2>
          <div className="ud-meta">
            <span>{TYPE_LABELS[u.user_type] || u.user_type}</span>
            <span dir="ltr">{u.phone_number}</span>
            {u.region && <span>{SAUDI_REGIONS[u.region]?.name} — {u.city || ''}</span>}
            {suspended ? <span className="dir-badge off">موقوف</span>
              : u.is_nafath_verified ? <span className="dir-badge ok">موثق نفاذ</span> : <span className="dir-badge warn">غير موثق</span>}
          </div>
          {suspended && u.suspension_reason && <p className="ud-reason">سبب الإيقاف: {u.suspension_reason}</p>}
        </div>
        <div className="ud-actions">
          {!confirm ? (
            <button type="button" className={`ud-suspend ${suspended ? 'reactivate' : ''}`} onClick={() => setConfirm(true)} data-testid="ud-suspend-btn">
              {suspended ? 'إعادة تفعيل الحساب' : 'إيقاف الحساب'}
            </button>
          ) : (
            <div className="ud-confirm" data-testid="ud-suspend-confirm">
              {!suspended && <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الإيقاف (اختياري)" data-testid="ud-suspend-reason" />}
              <button type="button" onClick={toggleSuspend} disabled={busy} data-testid="ud-suspend-confirm-btn">{busy ? '...' : 'تأكيد'}</button>
              <button type="button" className="ghost" onClick={() => setConfirm(false)}>إلغاء</button>
            </div>
          )}
        </div>
      </div>

      <div className="ud-kpis">
        <div><span>{u.active_listings}</span><label>إعلانات نشطة</label></div>
        <div><span>{u.completed_deals}</span><label>صفقات مكتملة</label></div>
        <div><span>{u.featured_listings}</span><label>إعلانات مميزة</label></div>
        <div><span>{Number(u.total_revenue || 0).toLocaleString('en-US')}</span><label>إيراد المنصة (ر.س)</label></div>
        <div><span>{u.points}</span><label>رصيد النقاط</label></div>
        <div><span>{u.plan_name_ar || '—'}</span><label>الباقة الحالية</label></div>
      </div>

      <div className="ud-grid">
        <section className="ud-card">
          <h3>بيانات الملف</h3>
          <Field label="الاسم" value={u.full_name_arabic} />
          <Field label="البريد الإلكتروني" value={u.email} ltr />
          {u.user_type.startsWith('broker') && <Field label="رخصة فال" value={u.fal_license} ltr />}
          {u.user_type === 'broker_company' && <><Field label="المنشأة" value={u.company_name} /><Field label="السجل التجاري" value={u.commercial_register} ltr /></>}
          {u.user_type === 'photographer' && <Field label="معرض الأعمال" value={u.portfolio_url} ltr />}
          <Field label="سنوات الخبرة" value={u.experience_years != null ? `${u.experience_years} سنة` : null} />
          <Field label="الأحياء" value={(u.districts || []).join('، ')} />
          <Field label="التخصص" value={(u.specializations || []).map((k) => SPEC[k] || k).join('، ')} />
          {u.bio && <Field label="نبذة" value={u.bio} />}
        </section>
        <section className="ud-card">
          <h3>الحساب والاشتراك</h3>
          <Field label="تاريخ التسجيل" value={fmt(u.created_at)} />
          <Field label="آخر دخول" value={fmt(u.last_login)} />
          <Field label="نموذج التعامل" value={u.engagement_model} ltr />
          <Field label="حالة الاشتراك" value={d.billing?.status} ltr />
          <Field label="ينتهي في" value={d.billing?.expires_at ? fmt(d.billing.expires_at) : null} />
          <Field label="عدد المعاملات" value={String(u.transactions_count)} />
          <Field label="الشارات" value={d.badges.map((b) => b.badge_key).join('، ')} />
        </section>
      </div>

      <div className="ud-tabs">
        {tabs.map(([k, l]) => <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)} data-testid={`ud-tab-${k}`}>{l}</button>)}
      </div>

      <div className="data-table-container">
        {tab === 'properties' && (
          <table className="data-table"><thead><tr><th>العنوان</th><th>المدينة</th><th>السعر</th><th>النوع</th><th>الحالة</th><th>المشاهدات</th><th>النشر</th></tr></thead>
            <tbody>{d.properties.length === 0 ? <tr><td colSpan={7} className="ud-none">لا توجد إعلانات</td></tr> : d.properties.map((p) => (
              <tr key={p.id}><td>{p.title}</td><td>{p.city}</td><td>{p.price} ر.س</td><td>{p.status}</td>
                <td>{p.is_completed ? <span className="dir-badge ok">مكتمل</span> : <span className="dir-badge info">نشط</span>}</td>
                <td className="num">{p.views ?? 0}</td><td>{p.publishDate}</td></tr>))}</tbody></table>
        )}
        {tab === 'transactions' && (
          <table className="data-table"><thead><tr><th>النوع</th><th>الوصف</th><th>الإجمالي</th><th>رسوم المنصة</th><th>الخصم</th><th>الحالة</th><th>التاريخ</th></tr></thead>
            <tbody>{d.transactions.length === 0 ? <tr><td colSpan={7} className="ud-none">لا توجد معاملات</td></tr> : d.transactions.map((t) => (
              <tr key={t.id}><td>{TXN[t.transaction_type] || t.transaction_type}</td><td>{t.description}</td>
                <td className="num">{t.net_amount} ر.س</td><td className="num">{t.platform_fee || 0}</td><td className="num">{t.discount || 0}</td>
                <td><span className={`dir-badge ${t.payment_status === 'paid' ? 'ok' : 'warn'}`}>{t.payment_status}</span></td><td>{fmt(t.created_at)}</td></tr>))}</tbody></table>
        )}
        {tab === 'audit' && (
          <table className="data-table"><thead><tr><th>العملية</th><th>الكيان</th><th>بواسطة</th><th>التاريخ</th></tr></thead>
            <tbody>{d.audit_logs.length === 0 ? <tr><td colSpan={4} className="ud-none">لا توجد سجلات</td></tr> : d.audit_logs.map((a) => (
              <tr key={a.id}><td>{a.action}</td><td>{a.entity_type}</td><td dir="ltr">{a.actor_phone || a.actor_id}</td><td>{fmt(a.created_at)}</td></tr>))}</tbody></table>
        )}
      </div>
    </div>
  );
}
