/// <reference types="vite/client" />

interface Window {
  snap: {
    pay: (token: string, options: {
      onSuccess?: (result: object) => void;
      onPending?: (result: object) => void;
      onError?: (result: object) => void;
      onClose?: () => void;
    }) => void;
  };
}

declare module 'swiper/css';
declare module 'swiper/css/navigation';
declare module 'swiper/css/pagination';
declare module 'swiper/css/autoplay';
