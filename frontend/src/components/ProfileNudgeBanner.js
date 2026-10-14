import React, { useState } from 'react';
import './ProfileNudgeBanner.css';

const BROKER_TYPES = ['broker_individual', 'broker_company'];

export default function ProfileNudgeBanner({ currentUser, onOpenProfile }) {
  const key = `onwan_profile_nudge_${currentUser?.id}`;
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(key) === '1');

  if (!currentUser || !BROKER_TYPES.includes(currentUser.user_type) || dismissed) return null;

  const missing = [
    !currentUser.region && 'المنطقة',
    !currentUser.city && 'المدينة',
    !currentUser.fal_license && 'رقم رخصة فال',
  ].filter(Boolean);
  if (missing.length === 0) return null;

  const dismiss = () => { sessionStorage.setItem(key, '1'); setDismissed(true); };

  return (
    <section className="nudge-banner" data-testid="profile-nudge-banner">
      <div className="container">
        <div className="nudge-inner">
          <div className="nudge-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3zm-1 14l-3-3 1.41-1.41L11 13.17l4.59-4.58L17 10l-6 6z"/></svg>
          </div>
          <div className="nudge-text">
            <strong>أكمل ملفك المهني ليجدك العملاء في منطقتك</strong>
            <span>
              البيانات الناقصة: {missing.map((m, i) => <em key={m} data-testid={`nudge-missing-${i}`}>{m}</em>)}
              — تساعد المنصة على عرض إعلاناتك للباحثين في مدينتك وتعزّز ثقة العملاء بك.
            </span>
          </div>
          <div className="nudge-actions">
            <button type="button" className="nudge-cta" onClick={onOpenProfile} data-testid="nudge-complete-btn">إكمال الملف الآن</button>
            <button type="button" className="nudge-later" onClick={dismiss} data-testid="nudge-dismiss-btn">لاحقاً</button>
          </div>
        </div>
      </div>
    </section>
  );
}
