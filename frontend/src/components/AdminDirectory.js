import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { SAUDI_REGIONS, REGION_OPTIONS } from '../utils/saudiRegions';
import AdminUserDetail from './AdminUserDetail';
import './AdminDirectory.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_META = {
  brokers: { title: 'الوسطاء', single: 'وسيط', types: { broker_individual: 'وسيط فرد', broker_company: 'شركة وساطة' } },
  photographers: { title: 'المصورون', single: 'مصور', types: { photographer: 'مصور' } },
};

export const SPEC_LABELS = {
  residential_sale: 'بيع سكني', residential_rent: 'تأجير سكني', commercial: 'تجاري', land: 'أراضٍ',
  projects: 'مشاريع', management: 'إدارة أملاك', photo: 'فوتوغرافي', video: 'فيديو', drone: 'درون',
  virtual_tour: 'جولة 360', staging: 'تجهيز',
};

const regionName = (k) => SAUDI_REGIONS[k]?.name?.replace('منطقة ', '') || '—';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');

const DEFAULT_FILTERS = { region: '', city: '', user_type: '', verified: '', status: '', plan_key: '', specialization: '', search: '' };

export default function AdminDirectory({ role, getAuthHeaders }) {
  const meta = ROLE_META[role];
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState({ by: 'created_at', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1, summary: {} });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const setFilter = (k, v) => { setPage(1); setFilters((f) => ({ ...f, [k]: v, ...(k === 'region' ? { city: '' } : {}) })); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, sort_by: sort.by, sort_dir: sort.dir });
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      const r = await axios.get(`${API}/admin/directory/${role}?${params}`, getAuthHeaders());
      setData(r.data);
    } catch (e) { console.error('directory', e); }
    finally { setLoading(false); }
  }, [role, page, sort, filters, getAuthHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    axios.get(`${API}/admin/finance/plans`, getAuthHeaders()).then((r) => setPlans(r.data.items || [])).catch(() => {});
  }, [getAuthHeaders]);
  useEffect(() => { setFilters(DEFAULT_FILTERS); setSearchInput(''); setPage(1); setSelected(null); }, [role]);

  const toggleSort = (by) => setSort((s) => ({ by, dir: s.by === by && s.dir === 'desc' ? 'asc' : 'desc' }));
  const SortTh = ({ k, children }) => (
    <th className={`sortable ${sort.by === k ? 'on' : ''}`} onClick={() => toggleSort(k)} data-testid={`dir-sort-${k}`}>
      {children} <span className="sort-arrow">{sort.by === k ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}</span>
    </th>
  );

  const s = data.summary || {};
  const topRegions = Object.entries(s.by_region || {}).filter(([k]) => k !== 'unset').sort((a, b) => b[1] - a[1]).slice(0, 4);
  const cities = filters.region ? SAUDI_REGIONS[filters.region]?.cities || [] : [];
  const specs = role === 'brokers'
    ? ['residential_sale', 'residential_rent', 'commercial', 'land', 'projects', 'management']
    : ['photo', 'video', 'drone', 'virtual_tour', 'staging'];

  if (selected) {
    return <AdminUserDetail userId={selected} getAuthHeaders={getAuthHeaders} onBack={() => { setSelected(null); fetchData(); }} />;
  }

  return (
    <div className="management-section dir" data-testid={`admin-directory-${role}`}>
      <div className="dir-summary">
        <div className="dir-stat main" data-testid="dir-stat-total"><span>{s.total ?? 0}</span><label>إجمالي {meta.title}</label></div>
        <div className="dir-stat"><span>{s.verified ?? 0}</span><label>موثق نفاذ</label></div>
        <div className="dir-stat"><span>{s.active_listings ?? 0}</span><label>إعلانات نشطة</label></div>
        <div className="dir-stat"><span>{s.completed_deals ?? 0}</span><label>صفقات مكتملة</label></div>
        <div className="dir-stat danger"><span>{s.suspended ?? 0}</span><label>موقوف</label></div>
        <div className="dir-regions">
          <label>حسب المنطقة</label>
          {topRegions.length === 0 ? <em>لا توجد بيانات منطقة بعد</em> : topRegions.map(([k, n]) => (
            <button key={k} type="button" className={filters.region === k ? 'on' : ''} onClick={() => setFilter('region', filters.region === k ? '' : k)} data-testid={`dir-region-chip-${k}`}>
              {regionName(k)} <b>{n}</b>
            </button>
          ))}
          {(s.by_region || {}).unset > 0 && <span className="dir-unset">بدون منطقة: {s.by_region.unset}</span>}
        </div>
      </div>

      <div className="dir-filters">
        <form className="dir-search" onSubmit={(e) => { e.preventDefault(); setFilter('search', searchInput); }}>
          <input data-testid="dir-search-input" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="بحث بالاسم، الجوال، رخصة فال، المنشأة..." />
          <button type="submit" data-testid="dir-search-btn">بحث</button>
        </form>
        <select data-testid="dir-filter-region" value={filters.region} onChange={(e) => setFilter('region', e.target.value)}>
          <option value="">كل المناطق</option>
          {REGION_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
        <select data-testid="dir-filter-city" value={filters.city} onChange={(e) => setFilter('city', e.target.value)} disabled={!filters.region}>
          <option value="">كل المدن</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {role === 'brokers' && (
          <select data-testid="dir-filter-type" value={filters.user_type} onChange={(e) => setFilter('user_type', e.target.value)}>
            <option value="">فرد وشركة</option>
            {Object.entries(meta.types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        <select data-testid="dir-filter-verified" value={filters.verified} onChange={(e) => setFilter('verified', e.target.value)}>
          <option value="">كل حالات التوثيق</option>
          <option value="verified">موثق نفاذ</option>
          <option value="unverified">غير موثق</option>
        </select>
        <select data-testid="dir-filter-plan" value={filters.plan_key} onChange={(e) => setFilter('plan_key', e.target.value)}>
          <option value="">كل الباقات</option>
          {plans.map((p) => <option key={p.key} value={p.key}>{p.name_ar}</option>)}
        </select>
        <select data-testid="dir-filter-spec" value={filters.specialization} onChange={(e) => setFilter('specialization', e.target.value)}>
          <option value="">كل التخصصات</option>
          {specs.map((k) => <option key={k} value={k}>{SPEC_LABELS[k]}</option>)}
        </select>
        <select data-testid="dir-filter-status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">نشط وموقوف</option>
          <option value="active">نشط</option>
          <option value="suspended">موقوف</option>
        </select>
        {Object.values(filters).some(Boolean) && (
          <button type="button" className="dir-clear" onClick={() => { setFilters(DEFAULT_FILTERS); setSearchInput(''); setPage(1); }} data-testid="dir-clear-filters">مسح الفلاتر</button>
        )}
      </div>

      {loading ? <div className="dir-loading">جاري التحميل...</div> : data.items.length === 0 ? (
        <div className="dir-empty" data-testid="dir-empty">لا يوجد {meta.title} مطابقون لهذه الفلاتر</div>
      ) : (
        <div className="data-table-container">
          <table className="data-table dir-table" data-testid="dir-table">
            <thead>
              <tr>
                <SortTh k="full_name_arabic">{meta.single}</SortTh>
                <th>المنطقة / المدينة</th>
                <th>التخصص</th>
                {role === 'brokers' && <th>رخصة فال</th>}
                <th>الباقة</th>
                <SortTh k="active_listings">إعلانات نشطة</SortTh>
                <SortTh k="completed_deals">صفقات</SortTh>
                <SortTh k="total_revenue">إيراد المنصة</SortTh>
                <th>الحالة</th>
                <SortTh k="last_login">آخر دخول</SortTh>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} className={`dir-row ${u.is_active === false ? 'suspended' : ''}`} onClick={() => setSelected(u.id)} data-testid={`dir-row-${u.id}`}>
                  <td>
                    <div className="dir-name">
                      <div className="dir-avatar">{(u.full_name_arabic || u.company_name || '?').charAt(0)}</div>
                      <div>
                        <strong>{u.company_name || u.full_name_arabic || 'بدون اسم'}</strong>
                        <small dir="ltr">{u.phone_number}</small>
                        {role === 'brokers' && <em>{meta.types[u.user_type]}</em>}
                      </div>
                    </div>
                  </td>
                  <td>{u.region ? <>{regionName(u.region)}<small className="dir-sub">{u.city || '—'}</small></> : <span className="dir-missing">غير محدد</span>}</td>
                  <td className="dir-specs">{(u.specializations || []).slice(0, 2).map((k) => <span key={k}>{SPEC_LABELS[k] || k}</span>)}{(u.specializations || []).length > 2 && <span>+{u.specializations.length - 2}</span>}</td>
                  {role === 'brokers' && <td dir="ltr">{u.fal_license || <span className="dir-missing">—</span>}</td>}
                  <td>{u.plan_name_ar ? <span className="dir-plan">{u.plan_name_ar}</span> : <span className="dir-missing">بدون باقة</span>}</td>
                  <td className="num">{u.active_listings}</td>
                  <td className="num">{u.completed_deals}</td>
                  <td className="num">{Number(u.total_revenue || 0).toLocaleString('en-US')} <small>ر.س</small></td>
                  <td>
                    {u.is_active === false ? <span className="dir-badge off">موقوف</span>
                      : u.is_nafath_verified ? <span className="dir-badge ok">موثق</span> : <span className="dir-badge warn">غير موثق</span>}
                  </td>
                  <td>{fmtDate(u.last_login)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.pages > 1 && (
        <div className="dir-pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="dir-prev">السابق</button>
          <span>صفحة {page} من {data.pages} ({data.total} {meta.single})</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} data-testid="dir-next">التالي</button>
        </div>
      )}
    </div>
  );
}
