// Market analysis utilities for Onwan
// Provides simple AI-like insights for property cards and details

/**
 * Parse price string like "2,500,000" to number
 */
export const parsePrice = (priceStr) => {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return 0;
  return parseInt(String(priceStr).replace(/[^0-9]/g, ''), 10) || 0;
};

/**
 * Format number to Arabic-friendly price string
 */
export const formatPrice = (num) => {
  return new Intl.NumberFormat('en-US').format(Math.round(num));
};

/**
 * Compute market average price per square meter for properties
 * grouped by category and status (sale/rent).
 * Returns map: `${category}__${status}` -> avg price per m²
 */
export const computeMarketAverages = (properties) => {
  const groups = {};
  properties.forEach((p) => {
    const price = parsePrice(p.price);
    const area = parseFloat(p.area) || 0;
    if (!price || !area) return;
    const key = `${p.category || 'all'}__${p.status || 'all'}`;
    if (!groups[key]) groups[key] = { total: 0, count: 0 };
    groups[key].total += price / area;
    groups[key].count += 1;
  });
  const result = {};
  Object.entries(groups).forEach(([k, v]) => {
    result[k] = v.total / v.count;
  });
  return result;
};

/**
 * Compute price insight: how much the property is below/above market
 * Returns: { percent, isBelow, marketAvgPerSqm } or null
 */
export const getPriceInsight = (property, averages) => {
  const price = parsePrice(property.price);
  const area = parseFloat(property.area) || 0;
  if (!price || !area) return null;
  const key = `${property.category || 'all'}__${property.status || 'all'}`;
  const avg = averages[key];
  if (!avg) return null;
  const propPerSqm = price / area;
  const diff = ((avg - propPerSqm) / avg) * 100;
  return {
    percent: Math.abs(Math.round(diff)),
    isBelow: diff > 0,
    marketAvgPerSqm: Math.round(avg),
  };
};

/**
 * Returns badges array for a property based on simple heuristics
 */
export const getPropertyBadges = (property, averages) => {
  const badges = [];
  const insight = getPriceInsight(property, averages);

  // Opportunity badge: priced significantly below market
  if (insight && insight.isBelow && insight.percent >= 5) {
    badges.push({
      key: 'opportunity',
      label: 'فرصة',
      icon: 'fire',
      tone: 'hot',
    });
  }

  // Recommended: high views or featured
  if (property.featured || (property.views && property.views > 1500)) {
    badges.push({
      key: 'recommended',
      label: 'موصى به',
      icon: 'star',
      tone: 'gold',
    });
  }

  // New badge: age 0
  if (property.age === 0) {
    badges.push({
      key: 'new',
      label: 'جديد',
      icon: 'sparkle',
      tone: 'fresh',
    });
  }

  return badges;
};

/**
 * Generate AI-like summary line for a property
 */
export const getAISummary = (property) => {
  const parts = [];
  const type = property.type || '';
  const cat = property.category || '';

  if (cat === 'residential') {
    if (property.bedrooms >= 4) parts.push('مناسب لعائلة');
    else if (property.bedrooms >= 2) parts.push('مناسب لعائلة صغيرة');
    else parts.push('مناسب للأفراد');
  } else if (cat === 'commercial') {
    parts.push('مناسب للاستثمار التجاري');
  }

  if (property.location && property.location.includes('الملقا')) parts.push('قريب من المدارس');
  if (property.location && (property.location.includes('العليا') || property.location.includes('الملز'))) parts.push('قريب من الخدمات');
  if (property.age === 0) parts.push('بناء جديد');
  else if (property.age && property.age <= 2) parts.push('بناء حديث');

  if (parts.length === 0) parts.push('عقار مميز');
  return parts.join(' • ');
};

/**
 * Estimate "interested now" count based on views (deterministic)
 */
export const getInterestedNow = (property) => {
  const views = property.views || 0;
  // 1.5% to 3% of views, deterministic-ish
  const seed = (property.id || 0) % 7;
  return Math.max(3, Math.round((views * (0.015 + seed * 0.002))));
};

/**
 * AI Matching score for a property given user preferences
 * preferences: { budget: number, region: string, type: string, purpose: 'sale'|'rent', bedrooms: number }
 */
export const matchScore = (property, prefs) => {
  let score = 0;
  const price = parsePrice(property.price);

  // Purpose match
  if (prefs.purpose === 'sale' && property.status === 'للبيع') score += 30;
  if (prefs.purpose === 'rent' && property.status === 'للإيجار') score += 30;
  if (!prefs.purpose) score += 10;

  // Budget match (within ±20% is great)
  if (prefs.budget && price) {
    const ratio = price / prefs.budget;
    if (ratio <= 1) score += 25;
    else if (ratio <= 1.1) score += 18;
    else if (ratio <= 1.2) score += 10;
  } else {
    score += 10;
  }

  // Region match (city or location string contains)
  if (prefs.region) {
    const loc = (property.location || '').toLowerCase();
    if (loc.includes(prefs.region.toLowerCase())) score += 20;
  } else {
    score += 5;
  }

  // Type match
  if (prefs.type && property.type === prefs.type) score += 15;
  else if (!prefs.type) score += 5;

  // Bedrooms match
  if (prefs.bedrooms && property.bedrooms) {
    const diff = Math.abs(property.bedrooms - prefs.bedrooms);
    if (diff === 0) score += 10;
    else if (diff === 1) score += 6;
    else if (diff === 2) score += 3;
  }

  return score;
};

/**
 * Filter helpers for the smart filter chips
 */
export const smartFilter = (properties, mode, userBudget = null) => {
  const averages = computeMarketAverages(properties);
  switch (mode) {
    case 'budget_close': {
      // Closest to user's budget (or median if not provided)
      const median = userBudget || median_price(properties);
      return [...properties].sort(
        (a, b) => Math.abs(parsePrice(a.price) - median) - Math.abs(parsePrice(b.price) - median)
      );
    }
    case 'best_value': {
      // Lowest price per sqm vs market avg in category
      return [...properties].sort((a, b) => {
        const ia = getPriceInsight(a, averages);
        const ib = getPriceInsight(b, averages);
        const va = ia ? (ia.isBelow ? ia.percent : -ia.percent) : 0;
        const vb = ib ? (ib.isBelow ? ib.percent : -ib.percent) : 0;
        return vb - va;
      });
    }
    case 'opportunities': {
      return properties.filter((p) => {
        const i = getPriceInsight(p, averages);
        return i && i.isBelow && i.percent >= 5;
      });
    }
    case 'recommended': {
      return properties.filter((p) => p.featured || (p.views && p.views > 1500));
    }
    default:
      return properties;
  }
};

const median_price = (properties) => {
  const vals = properties.map((p) => parsePrice(p.price)).filter(Boolean).sort((a, b) => a - b);
  if (vals.length === 0) return 0;
  return vals[Math.floor(vals.length / 2)];
};
