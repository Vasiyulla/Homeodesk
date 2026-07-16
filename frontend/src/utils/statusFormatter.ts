export const formatCaseStatus = (status: string): string => {
  if (!status) return 'Unknown';
  
  switch (status) {
    case 'DRAFT': return 'Draft';
    case 'WAITING_FOR_DOCTOR': return 'Waiting';
    case 'REMEDY_PRESCRIBED': return 'Prescribed';
    case 'UNDER_OBSERVATION': return 'Observing';
    case 'CLOSED': return 'Closed';
    default: 
      return status.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }
};
