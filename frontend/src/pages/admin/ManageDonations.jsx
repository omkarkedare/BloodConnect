import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Activity, 
  Calendar, 
  MapPin, 
  User, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Award, 
  Search, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../services/adminService';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/common/Modal';
import DonationCertificateModal from '../../components/donor/DonationCertificateModal';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function ManageDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Certificate Modal State
  const [certificateDonationId, setCertificateDonationId] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const validTabs = ['all', 'pending', 'verified', 'rejected'];
  const statusParam = searchParams.get('status');
  const currentTab = useMemo(() => {
    if (statusParam && validTabs.includes(statusParam.toLowerCase())) {
      return statusParam.toLowerCase();
    }
    return 'all';
  }, [statusParam]);

  const handleTabChange = (tabId) => {
    setCurrentPage(1);
    if (tabId === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ status: tabId });
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBloodGroup, startDate, endDate, currentTab]);

  // Verification Modal State
  const [verifyingDonation, setVerifyingDonation] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [actualDate, setActualDate] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [verifyModalError, setVerifyModalError] = useState(null);

  // Rejection Modal State
  const [rejectingDonation, setRejectingDonation] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);
  const [rejectModalError, setRejectModalError] = useState(null);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getDonations();
      setDonations(res.data || []);
    } catch (err) {
      setError('Failed to fetch donations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const openVerifyModal = (donation) => {
    setVerifyingDonation(donation);
    setReferenceNumber('');
    setActualDate(donation.donation_date || new Date().toISOString().split('T')[0]);
    setHospitalName(donation.hospital_name || '');
    setVerificationNotes('');
    setConfirmedCheck(false);
    setVerifyModalError(null);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!referenceNumber.trim()) {
      setVerifyModalError('Verification reference or hospital record ID is required.');
      return;
    }
    if (!confirmedCheck) {
      setVerifyModalError('Please confirm that you verified the official hospital record.');
      return;
    }

    try {
      setSubmittingVerify(true);
      setVerifyModalError(null);
      await adminService.verifyDonation(verifyingDonation.id, {
        reference_number: referenceNumber.trim(),
        actual_donation_date: actualDate || null,
        hospital_name: hospitalName.trim() || null,
        notes: verificationNotes.trim() || null,
      });

      toast.success(`Donation #${verifyingDonation.id} successfully verified!`);
      setVerifyingDonation(null);
      fetchDonations();
    } catch (err) {
      setVerifyModalError(err.response?.data?.detail || 'Failed to verify donation.');
    } finally {
      setSubmittingVerify(false);
    }
  };

  const openRejectModal = (donation) => {
    setRejectingDonation(donation);
    setRejectionReason('');
    setRejectModalError(null);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setRejectModalError('A rejection reason is required.');
      return;
    }

    try {
      setSubmittingReject(true);
      setRejectModalError(null);
      await adminService.rejectDonation(rejectingDonation.id, {
        rejection_reason: rejectionReason.trim(),
      });

      toast.success(`Donation #${rejectingDonation.id} has been rejected.`);
      setRejectingDonation(null);
      fetchDonations();
    } catch (err) {
      setRejectModalError(err.response?.data?.detail || 'Failed to reject donation.');
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedBloodGroup('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || 
    selectedBloodGroup !== 'all' || 
    startDate || 
    endDate
  );

  // Overall Global Counts
  const pendingCount = donations.filter((d) => (d.status?.value || d.status || '').toLowerCase() === 'pending').length;
  const verifiedCount = donations.filter((d) => (d.status?.value || d.status || '').toLowerCase() === 'verified').length;
  const rejectedCount = donations.filter((d) => (d.status?.value || d.status || '').toLowerCase() === 'rejected').length;

  // Successful Donations specific calculations
  const verifiedDonationsList = useMemo(() => {
    return donations.filter((d) => (d.status?.value || d.status || '').toLowerCase() === 'verified');
  }, [donations]);

  const totalVerifiedUnits = useMemo(() => {
    return verifiedDonationsList.reduce((acc, d) => acc + (d.units_donated || 1), 0);
  }, [verifiedDonationsList]);

  const distinctVerifiedDonorsCount = useMemo(() => {
    const ids = new Set(verifiedDonationsList.map(d => d.donor_id));
    return ids.size;
  }, [verifiedDonationsList]);

  // Filtered donations matching current tab and search/filter controls
  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      const statusMatch = currentTab === 'all' 
        ? true 
        : (d.status?.value || d.status || '').toLowerCase() === currentTab;
      if (!statusMatch) return false;

      // Blood Group filter
      if (selectedBloodGroup !== 'all') {
        const bgVal = (d.blood_group?.value || d.blood_group || '').toUpperCase();
        if (bgVal !== selectedBloodGroup.toUpperCase()) return false;
      }

      // Date range filter
      if (startDate && d.donation_date) {
        if (d.donation_date < startDate) return false;
      }
      if (endDate && d.donation_date) {
        if (d.donation_date > endDate) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const donorName = (d.donor_name || '').toLowerCase();
        const donorEmail = (d.donor_email || '').toLowerCase();
        const hospital = (d.hospital_name || '').toLowerCase();
        const patient = (d.patient_name || '').toLowerCase();
        const notes = (d.notes || '').toLowerCase();
        const idStr = `#${d.id}`.toLowerCase();
        const bgStr = (d.blood_group || '').toLowerCase();

        const matches = 
          donorName.includes(query) ||
          donorEmail.includes(query) ||
          hospital.includes(query) ||
          patient.includes(query) ||
          notes.includes(query) ||
          idStr.includes(query) ||
          bgStr.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [donations, currentTab, selectedBloodGroup, startDate, endDate, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredDonations.length / itemsPerPage));
  const paginatedDonations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDonations.slice(start, start + itemsPerPage);
  }, [filteredDonations, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Manage Blood Donations</h1>
          <p className="text-surface-500 text-sm mt-1">
            Review, verify, and audit voluntary blood donations with cryptographic certificates
          </p>
        </div>

        {/* Quick View Certificate CTA */}
        {verifiedCount > 0 && currentTab !== 'verified' && (
          <button
            onClick={() => handleTabChange('verified')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs self-start md:self-auto cursor-pointer"
          >
            <Award className="w-4 h-4 text-emerald-600" />
            View {verifiedCount} Successful Donation{verifiedCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {error && <Alert type="error" message={error} className="mb-4" />}

      {/* KPI Cards / Quick Action Filter Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => handleTabChange('all')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            currentTab === 'all'
              ? 'bg-primary-50/70 border-primary-300 ring-2 ring-primary-500/20 shadow-xs'
              : 'bg-white border-surface-200 hover:border-surface-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">All Records</span>
            <Activity className="w-4 h-4 text-surface-400" />
          </div>
          <div className="text-2xl font-bold text-surface-900 mt-1">{donations.length}</div>
          <p className="text-[11px] text-surface-400 mt-0.5">Total donation history</p>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('pending')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            currentTab === 'pending'
              ? 'bg-amber-100/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending Verification</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{pendingCount}</div>
          <p className="text-[11px] text-amber-700/80 mt-0.5">Hospital audits awaiting review</p>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('verified')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            currentTab === 'verified'
              ? 'bg-emerald-100/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Successful Donations</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{verifiedCount}</div>
          <p className="text-[11px] text-emerald-700/80 mt-0.5">Medically verified life-saves</p>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('rejected')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            currentTab === 'rejected'
              ? 'bg-red-100/70 border-red-300 ring-2 ring-red-500/20 shadow-xs'
              : 'bg-red-50/50 border-red-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-700">Rejected Records</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-800 mt-1">{rejectedCount}</div>
          <p className="text-[11px] text-red-700/80 mt-0.5">Incomplete or unverified records</p>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleTabChange('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            currentTab === 'all'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'
          }`}
        >
          All Donations ({donations.length})
        </button>
        <button
          onClick={() => handleTabChange('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            currentTab === 'pending'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          Pending Audit Queue ({pendingCount})
        </button>
        <button
          onClick={() => handleTabChange('verified')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            currentTab === 'verified'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <Award className="w-4 h-4" />
          Successful Donations ({verifiedCount})
        </button>
        <button
          onClick={() => handleTabChange('rejected')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            currentTab === 'rejected'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'
          }`}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {/* DEDICATED SUCCESSFUL DONATIONS SPOTLIGHT BANNER */}
      {currentTab === 'verified' && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200 rounded-xl p-5 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
                  Verified Life-Saving Register
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  {verifiedCount} Medically Confirmed Donations
                </span>
              </div>
              <h2 className="text-base font-bold text-surface-900">
                Official Successful Donations & Issued Certificates
              </h2>
              <p className="text-xs text-emerald-900 leading-relaxed max-w-2xl">
                Every record below represents an authenticated physical blood donation audited with hospital confirmation. All records have an official, tamper-evident Voluntary Donation Certificate of Appreciation with cryptographic verification ID and QR code.
              </p>
            </div>

            {/* Quick Metrics Pills */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <div className="px-3.5 py-2 bg-white rounded-lg border border-emerald-200 text-center shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-surface-500 block">Total Collected</span>
                <span className="text-sm font-extrabold text-emerald-800">{totalVerifiedUnits} Blood Units</span>
              </div>
              <div className="px-3.5 py-2 bg-white rounded-lg border border-emerald-200 text-center shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-surface-500 block">Verified Donors</span>
                <span className="text-sm font-extrabold text-emerald-800">{distinctVerifiedDonorsCount} Individuals</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Queue Priority Alert Banner */}
      {currentTab === 'pending' && pendingCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Pending Hospital Verification Queue:</span> {pendingCount} donation {pendingCount === 1 ? 'record requires' : 'records require'} official hospital audit. Verified records receive official appreciation certificates and award donor badges.
            </div>
          </div>
          <button
            onClick={() => handleTabChange('all')}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 underline self-start sm:self-auto cursor-pointer"
          >
            Show All Donations
          </button>
        </div>
      )}

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-surface-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search donor, hospital, patient, ref ID, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-surface-800"
            />
          </div>

          {/* Blood Group Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-surface-600 whitespace-nowrap">Blood Group:</span>
            <select
              value={selectedBloodGroup}
              onChange={(e) => setSelectedBloodGroup(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-surface-800 font-medium"
            >
              <option value="all">All Groups</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-surface-600 whitespace-nowrap">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-700"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-surface-600 whitespace-nowrap">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-700"
              />
            </div>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-surface-600 hover:text-surface-900 hover:bg-surface-100 border border-surface-200 transition-colors shrink-0 cursor-pointer"
              title="Reset all search and date filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-surface-500 pt-1 border-t border-surface-100">
          <div>
            Showing <span className="font-semibold text-surface-800">{filteredDonations.length}</span> of {donations.length} records
            {hasActiveFilters && <span className="text-primary-600 ml-1">(filtered)</span>}
          </div>
          {totalPages > 1 && (
            <div className="text-surface-400">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filteredDonations.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={
            hasActiveFilters 
              ? "No matching donations found" 
              : currentTab === 'verified' 
              ? "No Successful Donations" 
              : "No donations found"
          }
          description={
            hasActiveFilters 
              ? "Try adjusting your search criteria, blood group selection, or date range." 
              : currentTab === 'verified'
              ? "There are currently no verified donation records in the system."
              : `There are currently no donations in ${currentTab === 'all' ? 'the system' : currentTab} status.`
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-600">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Donor Details</th>
                  <th className="px-6 py-4">Blood Group & Units</th>
                  <th className="px-6 py-4">Hospital & Date</th>
                  <th className="px-6 py-4">Status & Audit</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {paginatedDonations.map((donation) => {
                  const isVerified = (donation.status?.value || donation.status || '').toLowerCase() === 'verified';
                  const isPending = (donation.status?.value || donation.status || '').toLowerCase() === 'pending';
                  const isRejected = (donation.status?.value || donation.status || '').toLowerCase() === 'rejected';

                  return (
                    <tr key={donation.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-surface-900">
                        #{donation.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-surface-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-surface-400" />
                            {donation.donor_name || `Donor #${donation.donor_id}`}
                          </span>
                          {donation.donor_email && (
                            <span className="text-xs text-surface-500 mt-0.5">{donation.donor_email}</span>
                          )}
                          <span className="text-[11px] text-surface-400 mt-0.5">
                            Donor ID: #{donation.donor_id}
                            {donation.request_id && ` • Req: #${donation.request_id}`}
                            {donation.patient_name && ` (Patient: ${donation.patient_name})`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge color="primary">{donation.blood_group}</Badge>
                          <span className="text-xs font-semibold text-surface-700">
                            {donation.units_donated} Unit{donation.units_donated > 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 font-medium text-surface-800">
                            <MapPin className="w-3.5 h-3.5 text-surface-400" />
                            {donation.hospital_name || 'Hospital not specified'}
                          </span>
                          <span className="text-xs text-surface-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-3.5 h-3.5 text-surface-400" />
                            {donation.donation_date
                              ? new Date(donation.donation_date).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={donation.status} />
                          {isVerified && (
                            <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              {donation.verifier_name ? `Verified by ${donation.verifier_name}` : `Admin #${donation.verified_by}`}
                            </span>
                          )}
                          {isRejected && donation.verified_by && (
                            <span className="text-[11px] text-red-600 font-medium">
                              Rejected by Admin #{donation.verified_by}
                            </span>
                          )}
                          {donation.notes && (
                            <span className="text-[11px] text-surface-400 font-mono truncate max-w-xs" title={donation.notes}>
                              {donation.notes.split('\n').pop()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isPending && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openVerifyModal(donation)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Verify
                            </button>
                            <button
                              onClick={() => openRejectModal(donation)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        )}

                        {isVerified && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setCertificateDonationId(donation.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                              title="View official appreciation certificate"
                            >
                              <Award className="w-4 h-4 text-emerald-600" />
                              View Certificate
                            </button>
                          </div>
                        )}

                        {isRejected && (
                          <span className="text-xs text-surface-400 italic">No action needed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION BAR */}
          {totalPages > 1 && (
            <div className="px-6 py-3.5 bg-surface-50 border-t border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-surface-600">
                Showing <strong className="text-surface-900">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-surface-900">{Math.min(currentPage * itemsPerPage, filteredDonations.length)}</strong> of <strong className="text-surface-900">{filteredDonations.length}</strong> records
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-surface-200 bg-white text-surface-700 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white shadow-2xs'
                        : 'bg-white border border-surface-200 text-surface-700 hover:bg-surface-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-surface-200 bg-white text-surface-700 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official Appreciation Certificate Modal */}
      <DonationCertificateModal
        donationId={certificateDonationId}
        isOpen={Boolean(certificateDonationId)}
        onClose={() => setCertificateDonationId(null)}
      />

      {/* Verification Confirmation Modal */}
      {verifyingDonation && (
        <Modal
          isOpen={Boolean(verifyingDonation)}
          onClose={() => setVerifyingDonation(null)}
          title="Verify Completed Blood Donation"
          size="md"
        >
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            {verifyModalError && <Alert type="error" message={verifyModalError} className="mb-3" />}

            {/* Donation Quick Overview Card */}
            <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 text-xs text-surface-700 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-semibold text-surface-900">Donation Record:</span>
                <span>#{verifyingDonation.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-surface-900">Donor:</span>
                <span>{verifyingDonation.donor_name || `User #${verifyingDonation.donor_id}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-surface-900">Blood Group / Units:</span>
                <span>{verifyingDonation.blood_group} ({verifyingDonation.units_donated} Unit)</span>
              </div>
            </div>

            {/* Evidence: Reference Number */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                Hospital / Blood Bank Reference ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. HOSP-2026-DON-8842 or Slip #104"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                required
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-[11px] text-surface-500 mt-1">
                Official physical or electronic record identifier confirming blood collection.
              </p>
            </div>

            {/* Actual Donation Date */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                Actual Donation Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-[11px] text-surface-500 mt-1">
                Used to update the donor&apos;s last donation date for medical eligibility.
              </p>
            </div>

            {/* Hospital Name */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                Hospital / Facility Name
              </label>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="Confirmed facility name"
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Admin Verification Notes */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                Audit Notes / Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Any special remarks or hospital coordinator contacts..."
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Attestation Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-surface-700 select-none">
                <input
                  type="checkbox"
                  checked={confirmedCheck}
                  onChange={(e) => setConfirmedCheck(e.target.checked)}
                  className="mt-0.5 rounded border-surface-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  I confirm that I have verified the physical blood donation with the hospital or blood centre record.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
              <button
                type="button"
                onClick={() => setVerifyingDonation(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-surface-300 text-surface-700 hover:bg-surface-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingVerify || !confirmedCheck || !referenceNumber.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white cursor-pointer transition-colors"
              >
                {submittingVerify ? <Spinner className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                Confirm & Verify
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Rejection Modal */}
      {rejectingDonation && (
        <Modal
          isOpen={Boolean(rejectingDonation)}
          onClose={() => setRejectingDonation(null)}
          title="Reject Blood Donation Record"
          size="sm"
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            {rejectModalError && <Alert type="error" message={rejectModalError} className="mb-3" />}

            <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>
                Rejecting Donation #{rejectingDonation.id} will mark it as rejected and notify the donor. This action cannot be reversed.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State why this donation could not be verified (e.g. Donor did not appear, hospital record could not be confirmed)..."
                required
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-surface-100">
              <button
                type="button"
                onClick={() => setRejectingDonation(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-surface-300 text-surface-700 hover:bg-surface-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReject || !rejectionReason.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white cursor-pointer transition-colors"
              >
                {submittingReject ? <Spinner className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                Confirm Rejection
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
