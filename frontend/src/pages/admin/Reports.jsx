import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  Clock, 
  AlertTriangle, 
  Award, 
  Droplets, 
  MapPin, 
  Printer, 
  RotateCw, 
  ShieldCheck, 
  FileText, 
  ArrowUpRight,
  HeartHandshake
} from 'lucide-react';
import adminService from '../../services/adminService';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const STANDARD_BLOOD_GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [_stats, setStats] = useState({});
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [donors, setDonors] = useState([]);
  const [users, setUsers] = useState([]);

  // Timeframe Filter: 'all', '30d', '90d', 'year'
  const [timeframe, setTimeframe] = useState(() => localStorage.getItem('bloodconnect_admin_default_timeframe') || 'all');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Interactive Hover States
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredBarGroup, setHoveredBarGroup] = useState(null);
  const [hoveredDonutSlice, setHoveredDonutSlice] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [statsRes, donationsRes, requestsRes, donorsRes, usersRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getDonations().catch(() => ({ data: [] })),
        adminService.getRequests().catch(() => ({ data: [] })),
        adminService.getDonors().catch(() => ({ data: [] })),
        adminService.getUsers().catch(() => ({ data: [] })),
      ]);

      setStats(statsRes.data || {});
      setDonations(donationsRes.data || []);
      setRequests(requestsRes.data || []);
      setDonors(donorsRes.data || []);
      setUsers(usersRes.data || []);

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError('Failed to fetch system reports and analytics data. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter records based on selected timeframe
  const cutoffDate = useMemo(() => {
    if (timeframe === 'all') return null;
    const now = new Date();
    if (timeframe === '30d') {
      now.setDate(now.getDate() - 30);
    } else if (timeframe === '90d') {
      now.setDate(now.getDate() - 90);
    } else if (timeframe === 'year') {
      now.setDate(now.getDate() - 365);
    }
    return now.toISOString().split('T')[0];
  }, [timeframe]);

  const activeDonations = useMemo(() => {
    if (!cutoffDate) return donations;
    return donations.filter((d) => (d.donation_date || d.created_at || '') >= cutoffDate);
  }, [donations, cutoffDate]);

  const activeRequests = useMemo(() => {
    if (!cutoffDate) return requests;
    return requests.filter((r) => (r.required_date || r.created_at || '') >= cutoffDate);
  }, [requests, cutoffDate]);

  // Operational Counts
  const verifiedDonationsCount = useMemo(() => {
    return activeDonations.filter((d) => (d.status?.value || d.status || '').toLowerCase() === 'verified').length;
  }, [activeDonations]);

  const totalVerifiedUnits = useMemo(() => {
    return activeDonations
      .filter((d) => (d.status?.value || d.status || '').toLowerCase() === 'verified')
      .reduce((acc, d) => acc + (d.units_donated || 1), 0);
  }, [activeDonations]);

  const pendingDonationsCount = useMemo(() => {
    return activeDonations.filter((d) => (d.status?.value || d.status || '').toLowerCase() === 'pending').length;
  }, [activeDonations]);

  const rejectedDonationsCount = useMemo(() => {
    return activeDonations.filter((d) => (d.status?.value || d.status || '').toLowerCase() === 'rejected').length;
  }, [activeDonations]);

  const fulfilledRequestsCount = useMemo(() => {
    return activeRequests.filter((r) => (r.status || '').toLowerCase() === 'fulfilled').length;
  }, [activeRequests]);

  const openRequestsCount = useMemo(() => {
    return activeRequests.filter((r) => ['open', 'in_progress'].includes((r.status || '').toLowerCase())).length;
  }, [activeRequests]);

  const urgentRequestsCount = useMemo(() => {
    return activeRequests.filter(
      (r) => ['urgent', 'critical'].includes((r.urgency || '').toLowerCase()) &&
             ['open', 'in_progress'].includes((r.status || '').toLowerCase())
    ).length;
  }, [activeRequests]);

  const fulfillmentRate = useMemo(() => {
    if (activeRequests.length === 0) return 0;
    return Math.round((fulfilledRequestsCount / activeRequests.length) * 100);
  }, [fulfilledRequestsCount, activeRequests]);

  const profileCompletePercent = useMemo(() => {
    if (donors.length === 0) return 0;
    const completed = donors.filter((d) => d.has_completed_profile).length;
    return Math.round((completed / donors.length) * 100);
  }, [donors]);

  // 1. MONTHLY TIMELINE DATA (Last 6 Months)
  const monthlyTimelineData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const key = `${year}-${String(monthNum).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, { month: 'short' });
      months.push({ key, label, year, verified: 0, requests: 0 });
    }

    const monthMap = {};
    months.forEach((m) => {
      monthMap[m.key] = m;
    });

    donations.forEach((d) => {
      if ((d.status?.value || d.status || '').toLowerCase() === 'verified') {
        const dateStr = d.donation_date || d.created_at;
        if (dateStr) {
          const key = String(dateStr).substring(0, 7);
          if (monthMap[key]) {
            monthMap[key].verified += 1;
          }
        }
      }
    });

    requests.forEach((r) => {
      const dateStr = r.required_date || r.created_at;
      if (dateStr) {
        const key = String(dateStr).substring(0, 7);
        if (monthMap[key]) {
          monthMap[key].requests += 1;
        }
      }
    });

    const maxVal = Math.max(
      ...months.map((m) => Math.max(m.verified, m.requests)),
      5
    );

    return { months, maxVal };
  }, [donations, requests]);

  // 2. BLOOD GROUP SUPPLY VS DEMAND DATA
  const bloodGroupData = useMemo(() => {
    const supplyMap = {};
    const demandMap = {};

    STANDARD_BLOOD_GROUPS.forEach((bg) => {
      supplyMap[bg] = 0;
      demandMap[bg] = 0;
    });

    // Count medically verified units donated per blood group
    activeDonations.forEach((d) => {
      if ((d.status?.value || d.status || '').toLowerCase() === 'verified') {
        const bg = (d.blood_group?.value || d.blood_group || '').toUpperCase();
        if (supplyMap[bg] !== undefined) {
          supplyMap[bg] += d.units_donated || 1;
        }
      }
    });

    // Count units requested per blood group
    activeRequests.forEach((r) => {
      const bg = (r.blood_group || '').toUpperCase();
      if (demandMap[bg] !== undefined) {
        demandMap[bg] += r.units_needed || 1;
      }
    });

    const maxVal = Math.max(
      ...STANDARD_BLOOD_GROUPS.map((bg) => Math.max(supplyMap[bg], demandMap[bg])),
      4
    );

    return {
      items: STANDARD_BLOOD_GROUPS.map((bg) => {
        const verifiedUnits = supplyMap[bg];
        const requestedUnits = demandMap[bg];
        const diff = verifiedUnits - requestedUnits;
        return {
          group: bg,
          verifiedUnits,
          requestedUnits,
          diff,
          isDeficit: diff < 0,
        };
      }),
      maxVal,
    };
  }, [activeDonations, activeRequests]);

  // 3. TOP HOSPITAL PARTNERS
  const topHospitals = useMemo(() => {
    const hospitalMap = {};
    activeDonations.forEach((d) => {
      if ((d.status?.value || d.status || '').toLowerCase() === 'verified') {
        const name = d.hospital_name || 'Hospital Not Specified';
        if (!hospitalMap[name]) {
          hospitalMap[name] = { name, count: 0, units: 0, latestDate: d.donation_date };
        }
        hospitalMap[name].count += 1;
        hospitalMap[name].units += d.units_donated || 1;
        if (d.donation_date && d.donation_date > (hospitalMap[name].latestDate || '')) {
          hospitalMap[name].latestDate = d.donation_date;
        }
      }
    });

    return Object.values(hospitalMap)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [activeDonations]);

  // 4. DONUT CALCULATIONS (Donation Outcomes)
  const donationDonut = useMemo(() => {
    const total = activeDonations.length;
    if (total === 0) {
      return { total: 0, slices: [] };
    }

    const segments = [
      { id: 'verified', label: 'Verified Life-Saves', count: verifiedDonationsCount, color: '#10b981', textColor: 'text-emerald-600' },
      { id: 'pending', label: 'Pending Verification', count: pendingDonationsCount, color: '#f59e0b', textColor: 'text-amber-600' },
      { id: 'rejected', label: 'Rejected Records', count: rejectedDonationsCount, color: '#ef4444', textColor: 'text-red-600' },
    ];

    let cumulativePercent = 0;
    const slices = segments.map((seg) => {
      const percent = seg.count / total;
      const sliceData = {
        ...seg,
        percent: Math.round(percent * 100),
        offset: cumulativePercent,
        strokePercent: percent,
      };
      cumulativePercent += percent;
      return sliceData;
    });

    return { total, slices };
  }, [activeDonations, verifiedDonationsCount, pendingDonationsCount, rejectedDonationsCount]);

  // 5. DONUT CALCULATIONS (Request Resolutions)
  const requestDonut = useMemo(() => {
    const total = activeRequests.length;
    if (total === 0) {
      return { total: 0, slices: [] };
    }

    const expiredCount = activeRequests.filter((r) => (r.status || '').toLowerCase() === 'expired').length;
    const cancelledCount = activeRequests.filter((r) => (r.status || '').toLowerCase() === 'cancelled').length;

    const segments = [
      { id: 'fulfilled', label: 'Fulfilled Requests', count: fulfilledRequestsCount, color: '#3b82f6', textColor: 'text-blue-600' },
      { id: 'open', label: 'Active / Open', count: openRequestsCount, color: '#f59e0b', textColor: 'text-amber-600' },
      { id: 'expired', label: 'Expired', count: expiredCount, color: '#94a3b8', textColor: 'text-slate-500' },
      { id: 'cancelled', label: 'Cancelled', count: cancelledCount, color: '#f43f5e', textColor: 'text-rose-500' },
    ];

    let cumulativePercent = 0;
    const slices = segments.map((seg) => {
      const percent = seg.count / total;
      const sliceData = {
        ...seg,
        percent: Math.round(percent * 100),
        offset: cumulativePercent,
        strokePercent: percent,
      };
      cumulativePercent += percent;
      return sliceData;
    });

    return { total, slices };
  }, [activeRequests, fulfilledRequestsCount, openRequestsCount]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="admin-reports-page space-y-8">
      {/* Scoped Multi-Page Print Styles for Admin Reports */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 15mm 10mm;
          }

          /* Unset all scrolling/clipping viewports on body, root, and layout ancestors */
          html,
          body {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #root,
          #root > div,
          .h-screen,
          .overflow-hidden,
          .overflow-auto,
          main {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }

          /* Hide UI elements: navigation, sidebar, topbar, buttons, interactive controls */
          nav,
          aside,
          header,
          footer,
          .no-print,
          button,
          input,
          select {
            display: none !important;
          }

          /* Multi-page container formatting */
          .admin-reports-page {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            gap: 0 !important;
          }

          .admin-reports-page > * + * {
            margin-top: 14px !important;
          }

          /* Grid layouts optimized for A4 portrait print width */
          .reports-kpi-grid {
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }

          .reports-kpi-grid > a {
            padding: 10px 12px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            text-decoration: none !important;
            transform: none !important;
          }

          .reports-blood-group-grid {
            display: grid !important;
            grid-template-columns: repeat(8, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }

          .reports-blood-group-grid > div {
            padding: 8px 4px !important;
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
          }

          .reports-donuts-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          /* Card padding and styling in print */
          .reports-card {
            padding: 14px 18px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 10px !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }

          /* Prevent page-breaks splitting cards, charts, summary blocks, and tables */
          .print-avoid-break,
          .reports-card,
          .reports-kpi-grid,
          .reports-blood-group-grid,
          .reports-donuts-grid,
          table,
          tbody tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Avoid breaking immediately after headings */
          h1, h2, h3, h4, h5, h6 {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          /* Crisp borders and no shadows for printing */
          .shadow-2xs,
          .shadow-xs,
          .shadow-sm,
          .shadow-md,
          .shadow-lg {
            box-shadow: none !important;
          }

          .border,
          .border-surface-200 {
            border-color: #cbd5e1 !important;
          }

          /* Ensure SVG charts retain vivid colors and strokes */
          svg {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
          }

          /* Print-only formal report header */
          .print-report-header {
            display: block !important;
            margin-bottom: 5mm;
            padding-bottom: 3mm;
            border-bottom: 2px solid #0f172a;
          }

          /* Print-only formal report footer */
          .print-report-footer {
            display: block !important;
            margin-top: 6mm;
            padding-top: 3mm;
            border-top: 1px solid #cbd5e1;
            font-size: 10px;
            color: #64748b;
          }
        }

        .print-report-header,
        .print-report-footer {
          display: none;
        }
      `}</style>

      {/* Formal Healthcare Document Header for Print */}
      <div className="print-report-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-red-600 tracking-tight">BloodConnect</span>
              <span className="text-xs font-bold uppercase tracking-wider text-surface-500">• Central Platform Telemetry</span>
            </div>
            <h1 className="text-xl font-extrabold text-surface-900 mt-0.5">
              Comprehensive Platform Operations & Analytics Report
            </h1>
            <p className="text-xs text-surface-600 mt-0.5">
              Voluntary blood donation metrics, regional blood group supply vs demand, and request fulfillment analytics
            </p>
          </div>
          <div className="text-right text-xs text-surface-500">
            <p className="font-semibold text-surface-800">Confidential Administration Document</p>
            <p className="text-[11px] mt-0.5">Timeframe: {timeframe === 'all' ? 'All Time' : timeframe === '30d' ? 'Last 30 Days' : timeframe === '90d' ? 'Last 90 Days' : 'Past Year'}</p>
            <p className="text-[10px] text-surface-400 mt-0.5">Generated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>

      {/* Reports Header & Governance Controls (Screen only - print uses print-report-header) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-200 no-print">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">System Reports & Analytics</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800 border border-primary-200">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
              Verified Operations Audit
            </span>
          </div>
          <p className="text-surface-500 text-xs sm:text-sm mt-1">
            Voluntary blood donation metrics, regional blood group supply vs demand, and request fulfillment analytics across {users.length} registered platform users
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap no-print">
          {lastRefreshed && (
            <span className="text-xs text-surface-400 font-medium">
              Updated {lastRefreshed}
            </span>
          )}

          {/* Timeframe Selector */}
          <div className="inline-flex rounded-lg border border-surface-200 p-0.5 bg-surface-50 text-xs font-medium">
            {[
              { id: 'all', label: 'All Time' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'year', label: '1 Year' },
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  timeframe === tf.id
                    ? 'bg-white text-surface-900 font-bold shadow-2xs'
                    : 'text-surface-600 hover:text-surface-900'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            onClick={() => fetchReportData(true)}
            isLoading={refreshing}
            className="text-xs font-semibold"
            title="Refresh reports data"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
            className="text-xs font-semibold"
            title="Print report summary"
          >
            Print Report
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} className="mb-4" />}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Spinner size="lg" />
          <p className="text-xs text-surface-500 font-medium">Generating platform analytics telemetry...</p>
        </div>
      ) : (
        <>
          {/* CLINICAL INTEGRITY & GOVERNANCE NOTICE (Task 7) */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-emerald-50/60 border border-blue-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 print-avoid-break">

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5 shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800">
                    Clinical Accounting Governance
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-blue-900 border border-blue-200">
                    Strict Metric Separation
                  </span>
                </div>
                <p className="text-xs text-surface-700 leading-relaxed max-w-3xl">
                  <strong>Medically Verified Donations</strong> represent physical blood collections audited by an administrator with verified hospital reference records, resulting in official Certificates of Appreciation and donor badge milestones. <strong>Fulfilled Blood Requests</strong> represent patient emergency requests whose required units were met. These metrics are strictly separated in all system accounts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto shrink-0 no-print">
              <Link
                to="/admin/donations?status=verified"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-surface-50 text-emerald-700 border border-emerald-200 transition-colors shadow-2xs"
              >
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                Successful Donations
              </Link>
            </div>
          </div>

          {/* SUMMARY KPI METRIC CARDS (Task 8 — deep navigation) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print-avoid-break reports-kpi-grid">
            {/* 1. Medically Verified Life-Saves */}
            <Link
              to="/admin/donations?status=verified"
              className="group p-5 bg-white rounded-xl border border-surface-200 hover:border-emerald-300 hover:shadow-md transition-all duration-200 block shadow-2xs hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Verified Life-Saves</span>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-surface-900 mt-2">{verifiedDonationsCount}</div>
              <div className="flex items-center justify-between text-xs text-surface-500 mt-1">
                <span>{totalVerifiedUnits} Blood Units</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            {/* 2. Fulfilled Blood Requests */}
            <Link
              to="/admin/requests?status=fulfilled"
              className="group p-5 bg-white rounded-xl border border-surface-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 block shadow-2xs hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">Fulfilled Requests</span>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <HeartHandshake className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-surface-900 mt-2">{fulfilledRequestsCount}</div>
              <div className="flex items-center justify-between text-xs text-surface-500 mt-1">
                <span>{fulfillmentRate}% Resolution</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            {/* 3. Active Emergency Demands */}
            <Link
              to="/admin/requests?urgency=emergency"
              className="group p-5 bg-white rounded-xl border border-surface-200 hover:border-rose-300 hover:shadow-md transition-all duration-200 block shadow-2xs hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">Emergency Demands</span>
                <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-surface-900 mt-2">{urgentRequestsCount}</div>
              <div className="flex items-center justify-between text-xs text-surface-500 mt-1">
                <span>{openRequestsCount} Active Total</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            {/* 4. Pending Verification Queue */}
            <Link
              to="/admin/donations?status=pending"
              className="group p-5 bg-white rounded-xl border border-surface-200 hover:border-amber-300 hover:shadow-md transition-all duration-200 block shadow-2xs hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Pending Audits</span>
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-surface-900 mt-2">{pendingDonationsCount}</div>
              <div className="flex items-center justify-between text-xs text-surface-500 mt-1">
                <span>Awaiting Review</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            {/* 5. Registered Voluntary Donors */}
            <Link
              to="/admin/donors"
              className="group p-5 bg-white rounded-xl border border-surface-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 block shadow-2xs hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-800">Voluntary Donors</span>
                <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-surface-900 mt-2">{donors.length}</div>
              <div className="flex items-center justify-between text-xs text-surface-500 mt-1">
                <span>{profileCompletePercent}% Profiles Complete</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>

          {/* CHART 1: MONTHLY ACTIVITY TIMELINE (Line & Gradient Area Chart) */}
          <Card className="p-6 bg-white border border-surface-200 shadow-2xs print-avoid-break reports-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Monthly Operational Trajectory (Past 6 Months)
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Comparison between medically verified completed donations and incoming blood requests
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-surface-700">Verified Life-Saves</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-surface-700">Blood Requests</span>
                </div>
              </div>
            </div>

            {/* SVG Line / Area Graph */}
            <div className="relative pt-2 pb-4">
              <svg viewBox="0 0 600 200" className="w-full h-56 overflow-visible">
                <defs>
                  <linearGradient id="emeraldAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="blueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const y = 20 + (1 - pct) * 140;
                  const val = Math.round(pct * monthlyTimelineData.maxVal);
                  return (
                    <g key={i}>
                      <line x1="40" y1={y} x2="580" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <text x="32" y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Calculations for points */}
                {(() => {
                  const { months, maxVal } = monthlyTimelineData;
                  const stepX = 540 / (months.length - 1);

                  const verifiedPoints = months.map((m, idx) => ({
                    x: 40 + idx * stepX,
                    y: 20 + (1 - m.verified / maxVal) * 140,
                    ...m,
                  }));

                  const requestPoints = months.map((m, idx) => ({
                    x: 40 + idx * stepX,
                    y: 20 + (1 - m.requests / maxVal) * 140,
                    ...m,
                  }));

                  const verifiedPathD = `M ${verifiedPoints.map((p) => `${p.x},${p.y}`).join(' L ')}`;
                  const requestPathD = `M ${requestPoints.map((p) => `${p.x},${p.y}`).join(' L ')}`;

                  const verifiedAreaD = `${verifiedPathD} L ${verifiedPoints[verifiedPoints.length - 1].x},160 L 40,160 Z`;
                  const requestAreaD = `${requestPathD} L ${requestPoints[requestPoints.length - 1].x},160 L 40,160 Z`;

                  return (
                    <>
                      {/* Area Fills */}
                      <path d={requestAreaD} fill="url(#blueAreaGradient)" />
                      <path d={verifiedAreaD} fill="url(#emeraldAreaGradient)" />

                      {/* Line Strokes */}
                      <path d={requestPathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                      <path d={verifiedPathD} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />

                      {/* Nodes & Interactivity */}
                      {verifiedPoints.map((p, idx) => (
                        <g key={`v-${idx}`}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="4.5"
                            className="fill-white stroke-emerald-600 stroke-2 hover:r-6 transition-all cursor-pointer"
                            onMouseEnter={() => setHoveredPoint({ ...p, type: 'verified' })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        </g>
                      ))}

                      {requestPoints.map((p, idx) => (
                        <g key={`r-${idx}`}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="4"
                            className="fill-white stroke-blue-600 stroke-2 hover:r-5 transition-all cursor-pointer"
                            onMouseEnter={() => setHoveredPoint({ ...p, type: 'requests' })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          {/* X-axis Month Label */}
                          <text x={p.x} y="180" textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b">
                            {p.label}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              {/* Interactive Hover Tooltip */}
              {hoveredPoint && (
                <div 
                  className="absolute p-2.5 bg-surface-900 text-white rounded-lg text-xs shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(hoveredPoint.x / 600) * 100}%`,
                    top: `${(hoveredPoint.y / 200) * 100}%`,
                  }}
                >
                  <div className="font-bold text-surface-200 border-b border-surface-700 pb-1 mb-1">
                    {hoveredPoint.label} {hoveredPoint.year}
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span>Verified Donations:</span>
                    <strong>{hoveredPoint.verified}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-blue-400">
                    <span>Blood Requests:</span>
                    <strong>{hoveredPoint.requests}</strong>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* CHART 2: BLOOD GROUP SUPPLY VS DEMAND (Grouped Bar Chart) */}
          <Card className="p-6 bg-white border border-surface-200 shadow-2xs print-avoid-break reports-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-primary-600" />
                  Blood Group Supply vs. Demand Analysis
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Medically verified units donated vs units requested across standard ABO/Rh blood groups
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-surface-700">Verified Units Donated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-400" />
                  <span className="text-surface-700">Units Requested</span>
                </div>
              </div>
            </div>

            {/* Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 reports-blood-group-grid">
              {bloodGroupData.items.map((item) => {
                const isHovered = hoveredBarGroup?.group === item.group;
                const chartHeightMax = 100;

                const vHeight = Math.max(6, Math.round((item.verifiedUnits / bloodGroupData.maxVal) * chartHeightMax));
                const rHeight = Math.max(6, Math.round((item.requestedUnits / bloodGroupData.maxVal) * chartHeightMax));

                return (
                  <div
                    key={item.group}
                    onMouseEnter={() => setHoveredBarGroup(item)}
                    onMouseLeave={() => setHoveredBarGroup(null)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-between text-center ${
                      isHovered
                        ? 'bg-primary-50/50 border-primary-300 shadow-xs ring-2 ring-primary-500/20'
                        : 'bg-surface-50/60 border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    {/* Blood Group Header */}
                    <div className="mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-primary-100 text-primary-800">
                        {item.group}
                      </span>
                    </div>

                    {/* Side-by-side vertical bar visualizer */}
                    <div className="h-28 w-full flex items-end justify-center gap-2 px-1">
                      {/* Verified Units Bar */}
                      <div className="flex flex-col items-center flex-1 max-w-[20px]">
                        <span className="text-[10px] font-bold text-emerald-700 mb-0.5">{item.verifiedUnits}</span>
                        <div
                          className="w-full bg-emerald-500 rounded-t-md transition-all duration-300 hover:bg-emerald-600"
                          style={{ height: `${vHeight}px` }}
                          title={`Verified: ${item.verifiedUnits} units`}
                        />
                      </div>

                      {/* Requested Units Bar */}
                      <div className="flex flex-col items-center flex-1 max-w-[20px]">
                        <span className="text-[10px] font-bold text-rose-700 mb-0.5">{item.requestedUnits}</span>
                        <div
                          className="w-full bg-rose-400 rounded-t-md transition-all duration-300 hover:bg-rose-500"
                          style={{ height: `${rHeight}px` }}
                          title={`Requested: ${item.requestedUnits} units`}
                        />
                      </div>
                    </div>

                    {/* Balance Status */}
                    <div className="mt-3 pt-2 border-t border-surface-200/80 w-full text-[11px]">
                      {item.diff >= 0 ? (
                        <span className="text-emerald-700 font-bold">
                          +{item.diff} Surplus
                        </span>
                      ) : (
                        <span className="text-rose-700 font-bold">
                          {item.diff} Deficit
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* TWO DONUT CHARTS: DONATION QUALITY vs REQUEST RESOLUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-avoid-break reports-donuts-grid">
            {/* Donut 1: Donation Audit Quality */}
            <Card className="p-6 bg-white border border-surface-200 shadow-2xs print-avoid-break reports-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    Donation Records Audit Pipeline
                  </h3>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Proportion of verified successful donations vs pending review
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                {/* SVG Donut */}
                <div className="relative w-44 h-44 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="14" />
                    {donationDonut.slices.map((slice) => {
                      const c = 2 * Math.PI * 38; // ~238.76
                      const dash = slice.strokePercent * c;
                      const offset = slice.offset * c;
                      const isHovered = hoveredDonutSlice?.id === slice.id;

                      return (
                        <circle
                          key={slice.id}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={isHovered ? 18 : 14}
                          strokeDasharray={`${dash} ${c - dash}`}
                          strokeDashoffset={-offset}
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredDonutSlice(slice)}
                          onMouseLeave={() => setHoveredDonutSlice(null)}
                        />
                      );
                    })}
                  </svg>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-2xl font-black text-surface-900">{donationDonut.total}</span>
                    <span className="text-[10px] uppercase font-bold text-surface-400">Total Records</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-3 flex-1 w-full text-xs">
                  {donationDonut.slices.map((slice) => (
                    <div
                      key={slice.id}
                      onMouseEnter={() => setHoveredDonutSlice(slice)}
                      onMouseLeave={() => setHoveredDonutSlice(null)}
                      className={`p-2 rounded-lg border transition-all flex items-center justify-between ${
                        hoveredDonutSlice?.id === slice.id ? 'bg-surface-50 border-surface-300' : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                        <span className="font-semibold text-surface-800">{slice.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-surface-900">{slice.count}</span>
                        <span className="text-surface-400 text-[11px]">({slice.percent}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Donut 2: Request Resolution Breakdown */}
            <Card className="p-6 bg-white border border-surface-200 shadow-2xs print-avoid-break reports-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Blood Request Resolution Pipeline
                  </h3>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Patient blood requests status breakdown (kept separate from verified donations)
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                {/* SVG Donut */}
                <div className="relative w-44 h-44 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="14" />
                    {requestDonut.slices.map((slice) => {
                      const c = 2 * Math.PI * 38; // ~238.76
                      const dash = slice.strokePercent * c;
                      const offset = slice.offset * c;
                      const isHovered = hoveredDonutSlice?.id === slice.id;

                      return (
                        <circle
                          key={slice.id}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={isHovered ? 18 : 14}
                          strokeDasharray={`${dash} ${c - dash}`}
                          strokeDashoffset={-offset}
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredDonutSlice(slice)}
                          onMouseLeave={() => setHoveredDonutSlice(null)}
                        />
                      );
                    })}
                  </svg>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-2xl font-black text-surface-900">{requestDonut.total}</span>
                    <span className="text-[10px] uppercase font-bold text-surface-400">Total Requests</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-3 flex-1 w-full text-xs">
                  {requestDonut.slices.map((slice) => (
                    <div
                      key={slice.id}
                      onMouseEnter={() => setHoveredDonutSlice(slice)}
                      onMouseLeave={() => setHoveredDonutSlice(null)}
                      className={`p-2 rounded-lg border transition-all flex items-center justify-between ${
                        hoveredDonutSlice?.id === slice.id ? 'bg-surface-50 border-surface-300' : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                        <span className="font-semibold text-surface-800">{slice.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-surface-900">{slice.count}</span>
                        <span className="text-surface-400 text-[11px]">({slice.percent}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* HOSPITAL PARTNERS SUMMARY TABLE */}
          <div className="bg-white rounded-xl border border-surface-200 overflow-hidden shadow-2xs print-avoid-break reports-card">
            <div className="px-6 py-4.5 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Top Verified Hospital & Medical Centre Partners
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Healthcare facilities with authenticated voluntary blood donation collections
                </p>
              </div>

              <Link
                to="/admin/donations?status=verified"
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 self-start sm:self-auto no-print"
              >
                View all verified donations <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {topHospitals.length === 0 ? (
              <div className="p-8 text-center text-xs text-surface-500">
                No hospital donation records verified yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-surface-600">
                  <thead className="bg-surface-50 text-surface-500 text-[11px] uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">Hospital / Facility</th>
                      <th className="px-6 py-3.5">Verified Collections</th>
                      <th className="px-6 py-3.5">Total Blood Units</th>
                      <th className="px-6 py-3.5">Latest Donation Date</th>
                      <th className="px-6 py-3.5 text-right no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {topHospitals.map((h, idx) => (
                      <tr key={idx} className="hover:bg-surface-50 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-surface-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-extrabold">
                            {idx + 1}
                          </span>
                          {h.name}
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-surface-800">
                          {h.count} donation{h.count > 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {h.units} Units
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-surface-500">
                          {h.latestDate ? new Date(h.latestDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-3.5 text-right no-print">
                          <Link
                            to={`/admin/donations?status=verified`}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                          >
                            Audit Records
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Formal Healthcare Document Footer for Print */}
          <div className="print-report-footer">
            <div className="flex items-center justify-between">
              <span>
                BloodConnect Voluntary Blood Donation System — Central Platform Administration Governance Node
              </span>
              <span>
                Cryptographically Audited Telemetry • Confidential
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
