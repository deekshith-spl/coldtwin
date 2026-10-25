import { useState, useEffect, useRef } from 'react';
import {
  Snowflake,
  Upload,
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  FileSpreadsheet,
  TrendingDown,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

interface StepContent {
  title: string;
  subtitle: string;
  badge: string;
  icon: typeof Snowflake;
  description: string;
  highlights: {
    icon: typeof Activity;
    title: string;
    text: string;
    tone: string;
  }[];
  tip: string;
}

const STEPS: StepContent[] = [
  {
    title: 'What ColdTwin Does',
    subtitle: 'Predictive Digital Twin for Cold Storage Facilities',
    badge: 'Step 1: Facility Intelligence',
    icon: Snowflake,
    description:
      'ColdTwin creates a live software replica of your warehouse refrigeration chambers. It blends physical thermal thermodynamics with real-time sensor data to safeguard produce quality and slash operational overhead.',
    highlights: [
      {
        icon: Activity,
        title: 'Thermal Microclimate Modeling',
        text: 'Continuously tracks actual vs. expected temperatures across every chamber to detect heat infiltration and insulation leaks.',
        tone: 'text-cold-700 bg-cold-50 border-cold-200',
      },
      {
        icon: AlertTriangle,
        title: 'Predictive Fault Detection',
        text: 'Identifies compressor short-cycling, iced/blocked cooling coils, and open doors before catastrophic breakdown occurs.',
        tone: 'text-amber-700 bg-amber-50 border-amber-200',
      },
      {
        icon: TrendingDown,
        title: 'Energy & Waste Prevention',
        text: 'Computes estimated excess kilowatt-hours and electricity costs in ₹ (INR) to pinpoint inefficient chamber operations.',
        tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      },
    ],
    tip: '💡 Tip: ColdTwin helps cold storage owners prevent midnight equipment emergencies and maintain contract compliance.',
  },
  {
    title: 'How to Load Data',
    subtitle: 'Effortless Sensor Telemetry & Produce Manifest Ingestion',
    badge: 'Step 2: Data Ingestion',
    icon: Upload,
    description:
      'You can run ColdTwin with realistic demo datasets in 1-click or connect your real cold warehouse logs using flexible CSV/Excel imports.',
    highlights: [
      {
        icon: Snowflake,
        title: '1-Click Demo Simulation',
        text: 'Click "Load Demo Data" anytime on the Dashboard or Data Input page to explore 60 days of telemetry across 4 chambers with pre-seeded anomalies.',
        tone: 'text-blue-700 bg-blue-50 border-blue-200',
      },
      {
        icon: FileSpreadsheet,
        title: 'CSV & Excel Telemetry Import',
        text: 'Head over to Data Input to drag-and-drop sensor logs (temperature, humidity, power, door status) or lot manifests using our pre-built templates.',
        tone: 'text-purple-700 bg-purple-50 border-purple-200',
      },
      {
        icon: Activity,
        title: 'Live Manual Entry',
        text: 'Facility operators can log immediate spot readings or register newly arrived farm produce batches directly on mobile or desktop.',
        tone: 'text-cold-700 bg-cold-50 border-cold-200',
      },
    ],
    tip: '💡 Tip: Download our ready-to-use CSV templates directly on the Data Input page to standardize logger exports.',
  },
  {
    title: 'How to Read the Sell First List',
    subtitle: 'Dynamic FEFO Prioritization to Prevent Crop Spoilage',
    badge: 'Step 3: FEFO Prioritization',
    icon: ShoppingCart,
    description:
      'Located directly on the Dashboard, the Sell First list dynamically re-ranks stored crop lots by remaining shelf life using non-linear temperature degradation kinetics (Q10 model).',
    highlights: [
      {
        icon: AlertTriangle,
        title: 'Urgent (Red Badge — < 3 Days)',
        text: 'Lots undergoing severe thermal stress. Immediately liquidate or dispatch to local markets to prevent total financial write-off.',
        tone: 'text-red-700 bg-red-50 border-red-200',
      },
      {
        icon: Clock,
        title: 'Soon (Amber Badge — 3 to 7 Days)',
        text: 'Lots with moderate remaining shelf life. Schedule wholesale buyers or secondary sorting within the coming week.',
        tone: 'text-amber-700 bg-amber-50 border-amber-200',
      },
      {
        icon: CheckCircle2,
        title: 'OK (Green Badge — > 7 Days)',
        text: 'Lots stored in optimal conditions with strong physiological stability. Safe for continued storage.',
        tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      },
    ],
    tip: '💡 Tip: Click "Why?" on any lot card to view the exact cumulative degree-days and temperature stress factors driving the estimate.',
  },
];

export function WalkthroughModal() {
  const { isTourOpen, openTour, closeTour } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Check localStorage on first launch
  useEffect(() => {
    try {
      const seen = localStorage.getItem('coldtwin_walkthrough_seen');
      if (seen !== 'true') {
        openTour();
      }
    } catch {
      // LocalStorage unavailable
    }
  }, [openTour]);

  // Reset to first step whenever opened
  useEffect(() => {
    if (isTourOpen) {
      setCurrentStep(0);
      // Accessibility focus
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);
    }
  }, [isTourOpen]);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    if (!isTourOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeTour();
      } else if (e.key === 'ArrowRight' && currentStep < STEPS.length - 1) {
        setCurrentStep(s => s + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep(s => s - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourOpen, currentStep, closeTour]);

  if (!isTourOpen) return null;

  const step = STEPS[currentStep];
  const StepIcon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      closeTour();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep(s => s - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-title"
      aria-describedby="walkthrough-desc"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-gray-100 animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cold-700 text-white flex items-center justify-center shadow-sm">
              <StepIcon size={18} aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cold-700">
                {step.badge}
              </span>
              <div className="text-xs text-gray-500 font-medium">
                Step {currentStep + 1} of {STEPS.length}
              </div>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            onClick={closeTour}
            aria-label="Close walkthrough"
            className="min-w-[44px] min-h-[44px] p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <div>
            <h2 id="walkthrough-title" className="text-xl font-bold text-gray-900 tracking-tight">
              {step.title}
            </h2>
            <p className="text-sm font-medium text-cold-700 mt-0.5">{step.subtitle}</p>
            <p id="walkthrough-desc" className="text-xs text-gray-600 mt-2 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Highlights list */}
          <div className="flex flex-col gap-2.5">
            {step.highlights.map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${item.tone}`}
                >
                  <div className="p-1.5 rounded-lg bg-white/90 shadow-2xs shrink-0 mt-0.5">
                    <ItemIcon size={16} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.text}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pro tip callout */}
          <div className="bg-cold-50 border border-cold-100 rounded-xl px-3.5 py-2.5 text-xs text-cold-900 font-medium">
            {step.tip}
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          {/* Stepper dots */}
          <div className="flex items-center gap-1.5" aria-label={`Step ${currentStep + 1} of 3`}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-2.5 rounded-full transition-all min-w-[20px] min-h-[20px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 ${
                  i === currentStep
                    ? 'w-7 bg-cold-700'
                    : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
              >
                <span className="sr-only">Step {i + 1}</span>
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isLast ? (
              <button
                type="button"
                onClick={closeTour}
                className="min-h-[44px] px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-200/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600"
              >
                Skip tour
              </button>
            ) : null}

            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600"
              >
                <ChevronLeft size={16} aria-hidden="true" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-cold-700 rounded-lg hover:bg-cold-800 transition-colors flex items-center gap-1 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600"
            >
              <span>{isLast ? 'Get Started' : 'Next'}</span>
              {!isLast && <ChevronRight size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
