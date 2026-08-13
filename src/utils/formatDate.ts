/**
 * Utility to format dates into Vietnamese format "Ngày DD tháng MM năm YYYY" or "DD/MM/YYYY"
 */

export const formatDateVN = (dateStr?: string | null): string => {
  if (!dateStr) return '---';
  const raw = dateStr.trim();
  const parts = raw.split('T')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `Ngày ${day} tháng ${month} năm ${year}`;
  }

  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `Ngày ${day} tháng ${month} năm ${year}`;
  }

  return dateStr;
};

export const formatDateShortVN = (dateStr?: string | null): string => {
  if (!dateStr) return '---';
  const raw = dateStr.trim();
  const parts = raw.split('T')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return dateStr;
};
