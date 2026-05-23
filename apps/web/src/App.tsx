import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AppRouter from "./router";
import { Toaster } from "./components/ui/sonner";
import { BaseMotionProvider } from "./components/base";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BaseMotionProvider>
          <Toaster />
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </BaseMotionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
