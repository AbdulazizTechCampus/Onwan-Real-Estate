import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const API = process.env.REACT_APP_BACKEND_URL;

// Sidebar Menu Items
const MENU_ITEMS = [
  { key: 'dashboard', label: 'الرئيسية', icon: '📊' },
  { key: 'users', label: 'المستخدمين', icon: '👥' },
  { key: 'brokers', label: 'الوسطاء', icon: '🏢' },
  { key: 'photographers', label: 'المصورين', icon: '📷' },
  { key: 'properties', label: 'العقارات', icon: '🏠' },
  { key: 'requests', label: 'طلبات العقارات', icon: '📋' },
  { key: 'photo-requests', label: 'طلبات التصوير', icon: '🎬' },
  { key: 'popups', label: 'الرسائل المنبثقة', icon: '💬' },
  { key: 'matches', label: 'التوفيقات', icon: '🔗' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' }
];

const USER_TYPES = {
  visitor: 'ضيف',
  property_seeker: 'طالب عقار',
  property_owner: 'مالك عقار',
  broker_individual: 'وسيط - فرد',
  broker_company: 'وسيط - منشأة',
  photographer: 'مصور',
  admin: 'مسؤول'
};

const POPUP_TYPES = {
  welcome: 'ترحيب',
  offer: 'عرض',
  registration: 'تسجيل',
  announcement: 'إعلان'
};

const TARGET_AUDIENCES = {
  all: 'الجميع',
  guests: 'الضيوف',
  registered: 'المسجلين',
  new_visitors: 'الزوار الجدد'
};

// Admin Dashboard Component
function AdminDashboard({ currentUser, onLogout }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
  });

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardStats getAuthHeaders={getAuthHeaders} />;
      case 'users':
        return <UsersManagement getAuthHeaders={getAuthHeaders} />;
      case 'brokers':
        return <BrokersManagement getAuthHeaders={getAuthHeaders} />;
      case 'photographers':
        return <PhotographersManagement getAuthHeaders={getAuthHeaders} />;
      case 'popups':
        return <PopupsManagement getAuthHeaders={getAuthHeaders} />;
      case 'requests':
        return <PropertyRequests getAuthHeaders={getAuthHeaders} />;
      case 'photo-requests':
        return <PhotographyRequests getAuthHeaders={getAuthHeaders} />;
      default:
        return <ComingSoon section={activeSection} />;
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img 
            src="https://customer-assets.emergentagent.com/job_onwan-homes/artifacts/obrzkr9d_Logo%2010201.png" 
            alt="عنوان" 
            className="sidebar-logo"
          />
          <h2>لوحة التحكم</h2>
        </div>
        
        <nav className="sidebar-nav">
          {MENU_ITEMS.map(item => (
            <button
              key={item.key}
              className={`sidebar-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => setActiveSection(item.key)}
            >
              <span className="item-icon">{item.icon}</span>
              <span className="item-label">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <div className="admin-info">
            <div className="admin-avatar">👤</div>
            <div className="admin-details">
              <span className="admin-name">{currentUser?.full_name_arabic || 'المسؤول'}</span>
              <span className="admin-role">مدير الموقع</span>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            تسجيل الخروج
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <button className="toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <h1>{MENU_ITEMS.find(i => i.key === activeSection)?.label}</h1>
          <div className="header-actions">
            <button className="back-to-site" onClick={() => window.location.href = '/'}>
              العودة للموقع
            </button>
          </div>
        </header>
        
        <div className="admin-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// Dashboard Stats Component
function DashboardStats({ getAuthHeaders }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, getAuthHeaders());
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const statCards = [
    { label: 'إجمالي المستخدمين', value: stats?.total_users || 0, icon: '👥', color: '#3b82f6' },
    { label: 'الوسطاء المعتمدين', value: stats?.total_brokers || 0, icon: '🏢', color: '#10b981' },
    { label: 'المصورين', value: stats?.total_photographers || 0, icon: '📷', color: '#8b5cf6' },
    { label: 'العقارات', value: stats?.total_properties || 0, icon: '🏠', color: '#f59e0b' },
    { label: 'عقارات معلقة', value: stats?.pending_properties || 0, icon: '⏳', color: '#ef4444' },
    { label: 'طلبات نشطة', value: stats?.active_requests || 0, icon: '📋', color: '#06b6d4' },
    { label: 'التوفيقات', value: stats?.total_matches || 0, icon: '🔗', color: '#ec4899' },
    { label: 'رسائل منبثقة نشطة', value: stats?.active_popups || 0, icon: '💬', color: '#84cc16' }
  ];

  return (
    <div className="dashboard-stats">
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderTopColor: stat.color }}>
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="dashboard-widgets">
        <div className="widget">
          <h3>📈 الإحصائيات السريعة</h3>
          <div className="quick-stats">
            <div className="quick-stat">
              <span className="qs-label">مستخدمين جدد اليوم</span>
              <span className="qs-value">{stats?.new_users_today || 0}</span>
            </div>
            <div className="quick-stat">
              <span className="qs-label">مستخدمين جدد هذا الأسبوع</span>
              <span className="qs-value">{stats?.new_users_week || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Users Management Component
function UsersManagement({ getAuthHeaders }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page, filterType]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterType) params.append('user_type', filterType);
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API}/admin/users?${params}`, getAuthHeaders());
      setUsers(response.data.users);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  return (
    <div className="management-section">
      <div className="section-toolbar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="بحث برقم الهاتف أو الاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">بحث</button>
        </form>
        
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">جميع الأنواع</option>
          {Object.entries(USER_TYPES).map(([key, value]) => (
            <option key={key} value={key}>{value}</option>
          ))}
        </select>
      </div>
      
      {loading ? <LoadingSpinner /> : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الهاتف</th>
                  <th>الاسم</th>
                  <th>النوع</th>
                  <th>موثق نفاذ</th>
                  <th>تاريخ التسجيل</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td dir="ltr">{user.phone_number}</td>
                    <td>{user.full_name_arabic || '-'}</td>
                    <td>
                      <span className={`badge badge-${user.user_type}`}>
                        {USER_TYPES[user.user_type]}
                      </span>
                    </td>
                    <td>
                      {user.is_nafath_verified ? (
                        <span className="status-verified">✓ موثق</span>
                      ) : (
                        <span className="status-pending">غير موثق</span>
                      )}
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString('ar-SA')}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-view" title="عرض">👁️</button>
                        <button className="btn-edit" title="تعديل">✏️</button>
                        <button className="btn-delete" title="حذف">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        </>
      )}
    </div>
  );
}

// Brokers Management Component
function BrokersManagement({ getAuthHeaders }) {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    try {
      const response = await axios.get(`${API}/admin/brokers`, getAuthHeaders());
      setBrokers(response.data.brokers);
    } catch (error) {
      console.error('Error fetching brokers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="management-section">
      <div className="section-header">
        <p>إجمالي الوسطاء المعتمدين: {brokers.length}</p>
      </div>
      
      <div className="cards-grid">
        {brokers.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🏢</span>
            <h3>لا يوجد وسطاء معتمدين حتى الآن</h3>
            <p>سيظهر هنا الوسطاء بعد التحقق من هويتهم عبر نفاذ</p>
          </div>
        ) : (
          brokers.map(broker => (
            <div key={broker.id} className="broker-card">
              <div className="broker-avatar">
                {broker.full_name_arabic ? broker.full_name_arabic.charAt(0) : '🏢'}
              </div>
              <div className="broker-info">
                <h4>{broker.full_name_arabic || broker.phone_number}</h4>
                <p>{USER_TYPES[broker.user_type]}</p>
                <p dir="ltr">{broker.phone_number}</p>
              </div>
              <div className="broker-status">
                <span className="verified-badge">✓ موثق</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Photographers Management Component
function PhotographersManagement({ getAuthHeaders }) {
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotographers();
  }, []);

  const fetchPhotographers = async () => {
    try {
      const response = await axios.get(`${API}/admin/photographers`, getAuthHeaders());
      setPhotographers(response.data.photographers);
    } catch (error) {
      console.error('Error fetching photographers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="management-section">
      <div className="section-header">
        <p>إجمالي المصورين: {photographers.length}</p>
      </div>
      
      <div className="cards-grid">
        {photographers.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📷</span>
            <h3>لا يوجد مصورين مسجلين حتى الآن</h3>
            <p>سيظهر هنا المصورين بعد تسجيلهم</p>
          </div>
        ) : (
          photographers.map(photographer => (
            <div key={photographer.id} className="photographer-card">
              <div className="photographer-avatar">📷</div>
              <div className="photographer-info">
                <h4>{photographer.full_name_arabic || photographer.phone_number}</h4>
                <p dir="ltr">{photographer.phone_number}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Popups Management Component
function PopupsManagement({ getAuthHeaders }) {
  const [popups, setPopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPopup, setEditingPopup] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    popup_type: 'announcement',
    target_audience: 'all',
    button_text: '',
    button_link: '',
    is_active: true,
    display_frequency: 'once',
    priority: 0
  });

  useEffect(() => {
    fetchPopups();
  }, []);

  const fetchPopups = async () => {
    try {
      const response = await axios.get(`${API}/admin/popups`, getAuthHeaders());
      setPopups(response.data.popups);
    } catch (error) {
      console.error('Error fetching popups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPopup) {
        await axios.put(`${API}/admin/popups/${editingPopup.id}`, formData, getAuthHeaders());
      } else {
        await axios.post(`${API}/admin/popups`, formData, getAuthHeaders());
      }
      fetchPopups();
      resetForm();
    } catch (error) {
      console.error('Error saving popup:', error);
      alert('خطأ في حفظ الرسالة');
    }
  };

  const handleDelete = async (popupId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    try {
      await axios.delete(`${API}/admin/popups/${popupId}`, getAuthHeaders());
      fetchPopups();
    } catch (error) {
      console.error('Error deleting popup:', error);
    }
  };

  const handleEdit = (popup) => {
    setEditingPopup(popup);
    setFormData({
      title: popup.title,
      content: popup.content,
      popup_type: popup.popup_type,
      target_audience: popup.target_audience,
      button_text: popup.button_text || '',
      button_link: popup.button_link || '',
      is_active: popup.is_active,
      display_frequency: popup.display_frequency,
      priority: popup.priority
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPopup(null);
    setFormData({
      title: '',
      content: '',
      popup_type: 'announcement',
      target_audience: 'all',
      button_text: '',
      button_link: '',
      is_active: true,
      display_frequency: 'once',
      priority: 0
    });
  };

  const toggleActive = async (popup) => {
    try {
      await axios.put(`${API}/admin/popups/${popup.id}`, 
        { is_active: !popup.is_active }, 
        getAuthHeaders()
      );
      fetchPopups();
    } catch (error) {
      console.error('Error toggling popup:', error);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="management-section">
      <div className="section-toolbar">
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + إنشاء رسالة جديدة
        </button>
      </div>
      
      {showForm && (
        <div className="popup-form-overlay" onClick={resetForm}>
          <div className="popup-form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingPopup ? 'تعديل الرسالة' : 'إنشاء رسالة جديدة'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>العنوان *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>المحتوى *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  required
                  rows={4}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>نوع الرسالة</label>
                  <select
                    value={formData.popup_type}
                    onChange={(e) => setFormData({...formData, popup_type: e.target.value})}
                  >
                    {Object.entries(POPUP_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>الجمهور المستهدف</label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                  >
                    {Object.entries(TARGET_AUDIENCES).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>نص الزر (اختياري)</label>
                  <input
                    type="text"
                    value={formData.button_text}
                    onChange={(e) => setFormData({...formData, button_text: e.target.value})}
                    placeholder="مثال: اكتشف المزيد"
                  />
                </div>
                
                <div className="form-group">
                  <label>رابط الزر (اختياري)</label>
                  <input
                    type="text"
                    value={formData.button_link}
                    onChange={(e) => setFormData({...formData, button_link: e.target.value})}
                    placeholder="مثال: /offers"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>تكرار العرض</label>
                  <select
                    value={formData.display_frequency}
                    onChange={(e) => setFormData({...formData, display_frequency: e.target.value})}
                  >
                    <option value="once">مرة واحدة</option>
                    <option value="daily">يومياً</option>
                    <option value="always">دائماً</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>الأولوية</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  تفعيل الرسالة
                </label>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingPopup ? 'تحديث' : 'إنشاء'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="popups-list">
        {popups.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">💬</span>
            <h3>لا توجد رسائل منبثقة</h3>
            <p>أنشئ رسالة جديدة للترحيب بزوارك أو الإعلان عن عروضك</p>
          </div>
        ) : (
          popups.map(popup => (
            <div key={popup.id} className={`popup-card ${popup.is_active ? 'active' : 'inactive'}`}>
              <div className="popup-header">
                <span className={`popup-type-badge ${popup.popup_type}`}>
                  {POPUP_TYPES[popup.popup_type]}
                </span>
                <span className={`popup-status ${popup.is_active ? 'active' : ''}`}>
                  {popup.is_active ? '🟢 نشط' : '⚪ متوقف'}
                </span>
              </div>
              <h4>{popup.title}</h4>
              <p>{popup.content}</p>
              <div className="popup-meta">
                <span>الجمهور: {TARGET_AUDIENCES[popup.target_audience]}</span>
                <span>الأولوية: {popup.priority}</span>
              </div>
              <div className="popup-actions">
                <button onClick={() => toggleActive(popup)}>
                  {popup.is_active ? '⏸️ إيقاف' : '▶️ تفعيل'}
                </button>
                <button onClick={() => handleEdit(popup)}>✏️ تعديل</button>
                <button onClick={() => handleDelete(popup.id)} className="btn-danger">🗑️ حذف</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Property Requests Component
function PropertyRequests({ getAuthHeaders }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/admin/property-requests`, getAuthHeaders());
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="management-section">
      {requests.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>لا توجد طلبات عقارات</h3>
          <p>ستظهر هنا طلبات المستخدمين للعقارات</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <span className="request-type">{request.property_type} - {request.transaction_type}</span>
                <span className="request-date">
                  {new Date(request.created_at).toLocaleDateString('ar-SA')}
                </span>
              </div>
              <div className="request-details">
                <p><strong>المنطقة:</strong> {request.region} - {request.city}</p>
                <p><strong>السعر:</strong> {request.min_price || '0'} - {request.max_price || 'غير محدد'}</p>
                <p><strong>الغرف:</strong> {request.bedrooms || 'غير محدد'}</p>
              </div>
              <div className="request-contact">
                <span dir="ltr">{request.user_phone}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Photography Requests Component
function PhotographyRequests({ getAuthHeaders }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/admin/photography-requests`, getAuthHeaders());
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching photography requests:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="management-section">
      {requests.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🎬</span>
          <h3>لا توجد طلبات تصوير</h3>
          <p>ستظهر هنا طلبات التصوير من المستخدمين</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request.id} className="request-card">
              <h4>{request.property_address}</h4>
              <p>{request.region} - {request.city}</p>
              <span className={`status-badge ${request.status}`}>{request.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Coming Soon Component
function ComingSoon({ section }) {
  return (
    <div className="coming-soon">
      <span className="coming-icon">🚧</span>
      <h2>قريباً</h2>
      <p>هذا القسم قيد التطوير وسيكون متاحاً قريباً</p>
    </div>
  );
}

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>جاري التحميل...</p>
    </div>
  );
}

// Pagination Component
function Pagination({ page, totalPages, setPage }) {
  return (
    <div className="pagination">
      <button 
        disabled={page === 1} 
        onClick={() => setPage(p => p - 1)}
      >
        السابق
      </button>
      <span>صفحة {page} من {totalPages}</span>
      <button 
        disabled={page === totalPages} 
        onClick={() => setPage(p => p + 1)}
      >
        التالي
      </button>
    </div>
  );
}

export default AdminDashboard;
