import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import './components/MapStyles.css';
import { PropertyMap, FullPageMap, PropertyMiniMap } from './components/MapComponent';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// User Types in Arabic
const USER_TYPES = {
  visitor: 'زائر',
  property_seeker: 'طالب عقار',
  property_owner: 'مالك عقار',
  broker_individual: 'وسيط عقاري - فرد',
  broker_company: 'وسيط عقاري - منشأة',
  photographer: 'مصور عقارات',
  admin: 'مدير الموقع'
};

// Property Categories
const PROPERTY_CATEGORIES = {
  residential: 'سكني',
  commercial: 'تجاري',
  industrial: 'صناعي',
  medical: 'صحي',
  educational: 'تعليمي',
  agricultural: 'زراعي'
};

const PROPERTY_TYPES = {
  land: 'أرض',
  room: 'غرفة',
  studio: 'استوديو',
  apartment: 'شقة',
  floor: 'دور',
  villa: 'فيلا',
  building: 'مبنى',
  tower: 'برج',
  showroom: 'معرض',
  store: 'متجر',
  office: 'مكتب',
  rest_house: 'استراحة',
  chalet: 'شاليه',
  farm: 'مزرعة',
  hospital: 'مستشفى',
  clinic: 'عيادة',
  workshop: 'ورشة',
  factory: 'مصنع',
  warehouse: 'مستودع',
  school: 'مدرسة',
  hotel: 'فندق',
  gas_station: 'محطة'
};

const REGIONS_AND_CITIES = {
  central: {
    name: 'المنطقة الوسطى',
    cities: ['الرياض', 'الخرج', 'الدوادمي', 'المجمعة', 'الزلفي', 'شقراء', 'عفيف', 'القويعية', 'وادي الدواسر', 'الحوطة والحريق', 'حريملاء', 'الدرعية', 'المزاحمية']
  },
  eastern: {
    name: 'المنطقة الشرقية',
    cities: ['الدمام', 'الخبر', 'الأحساء', 'القطيف', 'سيهات', 'الجبيل', 'رأس تنورة', 'النعيرية', 'الخفجي', 'حفر الباطن', 'بقيق', 'العديد', 'قرية العليا', 'تاروت', 'صفوى']
  },
  western: {
    name: 'المنطقة الغربية',
    cities: ['جدة', 'مكة المكرمة', 'المدينة المنورة', 'الطائف', 'ينبع', 'رابغ', 'الليث', 'القنفذة', 'جازان', 'صبيا', 'أبها', 'خميس مشيط', 'الباحة', 'بيشة', 'نجران']
  },
  northern: {
    name: 'المنطقة الشمالية',
    cities: ['تبوك', 'عرعر', 'سكاكا', 'طريف', 'القريات', 'رفحاء', 'حائل', 'بريدة', 'عنيزة', 'الرس', 'المذنب', 'البكيرية', 'الزلفي', 'الغاط']
  },
  southern: {
    name: 'المنطقة الجنوبية',
    cities: ['أبها', 'خميس مشيط', 'بيشة', 'نجران', 'جازان', 'صبيا', 'الباحة', 'المندق', 'القنفذة', 'محايل عسير', 'سراة عبيدة', 'تنومة', 'النماص', 'رجال ألمع', 'ظهران الجنوب']
  }
};

const REGIONS = {
  central: 'الوسطى',
  eastern: 'الشرقية', 
  northern: 'الشمالية',
  western: 'الغربية',
  southern: 'الجنوبية'
};

// Sample Properties Data
const SAMPLE_PROPERTIES = [
  {
    id: 1,
    title: 'فيلا فاخرة مع مسبح في الرياض',
    price: '2,500,000',
    location: 'حي الملقا، الرياض',
    area: '450',
    bedrooms: 5,
    bathrooms: 4,
    type: 'villa',
    category: 'residential',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjByZWFsJTIwZXN0YXRlfGVufDB8fHx8MTc1NTI2OTg1NHww&ixlib=rb-4.1.0&q=85',
    status: 'للبيع',
    featured: true,
    views: 1250,
    publishDate: '2024-01-15',
    coordinates: [24.8204, 46.6275], // حي الملقا
    agent: {
      name: 'أحمد محمد العبدالله',
      phone: '+966501234567',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=agent1'
    }
  },
  {
    id: 2,
    title: 'شقة حديثة في برج سكني راقي',
    price: '850,000',
    location: 'حي الملز، الرياض',
    area: '180',
    bedrooms: 3,
    bathrooms: 2,
    type: 'apartment',
    category: 'residential',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjByZWFsJTIwZXN0YXRlfGVufDB8fHx8MTc1NTI2OTg1NHww&ixlib=rb-4.1.0&q=85',
    status: 'للإيجار',
    featured: true,
    views: 890,
    publishDate: '2024-01-10',
    coordinates: [24.6632, 46.7186], // حي الملز
    agent: {
      name: 'فاطمة سالم الخالد',
      phone: '+966502345678',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=agent2'
    }
  },
  {
    id: 3,
    title: 'مجمع تجاري في موقع استراتيجي',
    price: '5,200,000',
    location: 'طريق الملك فهد، جدة',
    area: '1200',
    type: 'building',
    category: 'commercial',
    image: 'https://images.unsplash.com/photo-1621831337128-35676ca30868?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwxfHxjb21tZXJjaWFsJTIwYnVpbGRpbmd8ZW58MHx8fHwxNzU1Mzc1MDEyfDA&ixlib=rb-4.1.0&q=85',
    status: 'للبيع',
    featured: true,
    views: 2150,
    publishDate: '2024-01-08',
    coordinates: [21.5433, 39.1728], // جدة
    agent: {
      name: 'خالد عبدالرحمن النمر',
      phone: '+966503456789',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=agent3'
    }
  },
  {
    id: 4,
    title: 'فيلا عصرية مع حديقة واسعة',
    price: '1,800,000',
    location: 'حي النرجس، الرياض',
    area: '380',
    bedrooms: 4,
    bathrooms: 3,
    type: 'villa',
    category: 'residential',
    image: 'https://images.unsplash.com/photo-1670589953882-b94c9cb380f5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB2aWxsYXxlbnwwfHx8fDE3NTUzNzUwMDd8MA&ixlib=rb-4.1.0&q=85',
    status: 'للبيع',
    featured: false,
    views: 765,
    publishDate: '2024-01-12',
    coordinates: [24.8607, 46.6458], // حي النرجس
    agent: {
      name: 'سارة أحمد الفريح',
      phone: '+966504567890',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=agent4'
    }
  },
  {
    id: 5,
    title: 'مكاتب إدارية في برج حديث',
    price: '12,000',
    location: 'حي العليا، الرياض',
    area: '250',
    type: 'office',
    category: 'commercial',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHw0fHxjb21tZXJjaWFsJTIwYnVpbGRpbmd8ZW58MHx8fHwxNzU1Mzc1MDEyfDA&ixlib=rb-4.1.0&q=85',
    status: 'للإيجار',
    featured: false,
    views: 420,
    publishDate: '2024-01-18',
    coordinates: [24.6903, 46.6854], // حي العليا
    agent: {
      name: 'محمد علي السويد',
      phone: '+966505678901',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=agent5'
    }
  },
  {
    id: 6,
    title: 'قصر فخم مع إطلالة مميزة',
    price: '8,500,000',
    location: 'حي الياسمين، الرياض',
    area: '800',
    bedrooms: 8,
    bathrooms: 6,
    type: 'villa',
    category: 'residential',
    image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjByZWFsJTIwZXN0YXRlfGVufDB8fHx8MTc1NTI2OTg1NHww&ixlib=rb-4.1.0&q=85',
    status: 'للبيع',
    featured: true,
    views: 3420,
    publishDate: '2024-01-05',
    coordinates: [24.8142, 46.5983], // حي الياسمين
    agent: {
      name: 'عبدالله راشد القحطاني',
      phone: '+966506789012',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=agent6'
    }
  }
];

// Sample Agents Data
const SAMPLE_AGENTS = [
  {
    id: 1,
    name: 'أحمد محمد العبدالله',
    license: 'FAL-12345',
    region: 'الرياض',
    followers: 1250,
    properties: 45,
    requests: 12,
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=agent1',
    rating: 4.8
  },
  {
    id: 2,
    name: 'فاطمة سالم الخالد',
    license: 'FAL-23456',
    region: 'جدة',
    followers: 890,
    properties: 32,
    requests: 8,
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=agent2',
    rating: 4.9
  },
  {
    id: 3,
    name: 'خالد عبدالرحمن النمر',
    license: 'FAL-34567',
    region: 'الدمام',
    followers: 2150,
    properties: 67,
    requests: 25,
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=agent3',
    rating: 4.7
  }
];

// Header Component - Modern Design
const Header = ({ onLoginClick, currentUser, onLogout, onOpenMap }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isArabic, setIsArabic] = useState(true);

  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
  };

  const toggleLanguage = () => {
    setIsArabic(!isArabic);
  };

  return (
    <header className="header-modern" onClick={closeDropdowns}>
      <div className="header-container">
        {/* Right Side - Logo */}
        <div className="header-logo">
          <img src="https://customer-assets.emergentagent.com/job_realty-cards/artifacts/w1hf3c8g_Logo%201020%20copy.png" alt="عنوان" className="logo-img-large" />
        </div>

        {/* Center - Navigation */}
        <nav className="header-nav">
          {/* العقارات Dropdown */}
          <div className="nav-dropdown" onClick={(e) => { e.stopPropagation(); toggleDropdown('properties'); }}>
            <button className="nav-dropdown-btn" data-testid="properties-dropdown">
              العقارات
              <svg className="dropdown-chevron" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            <div className={`dropdown-panel ${activeDropdown === 'properties' ? 'show' : ''}`}>
              <div className="dropdown-panel-content">
                <a href="#" className="dropdown-link" data-testid="add-property-link">
                  <div className="dropdown-link-icon add">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </div>
                  <div className="dropdown-link-text">
                    <span className="dropdown-link-title">إضافة عقار</span>
                    <span className="dropdown-link-desc">أضف عقارك للبيع أو الإيجار</span>
                  </div>
                </a>
                <a href="#" className="dropdown-link" data-testid="request-property-link">
                  <div className="dropdown-link-icon request">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                  </div>
                  <div className="dropdown-link-text">
                    <span className="dropdown-link-title">طلب عقار</span>
                    <span className="dropdown-link-desc">اطلب عقارك المناسب</span>
                  </div>
                </a>
                <a href="#" className="dropdown-link" data-testid="interest-link">
                  <div className="dropdown-link-icon interest">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  </div>
                  <div className="dropdown-link-text">
                    <span className="dropdown-link-title">الاهتمام والتواصل</span>
                    <span className="dropdown-link-desc">تابع اهتماماتك وتواصلك</span>
                  </div>
                </a>
                <a href="#" className="dropdown-link" data-testid="favorites-link">
                  <div className="dropdown-link-icon favorites">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  <div className="dropdown-link-text">
                    <span className="dropdown-link-title">المفضلة</span>
                    <span className="dropdown-link-desc">عقاراتك المفضلة</span>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* الوساطة Dropdown */}
          <div className="nav-dropdown" onClick={(e) => { e.stopPropagation(); toggleDropdown('brokerage'); }}>
            <button className="nav-dropdown-btn" data-testid="brokerage-dropdown">
              الوساطة
              <svg className="dropdown-chevron" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            <div className={`dropdown-panel ${activeDropdown === 'brokerage' ? 'show' : ''}`}>
              <div className="dropdown-panel-content">
                <a href="#" className="dropdown-link" data-testid="brokers-link">
                  <div className="dropdown-link-icon brokers">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                  </div>
                  <div className="dropdown-link-text">
                    <span className="dropdown-link-title">الوسطاء</span>
                    <span className="dropdown-link-desc">تصفح الوسطاء المعتمدين</span>
                  </div>
                </a>
                <a href="#" className="dropdown-link" data-testid="contracts-link">
                  <div className="dropdown-link-icon contracts">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM9 13v2h6v-2H9zm0 4v2h4v-2H9z"/>
                    </svg>
                  </div>
                  <div className="dropdown-link-text">
                    <span className="dropdown-link-title">العقود</span>
                    <span className="dropdown-link-desc">إدارة عقودك</span>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* الدعم Dropdown */}
          <div className="nav-dropdown" onClick={(e) => { e.stopPropagation(); toggleDropdown('support'); }}>
            <button className="nav-dropdown-btn" data-testid="support-dropdown">
              الدعم
              <svg className="dropdown-chevron" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            <div className={`dropdown-panel support-panel ${activeDropdown === 'support' ? 'show' : ''}`}>
              <div className="support-content">
                <h3 className="support-title">المساعدة</h3>
                <div className="support-phone">0555964559</div>
                <div className="support-hours">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  من 8:00 ص حتى 8:00 م، من الأحد إلى الخميس
                </div>
                <div className="support-buttons">
                  <a href="https://wa.me/966555964559" className="support-btn whatsapp-btn" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"/>
                    </svg>
                    واتساب
                  </a>
                  <a href="tel:0555964559" className="support-btn call-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                    مكالمة
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* عقاراتنا - Map Link */}
          <button className="nav-map-btn" onClick={onOpenMap} data-testid="our-properties-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
            </svg>
            عقاراتنا
          </button>

          {/* اللغة - Toggle */}
          <button className="lang-toggle-btn" onClick={(e) => { e.stopPropagation(); toggleLanguage(); }} data-testid="language-toggle">
            <svg className="globe-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <ellipse cx="12" cy="12" rx="4" ry="10"/>
              <path d="M2 12h20"/>
            </svg>
            {isArabic ? 'English' : 'العربية'}
          </button>
        </nav>

        {/* Left Side - Auth & Actions */}
        <div className="header-actions">
          {currentUser ? (
            <div className="user-logged-in">
              <div className="user-avatar">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className="user-details">
                <span className="user-greeting">مرحباً، {currentUser.full_name_arabic || currentUser.phone_number}</span>
                <span className="user-role">{USER_TYPES[currentUser.user_type]}</span>
              </div>
              <button onClick={onLogout} className="btn-logout" data-testid="logout-btn">
                خروج
              </button>
            </div>
          ) : (
            <button onClick={onLoginClick} className="btn-login" data-testid="login-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              تسجيل الدخول
            </button>
          )}

          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-btn" 
            onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(!mobileMenuOpen); }}
            data-testid="mobile-menu-btn"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              {mobileMenuOpen ? (
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              ) : (
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-section">
          <div className="mobile-menu-title">العقارات</div>
          <a href="#" className="mobile-menu-link">إضافة عقار</a>
          <a href="#" className="mobile-menu-link">طلب عقار</a>
          <a href="#" className="mobile-menu-link">الاهتمام والتواصل</a>
          <a href="#" className="mobile-menu-link">المفضلة</a>
        </div>
        <div className="mobile-menu-section">
          <div className="mobile-menu-title">الوساطة</div>
          <a href="#" className="mobile-menu-link">الوسطاء</a>
          <a href="#" className="mobile-menu-link">العقود</a>
        </div>
        <div className="mobile-menu-section">
          <div className="mobile-menu-title">الدعم</div>
          <div className="mobile-support-info">
            <div className="mobile-support-phone">0555964559</div>
            <div className="mobile-support-hours">من 8:00 ص حتى 8:00 م، من الأحد إلى الخميس</div>
            <div className="mobile-support-buttons">
              <a href="https://wa.me/966555964559" className="mobile-support-btn whatsapp" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"/>
                </svg>
                واتساب
              </a>
              <a href="tel:0555964559" className="mobile-support-btn call">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
                مكالمة
              </a>
            </div>
          </div>
        </div>
        <div className="mobile-menu-section">
          <button className="mobile-map-btn" onClick={() => { setMobileMenuOpen(false); onOpenMap && onOpenMap(); }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
            </svg>
            عقاراتنا على الخريطة
          </button>
          <button className="mobile-lang-toggle" onClick={toggleLanguage}>
            <svg className="globe-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <ellipse cx="12" cy="12" rx="4" ry="10"/>
              <path d="M2 12h20"/>
            </svg>
            {isArabic ? 'English' : 'العربية'}
          </button>
        </div>
      </div>
    </header>
  );
};

// Search Bar Component
const SearchBar = ({ onSearch }) => {
  const [searchData, setSearchData] = useState({
    type: 'all',
    region: '',
    city: '',
    category: '',
    propertyType: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    bedrooms: '',
    bathrooms: '',
    voiceSearch: ''
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Check for voice support
  useEffect(() => {
    setVoiceSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'region') {
      const cities = value ? REGIONS_AND_CITIES[value]?.cities || [] : [];
      setAvailableCities(cities);
      setSearchData(prev => ({ ...prev, [name]: value, city: '' })); // Reset city when region changes
    } else {
      setSearchData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSearch = () => {
    onSearch(searchData);
  };

  // Voice Search functionality
  const startVoiceSearch = () => {
    if (!voiceSupported) {
      alert('المتصفح لا يدعم البحث الصوتي');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'ar-SA'; // Arabic language
    recognition.continuous = false;
    recognition.interimResults = false;

    setIsListening(true);

    recognition.onresult = (event) => {
      const voiceText = event.results[0][0].transcript;
      setSearchData(prev => ({ ...prev, voiceSearch: voiceText }));
      
      // Auto-process voice command
      processVoiceCommand(voiceText);
    };

    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const processVoiceCommand = (command) => {
    // Simple voice command processing
    const lowerCommand = command.toLowerCase();
    
    // Check for property types
    if (lowerCommand.includes('فيلا')) {
      setSearchData(prev => ({ ...prev, propertyType: 'villa' }));
    } else if (lowerCommand.includes('شقة')) {
      setSearchData(prev => ({ ...prev, propertyType: 'apartment' }));
    } else if (lowerCommand.includes('أرض')) {
      setSearchData(prev => ({ ...prev, propertyType: 'land' }));
    }
    
    // Check for sale/rent
    if (lowerCommand.includes('للبيع')) {
      setSearchData(prev => ({ ...prev, type: 'sale' }));
    } else if (lowerCommand.includes('للإيجار')) {
      setSearchData(prev => ({ ...prev, type: 'rent' }));
    }
    
    // Check for cities
    Object.values(REGIONS_AND_CITIES).forEach(region => {
      region.cities.forEach(city => {
        if (lowerCommand.includes(city)) {
          setSearchData(prev => ({ ...prev, city: city }));
        }
      });
    });
  };

  return (
    <section className="search-section">
      <div className="container">
        <div className="search-bar">
          <div className="search-tabs">
            <button 
              className={`search-tab ${searchData.type === 'all' ? 'active' : ''}`}
              onClick={() => setSearchData(prev => ({ ...prev, type: 'all' }))}
            >
              الكل
            </button>
            <button 
              className={`search-tab ${searchData.type === 'sale' ? 'active' : ''}`}
              onClick={() => setSearchData(prev => ({ ...prev, type: 'sale' }))}
            >
              للبيع
            </button>
            <button 
              className={`search-tab ${searchData.type === 'rent' ? 'active' : ''}`}
              onClick={() => setSearchData(prev => ({ ...prev, type: 'rent' }))}
            >
              للإيجار
            </button>
            <button 
              className={`search-tab ${searchData.type === 'projects' ? 'active' : ''}`}
              onClick={() => setSearchData(prev => ({ ...prev, type: 'projects' }))}
            >
              المشاريع
            </button>
            <button 
              className={`search-tab ${searchData.type === 'requests' ? 'active' : ''}`}
              onClick={() => setSearchData(prev => ({ ...prev, type: 'requests' }))}
            >
              الطلبات
            </button>
          </div>
          
          <div className="search-inputs">
            <div className="search-field">
              <select name="region" value={searchData.region} onChange={handleInputChange}>
                <option value="">اختر المنطقة</option>
                {Object.entries(REGIONS_AND_CITIES).map(([key, region]) => (
                  <option key={key} value={key}>{region.name}</option>
                ))}
              </select>
            </div>
            
            <div className="search-field">
              <select name="city" value={searchData.city} onChange={handleInputChange} disabled={!searchData.region}>
                <option value="">اختر المدينة</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            
            <div className="search-field">
              <select name="category" value={searchData.category} onChange={handleInputChange}>
                <option value="">فئة العقار</option>
                {Object.entries(PROPERTY_CATEGORIES).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>
            
            <div className="voice-search-container">
              {voiceSupported && (
                <button 
                  className={`voice-search-btn ${isListening ? 'listening' : ''}`}
                  onClick={startVoiceSearch}
                  disabled={isListening}
                  title="البحث الصوتي"
                >
                  <svg viewBox="0 0 24 24" className="microphone-icon">
                    <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path fill="currentColor" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </button>
              )}
              
              {searchData.voiceSearch && (
                <div className="voice-result">
                  <span>🗣️ {searchData.voiceSearch}</span>
                  <button 
                    className="clear-voice"
                    onClick={() => setSearchData(prev => ({ ...prev, voiceSearch: '' }))}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            
            <button 
              className="advanced-search-btn"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              البحث المتقدم
            </button>
            
            <button className="search-btn" onClick={handleSearch}>
              <span>🔍</span>
              بحث
            </button>
          </div>
          
          {showAdvanced && (
            <div className="advanced-search">
              <div className="advanced-row">
                <select name="propertyType" value={searchData.propertyType} onChange={handleInputChange}>
                  <option value="">نوع العقار</option>
                  {Object.entries(PROPERTY_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
                
                <input 
                  type="number" 
                  name="minPrice" 
                  placeholder="الحد الأدنى للسعر"
                  value={searchData.minPrice}
                  onChange={handleInputChange}
                />
                
                <input 
                  type="number" 
                  name="maxPrice" 
                  placeholder="الحد الأقصى للسعر"
                  value={searchData.maxPrice}
                  onChange={handleInputChange}
                />
                
                <input 
                  type="number" 
                  name="minArea" 
                  placeholder="أقل مساحة (م²)"
                  value={searchData.minArea}
                  onChange={handleInputChange}
                />
                
                <input 
                  type="number" 
                  name="maxArea" 
                  placeholder="أكبر مساحة (م²)"
                  value={searchData.maxArea}
                  onChange={handleInputChange}
                />
                
                <select name="bedrooms" value={searchData.bedrooms} onChange={handleInputChange}>
                  <option value="">عدد الغرف</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5+">5+</option>
                </select>
                
                <select name="bathrooms" value={searchData.bathrooms} onChange={handleInputChange}>
                  <option value="">دورات المياه</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4+">4+</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// SVG Icons Component - Based on latest reference image in gray
const PropertyIcons = {
  Area: () => (
    <svg viewBox="0 0 24 24" className="property-icon-svg">
      <rect x="2" y="2" width="20" height="20" stroke="#6b7280" strokeWidth="1.5" fill="none"/>
      <path d="M2 2l5 5M22 2l-5 5M2 22l5-5M22 22l-5-5" stroke="#6b7280" strokeWidth="1.5"/>
      <path d="M7 12h10M12 7v10" stroke="#6b7280" strokeWidth="1"/>
    </svg>
  ),
  Bed: () => (
    <svg viewBox="0 0 24 24" className="property-icon-svg">
      <rect x="2" y="11" width="20" height="7" rx="1" stroke="#6b7280" strokeWidth="1.5" fill="none"/>
      <rect x="4" y="7" width="3.5" height="4" rx="0.5" fill="#6b7280"/>
      <rect x="16.5" y="7" width="3.5" height="4" rx="0.5" fill="#6b7280"/>
      <path d="M2 14h20M2 18v2M22 18v2" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Bath: () => (
    <svg viewBox="0 0 24 24" className="property-icon-svg">
      <ellipse cx="12" cy="15" rx="9" ry="5" stroke="#6b7280" strokeWidth="1.5" fill="none"/>
      <path d="M12 5v5" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="7" cy="15" r="0.8" fill="#6b7280"/>
      <circle cx="12" cy="16" r="0.8" fill="#6b7280"/>
      <circle cx="17" cy="15" r="0.8" fill="#6b7280"/>
      <circle cx="9" cy="13" r="0.5" fill="#6b7280"/>
      <circle cx="15" cy="17" r="0.5" fill="#6b7280"/>
      <circle cx="10" cy="17" r="0.4" fill="#6b7280"/>
      <circle cx="14" cy="13" r="0.4" fill="#6b7280"/>
    </svg>
  ),
  Location: () => (
    <svg viewBox="0 0 24 24" className="property-icon-svg location-red">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#ef4444" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="9" r="2.5" fill="#ef4444"/>
    </svg>
  ),
  Views: () => (
    <svg viewBox="0 0 24 24" className="property-icon-svg">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#ef4444"/>
    </svg>
  ),
  Date: () => (
    <svg viewBox="0 0 24 24" className="property-icon-svg">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="#6b7280"/>
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" className="property-icon-svg">
      <rect x="6" y="2" width="12" height="20" rx="3" stroke="#6b7280" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="19" r="1" fill="#6b7280"/>
      <path d="M9 4h6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Chat: () => (
    <svg viewBox="0 0 24 24" className="property-icon-svg">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#6b7280" strokeWidth="2" fill="none"/>
      <path d="M8 9h8M8 13h6" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
};

// Modern Social Media Icons for Agent Cards
const SocialMediaIcons = {
  WhatsApp: () => (
    <svg viewBox="0 0 24 24" className="social-icon">
      <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"/>
    </svg>
  ),
  Instagram: () => (
    <svg viewBox="0 0 24 24" className="social-icon">
      <defs>
        <radialGradient id="instagram-gradient" cx="0.5" cy="1" r="1">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#instagram-gradient)"/>
      <rect x="4" y="4" width="16" height="16" rx="3.5" fill="none" stroke="white" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3.5" fill="none" stroke="white" strokeWidth="1.5"/>
      <circle cx="17.5" cy="6.5" r="1" fill="white"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" className="social-icon">
      <rect width="24" height="24" rx="5" fill="#000000"/>
      <path fill="white" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153ZM17.61 20.644h2.039L6.486 3.24H4.298L17.61 20.644Z"/>
    </svg>
  ),
  Snapchat: () => (
    <svg viewBox="0 0 24 24" className="social-icon">
      <rect width="24" height="24" rx="5" fill="#FFFC00" stroke="#000" strokeWidth="0.8"/>
      {/* النقاط السوداء المنتشرة */}
      <circle cx="3.5" cy="4" r="0.4" fill="#000"/>
      <circle cx="5" cy="3.2" r="0.3" fill="#000"/>
      <circle cx="6.5" cy="3.8" r="0.4" fill="#000"/>
      <circle cx="8" cy="2.8" r="0.3" fill="#000"/>
      <circle cx="9.5" cy="3.5" r="0.3" fill="#000"/>
      <circle cx="11" cy="3" r="0.4" fill="#000"/>
      <circle cx="13" cy="3.2" r="0.3" fill="#000"/>
      <circle cx="14.5" cy="4" r="0.4" fill="#000"/>
      <circle cx="16" cy="3.5" r="0.3" fill="#000"/>
      <circle cx="17.5" cy="4.2" r="0.4" fill="#000"/>
      <circle cx="19" cy="3.8" r="0.3" fill="#000"/>
      <circle cx="20.5" cy="4.5" r="0.4" fill="#000"/>
      
      <circle cx="2.8" cy="6" r="0.3" fill="#000"/>
      <circle cx="21.2" cy="6.2" r="0.4" fill="#000"/>
      <circle cx="2.5" cy="8" r="0.4" fill="#000"/>
      <circle cx="21.5" cy="8.5" r="0.3" fill="#000"/>
      <circle cx="2.2" cy="10.5" r="0.3" fill="#000"/>
      <circle cx="21.8" cy="11" r="0.4" fill="#000"/>
      <circle cx="2.8" cy="13" r="0.4" fill="#000"/>
      <circle cx="21.2" cy="13.5" r="0.3" fill="#000"/>
      <circle cx="3.2" cy="15.5" r="0.3" fill="#000"/>
      <circle cx="20.8" cy="16" r="0.4" fill="#000"/>
      <circle cx="2.5" cy="18" r="0.4" fill="#000"/>
      <circle cx="21.5" cy="18.2" r="0.3" fill="#000"/>
      
      <circle cx="3.8" cy="20" r="0.3" fill="#000"/>
      <circle cx="5.2" cy="20.8" r="0.4" fill="#000"/>
      <circle cx="7" cy="20.2" r="0.3" fill="#000"/>
      <circle cx="8.5" cy="21" r="0.4" fill="#000"/>
      <circle cx="10" cy="20.5" r="0.3" fill="#000"/>
      <circle cx="12" cy="21.2" r="0.4" fill="#000"/>
      <circle cx="14" cy="20.8" r="0.3" fill="#000"/>
      <circle cx="15.5" cy="21" r="0.4" fill="#000"/>
      <circle cx="17.2" cy="20.5" r="0.3" fill="#000"/>
      <circle cx="18.8" cy="20.2" r="0.4" fill="#000"/>
      <circle cx="20.2" cy="20.8" r="0.3" fill="#000"/>
      
      {/* مجموعات النقاط */}
      <circle cx="4" cy="7" r="0.3" fill="#000"/>
      <circle cx="4.8" cy="7.8" r="0.3" fill="#000"/>
      <circle cx="3.2" cy="7.8" r="0.3" fill="#000"/>
      
      <circle cx="20" cy="7.5" r="0.3" fill="#000"/>
      <circle cx="19.2" cy="8.3" r="0.3" fill="#000"/>
      <circle cx="20.8" cy="8.3" r="0.3" fill="#000"/>
      
      {/* الشبح الأبيض */}
      <path fill="white" stroke="#000" strokeWidth="0.6" d="M12 5.5c-2.8 0-5 2.2-5 5 0 1.5 0.7 2.8 1.8 3.7v4.3c0 0.3 0.2 0.5 0.5 0.5 0.1 0 0.3-0.1 0.4-0.2l1.3-1.3 1.3 1.3c0.1 0.1 0.2 0.2 0.4 0.2s0.3-0.1 0.4-0.2l1.3-1.3 1.3 1.3c0.1 0.1 0.2 0.2 0.4 0.2 0.3 0 0.5-0.2 0.5-0.5v-4.3c1.1-0.9 1.8-2.2 1.8-3.7 0-2.8-2.2-5-5-5z"/>
      {/* عيون الشبح */}
      <circle cx="10.5" cy="9.5" r="0.8" fill="#000"/>
      <circle cx="13.5" cy="9.5" r="0.8" fill="#000"/>
      {/* فم الشبح */}
      <ellipse cx="12" cy="12" rx="1" ry="0.6" fill="#000"/>
    </svg>
  ),
  TikTok: () => (
    <svg viewBox="0 0 24 24" className="social-icon">
      <rect width="24" height="24" rx="5" fill="#000000"/>
      <path fill="white" d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  ),
  LinkedIn: () => (
    <svg viewBox="0 0 24 24" className="social-icon">
      <rect width="24" height="24" rx="3" fill="#0077B5"/>
      <path fill="white" d="M6.5 8.31h2.97v9.54H6.5V8.31zM7.965 7.04c-.95 0-1.72-.77-1.72-1.72s.77-1.72 1.72-1.72 1.72.77 1.72 1.72-.77 1.72-1.72 1.72zM18.85 17.85h-2.97v-4.64c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.72h-2.97V8.31h2.85v1.3h.04c.4-.75 1.37-1.55 2.82-1.55 3.02 0 3.57 1.99 3.57 4.57v5.22z"/>
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" className="social-icon">
      <rect width="24" height="24" rx="5" fill="#22c55e"/>
      <path fill="white" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
    </svg>
  ),
  YouTube: () => (
    <svg viewBox="0 0 24 24" className="social-icon">
      <rect width="24" height="24" rx="5" fill="#FF0000"/>
      <path fill="white" d="M19.615 7.154c-.23-.86-.905-1.534-1.764-1.764C16.502 5 12 5 12 5s-4.502 0-5.85.39c-.86.23-1.535.905-1.765 1.764C4 8.502 4 12 4 12s0 3.498.385 4.846c.23.86.905 1.534 1.764 1.764C7.498 19 12 19 12 19s4.502 0 5.85-.39c.86-.23 1.535-.905 1.765-1.764C20 15.498 20 12 20 12s0-3.498-.385-4.846zM10 15V9l5.196 3L10 15z"/>
    </svg>
  )
};

// Property Card Component
const PropertyCard = ({ property }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div className="property-card">
      <div className="property-image">
        <img src={property.image} alt={property.title} />
        <div className="property-status">{property.status}</div>
        <div className="property-actions">
          <button 
            className={`action-btn favorite ${isFavorite ? 'active' : ''}`}
            onClick={() => setIsFavorite(!isFavorite)}
          >
            ❤️
          </button>
          <button className="action-btn share">📤</button>
        </div>
        {property.featured && <div className="featured-badge">مميز</div>}
      </div>
      
      <div className="property-content">
        <h3 className="property-title">{property.title}</h3>
        <div className="property-price">
          {property.price} ريال سعودي
        </div>
        <div className="property-location">
          <PropertyIcons.Location />
          {property.location}
        </div>
        
        <div className="property-details">
          <div className="property-category">
            {PROPERTY_CATEGORIES[property.category]} - {PROPERTY_TYPES[property.type]}
          </div>
          <div className="property-icons">
            <div className="property-icon">
              <PropertyIcons.Area />
              {property.area} م²
            </div>
            {property.bedrooms && (
              <div className="property-icon">
                <PropertyIcons.Bed />
                {property.bedrooms}
              </div>
            )}
            {property.bathrooms && (
              <div className="property-icon">
                <PropertyIcons.Bath />
                {property.bathrooms}
              </div>
            )}
          </div>
        </div>
        
        <div className="property-stats">
          <span className="publish-date">
            <PropertyIcons.Date />
            {new Date(property.publishDate).toLocaleDateString('ar-SA')}
          </span>
          <span className="views">
            <PropertyIcons.Views />
            {property.views} مشاهدة
          </span>
        </div>
        
        <div className="agent-info">
          <img src={property.agent.image} alt={property.agent.name} className="agent-avatar" />
          <div className="agent-details">
            <div className="agent-name">{property.agent.name}</div>
            <div className="agent-contact">
              <button className="contact-btn">
                <PropertyIcons.Phone />
                اتصال
              </button>
              <button className="chat-btn">
                <PropertyIcons.Chat />
                محادثة
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Agent Card Component - Exact match to reference image
const AgentCard = ({ agent }) => {
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <div className="agent-card">
      <div className="agent-card-header">
        <div></div>
        <button 
          className={`follow-btn ${isFollowing ? 'following' : ''}`}
          onClick={() => setIsFollowing(!isFollowing)}
        >
          {isFollowing ? 'متابع' : 'متابعة'}
        </button>
      </div>
      
      <div className="agent-main-info">
        <div className="agent-photo-container">
          <div className="agent-photo">
            لا توجد صورة
          </div>
        </div>
        
        <h3 className="agent-name">{agent.name}</h3>
        <div className="agent-location">{agent.region}</div>
        
        <div className="agent-rating">
          <span className="rating-stars">★★★★★</span>
          <span className="rating-number">{agent.rating}</span>
          <span className="rating-count">({agent.followers})</span>
        </div>
        
        <div className="agent-join-date">انضم في فبراير 2024</div>
      </div>
      
      <div className="agent-stats">
        <div className="stat">
          <span className="stat-number">{agent.properties}</span>
          <span className="stat-label">عقار</span>
        </div>
        <div className="stat">
          <span className="stat-number">{agent.requests}</span>
          <span className="stat-label">طلب</span>
        </div>
        <div className="stat">
          <span className="stat-number">{agent.followers}</span>
          <span className="stat-label">متابع</span>
        </div>
      </div>
      
      <div className="agent-actions">
        <div className="social-media-icons">
          <button className="social-btn whatsapp" title="واتساب">
            <SocialMediaIcons.WhatsApp />
          </button>
          <button className="social-btn instagram" title="إنستغرام">
            <SocialMediaIcons.Instagram />
          </button>
          <button className="social-btn x" title="X (تويتر)">
            <SocialMediaIcons.X />
          </button>
          <button className="social-btn snapchat" title="سناب شات">
            <SocialMediaIcons.Snapchat />
          </button>
          <button className="social-btn tiktok" title="تيك توك">
            <SocialMediaIcons.TikTok />
          </button>
          <button className="social-btn linkedin" title="لينكد إن">
            <SocialMediaIcons.LinkedIn />
          </button>
        </div>
        <button className="contact-agent-btn">
          <SocialMediaIcons.Phone />
        </button>
      </div>
    </div>
  );
};

// Login Modal Component (unchanged from previous version)
const LoginModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState('phone');
  const [formData, setFormData] = useState({
    phone_number: '',
    user_type: 'visitor',
    otp_code: '',
    national_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userTypes, setUserTypes] = useState([]);
  const [requiresNafath, setRequiresNafath] = useState(false);

  useEffect(() => {
    fetchUserTypes();
  }, []);

  const fetchUserTypes = async () => {
    try {
      const response = await axios.get(`${API}/user-types`);
      setUserTypes(response.data.user_types);
    } catch (error) {
      console.error('Failed to fetch user types:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'user_type') {
      const selectedType = userTypes.find(type => type.key === value);
      setRequiresNafath(selectedType?.requires_nafath || false);
    }
  };

  const sendOTP = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await axios.post(`${API}/auth/send-otp`, {
        phone_number: formData.phone_number,
        user_type: formData.user_type,
        language: 'ar'
      });
      
      if (response.data.success) {
        setMessage(response.data.message);
        setStep('otp');
      }
    } catch (error) {
      setMessage(error.response?.data?.detail || 'خطأ في إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await axios.post(`${API}/auth/verify-otp`, {
        phone_number: formData.phone_number,
        otp_code: formData.otp_code,
        user_type: formData.user_type
      });
      
      if (response.data.success) {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        
        if (requiresNafath && !response.data.user.is_nafath_verified) {
          setStep('nafath');
          setMessage('يتطلب التحقق من الهوية عبر النفاذ الوطني');
        } else {
          onSuccess(response.data.user);
          onClose();
          setStep('phone');
          setFormData({ phone_number: '', user_type: 'visitor', otp_code: '', national_id: '' });
        }
      }
    } catch (error) {
      setMessage(error.response?.data?.detail || 'خطأ في التحقق من الرمز');
    } finally {
      setLoading(false);
    }
  };

  const verifyNafath = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API}/auth/nafath/verify`, {
        national_id: formData.national_id,
        phone_number: formData.phone_number
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setMessage(response.data.message);
        const profileResponse = await axios.get(`${API}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        localStorage.setItem('user_data', JSON.stringify(profileResponse.data.user));
        onSuccess(profileResponse.data.user);
        onClose();
        setStep('phone');
        setFormData({ phone_number: '', user_type: 'visitor', otp_code: '', national_id: '' });
      }
    } catch (error) {
      setMessage(error.response?.data?.detail || 'خطأ في التحقق من النفاذ الوطني');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>تسجيل الدخول</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {step === 'phone' && (
            <div className="phone-step">
              <h3>أدخل رقم الهاتف ونوع المستخدم</h3>
              
              <div className="form-group">
                <label>نوع المستخدم</label>
                <select
                  name="user_type"
                  value={formData.user_type}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  {userTypes.map(type => (
                    <option key={type.key} value={type.key}>
                      {type.name_arabic}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>رقم الهاتف</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  placeholder="05xxxxxxxx"
                  className="form-input"
                  dir="rtl"
                />
              </div>
              
              {requiresNafath && (
                <div className="nafath-notice">
                  <p>⚠️ هذا النوع من المستخدمين يتطلب التحقق عبر النفاذ الوطني</p>
                </div>
              )}
              
              <button
                onClick={sendOTP}
                disabled={loading || !formData.phone_number}
                className="submit-btn"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </button>
            </div>
          )}
          
          {step === 'otp' && (
            <div className="otp-step">
              <h3>أدخل رمز التحقق</h3>
              <p>تم إرسال رمز التحقق إلى {formData.phone_number}</p>
              
              <div className="form-group">
                <label>رمز التحقق</label>
                <input
                  type="text"
                  name="otp_code"
                  value={formData.otp_code}
                  onChange={handleInputChange}
                  placeholder="123456"
                  className="form-input otp-input"
                  maxLength="6"
                  dir="ltr"
                />
              </div>
              
              <button
                onClick={verifyOTP}
                disabled={loading || !formData.otp_code}
                className="submit-btn"
              >
                {loading ? 'جاري التحقق...' : 'تحقق من الرمز'}
              </button>
              
              <button
                onClick={() => setStep('phone')}
                className="back-btn"
              >
                العودة
              </button>
            </div>
          )}
          
          {step === 'nafath' && (
            <div className="nafath-step">
              <h3>التحقق من الهوية - النفاذ الوطني</h3>
              <p>يرجى إدخال رقم الهوية الوطنية للتحقق</p>
              
              <div className="form-group">
                <label>رقم الهوية الوطنية</label>
                <input
                  type="text"
                  name="national_id"
                  value={formData.national_id}
                  onChange={handleInputChange}
                  placeholder="1234567890"
                  className="form-input"
                  maxLength="10"
                  dir="ltr"
                />
              </div>
              
              <button
                onClick={verifyNafath}
                disabled={loading || !formData.national_id}
                className="submit-btn"
              >
                {loading ? 'جاري التحقق...' : 'التحقق عبر النفاذ الوطني'}
              </button>
            </div>
          )}
          
          {message && (
            <div className={`message ${message.includes('خطأ') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showFullMap, setShowFullMap] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
      }
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setCurrentUser(null);
  };

  const handleSearch = (searchData) => {
    console.log('Search data:', searchData);
    // Implement search functionality
  };

  const featuredProperties = SAMPLE_PROPERTIES.filter(p => p.featured);
  const latestProperties = SAMPLE_PROPERTIES.slice().reverse().slice(0, 4);
  const mostViewedProperties = SAMPLE_PROPERTIES.slice().sort((a, b) => b.views - a.views).slice(0, 4);

  return (
    <div className="App">
      <Header 
        onLoginClick={() => setShowLoginModal(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenMap={() => setShowFullMap(true)}
      />
      
      <SearchBar onSearch={handleSearch} />
      
      <main className="main-content">
        {currentUser && (
          <section className="user-welcome-section">
            <div className="container">
              <div className="user-welcome-card">
                <h2>مرحباً بك، {currentUser.full_name_arabic || currentUser.phone_number}</h2>
                <p>نوع الحساب: {USER_TYPES[currentUser.user_type]}</p>
                
                <div className="verification-badges">
                  {currentUser.is_phone_verified && (
                    <div className="verification-badge verified">
                      ✅ تم التحقق من رقم الهاتف
                    </div>
                  )}
                  
                  {currentUser.is_nafath_verified && (
                    <div className="verification-badge verified">
                      ✅ تم التحقق من الهوية عبر النفاذ الوطني
                    </div>
                  )}
                  
                  {!currentUser.is_nafath_verified && 
                   ['property_owner', 'broker_individual', 'broker_company'].includes(currentUser.user_type) && (
                    <div className="verification-badge pending">
                      ⚠️ يتطلب التحقق من الهوية عبر النفاذ الوطني
                      <button 
                        onClick={() => setShowLoginModal(true)} 
                        className="verify-btn"
                      >
                        التحقق الآن
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* Featured Properties */}
        <section className="properties-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">العقارات المميزة</h2>
              <div className="section-tabs">
                <button className="tab-btn active">الكل</button>
                <button className="tab-btn">للبيع</button>
                <button className="tab-btn">للإيجار</button>
                <button className="tab-btn">المشاريع</button>
              </div>
              <a href="#more" className="more-link">المزيد →</a>
            </div>
            
            <div className="properties-grid">
              {featuredProperties.map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="map-section">
          <div className="container">
            <div className="map-section-header">
              <h2 className="map-section-title">استكشف العقارات على الخريطة</h2>
              <button 
                className="view-full-map-btn"
                onClick={() => setShowFullMap(true)}
                data-testid="view-full-map-btn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
                </svg>
                عرض الخريطة الكاملة
              </button>
            </div>
            <PropertyMap 
              properties={SAMPLE_PROPERTIES}
              height="450px"
              showSearch={true}
              zoom={11}
            />
          </div>
        </section>
        
        {/* Latest Properties */}
        <section className="properties-section latest">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">العقارات الأحدث</h2>
              <div className="section-tabs">
                <button className="tab-btn active">الكل</button>
                <button className="tab-btn">للبيع</button>
                <button className="tab-btn">للإيجار</button>
                <button className="tab-btn">المشاريع</button>
              </div>
              <a href="#more" className="more-link">المزيد →</a>
            </div>
            
            <div className="properties-grid">
              {latestProperties.map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
        
        {/* Most Viewed Properties */}
        <section className="properties-section most-viewed">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">العقارات الأكثر مشاهدة</h2>
              <div className="section-tabs">
                <button className="tab-btn active">الكل</button>
                <button className="tab-btn">للبيع</button>
                <button className="tab-btn">للإيجار</button>
                <button className="tab-btn">المشاريع</button>
              </div>
              <a href="#more" className="more-link">المزيد →</a>
            </div>
            
            <div className="properties-grid">
              {mostViewedProperties.map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
        
        {/* Properties by Region */}
        <section className="regions-section">
          <div className="container">
            <h2 className="section-title">العقارات حسب المنطقة</h2>
            
            <div className="regions-tabs">
              {Object.entries(REGIONS).map(([key, name]) => (
                <button key={key} className="region-tab">
                  {name}
                  <span className="property-count">(125)</span>
                </button>
              ))}
            </div>
            
            <div className="properties-grid">
              {SAMPLE_PROPERTIES.slice(0, 4).map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
        
        {/* Agents Section */}
        <section className="agents-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">الوسطاء المميزون</h2>
              <a href="#more-agents" className="more-link">المزيد →</a>
            </div>
            
            <div className="agents-grid">
              {SAMPLE_AGENTS.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <img src="https://customer-assets.emergentagent.com/job_realty-cards/artifacts/w1hf3c8g_Logo%201020%20copy.png" alt="الموقع" className="logo" />
                <h3>عنوان</h3>
                <p>منصة الوساطة والتسويق العقاري</p>
              </div>
            </div>
            
            <div className="footer-section">
              <h4>روابط سريعة</h4>
              <ul>
                <li><a href="#properties">العقارات</a></li>
                <li><a href="#brokers">الوسطاء</a></li>
                <li><a href="#photography">التصوير</a></li>
                <li><a href="#pricing">الأسعار</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>خدمات</h4>
              <ul>
                <li><a href="#add-property">إضافة عقار</a></li>
                <li><a href="#property-request">طلب عقار</a></li>
                <li><a href="#mediation">عقد وساطة</a></li>
                <li><a href="#marketing">عقد تسويق</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>تواصل معنا</h4>
              <div className="contact-info">
                <p>📞 +966 11 123 4567</p>
                <p>✉️ info@onwan.sa</p>
                <p>📍 الرياض، المملكة العربية السعودية</p>
              </div>
              
              <div className="social-links">
                <a href="#twitter" className="social-link">🐦</a>
                <a href="#linkedin" className="social-link">💼</a>
                <a href="#instagram" className="social-link">📷</a>
              </div>
            </div>
            
            <div className="footer-section">
              <h4>شهادة التوثيق</h4>
              <div className="certification">
                <div className="cert-badge">🏛️</div>
                <p>منصة معتمدة من الهيئة العامة للعقار</p>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <div className="footer-bottom-content">
              <p>© 2024 عنوان. جميع الحقوق محفوظة.</p>
              <div className="footer-links">
                <a href="#privacy">سياسة الخصوصية</a>
                <a href="#terms">الشروط والأحكام</a>
                <a href="#support">الدعم الفني</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Full Page Map Modal */}
      {showFullMap && (
        <FullPageMap
          properties={SAMPLE_PROPERTIES}
          onClose={() => setShowFullMap(false)}
        />
      )}
    </div>
  );
}

export default App;