import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SAUDI_REGIONS, REGION_OPTIONS } from '../utils/saudiRegions';
import './ProfileModal.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });

const EMPTY = {
  full_name_arabic: '', email: '', region: '', city: '', districts: [], specializations: [],
  fal_license: '', experience_years: '', company_name: '', commercial_register: '', bio: '', portfolio_url: '',
};

export default function ProfileModal({ currentUser, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [options, setOptions] = useState({});
  const [districtInput, setDistrictInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || null);

  const uploadAvatar = async (file) => {
    if (!file) return;
    setAvatarBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await axios.post(`${API}/profile/avatar`, fd, auth());
      setAvatarUrl(r.data.avatar_url);
      const merged = { ...currentUser, avatar_url: r.data.avatar_url };
      localStorage.setItem('user_data', JSON.stringify(merged));
      onSaved && onSaved(merged);
      setMsg({ type: 'ok', text: isCompany ? 'تم تحديث شعار المنشأة' : 'تم تحديث صورتك الشخصية' });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.detail || 'فشل رفع الصورة' });
    } finally { setAvatarBusy(false); }
  };

  const role = currentUser?.user_type || '';
  const isBroker = role.startsWith('broker');
  const isPhotographer = role === 'photographer';
  const isCompany = role === 'broker_company';
  const specOptions = isBroker ? options.broker_specializations : isPhotographer ? options.photographer_specializations : null;
  const cities = form.region ? SAUDI_REGIONS[form.region]?.cities || [] : [];

  useEffect(() => {
    axios.get(`${API}/profile/me`, auth()).then((r) => {
      const p = r.data.profile || {};
      setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(p).filter(([k, v]) => k in EMPTY && v != null)) });
      setOptions(r.data.options || {});
    }).catch(() => setMsg({ type: 'error', text: 'تعذر تحميل الملف الشخصي' })).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSpec = (k) => set('specializations', form.specializations.includes(k)
    ? form.specializations.filter((s) => s !== k) : [...form.specializations, k]);
  const addDistrict = () => {
    const d = districtInput.trim();
    if (d && !form.districts.includes(d)) set('districts', [...form.districts, d]);
    setDistrictInput('');
  };

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
      if (payload.experience_years != null) payload.experience_years = parseInt(payload.experience_years, 10);
      const r = await axios.put(`${API}/profile/me`, payload, auth());
      const merged = { ...currentUser, ...r.data.profile };
      localStorage.setItem('user_data', JSON.stringify(merged));
      onSaved && onSaved(merged);
      setMsg({ type: 'ok', text: 'تم حفظ ملفك الشخصي بنجاح' });
    } catch (e) {
      const d = e.response?.data?.detail;
      setMsg({ type: 'error', text: Array.isArray(d) ? d.map((x) => x.msg).join('، ') : d || 'فشل حفظ البيانات' });
    } finally { setBusy(false); }
  };

  return (
    <div className="pm-backdrop" onClick={onClose} data-testid="profile-backdrop">
      <div className="pm-modal" onClick={(e) => e.stopPropagation()} data-testid="profile-modal">
        <div className="pm-header">
          <div>
            <h2>ملفي الشخصي</h2>
            <p>البيانات التي تساعد العملاء والمنصة على الوصول إليك في منطقتك</p>
          </div>
          <button className="pm-close" onClick={onClose} data-testid="profile-close">✕</button>
        </div>

        {loading ? <div className="pm-loading">جاري التحميل...</div> : (
          <div className="pm-body">
            <section className="pm-section pm-avatar-section" data-testid="profile-avatar-section">
              <div className="pm-avatar">
                {avatarUrl ? <img src={`${process.env.REACT_APP_BACKEND_URL}${avatarUrl}`} alt="" data-testid="profile-avatar-img" />
                  : <span>{(form.full_name_arabic || form.company_name || '?').charAt(0)}</span>}
                {avatarBusy && <div className="pm-avatar-busy">...</div>}
              </div>
              <div className="pm-avatar-text">
                <strong>{isCompany ? 'شعار المنشأة' : 'الصورة الشخصية'}</strong>
                <span>تظهر في قائمتك وبجانب اسمك في تفاصيل كل إعلان. JPG أو PNG أو WEBP حتى 3 ميجابايت.</span>
                <label className="pm-upload-btn">
                  {avatarUrl ? 'تغيير الصورة' : 'رفع صورة'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden data-testid="profile-avatar-input"
                    onChange={(e) => { uploadAvatar(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
              </div>
            </section>

            <section className="pm-section">
              <h3>البيانات الأساسية</h3>
              <div className="pm-grid">
                <label>الاسم الكامل (عربي)
                  <input data-testid="profile-name" value={form.full_name_arabic} onChange={(e) => set('full_name_arabic', e.target.value)} placeholder="مثال: محمد بن أحمد العتيبي" />
                </label>
                <label>البريد الإلكتروني
                  <input data-testid="profile-email" dir="ltr" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.com" />
                </label>
                <label>المنطقة
                  <select data-testid="profile-region" value={form.region} onChange={(e) => { set('region', e.target.value); set('city', ''); }}>
                    <option value="">اختر المنطقة</option>
                    {REGION_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                  </select>
                </label>
                <label>المدينة
                  <select data-testid="profile-city" value={form.city} onChange={(e) => set('city', e.target.value)} disabled={!form.region}>
                    <option value="">اختر المدينة</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              {(isBroker || isPhotographer) && (
                <label className="pm-full">الأحياء التي تغطيها
                  <div className="pm-tags">
                    {form.districts.map((d) => (
                      <span key={d} className="pm-tag">{d}<button type="button" onClick={() => set('districts', form.districts.filter((x) => x !== d))}>×</button></span>
                    ))}
                    <input data-testid="profile-district-input" value={districtInput} onChange={(e) => setDistrictInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDistrict(); } }}
                      placeholder="اكتب اسم الحي واضغط Enter" />
                  </div>
                </label>
              )}
            </section>

            {(isBroker || isPhotographer) && (
              <section className="pm-section">
                <h3>{isBroker ? 'الترخيص والخبرة' : 'الخبرة والأعمال'}</h3>
                <div className="pm-grid">
                  {isBroker && (
                    <label>رقم رخصة فال
                      <input data-testid="profile-fal" dir="ltr" value={form.fal_license} onChange={(e) => set('fal_license', e.target.value)} placeholder="12000XXXXX" />
                    </label>
                  )}
                  <label>سنوات الخبرة
                    <input data-testid="profile-experience" type="number" min="0" max="60" value={form.experience_years} onChange={(e) => set('experience_years', e.target.value)} />
                  </label>
                  {isCompany && (<>
                    <label>اسم المنشأة
                      <input data-testid="profile-company" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
                    </label>
                    <label>السجل التجاري
                      <input data-testid="profile-cr" dir="ltr" value={form.commercial_register} onChange={(e) => set('commercial_register', e.target.value)} />
                    </label>
                  </>)}
                  {isPhotographer && (
                    <label>رابط معرض الأعمال
                      <input data-testid="profile-portfolio" dir="ltr" value={form.portfolio_url} onChange={(e) => set('portfolio_url', e.target.value)} placeholder="https://" />
                    </label>
                  )}
                </div>
                {specOptions && (
                  <div className="pm-full">
                    <span className="pm-label">التخصص</span>
                    <div className="pm-chips" data-testid="profile-specializations">
                      {Object.entries(specOptions).map(([k, label]) => (
                        <button type="button" key={k} className={`pm-chip ${form.specializations.includes(k) ? 'on' : ''}`}
                          onClick={() => toggleSpec(k)} data-testid={`spec-${k}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                )}
                <label className="pm-full">نبذة تعريفية
                  <textarea data-testid="profile-bio" rows={3} maxLength={600} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="عرّف العملاء بنفسك وخدماتك" />
                </label>
              </section>
            )}

            {msg && <div className={`pm-msg ${msg.type}`} data-testid="profile-message">{msg.text}</div>}
            <div className="pm-actions">
              <button className="pm-cancel" onClick={onClose}>إغلاق</button>
              <button className="pm-save" onClick={save} disabled={busy} data-testid="profile-save">{busy ? 'جاري الحفظ...' : 'حفظ البيانات'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
