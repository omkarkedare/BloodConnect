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
  matched: 'blue',
  partially_verified: 'yellow',
  donation_verified: 'green',
  donation_rejected: 'red',
  pending_verification: 'yellow',
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
  matched: 'Matched',
  partially_verified: 'Partially Verified',
  donation_verified: 'Donation Verified',
  donation_rejected: 'Donation Rejected',
  pending_verification: 'Pending Verification',
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
