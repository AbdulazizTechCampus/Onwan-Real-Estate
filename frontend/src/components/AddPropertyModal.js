import React, { useState } from 'react';
import axios from 'axios';
import './AddPropertyModal.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPES = [
  { key: 'villa', label: 'فيلا' },
  { key: 'apartment', label: 'شقة' },
  { key: 'land', label: 'أرض' },
  { key: 'building', label: 'عمارة' },
  { key: 'office', label: 'مكتب' },
  { key: 'shop', label: 'محل تجاري' },
];

const CITIES = ['الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة', 'الخبر'];

export const AddPropertyModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    title: '', status: 'للبيع', type: 'apartment', category: 'residential',
    price: '', city: 'الرياض', district: '', area: '',
    bedrooms: '', bathrooms: '', age: '', image: '', description: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !form.price || !form.area) {
      setError('العنوان والسعر والمساحة حقول مطلوبة');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...form,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        age: form.age ? parseInt(form.age) : 0,
        image: form.image || null,
        district: form.district || null,
      };
      const r = await axios.post(`${API}/properties`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      onCreated && onCreated(r.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'فشل نشر الإعلان');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="apm-backdrop" onClick={onClose} data-testid="add-property-backdrop">
      <div className="apm-modal" onClick={e => e.stopPropagation()} data-testid="add-property-modal">
        <div className="apm-header">
          <h2>إضافة عقار جديد</h2>
          <button className="apm-close" onClick={onClose} data-testid="add-property-close">✕</button>
        </div>

        {error && <div className="apm-error" data-testid="add-property-error">{error}</div>}

        <div className="apm-grid">
          <label className="apm-field full">
            <span>عنوان الإعلان *</span>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="مثال: فيلا حديثة مع حديقة في حي النرجس" data-testid="ap-title-input" />
          </label>

          <label className="apm-field">
            <span>الغرض *</span>
            <select value={form.status} onChange={e => set('status', e.target.value)} data-testid="ap-status-select">
              <option value="للبيع">للبيع</option>
              <option value="للإيجار">للإيجار</option>
            </select>
          </label>

          <label className="apm-field">
            <span>نوع العقار</span>
            <select value={form.type} onChange={e => set('type', e.target.value)} data-testid="ap-type-select">
              {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </label>

          <label className="apm-field">
            <span>الفئة</span>
            <select value={form.category} onChange={e => set('category', e.target.value)} data-testid="ap-category-select">
              <option value="residential">سكني</option>
              <option value="commercial">تجاري</option>
            </select>
          </label>

          <label className="apm-field">
            <span>السعر (ريال) *</span>
            <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
              placeholder="850000" data-testid="ap-price-input" />
          </label>

          <label className="apm-field">
            <span>المدينة</span>
            <select value={form.city} onChange={e => set('city', e.target.value)} data-testid="ap-city-select">
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="apm-field">
            <span>الحي</span>
            <input value={form.district} onChange={e => set('district', e.target.value)}
              placeholder="النرجس" data-testid="ap-district-input" />
          </label>

          <label className="apm-field">
            <span>المساحة (م²) *</span>
            <input type="number" value={form.area} onChange={e => set('area', e.target.value)}
              placeholder="250" data-testid="ap-area-input" />
          </label>

          <label className="apm-field">
            <span>غرف النوم</span>
            <input type="number" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} data-testid="ap-bedrooms-input" />
          </label>

          <label className="apm-field">
            <span>دورات المياه</span>
            <input type="number" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} data-testid="ap-bathrooms-input" />
          </label>

          <label className="apm-field">
            <span>عمر البناء (سنة)</span>
            <input type="number" value={form.age} onChange={e => set('age', e.target.value)} data-testid="ap-age-input" />
          </label>

          <label className="apm-field full">
            <span>رابط صورة (اختياري)</span>
            <input value={form.image} onChange={e => set('image', e.target.value)} dir="ltr"
              placeholder="https://..." data-testid="ap-image-input" />
          </label>

          <label className="apm-field full">
            <span>الوصف</span>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="وصف تفصيلي للعقار..." data-testid="ap-description-input" />
          </label>
        </div>

        <div className="apm-actions">
          <button className="apm-submit" disabled={busy} onClick={submit} data-testid="ap-submit-btn">
            {busy ? 'جارٍ النشر...' : 'نشر الإعلان'}
          </button>
          <button className="apm-cancel" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
};

export default AddPropertyModal;
