import { Shield, Layers, Building2, CheckCircle2 } from 'lucide-react';
import Card from '../ui/Card';

export default function AdminOpsArchitectureNotice({ className = '' }) {
  return (
    <Card className={`p-6 bg-gradient-to-r from-surface-50 via-white to-primary-50/30 border-surface-200 ${className}`}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-primary-100 text-primary-800 border border-primary-200">
              <Shield className="w-3.5 h-3.5 text-primary-600" />
              Central Platform Governance
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-100 text-surface-600 border border-surface-200">
              <Layers className="w-3.5 h-3.5 text-surface-500" />
              Facility Decoupled Architecture
            </span>
          </div>

          <h3 className="text-sm font-bold text-surface-900 pt-1">
            Platform Operations & Facility Extensibility Boundary
          </h3>
          <p className="text-xs text-surface-600 leading-relaxed">
            BloodConnect maintains a strict separation between central platform governance (regional request matching, voluntary donor registry, tamper-resistant certificate audits) and facility-level operations. Blood bank partner telemetry, camp dispatch, and facility inventory management are planned to interface via decoupled operator nodes without disrupting central administrative authority.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0 w-full lg:w-auto">
          <div className="p-3 bg-white rounded-lg border border-surface-200 text-xs shadow-2xs">
            <div className="font-semibold text-surface-800 flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Current Platform Scope
            </div>
            <p className="text-[11px] text-surface-500">
              User governance, donation audit, appreciation certificate verification, emergency matching.
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-dashed border-primary-300 text-xs shadow-2xs">
            <div className="font-semibold text-primary-800 flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5 text-primary-600" />
              Facility Readiness (Future)
            </div>
            <p className="text-[11px] text-surface-500">
              Dedicated interfaces for external blood centre telemetry, camp coordination, and regional reserves.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
