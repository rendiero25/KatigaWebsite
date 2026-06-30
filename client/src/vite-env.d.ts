/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_MIDTRANS_CLIENT_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  snap?: {
    pay: (token: string, options: {
      onSuccess?: (result: object) => void;
      onPending?: (result: object) => void;
      onError?: (result: object) => void;
      onClose?: () => void;
    }) => void;
  };
  google: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
        }) => void;
        prompt: () => void;
        renderButton: (element: HTMLElement, config: object) => void;
      };
    };
  };
}

declare module 'swiper/css';
declare module 'swiper/css/navigation';
declare module 'swiper/css/pagination';
declare module 'swiper/css/autoplay';
