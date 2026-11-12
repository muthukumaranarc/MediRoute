import React from 'react';
import { Ambulance, Hospital, CheckCircle2, ArrowRight, X, ShieldAlert, Sparkles, MapPin } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLaunchDemo?: () => void;
}

export const HowItWorksModal: React.FC<Props> = ({ isOpen, onClose, onLaunchDemo }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="badge-pulse">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Welcome to MediRoute</h2>
              <p className="text-xs text-slate-500 font-medium">
                108 அவசர சேவை · Smart Ambulance &amp; Hospital Coordination (Tamil Nadu)
              </p>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body space-y-6">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
            <p>
              In critical golden-hour emergencies, ambulances often arrive at hospitals only to find full ER beds or missing specialized equipment. 
              <strong> MediRoute bridges this gap</strong> across the Namakkal, Tiruchengode &amp; Kumarapalayam emergency corridor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon-wrapper bg-rose-50 text-rose-600">
                <Ambulance className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-3">1. Ambulance Reports</h3>
              <p className="text-xs text-slate-600 mt-1">
                Ambulance crew logs the emergency (e.g. Cardiac, Trauma) &amp; essential life-support required.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon-wrapper bg-blue-50 text-blue-600">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-3">2. Intelligent Match</h3>
              <p className="text-xs text-slate-600 mt-1">
                Matching uses the latest hospital desk report for capacity and equipment, plus distance. Stale reports are excluded according to the configured freshness limit.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon-wrapper bg-emerald-50 text-emerald-600">
                <Hospital className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-3">3. Hospital Reserves</h3>
              <p className="text-xs text-slate-600 mt-1">
                Hospital ER staff accepts the request with 1-click, reserving an emergency bed before arrival!
              </p>
            </div>
          </div>

          {onLaunchDemo && <div className="border-t border-slate-200 pt-4">
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-1">
                  ⚡ Recommended for First-Time Users
                </span>
                <h4 className="font-bold text-slate-900 text-sm">Experience the complete workflow in 5 seconds</h4>
                <p className="text-xs text-slate-600">
                  Click below to create a synthetic Trauma case in Tiruchengode and see the demo matching flow.
                </p>
              </div>
              <button
                className="btn-primary whitespace-nowrap flex items-center gap-2"
                onClick={() => {
                  onClose();
                  onLaunchDemo();
                }}
              >
                <span>Launch Quick Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Got it, explore on my own
          </button>
        </div>
      </div>
    </div>
  );
};
