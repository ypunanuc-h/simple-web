import { useState } from 'react';
import { EmployeeListPage } from './features/employees/EmployeeListPage';
import { DepartmentsPage } from './features/departments/DepartmentsPage';

type View = 'employees' | 'departments';

const TABS: ReadonlyArray<{ readonly view: View; readonly label: string }> = [
  { view: 'employees', label: 'พนักงาน' },
  { view: 'departments', label: 'แผนก' },
];

export function App() {
  const [view, setView] = useState<View>('employees');

  return (
    <div>
      <nav className="border-b border-gray-200 bg-white px-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.view}
              type="button"
              onClick={() => setView(tab.view)}
              className={
                tab.view === view
                  ? 'border-b-2 border-brand px-4 py-3 text-sm font-medium text-brand'
                  : 'border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700'
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {view === 'employees' ? <EmployeeListPage /> : <DepartmentsPage />}
    </div>
  );
}
