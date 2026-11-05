import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCw, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AppErrorBoundary caught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Unknown runtime error";

      return (
        <div className="min-h-screen w-full bg-[#0a0f1d] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131c31] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/50 flex items-center justify-center text-red-500 mb-5 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              ເກີດຂໍ້ຜິດພາດໃນລະບົບ (An error occurred)
            </h2>

            {/* Description */}
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              ລະບົບກຳລັງປົກປ້ອງຂໍ້ມູນຂອງທ່ານ. ທ່ານສາມາດກົດໂຫຼດຄືນໃໝ່ເພື່ອສືບຕໍ່ໃຊ້ງານ.
            </p>

            {/* Error Message Box */}
            <div className="w-full bg-[#0d1424] border border-slate-800 rounded-xl px-4 py-3 text-left mb-6 font-mono text-xs text-slate-300 overflow-x-auto select-all">
              {errorMessage}
            </div>

            {/* Actions */}
            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 transition font-semibold text-white shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>ໂຫຼດໜ້າຄືນໃໝ່ (Reload Page)</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-98 transition font-medium text-slate-300 hover:text-white border border-slate-700/60 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <RotateCw className="w-4 h-4" />
                <span>ລ້າງແຄຊ ແລະ ເຂົ້າສູ່ລະບົບໃໝ່ (Reset & Reload)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
