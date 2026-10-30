import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  Droplets, 
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import Card from '../ui/Card';

const STANDARD_BLOOD_GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

export default function AdminAnalyticsCharts({ 
  donors = [], 
  requests = [], 
  donations = [], 
  stats = {} 
}) {
  // 1. Calculate Blood Group Supply (Registered Donors) vs Demand (Units Requested in Active Requests)
  const bloodGroupData = useMemo(() => {
    const supplyMap = {};
    const demandMap = {};

    STANDARD_BLOOD_GROUPS.forEach(bg => {
      supplyMap[bg] = 0;
      demandMap[bg] = 0;
    });

    // Count donors with each blood group
    donors.forEach(d => {
      const bg = (d.blood_group || '').toUpperCase();
      if (supplyMap[bg] !== undefined) {
        supplyMap[bg] += 1;
      }
    });

    // Count units requested in active (open/in_progress) requests
    requests.forEach(r => {
      const status = (r.status || '').toLowerCase();
      if (['open', 'in_progress'].includes(status)) {
        const bg = (r.blood_group || '').toUpperCase();
        if (demandMap[bg] !== undefined) {
          demandMap[bg] += (r.units_needed || 1);
        }
      }
    });

    const maxVal = Math.max(
      ...STANDARD_BLOOD_GROUPS.map(bg => Math.max(supplyMap[bg], demandMap[bg])),
      1
    );

    return STANDARD_BLOOD_GROUPS.map(bg => {
      const supply = supplyMap[bg];
      const demand = demandMap[bg];
      const isDeficit = demand > supply && demand > 0;
      return {
        blood_group: bg,
        supply,
        demand,
        supplyPercent: Math.round((supply / maxVal) * 100),
        demandPercent: Math.round((demand / maxVal) * 100),
        isDeficit,
      };
    });
  }, [donors, requests]);

  // 2. Operational Fulfillment & Health Metrics
  const operationalRatios = useMemo(() => {
    const totalRequests = stats.total_requests || requests.length || 0;
    const fulfilledRequests = stats.fulfilled_requests || requests.filter(r => (r.status || '').toLowerCase() === 'fulfilled').length;
    const fulfillmentRate = totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 0;

    const totalDonations = stats.total_donations || donations.length || 0;
    const verifiedDonations = stats.completed_donations || donations.filter(d => (d.status || '').toLowerCase() === 'verified').length;
    const verificationRate = totalDonations > 0 ? Math.round((verifiedDonations / totalDonations) * 100) : 0;

    const activeRequests = stats.active_blood_requests || requests.filter(r => ['open', 'in_progress'].includes((r.status || '').toLowerCase())).length;
    const urgentCount = stats.urgent_requests || requests.filter(r => ['urgent', 'critical'].includes((r.urgency || '').toLowerCase())).length;
    const urgencyRatio = activeRequests > 0 ? Math.round((urgentCount / activeRequests) * 100) : 0;

    const totalDonors = stats.total_donors || donors.length || 0;
    const completeProfiles = donors.filter(d => d.has_completed_profile).length;
    const profileRate = totalDonors > 0 ? Math.round((completeProfiles / totalDonors) * 100) : 0;

    return {
      fulfillmentRate,
      fulfilledRequests,
      totalRequests,
      verificationRate,
      verifiedDonations,
      totalDonations,
      urgencyRatio,
      urgentCount,
      activeRequests,
      profileRate,
      completeProfiles,
      totalDonors,
    };
  }, [requests, donations, donors, stats]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Chart 1: Blood Group Supply vs. Demand */}
      <Card className="lg:col-span-2 p-6 border-surface-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-surface-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">Blood Group Supply vs. Active Demand</h2>
              <p className="text-xs text-surface-500">Registered donors vs. units requested across active emergency requests</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium self-start sm:self-auto">
            <span className="flex items-center gap-1.5 text-surface-600">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
              Available Donors (Supply)
            </span>
            <span className="flex items-center gap-1.5 text-surface-600">
              <span className="w-3 h-3 rounded-xs bg-red-500 inline-block" />
              Units Needed (Demand)
            </span>
          </div>
        </div>

        {/* Bars Grid */}
        <div className="space-y-3.5">
          {bloodGroupData.map(item => (
            <div key={item.blood_group} className="flex items-center gap-3 text-xs">
              <span className="w-10 font-bold text-surface-800 shrink-0 text-right">
                {item.blood_group}
              </span>

              <div className="flex-1 space-y-1">
                {/* Supply Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-surface-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.supplyPercent}%` }}
                    />
                  </div>
                  <span className="w-12 text-[11px] font-semibold text-emerald-700 text-right">
                    {item.supply} donor{item.supply === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Demand Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-surface-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.demandPercent}%` }}
                    />
                  </div>
                  <span className="w-12 text-[11px] font-semibold text-red-700 text-right">
                    {item.demand} unit{item.demand === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {item.isDeficit && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  High Need
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Chart 2: Operational Triage & Pipeline Health */}
      <Card className="p-6 border-surface-200 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-surface-100">
            <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">Operational Triage Health</h2>
              <p className="text-xs text-surface-500">Platform fulfillment and verification ratios</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Metric 1: Request Fulfillment Rate */}
            <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-100">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-semibold text-surface-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary-600" />
                  Request Fulfillment Rate
                </span>
                <span className="font-bold text-primary-700 text-sm">
                  {operationalRatios.fulfillmentRate}%
                </span>
              </div>
              <div className="w-full bg-surface-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${operationalRatios.fulfillmentRate}%` }}
                />
              </div>
              <p className="text-[11px] text-surface-500 mt-1">
                {operationalRatios.fulfilledRequests} of {operationalRatios.totalRequests} requests fulfilled
              </p>
            </div>

            {/* Metric 2: Donation Verification Rate */}
            <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-100">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-semibold text-surface-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Donation Audit & Verification
                </span>
                <span className="font-bold text-emerald-700 text-sm">
                  {operationalRatios.verificationRate}%
                </span>
              </div>
              <div className="w-full bg-surface-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{ width: `${operationalRatios.verificationRate}%` }}
                />
              </div>
              <p className="text-[11px] text-surface-500 mt-1">
                {operationalRatios.verifiedDonations} of {operationalRatios.totalDonations} donation records verified
              </p>
            </div>

            {/* Metric 3: Emergency Urgency Proportion */}
            <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-100">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-semibold text-surface-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Critical & Urgent Proportion
                </span>
                <span className="font-bold text-amber-700 text-sm">
                  {operationalRatios.urgencyRatio}%
                </span>
              </div>
              <div className="w-full bg-surface-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${operationalRatios.urgencyRatio}%` }}
                />
              </div>
              <p className="text-[11px] text-surface-500 mt-1">
                {operationalRatios.urgentCount} of {operationalRatios.activeRequests} active requests marked urgent/critical
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-surface-600">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Real-time calculation from live operational database records.</span>
          </div>
          <Link
            to="/admin/reports"
            className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            View System Reports & Analytics <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
