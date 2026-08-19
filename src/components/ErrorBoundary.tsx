import React, { ErrorInfo, ReactNode } from 'react';
import { Heart, RefreshCw, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary bắt được lỗi:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('Cannot clear sessionStorage:', e);
    }
    window.location.reload();
  };

  private handleFullReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
    window.location.href = '/';
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-rose-100 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
              <Heart className="w-8 h-8 fill-rose-500 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-800">Không gian tình yêu</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Đã xảy ra sự cố hiển thị (có thể do tệp media quá nặng làm đầy bộ nhớ trình duyệt). Hai bạn hãy bấm nút bên dưới để khôi phục lại nhé!
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-left">
                <p className="text-[11px] font-mono text-rose-600 line-clamp-3 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold rounded-2xl text-xs shadow-md shadow-rose-200 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tải lại trang ngay</span>
              </button>

              <button
                type="button"
                onClick={this.handleFullReset}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Xóa bộ nhớ đệm & Khôi phục an toàn</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
