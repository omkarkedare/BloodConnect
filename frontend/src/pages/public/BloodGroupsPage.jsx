import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const bloodGroups = [
  { type: 'A+', canDonateTo: ['A+', 'AB+'], canReceiveFrom: ['A+', 'A-', 'O+', 'O-'] },
  { type: 'A-', canDonateTo: ['A+', 'A-', 'AB+', 'AB-'], canReceiveFrom: ['A-', 'O-'] },
  { type: 'B+', canDonateTo: ['B+', 'AB+'], canReceiveFrom: ['B+', 'B-', 'O+', 'O-'] },
  { type: 'B-', canDonateTo: ['B+', 'B-', 'AB+', 'AB-'], canReceiveFrom: ['B-', 'O-'] },
  { type: 'AB+', canDonateTo: ['AB+'], canReceiveFrom: ['All Types'] },
  { type: 'AB-', canDonateTo: ['AB+', 'AB-'], canReceiveFrom: ['A-', 'B-', 'AB-', 'O-'] },
  { type: 'O+', canDonateTo: ['A+', 'B+', 'AB+', 'O+'], canReceiveFrom: ['O+', 'O-'] },
  { type: 'O-', canDonateTo: ['All Types'], canReceiveFrom: ['O-'] },
];

export default function BloodGroupsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-surface-900 mb-4">Blood Group Compatibility</h1>
        <p className="text-surface-500 max-w-2xl mx-auto text-lg">Understanding blood type compatibility is essential for safe transfusions.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {bloodGroups.map(({ type, canDonateTo, canReceiveFrom }) => (
          <Card key={type} className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-700">{type}</span>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold text-surface-500 uppercase mb-2">Can Donate To</p>
              <div className="flex flex-wrap justify-center gap-1">
                {canDonateTo.map(g => <Badge key={g} color="green">{g}</Badge>)}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase mb-2">Can Receive From</p>
              <div className="flex flex-wrap justify-center gap-1">
                {canReceiveFrom.map(g => <Badge key={g} color="blue">{g}</Badge>)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
