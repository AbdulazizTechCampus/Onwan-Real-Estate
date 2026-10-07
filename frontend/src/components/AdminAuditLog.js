import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AdminAuditLog.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACTION_LABELS = {
  USER_UPDATE: 'تعديل مستخدم', USER_DELETE: 'حذف مستخدم',
  POPUP_CREATE: 'إنشاء رسالة', POPUP_UPDATE: 'تعديل رسالة', POPUP_DELETE: 'حذف رسالة',
  CONFIG_CREATE: 'إضافة إعداد مالي', CONFIG_UPDATE: 'تعديل إعداد مالي', CONFIG_DEACTIVATE: 'تعطيل إعداد مالي',
  SUBSCRIBE: 'اشتراك في باقة', AD_PURCHASE: 'شراء منتج إعلان', SUCCESS_FEE_PAID: 'دفع رسوم نجاح',
  POINTS_REDEEM: 'استبدال نقاط', PROPERTY_CREATE: 'نشر إعلان', PROPERTY_STATUS_CHANGE: 'تغيير حالة إعلان',
};

const ENTITY_LABELS = {
  user: 'مستخدم', popup: 'رسالة منبثقة', plans: 'باقة', 'ad-products': 'منتج إعلان',
  'commission-rules': 'قاعدة عمولة', 'point-rules': 'قاعدة نقاط', badges: 'شارة',
  'promo-codes': 'كود خصم', plan: 'باقة', property: 'عقار', deal: 'صفقة', points: 'نقاط',
};

const actionTone = (a) => {
  if (/DELETE|DEACTIVATE/.test(a)) return 'danger';
  if (/CREATE|SUBSCRIBE|PURCHASE|PAID/.test(a)) return 'success';
  return 'info';
};

export default function AdminAuditLog({ getAuthHeaders }) {
  const [data, setData] = useState({ items: [], total: 0, pages: 1, actions: [], entity_types: [] });
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 25 });
      if (action) params.append('action', action);
      if (entityType) params.append('entity_type', entityType);
      const res = await axios.get(`${API}/admin/audit-logs?${params}`, getAuthHeaders());
      setData(res.data);
    } catch (e) {
      console.error('audit logs', e);
    } finally {
      setLoading(false);
    }
  }, [page, action, entityType, getAuthHeaders]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="management-section audit-log" data-testid="admin-audit-log">
      <div className="audit-head">
        <div>
          <h2>سجل التدقيق</h2>
          <p>تتبع كامل لعمليات الإدارة والعمليات المالية الحساسة — من قام بها، متى، وعلى أي كيان</p>
        </div>
        <div className="audit-total" data-testid="audit-total">{data.total} عملية مسجلة</div>
      </div>

      <div className="audit-filters">
        <select data-testid="audit-filter-action" value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }}>
          <option value="">كل العمليات</option>
          {data.actions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
        </select>
        <select data-testid="audit-filter-entity" value={entityType} onChange={(e) => { setPage(1); setEntityType(e.target.value); }}>
          <option value="">كل الكيانات</option>
          {data.entity_types.map((t) => <option key={t} value={t}>{ENTITY_LABELS[t] || t}</option>)}
        </select>
        <button type="button" className="audit-refresh" data-testid="audit-refresh" onClick={fetchLogs}>تحديث</button>
      </div>

      {loading ? <div className="audit-loading">جاري التحميل...</div> : data.items.length === 0 ? (
        <div className="audit-empty" data-testid="audit-empty">لا توجد عمليات مسجلة بعد</div>
      ) : (
        <div className="audit-list">
          {data.items.map((log) => (
            <div key={log.id} className={`audit-row tone-${actionTone(log.action)}`} data-testid={`audit-row-${log.id}`}
                 onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
              <div className="audit-marker" />
              <div className="audit-main">
                <div className="audit-line1">
                  <span className="audit-action">{ACTION_LABELS[log.action] || log.action}</span>
                  <span className="audit-entity">{ENTITY_LABELS[log.entity_type] || log.entity_type}</span>
                  {log.entity_id && <code className="audit-entity-id" dir="ltr">{String(log.entity_id).slice(0, 8)}</code>}
                </div>
                <div className="audit-line2">
                  <span dir="ltr">{log.actor_phone || log.actor_id || '—'}</span>
                  <span className="audit-dot">•</span>
                  <span>{log.actor_type || 'غير معروف'}</span>
                  {log.ip && <><span className="audit-dot">•</span><span dir="ltr">{log.ip}</span></>}
                </div>
                {expanded === log.id && (
                  <pre className="audit-details" dir="ltr">{JSON.stringify(log.details, null, 2)}</pre>
                )}
              </div>
              <time className="audit-time" dir="ltr">{new Date(log.created_at).toLocaleString('ar-SA')}</time>
            </div>
          ))}
        </div>
      )}

      {data.pages > 1 && (
        <div className="audit-pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="audit-prev">السابق</button>
          <span>{page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} data-testid="audit-next">التالي</button>
        </div>
      )}
    </div>
  );
}
