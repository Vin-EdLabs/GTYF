/** Minimal types for @paystack/inline-js (the package ships none). */
declare module '@paystack/inline-js' {
  interface ResumeCallbacks {
    onSuccess?: (tx: { id: number; reference: string; message: string }) => void;
    onCancel?: () => void;
    onError?: (e: { message: string }) => void;
    onLoad?: (tx: { id: number; accessCode: string }) => void;
  }
  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: ResumeCallbacks): unknown;
  }
}
