export function filterDataByDate(data, dateFilter) {
  if (!dateFilter || dateFilter === 'all') return data;

  // All-time with month or month+day filter (all-MM or all-MM-DD)
  if (dateFilter.startsWith('all-')) {
    const parts = dateFilter.split('-');
    if (parts.length === 3) {
      const month = parseInt(parts[1]), day = parseInt(parts[2]);
      return data.filter(entry => {
        try {
          if (!(entry._dateObj instanceof Date) || isNaN(entry._dateObj.getTime())) {
            entry._dateObj = new Date(entry.ts);
          }
          return (entry._dateObj.getMonth() + 1) === month && entry._dateObj.getDate() === day;
        } catch (err) { return false; }
      });
    } else {
      const month = parseInt(parts[1]);
      return data.filter(entry => {
        try {
          if (!(entry._dateObj instanceof Date) || isNaN(entry._dateObj.getTime())) {
            entry._dateObj = new Date(entry.ts);
          }
          return (entry._dateObj.getMonth() + 1) === month;
        } catch (err) { return false; }
      });
    }
  }

  // Parse dates once to avoid repeated parsing in filter loop
  let startDate, endDate;

  // Parse year-month-day format (YYYY-MM-DD)
  if (dateFilter.includes('-') && dateFilter.split('-').length === 3) {
    const [year, month, day] = dateFilter.split('-').map(Number);
    startDate = new Date(year, month - 1, day);
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(year, month - 1, day);
    endDate.setHours(23, 59, 59, 999);
    
    return data.filter(entry => {
      try {
        // Cache date object on entry to avoid repeated parsing
        // Ensure _dateObj is actually a Date object (not a serialized string)
        if (!(entry._dateObj instanceof Date) || isNaN(entry._dateObj.getTime())) {
          entry._dateObj = new Date(entry.ts);
        }
        return entry._dateObj >= startDate && entry._dateObj <= endDate;
      } catch (err) { return false; }
    });
  }

  // Parse year-month format (YYYY-MM)
  if (dateFilter.includes('-') && dateFilter.split('-').length === 2) {
    const [year, month] = dateFilter.split('-').map(Number);
    startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    // Last day of month
    endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    return data.filter(entry => {
      try {
        if (!(entry._dateObj instanceof Date) || isNaN(entry._dateObj.getTime())) {
          entry._dateObj = new Date(entry.ts);
        }
        return entry._dateObj >= startDate && entry._dateObj <= endDate;
      } catch (err) { return false; }
    });
  }

  // Just a year
  const year = parseInt(dateFilter);
  if (!isNaN(year)) {
    startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(year, 11, 31);
    endDate.setHours(23, 59, 59, 999);

    return data.filter(entry => {
      try {
        if (!(entry._dateObj instanceof Date) || isNaN(entry._dateObj.getTime())) {
          entry._dateObj = new Date(entry.ts);
        }
        return entry._dateObj >= startDate && entry._dateObj <= endDate;
      } catch (err) { return false; }
    });
  }
  
  console.warn("Invalid date filter format:", dateFilter);
  return data;
}

// Safe date parsing with fallback
export function parseDateSafely(input) {
  try {
    const date = new Date(input);
    return isNaN(date.getTime()) ? new Date() : date;
  } catch (e) {
    return new Date();
  }
}

// Content-based detection functions

export function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 210000;
  
  try {
    let ms = 0;
    
    // Match hours
    const hoursMatch = timeStr.match(/(\d+)h/);
    if (hoursMatch) {
      ms += parseInt(hoursMatch[1]) * 60 * 60 * 1000;
    }
    
    // Match minutes
    const minutesMatch = timeStr.match(/(\d+)m/);
    if (minutesMatch) {
      ms += parseInt(minutesMatch[1]) * 60 * 1000;
    }
    
    // Match seconds
    const secondsMatch = timeStr.match(/(\d+)s/);
    if (secondsMatch) {
      ms += parseInt(secondsMatch[1]) * 1000;
    }
    
    return ms || 210000; // Default to 3.5 minutes if parsing fails
  } catch (e) {
    return 210000;
  }
}

