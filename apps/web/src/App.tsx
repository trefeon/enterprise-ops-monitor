import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AppRouter from "./router";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster />
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
