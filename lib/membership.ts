type MembershipRecord = {
  membership_type?: string | null;
  membership_status?: string | null;
  membership_expires_at?: string | null;
};

type PaymentRecord = {
  plan_type?: string | null;
  status?: string | null;
  activated_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getPlanDurationMonths(planType?: string | null) {
  if (!planType) return 12;
  if (planType.includes('monthly')) return 1;
  if (planType.includes('quarterly')) return 3;
  return 12;
}

export function getPlanDurationLabel(planType?: string | null) {
  const durationMonths = getPlanDurationMonths(planType);
  if (durationMonths === 1) return '1 month';
  if (durationMonths === 3) return '3 months';
  return '12 months';
}

export function getPlanLabel(planType?: string | null) {
  if (planType?.includes('provider_quarterly') || planType === 'quarterly') return 'Driver 3 Months';
  if (planType?.includes('provider_annual') || planType === 'annual') return 'Driver 12 Months';
  if (planType?.includes('provider_monthly') || planType === 'monthly') return 'Driver 1 Month';
  return 'Member 12 Months';
}

export function getMembershipExpiry(record?: MembershipRecord | null, payment?: PaymentRecord | null) {
  if (record?.membership_expires_at) {
    return record.membership_expires_at;
  }

  if (payment?.expires_at) {
    return payment.expires_at;
  }

  const start = payment?.activated_at || payment?.created_at;
  if (!start) return null;

  const baseDate = new Date(start);
  if (Number.isNaN(baseDate.getTime())) return null;

  const durationMonths = getPlanDurationMonths(payment?.plan_type || record?.membership_type);
  return addMonths(baseDate, durationMonths).toISOString();
}

export function formatMembershipExpiry(dateString: string | null): string {
  if (!dateString) return 'No expiry';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'No expiry';

  return `${date.getDate()} ${
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]
  } ${date.getFullYear()}`;
}
