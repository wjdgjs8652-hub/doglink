import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ReportDraftProvider } from "./state/ReportDraftContext";
import { EntryPage } from "./pages/EntryPage";
import { PhotoPage } from "./pages/PhotoPage";
import { LocationPage } from "./pages/LocationPage";
import { DetailsPage } from "./pages/DetailsPage";
import { TriagePage } from "./pages/TriagePage";
import { CompletePage } from "./pages/CompletePage";
import { StatusLookupPage, StatusPage } from "./pages/StatusPage";
import { DesignSystemPage } from "./pages/DesignSystemPage";

export default function App() {
  return (
    <BrowserRouter>
      <ReportDraftProvider>
        <Routes>
          <Route path="/" element={<EntryPage />} />
          <Route path="/report/photo" element={<PhotoPage />} />
          <Route path="/report/location" element={<LocationPage />} />
          <Route path="/report/details" element={<DetailsPage />} />
          <Route path="/report/triage" element={<TriagePage />} />
          <Route path="/report/complete/:id" element={<CompletePage />} />
          <Route path="/report/status" element={<StatusLookupPage />} />
          <Route path="/report/status/:id" element={<StatusPage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          <Route path="*" element={<EntryPage />} />
        </Routes>
      </ReportDraftProvider>
    </BrowserRouter>
  );
}
