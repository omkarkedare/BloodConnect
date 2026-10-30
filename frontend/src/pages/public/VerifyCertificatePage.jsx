import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Award, 
  Droplets, 
  Calendar, 
  Building2, 
  FileText, 
  Search, 
  Lock,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import donationService from '../../services/donationService';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

export default function VerifyCertificatePage() {
  const { certificateId: paramCertId } = useParams();
  const [searchParams] = useSearchParams();
  const queryCertId = searchParams.get('id') || '';

  const initialId = paramCertId || queryCertId || '';
  const [inputCertId, setInputCertId] = useState(initialId);
  const [inputDonorName, setInputDonorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(null);

  useEffect(() => {
    if (initialId) {
      setInputCertId(initialId);
      performVerification(initialId, '');
    }
  }, [initialId]);

  const performVerification = async (certId, donorName = '') => {
    const cleanedId = (certId || '').trim();
    if (!cleanedId) return;

    setLoading(true);
    setHasSearched(true);
    setRateLimitError(null);

    try {
      const res = await donationService.verifyCertificate(cleanedId, donorName.trim() || null);
      setVerificationResult(res.data);
    } catch (err) {
      if (err.response?.status === 429) {
        setRateLimitError('Rate limit exceeded. Please wait 60 seconds before submitting another verification request.');
        setVerificationResult(null);
      } else {
        setVerificationResult({
          is_valid: false,
          certificate_id: cleanedId,
          message: 'Certificate not found or could not be verified.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performVerification(inputCertId, inputDonorName);
  };

  return (
    <div className="min-h-screen bg-surface-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Page Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 text-red-600 mb-4 shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight sm:text-4xl">
            Certificate Authenticity Verification
          </h1>
          <p className="mt-3 text-base text-surface-600 max-w-xl mx-auto">
            Verify the official validity of BloodConnect Voluntary Blood Donation Appreciation Certificates with cryptographic integrity.
          </p>
        </div>

        {/* Certificate Search / Lookup Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 sm:p-8 mb-8">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div>
              <label htmlFor="certificate-id-input" className="block text-sm font-semibold text-surface-700 mb-1.5">
                BloodConnect Certificate ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  id="certificate-id-input"
                  type="text"
                  value={inputCertId}
                  onChange={(e) => setInputCertId(e.target.value)}
                  placeholder="e.g. BC-CERT-20261028-00001-E2090D77"
                  className="w-full pl-11 pr-4 py-3 text-sm font-mono rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-surface-900 placeholder:text-surface-400 uppercase"
                  required
                />
              </div>
              <p className="text-xs text-surface-400 mt-1">
                Format: <span className="font-mono text-surface-600">BC-CERT-YYYYMMDD-XXXXX-XXXXXXXX</span> (found below the QR code on the certificate).
              </p>
            </div>

            <div>
              <label htmlFor="donor-name-input" className="block text-sm font-semibold text-surface-700 mb-1.5">
                <span>Donor Name Printed on Certificate <span className="text-surface-400 font-normal text-xs">(Optional — Verifies Name Match)</span></span>
              </label>
              <input
                id="donor-name-input"
                type="text"
                value={inputDonorName}
                onChange={(e) => setInputDonorName(e.target.value)}
                placeholder="e.g. Omkar Kedare or ओंकार केदारे"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-surface-900 placeholder:text-surface-400"
              />
              <p className="text-xs text-surface-400 mt-1">
                Enter the exact recipient name printed on the physical certificate to confirm a verified name match.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !inputCertId.trim()}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium px-8 py-3 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {loading ? <Spinner size="sm" className="text-white" /> : <Search className="w-4 h-4" />}
                Verify Authenticity
              </Button>
            </div>
          </form>
        </div>

        {/* Rate Limit Alert */}
        {rateLimitError && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 mb-8 text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold">Request Rate Limit Reached</h3>
              <p className="text-xs text-amber-800 mt-1">{rateLimitError}</p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-16 text-center">
            <Spinner size="lg" className="mx-auto text-red-600" />
            <p className="mt-4 text-sm font-medium text-surface-600">
              Validating digital credential with BloodConnect Registry...
            </p>
          </div>
        )}

        {/* Verification Result Display */}
        {!loading && hasSearched && verificationResult && (
          <div>
            {verificationResult.is_valid ? (
              /* VALID VERIFIED CERTIFICATE */
              <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-500 overflow-hidden transition-all animate-fadeIn">
                {/* Result Header Badge */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center sm:text-left sm:flex sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">Official BloodConnect Record</span>
                      <h2 className="text-xl font-extrabold text-white">Certificate Authenticated</h2>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 text-center sm:text-right">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-emerald-800 shadow-xs">
                      ✓ Verified Donation
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Certificate ID Monospace Box */}
                  <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-200 flex flex-col sm:flex-row items-center justify-between text-xs gap-2">
                    <span className="text-surface-500 font-medium">Verified Certificate ID:</span>
                    <strong className="font-mono text-sm text-surface-900 tracking-wider select-all">
                      {verificationResult.certificate_id}
                    </strong>
                  </div>

                  {/* Donor Name Presentation (Privacy-Minimized) */}
                  <div className="text-center py-4 border-b border-surface-200">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <p className="text-xs uppercase tracking-widest text-surface-400 font-semibold">
                        Awarded To Voluntary Donor
                      </p>
                      {verificationResult.is_authenticated_view ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <UserCheck className="w-3 h-3" /> Full Account Access
                        </span>
                      ) : verificationResult.name_verified === true ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Name Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-surface-100 text-surface-600">
                          <Lock className="w-3 h-3 text-surface-400" /> Privacy Protected
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-surface-900 font-serif text-red-950">
                      {verificationResult.donor_name}
                    </h3>

                    {/* Name match verification banner or prompt */}
                    {!verificationResult.is_authenticated_view && verificationResult.name_verified === false && (
                      <div className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 inline-block">
                        ⚠️ The name entered does not match our registry record for this certificate.
                      </div>
                    )}

                    {!verificationResult.is_authenticated_view && verificationResult.name_verified === null && (
                      <p className="text-xs text-surface-400 mt-2 max-w-md mx-auto">
                        Donor name is masked to protect voluntary donor privacy. Enter the printed name above to confirm an exact match.
                      </p>
                    )}
                  </div>

                  {/* 4-Column Verification Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-amber-50/40 rounded-xl border border-amber-200/60">
                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-surface-400 font-semibold">Blood Group</span>
                      <span className="text-base font-bold text-red-700 flex items-center gap-1 mt-0.5">
                        <Droplets className="w-4 h-4 fill-red-600 text-red-600" />
                        {verificationResult.blood_group}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-surface-400 font-semibold">Units Donated</span>
                      <span className="text-base font-bold text-surface-800 mt-0.5 block">
                        {verificationResult.units_donated} Unit ({verificationResult.units_donated * 450} ml)
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-surface-400 font-semibold">Donation Date</span>
                      <span className="text-sm font-semibold text-surface-800 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-surface-400" />
                        {new Date(verificationResult.donation_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-surface-400 font-semibold">Medical Facility</span>
                      <span className="text-sm font-semibold text-surface-800 flex items-center gap-1 mt-0.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                        <span className="truncate">
                          {verificationResult.hospital_name || (
                            <span className="text-surface-400 italic">Protected Medical Record</span>
                          )}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Official Audit Details */}
                  <div className="pt-2 border-t border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-surface-500 gap-2">
                    <div>
                      <span>Registry Authority: </span>
                      <strong className="text-surface-700">{verificationResult.issuer || 'BloodConnect Registry'}</strong>
                      {verificationResult.verification_reference && (
                        <span className="ml-2 font-mono text-primary-700">
                          (Ref: {verificationResult.verification_reference})
                        </span>
                      )}
                    </div>
                    {verificationResult.verified_at && (
                      <span className="text-surface-400">
                        {verificationResult.verified_at}
                      </span>
                    )}
                  </div>

                  {/* Security Statement */}
                  <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>Cryptographic Authenticity Verified:</strong> Validated deterministically via HMAC-SHA256 signature against the BloodConnect National Registry. This credential is authentic, verified, and protected against unauthorized alterations.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* INVALID / REJECTED / UNVERIFIED CERTIFICATE */
              <div className="bg-white rounded-2xl shadow-lg border-2 border-red-500 overflow-hidden transition-all animate-fadeIn">
                <div className="bg-gradient-to-r from-red-600 to-rose-700 p-6 text-white text-center sm:text-left sm:flex sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-red-100">Verification Alert</span>
                      <h2 className="text-xl font-extrabold text-white">Certificate Not Verified</h2>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 text-center sm:text-right">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-red-800 shadow-xs">
                      ✕ Unverified Record
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-4">
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-sm text-red-800 space-y-2">
                    <p className="font-semibold text-red-900">
                      {verificationResult.message || 'Certificate not found or could not be verified.'}
                    </p>
                    <p className="text-xs text-red-700 leading-relaxed">
                      The certificate ID you entered does not match any officially verified voluntary blood donation record in the BloodConnect National Registry. Possible reasons include:
                    </p>
                    <ul className="list-disc pl-5 text-xs text-red-700 space-y-1">
                      <li>The certificate ID contains a typographical mistake or missing characters.</li>
                      <li>The certificate was modified, expired, or tampered with.</li>
                      <li>The blood donation record is still pending medical verification.</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-surface-50 rounded-xl text-xs text-surface-600 font-mono text-center">
                    Searched ID: <strong>{verificationResult.certificate_id}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial Empty / Guide State */}
        {!hasSearched && (
          <div className="bg-white rounded-2xl shadow-xs border border-surface-200 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-surface-900 mb-1">
              How to Verify a BloodConnect Certificate
            </h3>
            <p className="text-sm text-surface-500 max-w-md mx-auto mb-6">
              Official BloodConnect Appreciation Certificates feature a unique, cryptographic Certificate ID and QR Code. 
              Scan the QR code with your phone camera or enter the Certificate ID above to confirm authenticity.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-surface-600">
              <span className="flex items-center gap-1.5 bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tamper-resistant HMAC
              </span>
              <span className="flex items-center gap-1.5 bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-200">
                <Lock className="w-4 h-4 text-surface-500" /> Privacy Protected
              </span>
              <span className="flex items-center gap-1.5 bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-200">
                <ShieldCheck className="w-4 h-4 text-primary-600" /> National Registry
              </span>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-12 text-center text-xs text-surface-400">
          <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
            ← Return to BloodConnect Home
          </Link>
          <span className="mx-2">•</span>
          <span>BloodConnect National Voluntary Blood Donation Registry</span>
        </div>

      </div>
    </div>
  );
}
