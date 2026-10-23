import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RaftSimulatorProvider } from './context/RaftSimulatorContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { AccountsPage } from './pages/AccountsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { LoansPage } from './pages/LoansPage';
import { BranchesPage } from './pages/BranchesPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { CockroachShowcasePage } from './pages/CockroachShowcasePage';
import { SchemaVisualizerPage } from './pages/SchemaVisualizerPage';
import { DatabaseExplorerPage } from './pages/DatabaseExplorerPage';
import { SqlWorkbenchPage } from './pages/SqlWorkbenchPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <RaftSimulatorProvider>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="loans" element={<LoansPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="showcase" element={<CockroachShowcasePage />} />
            <Route path="schema" element={<SchemaVisualizerPage />} />
            <Route path="database" element={<DatabaseExplorerPage />} />
            <Route path="workbench" element={<SqlWorkbenchPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </RaftSimulatorProvider>
    </BrowserRouter>
  );
};

export default App;
