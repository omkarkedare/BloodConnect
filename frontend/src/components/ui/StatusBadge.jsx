import Badge from './Badge';

const statusColorMap = {
  open: 'green',
  in_progress: 'blue',
  fulfilled: 'purple',
  cancelled: 'gray',
  expired: 'red',
  pending: 'yellow',
  accepted: 'green',
  confirmed: 'green',
  rejected: 'red',
  verified: 'green',
  withdrawn: 'gray',
  normal: 'blue',
  urgent: 'orange',
  critical: 'red',
};

const statusLabelMap = {
  open: 'Open',
  in_progress: 'In Progress',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  expired: 'Expired',
  pending: 'Pending',
  accepted: 'Accepted',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  verified: 'Verified',
  withdrawn: 'Withdrawn',
  normal: 'Normal',
  urgent: 'Urgent',
  critical: 'Critical',
};

export default function StatusBadge({ status }) {
  return (
    <Badge color={statusColorMap[status] || 'gray'}>
      {statusLabelMap[status] || status}
    </Badge>
  );
}
