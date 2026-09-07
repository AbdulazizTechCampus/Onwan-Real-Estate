import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AdminFinance.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Field types: text | number | bool | json | list (comma separated)
const TABS = [
  {
    key: 'plans', label: 'الباقات',
    fields: [
      { key: 'key', label: 'المعرف (key)', type: 'text' },
      { key: 'name_ar', label: 'الاسم', type: 'text' },
      { key: 'price', label: 'السعر الشهري', type: 'number' },
      { key: 'billing', label: 'نوع الفوترة (monthly/success_fee/custom)', type: 'text' },
      { key: 'user_types', label: 'أنواع المستخدمين', type: 'list' },
      { key: 'sort_order', label: 'الترتيب', type: 'number' },
      { key: 'features', label: 'المزايا (JSON)', type: 'json' },
      { key: 'is_active', label: 'مفعّلة', type: 'bool' },
    ],
    columns: ['name_ar', 'price', 'billing', 'is_active'],
  },
  {
    key: 'ad-products', label: 'منتجات الإعلانات',
    fields: [
      { key: 'key', label: 'المعرف (key)', type: 'text' },
      { key: 'name_ar', label: 'الاسم', type: 'text' },
      { key: 'price', label: 'السعر', type: 'number' },
      { key: 'duration_days', label: 'المدة (يوم)', type: 'number' },
      { key: 'priority_level', label: 'الأولوية', type: 'number' },
      { key: 'homepage_visibility', label: 'الظهور بالرئيسية', type: 'bool' },
      { key: 'search_boost', label: 'تعزيز البحث', type: 'bool' },
      { key: 'is_active', label: 'مفعّل', type: 'bool' },
    ],
    columns: ['name_ar', 'price', 'duration_days', 'priority_level', 'is_active'],
  },
  {
    key: 'commission-rules', label: 'قواعد العمولات',
    fields: [
      { key: 'key', label: 'المعرف (key)', type: 'text' },
      { key: 'name_ar', label: 'الاسم', type: 'text' },
      { key: 'user_types', label: 'أنواع المستخدمين', type: 'list' },
      { key: 'transaction_type', label: 'نوع المعاملة', type: 'text' },
      { key: 'percentage', label: 'النسبة %', type: 'number' },
      { key: 'min_fee', label: 'الحد الأدنى', type: 'number' },
      { key: 'max_fee', label: 'الحد الأعلى', type: 'number' },
      { key: 'is_active', label: 'مفعّلة', type: 'bool' },
    ],
    columns: ['name_ar', 'percentage', 'max_fee', 'is_active'],
  },
  {
    key: 'point-rules', label: 'قواعد النقاط',
    fields: [
      { key: 'key', label: 'المعرف (key)', type: 'text' },
      { key: 'name_ar', label: 'الاسم', type: 'text' },
      { key: 'rule_type', label: 'النوع (earn/redeem)', type: 'text' },
      { key: 'points', label: 'النقاط', type: 'number' },
      { key: 'is_active', label: 'مفعّلة', type: 'bool' },
    ],
    columns: ['name_ar', 'rule_type', 'points', 'is_active'],
  },
  {
    key: 'badges', label: 'الشارات',
    fields: [
      { key: 'key', label: 'المعرف (key)', type: 'text' },
      { key: 'name_ar', label: 'الاسم', type: 'text' },
      { key: 'icon', label: 'الأيقونة', type: 'text' },
      { key: 'requirements', label: 'الشروط (JSON)', type: 'json' },
      { key: 'is_active', label: 'مفعّلة', type: 'bool' },
    ],
    columns: ['name_ar', 'key', 'is_active'],
  },
  {
    key: 'promo-codes', label: 'أكواد الخصم',
    fields: [
      { key: 'code', label: 'الكود', type: 'text' },
      { key: 'discount_type', label: 'النوع (percentage/fixed)', type: 'text' },
      { key: 'value', label: 'القيمة', type: 'number' },
      { key: 'max_uses', label: 'حد الاستخدام', type: 'number' },
      { key: 'expires_at', label: 'تاريخ الانتهاء (ISO)', type: 'text' },
      { key: 'applies_to', label: 'ينطبق على', type: 'list' },
      { key: 'is_active', label: 'مفعّل', type: 'bool' },
    ],
    columns: ['code', 'discount_type', 'value', 'used_count', 'max_uses', 'is_active'],
  },
  { key: 'transactions', label: 'المعاملات المالية', readOnly: true,
    columns: ['transaction_type', 'gross_amount', 'platform_fee', 'discount', 'net_amount', 'payment_status', 'created_at'] },
];

const COL_LABELS = {
  name_ar: 'الاسم', price: 'السعر', billing: 'الفوترة', is_active: 'الحالة',
  duration_days: 'المدة', priority_level: 'الأولوية', percentage: 'النسبة %',
  max_fee: 'الحد الأعلى', rule_type: 'النوع', points: 'النقاط', key: 'المعرف',
  code: 'الكود', discount_type: 'نوع الخصم', value: 'القيمة', used_count: 'استُخدم',
  max_uses: 'الحد', transaction_type: 'نوع المعاملة', gross_amount: 'الإجمالي',
  platform_fee: 'رسوم المنصة', discount: 'الخصم', net_amount: 'الصافي',
  payment_status: 'حالة الدفع', created_at: 'التاريخ',
};

const cellValue = (v) => {
  if (v === true) return '✓ مفعّل';
  if (v === false) return '✕ معطّل';
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string' && v.includes('T') && v.length > 18) return v.slice(0, 16).replace('T', ' ');
  return String(v);
};

const ItemEditor = ({ tab, item, onSave, onCancel }) => {
  const [form, setForm] = useState(() => {
    const f = {};
    tab.fields.forEach(fl => {
      const v = item?.[fl.key];
      if (fl.type === 'json') f[fl.key] = JSON.stringify(v || {}, null, 2);
      else if (fl.type === 'list') f[fl.key] = (v || []).join(', ');
      else if (fl.type === 'bool') f[fl.key] = v !== false;
      else f[fl.key] = v ?? '';
    });
    return f;
  });
  const [error, setError] = useState(null);

  const submit = () => {
    const payload = {};
    try {
      tab.fields.forEach(fl => {
        const raw = form[fl.key];
        if (fl.type === 'json') payload[fl.key] = raw.trim() ? JSON.parse(raw) : {};
        else if (fl.type === 'list') payload[fl.key] = raw.split(',').map(s => s.trim()).filter(Boolean);
        else if (fl.type === 'number') payload[fl.key] = raw === '' || raw === null ? null : Number(raw);
        else if (fl.type === 'bool') payload[fl.key] = !!raw;
        else payload[fl.key] = raw;
      });
    } catch {
      setError('صيغة JSON غير صحيحة');
      return;
    }
    onSave(payload);
  };

  return (
    <div className="af-editor-backdrop" onClick={onCancel}>
      <div className="af-editor" onClick={e => e.stopPropagation()} data-testid="af-editor">
        <h3>{item ? 'تعديل' : 'إضافة'} — {tab.label}</h3>
        {error && <div className="af-error">{error}</div>}
        <div className="af-fields">
          {tab.fields.map(fl => (
            <label key={fl.key} className={`af-field ${fl.type}`}>
              <span>{fl.label}</span>
              {fl.type === 'bool' ? (
                <input type="checkbox" checked={!!form[fl.key]}
                  onChange={e => setForm({ ...form, [fl.key]: e.target.checked })} />
              ) : fl.type === 'json' ? (
                <textarea rows={6} dir="ltr" value={form[fl.key]}
                  onChange={e => setForm({ ...form, [fl.key]: e.target.value })} />
              ) : (
                <input type={fl.type === 'number' ? 'number' : 'text'} value={form[fl.key] ?? ''}
                  dir={fl.type === 'number' ? 'ltr' : undefined}
                  onChange={e => setForm({ ...form, [fl.key]: e.target.value })} />
              )}
            </label>
          ))}
        </div>
        <div className="af-editor-actions">
          <button className="af-save" onClick={submit} data-testid="af-save-btn">حفظ</button>
          <button className="af-cancel" onClick={onCancel}>إلغاء</button>
        </div>
      </div>
    </div>
  );
};

export const AdminFinance = ({ getAuthHeaders }) => {
  const [activeTab, setActiveTab] = useState('plans');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // {item} or {item:null} for create

  const tab = TABS.find(t => t.key === activeTab);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/finance/${activeTab}`, getAuthHeaders());
      setItems(r.data.items || []);
    } catch { setItems([]); }
    setLoading(false);
  }, [activeTab, getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const save = async (payload) => {
    try {
      if (editing.item) {
        await axios.put(`${API}/admin/finance/${activeTab}/${editing.item.id}`, payload, getAuthHeaders());
      } else {
        await axios.post(`${API}/admin/finance/${activeTab}`, payload, getAuthHeaders());
      }
      setEditing(null);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'فشل الحفظ');
    }
  };

  const deactivate = async (item) => {
    if (!window.confirm('تعطيل هذا العنصر؟')) return;
    try {
      await axios.delete(`${API}/admin/finance/${activeTab}/${item.id}`, getAuthHeaders());
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'فشل التعطيل');
    }
  };

  return (
    <div className="admin-finance" data-testid="admin-finance">
      <div className="af-tabs">
        {TABS.map(t => (
          <button key={t.key}
            className={`af-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
            data-testid={`af-tab-${t.key}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="af-toolbar">
        <span className="af-count">{items.length} عنصر</span>
        {!tab.readOnly && (
          <button className="af-add" onClick={() => setEditing({ item: null })} data-testid="af-add-btn">
            + إضافة جديد
          </button>
        )}
      </div>

      {loading ? (
        <div className="af-loading">جارٍ التحميل...</div>
      ) : (
        <div className="af-table-wrap">
          <table className="af-table" data-testid="af-table">
            <thead>
              <tr>
                {tab.columns.map(c => <th key={c}>{COL_LABELS[c] || c}</th>)}
                {!tab.readOnly && <th>إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={item.is_active === false ? 'inactive' : ''}>
                  {tab.columns.map(c => <td key={c}>{cellValue(item[c])}</td>)}
                  {!tab.readOnly && (
                    <td className="af-actions">
                      <button onClick={() => setEditing({ item })} data-testid={`af-edit-${item.key || item.code || item.id}`}>تعديل</button>
                      {item.is_active !== false && (
                        <button className="danger" onClick={() => deactivate(item)}>تعطيل</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={tab.columns.length + 1} className="af-empty">لا توجد بيانات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ItemEditor tab={tab} item={editing.item} onSave={save} onCancel={() => setEditing(null)} />
      )}
    </div>
  );
};

export default AdminFinance;
