import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  Award, 
  Droplets, 
  Heart, 
  ShieldCheck, 
  Calendar, 
  Building2, 
  CheckCircle2,
  FileText
} from 'lucide-react';
import donationService from '../../services/donationService';
import Spinner from '../ui/Spinner';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import QRCodeSVG from '../ui/QRCodeSVG';

/**
 * Reusable Certificate Presentation Card
 * Rendered both inside the interactive modal (screen view)
 * and in an isolated portal mounted to document.body (print view).
 */
function CertificateCard({ certificate, isPrint = false }) {
  if (!certificate) return null;

  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL)
    ? import.meta.env.VITE_APP_URL.replace(/\/+$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '');

  const verificationUrl = `${baseUrl}/verify-certificate/${encodeURIComponent(certificate.certificate_id)}`;

  return (
    <div 
      id={isPrint ? 'bloodconnect-certificate-print-card' : 'bloodconnect-certificate-card'}
      className={`relative bg-gradient-to-br from-amber-50/50 via-white to-red-50/30 rounded-xl border-8 border-double border-red-800/80 shadow-md text-center ${
        isPrint ? 'p-6 max-w-[278mm] mx-auto' : 'p-6 sm:p-10'
      }`}
    >
      {/* Inner Decorative Golden Border */}
      <div className={`border border-amber-500/50 rounded-lg relative ${isPrint ? 'p-5' : 'p-6 sm:p-8'}`}>
        
        {/* Background Watermark Droplet */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035]">
          <Droplets className={`${isPrint ? 'w-80 h-80' : 'w-96 h-96'} text-red-900`} />
        </div>

        {/* Certificate Header */}
        <div className={`relative z-10 ${isPrint ? 'mb-4' : 'mb-6'}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-red-700">
              Blood<span className="text-surface-900">Connect</span>
            </span>
          </div>
          <p className="text-xs uppercase tracking-widest text-surface-500 font-semibold mb-2">
            National Voluntary Blood Donation &amp; Emergency Coordination
          </p>
          <h1 className={`font-serif font-extrabold uppercase text-red-900 tracking-wide ${
            isPrint ? 'text-2xl sm:text-3xl' : 'text-2xl sm:text-4xl'
          }`}>
            Certificate of Appreciation
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 mx-auto mt-2 rounded-full" />
        </div>

        {/* Presentation Subheading */}
        <p className="relative z-10 text-sm text-surface-600 italic font-serif mb-2">
          This certificate is proudly awarded to
        </p>

        {/* Recipient / Donor Name (Supports Multilingual: English, Marathi, Hindi) */}
        <div className={`relative z-10 border-b-2 border-dotted border-red-200 inline-block min-w-[280px] max-w-full px-6 ${
          isPrint ? 'my-2 py-1.5' : 'my-4 py-2'
        }`}>
          <h2 className={`font-extrabold text-surface-900 tracking-normal font-serif text-red-950 break-words ${
            isPrint ? 'text-3xl' : 'text-2xl sm:text-4xl'
          }`}>
            {certificate.donor_name}
          </h2>
        </div>

        {/* Citation Statement */}
        <p className={`relative z-10 max-w-2xl mx-auto text-surface-700 leading-relaxed font-serif ${
          isPrint ? 'text-sm my-3' : 'text-sm sm:text-base my-4'
        }`}>
          in deep recognition and heartfelt appreciation for your voluntary, selfless blood donation. 
          Your noble contribution of life-saving blood brings hope, healing, and vital life support 
          to patients during critical medical emergencies.
        </p>

        {/* Verification Credentials Grid */}
        <div className={`relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200/60 shadow-sm text-left ${
          isPrint ? 'my-4' : 'my-6'
        }`}>
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-surface-400 font-semibold">Blood Group</span>
            <span className="text-base font-bold text-red-700 flex items-center gap-1 mt-0.5">
              <Droplets className="w-4 h-4 fill-red-600 text-red-600" />
              {certificate.blood_group}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-surface-400 font-semibold">Units Donated</span>
            <span className="text-base font-bold text-surface-800 mt-0.5 block">
              {certificate.units_donated} Unit ({certificate.units_donated * 450} ml)
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-surface-400 font-semibold">Donation Date</span>
            <span className="text-sm font-semibold text-surface-800 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-surface-400" />
              {new Date(certificate.donation_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-surface-400 font-semibold">Medical Facility</span>
            <span className="text-sm font-semibold text-surface-800 flex items-center gap-1 mt-0.5 truncate" title={certificate.hospital_name || 'Verified Hospital'}>
              <Building2 className="w-3.5 h-3.5 text-surface-400 shrink-0" />
              <span className="truncate">{certificate.hospital_name || 'Certified Hospital'}</span>
            </span>
          </div>
        </div>

        {/* Signatures, Official Authenticity Seal & Verification QR Code */}
        <div className={`relative z-10 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end border-t border-amber-200/50 ${
          isPrint ? 'pt-3 mt-2' : 'pt-5 mt-4'
        }`}>
          {/* 1. Left: Administrative Authority */}
          <div className="text-left text-xs text-surface-500">
            <p className="font-semibold text-surface-700">{certificate.issuer}</p>
            <p className="mt-0.5">Blood Donation Registry</p>
            {certificate.verification_reference && (
              <p className="mt-1 font-mono text-[11px] text-primary-700 font-medium">
                Ref No: {certificate.verification_reference}
              </p>
            )}
          </div>

          {/* 2. Center-Left: Official Golden Seal */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full border-4 border-double border-amber-600 bg-amber-50/90 flex flex-col items-center justify-center shadow-inner">
              <ShieldCheck className="w-6 h-6 text-amber-700" />
              <span className="text-[7.5px] font-black uppercase tracking-tighter text-amber-900 mt-0.5">
                AUTHENTICATED
              </span>
            </div>
            <span className="text-[9.5px] uppercase tracking-widest text-emerald-700 font-bold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Officially Verified
            </span>
          </div>

          {/* 3. Center-Right: QR Code Verification */}
          <div className="flex flex-col items-center justify-center">
            <div className="p-1 bg-white rounded-lg border border-amber-300/80 shadow-xs">
              <QRCodeSVG 
                value={verificationUrl} 
                size={isPrint ? 54 : 58} 
                color="#0f172a"
                title={`Scan to verify ${certificate.certificate_id}`}
              />
            </div>
            <span className="text-[8.5px] uppercase tracking-wider text-surface-500 font-semibold mt-0.5">
              Scan to Verify
            </span>
          </div>

          {/* 4. Right: Digital Signature / Authorized Verifier */}
          <div className="text-right text-xs">
            <div className="border-b border-surface-400 pb-1 mb-1 inline-block min-w-[150px]">
              <span className="font-serif italic font-bold text-surface-800 text-sm">
                {certificate.verifier_name || 'Authorized Admin'}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-surface-700">Medical Verifier / System Admin</p>
            <p className="text-[10px] text-surface-400">
              {certificate.verified_at ? `Verified: ${certificate.verified_at}` : 'Digitally Certified'}
            </p>
          </div>
        </div>

        {/* Bottom Authenticity Footnote & Unique Certificate ID */}
        <div className={`relative z-10 border-t border-dotted border-surface-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-surface-500 font-mono gap-1 ${
          isPrint ? 'mt-4 pt-2.5' : 'mt-6 pt-3'
        }`}>
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-surface-400" />
            <span>Certificate ID:</span>
            <strong className="text-surface-800 tracking-wider select-all">{certificate.certificate_id}</strong>
          </div>
          <span className="text-[10px] text-surface-400">
            Issued: {new Date(certificate.issued_at).toLocaleDateString()} • BloodConnect Verified Credential
          </span>
        </div>

      </div>
    </div>
  );
}

export default function DonationCertificateModal({ donationId, isOpen, onClose }) {
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && donationId) {
      fetchCertificate(donationId);
    } else {
      setCertificate(null);
      setError(null);
    }
  }, [isOpen, donationId]);

  const fetchCertificate = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await donationService.getCertificate(id);
      setCertificate(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load donation certificate.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Scoped Print Styles for A4 Landscape Printing */}
      <style>{`
        /* Screen view: isolated print portal remains hidden */
        #bloodconnect-certificate-print-portal {
          display: none;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          /* Ensure body background and margins are clean */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide entire React root application to avoid any overflow, clipping, or backdrop issues */
          #root {
            display: none !important;
          }

          /* Render only the isolated print portal directly inside body */
          #bloodconnect-certificate-print-portal {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 278mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #bloodconnect-certificate-print-card {
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Screen Modal View (Rendered inside React App) ── */}
      <div id="bloodconnect-certificate-modal" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto border border-surface-200">
          {/* Top Control Bar (Hidden on print) */}
          <div className="no-print flex items-center justify-between px-6 py-4 bg-surface-50 border-b border-surface-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-surface-900">Official Donation Certificate</h2>
                <p className="text-xs text-surface-500">
                  {certificate ? certificate.certificate_id : 'Verification Document'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {certificate && (
                <>
                  <a
                    href={`/verify-certificate/${encodeURIComponent(certificate.certificate_id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-100 text-surface-700 hover:bg-surface-200 border border-surface-300 transition-colors cursor-pointer"
                    title="Open public verification page"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Verify Online
                  </a>
                  <Button 
                    onClick={handlePrint}
                    icon={Printer}
                    variant="primary"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
                  >
                    Print / Save as PDF
                  </Button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-200 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
            {loading && (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <Spinner size="lg" />
                <p className="text-sm font-medium text-surface-600">Generating verified certificate...</p>
              </div>
            )}

            {error && (
              <div className="py-12">
                <Alert type="error" message={error} className="mb-4" />
                <div className="flex justify-center">
                  <Button variant="outline" onClick={onClose}>Close Window</Button>
                </div>
              </div>
            )}

            {certificate && !loading && (
              <CertificateCard certificate={certificate} isPrint={false} />
            )}
          </div>
        </div>
      </div>

      {/* ── Isolated Print Portal (Rendered directly into document.body) ── */}
      {typeof document !== 'undefined' && certificate && !loading && createPortal(
        <div id="bloodconnect-certificate-print-portal" aria-hidden="true">
          <CertificateCard certificate={certificate} isPrint={true} />
        </div>,
        document.body
      )}
    </>
  );
}
