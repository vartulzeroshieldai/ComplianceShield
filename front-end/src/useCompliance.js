import { useContext } from "react";
import { ComplianceContext } from "./ComplianceContext.jsx";

// Custom hook to use compliance context
export function useCompliance() {
  const context = useContext(ComplianceContext);
  if (!context) {
    throw new Error("useCompliance must be used within a ComplianceProvider");
  }
  return context;
}
