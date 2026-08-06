"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { CategoryBudgetsProvider } from "@/contexts/CategoryBudgetsContext";
import { CustomCategoriesProvider } from "@/contexts/CustomCategoriesContext";
import { ExpensesProvider } from "@/contexts/ExpensesContext";
import { HouseholdProvider } from "@/contexts/HouseholdContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <CustomCategoriesProvider>
          <CategoryBudgetsProvider>
            <ExpensesProvider>{children}</ExpensesProvider>
          </CategoryBudgetsProvider>
        </CustomCategoriesProvider>
      </HouseholdProvider>
    </AuthProvider>
  );
}
