import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { App } from '@capacitor/app';
import { isNativeApp } from './api-transport';

export function NativeNavigation() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNativeApp()) return;
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) navigate(-1);
      else void App.minimizeApp();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [navigate]);
  return null;
}
